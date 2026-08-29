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
