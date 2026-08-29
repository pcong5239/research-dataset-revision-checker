import builtins
import json
import pathlib
import sys
import types


class _UserError(Exception):
    pass


class _Decorators:
    def __getattr__(self, _name):
        return lambda fn: fn


class _Contract:
    pass


def _load_contract():
    genlayer = types.ModuleType("genlayer")
    genlayer.Contract = _Contract
    genlayer.TreeMap = dict
    genlayer.DynArray = list
    genlayer.u8 = int
    genlayer.allow_storage = lambda cls: cls
    genlayer.gl = types.SimpleNamespace(
        Contract=_Contract,
        public=_Decorators(),
        vm=types.SimpleNamespace(UserError=_UserError),
        message=types.SimpleNamespace(sender_address="0x0"),
        nondet=types.SimpleNamespace(web=None),
        eq_principle=types.SimpleNamespace(strict_eq=None),
    )
    old = sys.modules.get("genlayer")
    sys.modules["genlayer"] = genlayer
    namespace = {"__name__": "revision_checker_test_module"}
    source = pathlib.Path(__file__).parents[1] / "contracts" / "revision_checker.py"
    exec(compile(source.read_text(encoding="utf-8"), str(source), "exec"), namespace)
    if old is None:
        del sys.modules["genlayer"]
    else:
        sys.modules["genlayer"] = old
    return namespace


mod = _load_contract()


def test_url_canonicalization_removes_fragment_default_port_and_trailing_slash():
    assert mod["_canonical_url"](" HTTPS://GitHub.com:443/Org/Repo/#notes ") == "https://github.com/Org/Repo"


def test_canonical_json_is_sorted_compact_utf8():
    assert mod["_canonical_json"]({"b": "é", "a": 1}) == '{"a":1,"b":"é"}'


def test_source_fields_normalize_only_declared_case_insensitive_fields():
    source = {
        "dataset_id": " DS-1 ",
        "version": " v1 ",
        "license_id": " MIT ",
        "repository_owner": " OpenAI ",
        "repository_name": " Data ",
        "release_ref": " Release/V1 ",
        "commit_id": " ABC123 ",
    }
    result = mod["_source_fields"](source, False)
    assert result["dataset_id"] == "DS-1"
    assert result["version"] == "v1"
    assert result["license_id"] == "mit"
    assert result["repository_owner"] == "openai"
    assert result["release_ref"] == "Release/V1"


def test_repository_identity_uses_canonical_path():
    assert mod["_repository_identity"]("https://GitHub.com:443/Org/Repo/") == ("org", "repo")


class _Response:
    def __init__(self, status_code, body):
        self.status_code = status_code
        self.body = body


def test_missing_required_metadata_is_distinguished_from_malformed_json():
    mod["gl"].nondet.web = types.SimpleNamespace(
        get=lambda _url: _Response(200, json.dumps({"dataset_id": "DS-1"}).encode("utf-8"))
    )
    assert mod["_fetch_source"]("https://example.com/landing", True)["status"] == "MISSING"

    mod["gl"].nondet.web = types.SimpleNamespace(
        get=lambda _url: _Response(200, b"not-json")
    )
    assert mod["_fetch_source"]("https://example.com/landing", True)["status"] == "MALFORMED"


def test_unavailable_statuses_fail_closed():
    for status in (0, 404, 429, 503):
        mod["gl"].nondet.web = types.SimpleNamespace(
            get=lambda _url, status=status: _Response(status, b"")
        )
        assert mod["_fetch_source"]("https://example.com/landing", True)["status"] == "UNAVAILABLE"


def test_unresolved_assessment_can_only_be_retried_explicitly():
    contract = mod["RevisionChecker"]()
    mod["gl"].message.sender_address = "0xowner"
    contract.register_case("DS-1", "https://example.com/landing", "https://github.com/org/repo", "v1", "mit")
    contract.freeze_case("DS-1")

    mod["gl"].eq_principle.strict_eq = lambda fn: fn()
    mod["gl"].nondet.web = types.SimpleNamespace(
        get=lambda _url: _Response(429, b"")
    )
    contract.assess("DS-1")
    assert contract.cases["DS-1"].state == "ASSESSED"
    assert contract.cases["DS-1"].outcome == "UNRESOLVED"
    assert contract.cases["DS-1"].retry_count == 0

    contract.retry_unresolved("DS-1")
    assert contract.cases["DS-1"].retry_count == 1


def test_consensus_result_classifies_matching_revision():
    landing = {
        "dataset_id": "DS-1",
        "version": "v1",
        "license_id": "mit",
        "release_ref": "v1",
        "commit_id": "abc123",
        "repository_url": "https://github.com/org/repo",
    }
    repository = {
        "dataset_id": "DS-1",
        "version": "v1",
        "license_id": "MIT",
        "release_ref": "v1",
        "commit_id": "abc123",
        "repository_owner": "Org",
        "repository_name": "Repo",
    }
    payloads = {"landing": landing, "repository": repository}
    mod["gl"].eq_principle.strict_eq = lambda fn: fn()
    mod["gl"].nondet.web = types.SimpleNamespace(
        get=lambda url: _Response(200, json.dumps(payloads["landing" if "landing" in url else "repository"]).encode("utf-8"))
    )
    result = json.loads(mod["_collect_evidence"](
        "https://example.com/landing", "https://github.com/org/repo", "v1", "mit"
    ))
    assert result["outcome"] == "MATCHING_REVISION"


def test_consensus_result_separates_revision_license_and_metadata_failures():
    mod["gl"].eq_principle.strict_eq = lambda fn: fn()

    def assess(landing, repository):
        payloads = {"landing": landing, "repository": repository}
        mod["gl"].nondet.web = types.SimpleNamespace(
            get=lambda url: _Response(200, json.dumps(payloads["landing" if "landing" in url else "repository"]).encode("utf-8"))
        )
        return json.loads(mod["_collect_evidence"](
            "https://example.com/landing", "https://github.com/org/repo", "v1", "mit"
        ))["outcome"]

    base_landing = {
        "dataset_id": "DS-1", "version": "v1", "license_id": "mit",
        "release_ref": "v1", "commit_id": "abc123", "repository_url": "https://github.com/org/repo",
    }
    base_repository = {
        "dataset_id": "DS-1", "version": "v1", "license_id": "mit",
        "release_ref": "v1", "commit_id": "abc123", "repository_owner": "org", "repository_name": "repo",
    }
    revised = dict(base_repository, commit_id="def456")
    licensed = dict(base_repository, license_id="apache-2.0")
    missing = dict(base_repository)
    del missing["license_id"]
    assert assess(base_landing, revised) == "REVISION_MISMATCH"
    assert assess(base_landing, licensed) == "LICENSE_MISMATCH"
    assert assess(base_landing, missing) == "METADATA_MISSING"
