import json
from pathlib import Path


CONTRACT = str(Path(__file__).parents[1] / "contracts" / "revision_checker.py")


def _landing(commit="abc123"):
    return {
        "dataset_id": "DS-1",
        "version": "v1",
        "license_id": "mit",
        "release_ref": "v1",
        "commit_id": commit,
        "repository_url": "https://github.com/org/repo",
    }


def _repository(commit="abc123"):
    return {
        "dataset_id": "DS-1",
        "version": "v1",
        "license_id": "mit",
        "release_ref": "v1",
        "commit_id": commit,
        "repository_owner": "org",
        "repository_name": "repo",
    }


def _mock_sources(vm, landing, repository):
    vm.mock_web(r"example\.com/landing", {
        "method": "GET",
        "status": 200,
        "body": json.dumps(landing),
    })
    vm.mock_web(r"github\.com/org/repo", {
        "method": "GET",
        "status": 200,
        "body": json.dumps(repository),
    })


def test_direct_runtime_roundtrips_storage_and_captures_equivalence_validator(
    direct_vm, direct_deploy, monkeypatch
):
    direct_vm.check_pickling = True
    contract = direct_deploy(CONTRACT)
    _mock_sources(direct_vm, _landing(), _repository())

    contract.register_case(
        "DS-1",
        "https://example.com/landing",
        "https://github.com/org/repo",
        "v1",
        "mit",
    )
    contract.freeze_case("DS-1")
    assert list(contract.get_case_ids()) == ["DS-1"]
    assert contract.get_case("DS-1")["state"] == "FROZEN"

    contract.assess("DS-1")
    assert contract.get_case("DS-1")["outcome"] == "MATCHING_REVISION"

    # gltest 0.39.2's Direct Mode sandbox decoder currently cannot decode the
    # strict_eq validator's nested sandbox response. Exercise the actual SDK
    # validator with the sandbox boundary reduced to a direct call.
    import genlayer.gl.vm as gl_vm

    monkeypatch.setattr(gl_vm, "spawn_sandbox", lambda fn: gl_vm.Return(calldata=fn()))
    assert direct_vm.run_validator() is True


def test_direct_runtime_rejects_disagreeing_representative_evidence(
    direct_vm, direct_deploy, monkeypatch
):
    contract = direct_deploy(CONTRACT)
    _mock_sources(direct_vm, _landing(), _repository())
    contract.register_case(
        "DS-1",
        "https://example.com/landing",
        "https://github.com/org/repo",
        "v1",
        "mit",
    )
    contract.freeze_case("DS-1")
    contract.assess("DS-1")

    direct_vm.clear_mocks()
    _mock_sources(direct_vm, _landing(commit="different"), _repository(commit="different"))
    import genlayer.gl.vm as gl_vm

    monkeypatch.setattr(gl_vm, "spawn_sandbox", lambda fn: gl_vm.Return(calldata=fn()))
    assert direct_vm.run_validator() is False
