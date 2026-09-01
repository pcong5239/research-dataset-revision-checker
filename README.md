# Research Dataset Revision Checker

A GenLayer PROJECT that makes dataset provenance review independently inspectable. A maintainer freezes a dataset ID, landing page, canonical repository, expected version, and expected license. Validators fetch only bounded metadata from the two mandatory public references and reach consensus on normalized, outcome-authorizing fields.

The optional paper is supporting disclosure only. It cannot change the primary result.

## Contract workflow

1. `register_case` stores bounded references and expectations; raw source bodies are never stored.
2. The owner calls `freeze_case`.
3. Anyone may call `assess`; the contract fetches both mandatory sources inside `strict_eq`.
4. A transport failure remains `UNRESOLVED`. The caller may use `retry_unresolved` up to three times.
5. A conclusive assessment stores the normalized repository commit plus SHA-256 metadata/evidence digests.

Outcomes are `MATCHING_REVISION`, `REVISION_MISMATCH`, `LICENSE_MISMATCH`, `METADATA_MISSING`, and `UNRESOLVED`.

## Local checks

```powershell
$env:PYTHONUTF8 = '1'
py -3.13 -m pytest -q -p no:cacheprovider
genvm-lint check contracts/revision_checker.py
genvm-lint schema contracts/revision_checker.py --json
genvm-lint typecheck contracts/revision_checker.py
```

The Vite frontend uses project-local `genlayer-js@1.1.8`. Set `VITE_CONTRACT_ADDRESS` from the exact deployed contract before using the write and read controls. The app starts disconnected after reload, requires explicit provider selection, and does not label a write successful until `FINALIZED`, `FINISHED_WITH_RETURN`, and authoritative case readback agree.

## Verified deployment

The exact frozen contract is deployed on Studionet at `0x3d5Ff07e8492d8a9eE8E333bdBCFb0B447447ea1` from source commit `08d759023c807e783d2bbb42059e1cb20a3a025f` (source SHA-256 `ECE513F2132168517E178F737EEEFC951BE370B415508D2604A7C62585E7C7C7`). Deployment transaction: `0x0b5a8f7183dd05b075eba9c7cdb5d0fdb05715a4085b3e5d0cd379f9902a675d`.

The live Studio matrix covers initial empty state, `register_case`, `freeze_case`, unavailable-source `assess` (`UNRESOLVED`), one bounded `retry_unresolved`, and duplicate `register_case` rejection with unchanged authoritative readback. Every successful write was `FINALIZED` with semantic execution success and consensus acceptance; the duplicate replay was `FINALIZED` with `CASE_ALREADY_EXISTS` and verified unchanged state. Full hashes, arguments, readbacks, limitations, and Explorer links are in [PRE-DEPLOY-MANIFEST.md](PRE-DEPLOY-MANIFEST.md).

The contract is intentionally frozen. A post-deployment defect requires a replacement deployment; there is no public upgrade method.
