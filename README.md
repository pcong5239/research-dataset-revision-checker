# Research Dataset Revision Checker

Verified Studionet contract: https://explorer-studio.genlayer.com/address/0x3d5Ff07e8492d8a9eE8E333bdBCFb0B447447ea1

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

## Why this matters

Dataset landing pages and repositories can drift apart. A reviewer who trusts only a self-entered version, commit or license claim cannot independently tell whether the published description matches the canonical source. This project binds the references and expectations before assessment so the evidence scope cannot be quietly changed during review.

GenLayer is essential because the contract needs validators to fetch and compare two public sources. Consensus over the normalized version, commit and license fields determines the recorded outcome; the frontend never invents that result and the optional paper cannot override it.

## How it works

1. A maintainer connects a supported wallet, enters a dataset ID, landing page URL, canonical repository URL, expected version and expected license, then chooses Register case.
2. The maintainer chooses Freeze to lock the references and expectations.
3. Anyone can enter the dataset ID and choose Assess. The contract fetches both required sources inside the validator rule and records a conclusive outcome or UNRESOLVED when transport evidence is insufficient.
4. An unresolved case can be retried up to three times with Retry unresolved. View saved case details reads the authoritative contract state. The page reports completion only after finality, execution success and readback agree.

## Trust boundaries and architecture

- The Intelligent Contract owns the frozen case inputs, validator comparison and authoritative state transition.
- The frontend is a user-facing wallet and transaction client. It collects inputs, submits explicit calls and displays authoritative readback; it does not decide outcomes.
- Public web sources provide bounded evidence only during assessment. Raw source bodies are not stored in contract state.
- There is no backend or linked contract. The contract is the source of truth; browser state and cache are convenience layers only.

## Transaction lifecycle

Every write asks the selected wallet for confirmation, keeps the returned transaction reference visible, waits for finality, checks semantic execution, and then performs an operation-specific contract readback. The interface shows understandable progress while waiting, a cancellation message when the wallet rejects the request, and a reconciliation action when an existing transaction needs checking. It never submits a second transaction automatically. A successful message appears only after the expected state is present on-chain.

## Security and recovery

Wallet selection is explicit and limited to detected MetaMask, OKX Wallet and Rabby options. Account, network and disconnect changes clear or pause the active write session. The contract enforces ownership for registration/freeze actions; UI checks are not treated as authorization. No private key, seed phrase, credential or token is stored in this repository.

If the Studio account or Studionet state is lost, or a deployed defect is found, use the recorded source and constructor manifest to deploy a replacement and rerun the live matrix. The old address must not be assumed recoverable.

## Known limitations

- The current live Studio evidence proves registration, freezing, an unavailable-source UNRESOLVED assessment, one bounded retry and duplicate-registration rejection. It does not claim a live MATCHING_REVISION path.
- The local Direct Mode package records an exact-runtime nested sandbox decoder limitation; Studionet consensus and authoritative readbacks are the live evidence for deployment acceptance.
- This project uses the compatibility finality method exposed by the installed genlayer-js 1.1.8; the exact installed runtime and current official guidance are recorded in the evidence documents.

See PRE-DEPLOY-MANIFEST.md, docs/RPC-BUDGET.md and RECOVERY-RUNBOOK.md for reproducible details.
