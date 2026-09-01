# v0.1.0
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from dataclasses import dataclass
import hashlib
import json
import typing
import unicodedata

from genlayer import *


MAX_TEXT = 256
MAX_URL = 512
MAX_RETRIES = 3
OUTCOMES = (
    "MATCHING_REVISION",
    "REVISION_MISMATCH",
    "LICENSE_MISMATCH",
    "METADATA_MISSING",
    "UNRESOLVED",
)


@allow_storage
@dataclass
class DatasetCase:
    owner: str
    dataset_id: str
    landing_url: str
    repository_url: str
    expected_version: str
    expected_license: str
    state: str
    outcome: str
    repository_commit: str
    metadata_digest: str
    evidence_digest: str
    retry_count: u8


def _text(value: typing.Any, field: str, limit: int = MAX_TEXT) -> str:
    if not isinstance(value, str):
        raise ValueError(field + " must be text")
    value = unicodedata.normalize("NFC", value).strip()
    if not value or len(value) > limit:
        raise ValueError(field + " has an invalid length")
    return value


def _canonical_url(value: str) -> str:
    value = _text(value, "url", MAX_URL)
    if value[:8].lower() != "https://":
        raise ValueError("url must use HTTPS")
    rest = value[8:]
    rest = rest.split("#", 1)[0]
    authority, separator, path_query = rest.partition("/")
    if not authority or "@" in authority:
        raise ValueError("url authority is invalid")
    authority = authority.lower()
    if authority.endswith(":443"):
        authority = authority[:-4]
    if not authority:
        raise ValueError("url host is missing")
    if not separator:
        return "https://" + authority
    path, query_separator, query = path_query.partition("?")
    if path.endswith("/") and path != "/":
        path = path[:-1]
    return "https://" + authority + "/" + path + ("?" + query if query_separator else "")


def _canonical_json(value: typing.Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _source_fields(payload: typing.Any, landing: bool) -> typing.Dict[str, str]:
    if not isinstance(payload, dict):
        raise ValueError("source JSON must be an object")
    keys = ["dataset_id", "version", "license_id", "release_ref", "commit_id"]
    if landing:
        keys.append("repository_url")
    else:
        keys.extend(["repository_owner", "repository_name"])
    result: typing.Dict[str, str] = {}
    for key in keys:
        if key not in payload:
            raise KeyError(key)
        value = _text(payload.get(key), key)
        if key == "license_id" or key in ("repository_owner", "repository_name"):
            value = value.lower()
        if key == "repository_url":
            value = _canonical_url(value)
        result[key] = value
    return result


def _repository_identity(repository_url: str) -> typing.Tuple[str, str]:
    rest = _canonical_url(repository_url)[8:]
    _, separator, path_query = rest.partition("/")
    if not separator:
        raise ValueError("repository URL has no path")
    path = path_query.split("?", 1)[0].strip("/")
    parts = path.split("/")
    if len(parts) < 2 or not parts[0] or not parts[1]:
        raise ValueError("repository URL identity is missing")
    return parts[0].lower(), parts[1].lower()


def _fetch_source(url: str, landing: bool) -> typing.Dict[str, typing.Any]:
    response = gl.nondet.web.get(url)
    status = response.status
    if status != 200:
        return {"status": "UNAVAILABLE"}
    try:
        body = response.body
        if not isinstance(body, bytes):
            return {"status": "MALFORMED"}
        body = body.decode("utf-8")
        # Bound parsing work and make oversized source data fail closed.
        if len(body) > 16000:
            return {"status": "MALFORMED"}
        return {"status": "OK", "fields": _source_fields(json.loads(body), landing)}
    except KeyError:
        return {"status": "MISSING"}
    except Exception:
        return {"status": "MALFORMED"}


def _collect_evidence(
    landing_url: str,
    repository_url: str,
    expected_version: str,
    expected_license: str,
) -> str:
    def fetch() -> str:
        landing = _fetch_source(landing_url, True)
        repository = _fetch_source(repository_url, False)
        statuses = {landing.get("status"), repository.get("status")}
        if statuses.intersection({"UNAVAILABLE", "MALFORMED"}):
            return _canonical_json({"outcome": "UNRESOLVED"})
        if "MISSING" in statuses:
            return _canonical_json({"outcome": "METADATA_MISSING"})
        if statuses != {"OK"}:
            return _canonical_json({"outcome": "UNRESOLVED"})

        landing_fields = landing["fields"]
        repository_fields = repository["fields"]
        try:
            expected_owner, expected_name = _repository_identity(repository_url)
        except Exception:
            return _canonical_json({"outcome": "UNRESOLVED"})

        relationship_ok = (
            landing_fields["repository_url"] == _canonical_url(repository_url)
            and repository_fields["repository_owner"] == expected_owner
            and repository_fields["repository_name"] == expected_name
            and landing_fields["dataset_id"] == repository_fields["dataset_id"]
        )
        if not relationship_ok:
            return _canonical_json({"outcome": "UNRESOLVED"})

        fields = {
            "dataset_id": landing_fields["dataset_id"],
            "version": landing_fields["version"],
            "license_id": landing_fields["license_id"],
            "release_ref": landing_fields["release_ref"],
            "commit_id": landing_fields["commit_id"],
            "repository_owner": repository_fields["repository_owner"],
            "repository_name": repository_fields["repository_name"],
        }
        if landing_fields["license_id"] != repository_fields["license_id"] or landing_fields["license_id"] != expected_license:
            outcome = "LICENSE_MISMATCH"
        elif (
            landing_fields["version"] != repository_fields["version"]
            or landing_fields["release_ref"] != repository_fields["release_ref"]
            or landing_fields["commit_id"] != repository_fields["commit_id"]
            or landing_fields["version"] != expected_version
        ):
            outcome = "REVISION_MISMATCH"
        else:
            outcome = "MATCHING_REVISION"
        fields["outcome"] = outcome
        return _canonical_json(fields)

    return gl.eq_principle.strict_eq(fetch)


class RevisionChecker(gl.Contract):
    cases: TreeMap[str, DatasetCase]
    case_ids: DynArray[str]

    def __init__(self):
        pass

    @gl.public.write
    def register_case(
        self,
        dataset_id: str,
        landing_url: str,
        repository_url: str,
        expected_version: str,
        expected_license: str,
    ) -> None:
        dataset_id = _text(dataset_id, "dataset_id")
        if dataset_id in self.cases:
            raise gl.vm.UserError("CASE_ALREADY_EXISTS")
        landing_url = _canonical_url(landing_url)
        repository_url = _canonical_url(repository_url)
        expected_version = _text(expected_version, "expected_version")
        expected_license = _text(expected_license, "expected_license").lower()
        self.cases[dataset_id] = DatasetCase(
            owner=str(gl.message.sender_address),
            dataset_id=dataset_id,
            landing_url=landing_url,
            repository_url=repository_url,
            expected_version=expected_version,
            expected_license=expected_license,
            state="REGISTERED",
            outcome="UNRESOLVED",
            repository_commit="",
            metadata_digest="",
            evidence_digest="",
            retry_count=u8(0),
        )
        self.case_ids.append(dataset_id)

    @gl.public.write
    def freeze_case(self, dataset_id: str) -> None:
        case = self._case(dataset_id)
        if case.owner != str(gl.message.sender_address):
            raise gl.vm.UserError("ONLY_OWNER")
        if case.state != "REGISTERED":
            raise gl.vm.UserError("CASE_NOT_REGISTERED")
        case.state = "FROZEN"
        self.cases[dataset_id] = case

    @gl.public.write
    def assess(self, dataset_id: str) -> None:
        self._assess(dataset_id, False)

    @gl.public.write
    def retry_unresolved(self, dataset_id: str) -> None:
        self._assess(dataset_id, True)

    def _assess(self, dataset_id: str, is_retry: bool) -> None:
        case = self._case(dataset_id)
        required_state = "ASSESSED" if is_retry else "FROZEN"
        if case.state != required_state:
            raise gl.vm.UserError("CASE_NOT_FROZEN")
        if case.outcome != "UNRESOLVED":
            raise gl.vm.UserError("CASE_ALREADY_CONCLUSIVE")
        if is_retry:
            if case.retry_count >= u8(MAX_RETRIES):
                raise gl.vm.UserError("RETRY_LIMIT_REACHED")
            case.retry_count = u8(case.retry_count + u8(1))
        result = json.loads(
            _collect_evidence(
                case.landing_url,
                case.repository_url,
                case.expected_version,
                case.expected_license,
            )
        )
        outcome = result.get("outcome")
        if outcome not in OUTCOMES:
            raise gl.vm.UserError("INVALID_CONSENSUS_RESULT")
        case.outcome = outcome
        case.state = "ASSESSED"
        if outcome != "UNRESOLVED":
            case.repository_commit = result.get("commit_id", "")
            metadata = {
                "dataset_id": result.get("dataset_id", ""),
                "version": result.get("version", ""),
                "license_id": result.get("license_id", ""),
                "repository_owner": result.get("repository_owner", ""),
                "repository_name": result.get("repository_name", ""),
                "release_ref": result.get("release_ref", ""),
                "commit_id": result.get("commit_id", ""),
            }
            case.metadata_digest = _sha256(_canonical_json(metadata))
            case.evidence_digest = _sha256(_canonical_json({"metadata": metadata, "outcome": outcome}))
        self.cases[dataset_id] = case

    def _case(self, dataset_id: str) -> DatasetCase:
        dataset_id = _text(dataset_id, "dataset_id")
        case = self.cases.get(dataset_id)
        if case is None:
            raise gl.vm.UserError("CASE_NOT_FOUND")
        return case

    @gl.public.view
    def get_case(self, dataset_id: str) -> TreeMap[str, typing.Any]:
        case = self._case(dataset_id)
        return {
            "owner": case.owner,
            "dataset_id": case.dataset_id,
            "landing_url": case.landing_url,
            "repository_url": case.repository_url,
            "expected_version": case.expected_version,
            "expected_license": case.expected_license,
            "state": case.state,
            "outcome": case.outcome,
            "repository_commit": case.repository_commit,
            "metadata_digest": case.metadata_digest,
            "evidence_digest": case.evidence_digest,
            "retry_count": case.retry_count,
        }

    @gl.public.view
    def get_case_ids(self) -> DynArray[str]:
        return self.case_ids
