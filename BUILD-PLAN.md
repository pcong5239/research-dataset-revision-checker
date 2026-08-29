# Research Dataset Revision Checker — build baseline

## Locked baseline

- Category: `PROJECT` with one Intelligent Contract and a public frontend.
- Trust problem: a landing page, canonical repository, and optional paper can point to different dataset revisions.
- Mandatory sources: landing page and canonical repository. Paper is disclosure-only and never changes the primary outcome.
- Exact research baseline files:
  - `STAGE-1.md`: `C099018D1B3F064932CFD22F900B40880841C2399FF8A9757593D5881EAF4733`
  - `STAGE-2.md`: `2D6DE5C6BF6AE2882D002E03E2303AD8D40BEA69632EDC545DBF73B216D0B237`
- The supplied handoff states that independent research and anonymous research review approved this exact baseline. No separate approval artifact was present in the project folder at intake.

## Minimum implementation adaptation

Original choice: persist `TreeMap[str, DatasetCase]` with extracted evidence and compute the result from two public references.

Verified risk: current storage rules require fully specialized persistent types and `@allow_storage` for stored dataclasses; current nondeterminism rules require web access inside an equivalence-principle block and deterministic state writes after consensus. Raw web bodies are also an unnecessary and unsafe storage surface.

Replacement: one storage-safe `DatasetCase` dataclass with bounded canonical fields, a single `TreeMap[str, DatasetCase]`, and a strict-equality result containing only normalized outcome-authorizing fields. Canonical JSON and SHA-256 digests are computed after consensus; raw source bodies are never stored.

Preserved outcomes: registration, freeze, assessment, retryable unresolved state, `MATCHING_REVISION`, `REVISION_MISMATCH`, `LICENSE_MISMATCH`, `METADATA_MISSING`, and `UNRESOLVED`, plus authoritative read views.

Affected proof: canonicalization, source relationship, transport-failure, malformed-input, missing-field, mismatch, duplicate-write, storage-schema, and readback tests; exact source hash and runtime schema probe before `PRE_DEPLOY`.

Residual risk: public web pages and repository APIs can change or rate-limit between validators. Consensus therefore fails closed unless both required sources produce the same bounded, normalized authorizing fields.

## Experience applied

- Evidence-unavailability taxonomy: `0`, `429`, and `5xx` remain `UNRESOLVED`; they cannot become a substantive negative outcome. Regression covers transport statuses and recovery.
- Consensus-field discipline: strict equality covers normalized outcome-authorizing fields only; validator-local/body digests are not consensus identity.
- Protocol-schema parity: this file will be checked against the deployed method/read schema before each checkpoint.
- GenVM source envelope: contract begins with `# v0.1.0` before the dependency manifest; any change requires a new source hash and fresh review.
- Frontend receipt/readback and RPC-budget entries applied: one shared read client, in-flight/cache dedupe for safe case reads, bounded SDK finality wait, exact selected-provider writes, hash retention/copy action, and authoritative post-write readback. No runtime secrets or wallet keys are persisted.

## Official technical references checked on 2026-08-30

- https://docs.genlayer.com/developers/intelligent-contracts/features/non-determinism
- https://docs.genlayer.com/developers/intelligent-contracts/storage
- https://docs.genlayer.com/developers/intelligent-contracts/types/dataclasses
- https://docs.genlayer.com/developers/intelligent-contracts/tooling-setup
- https://docs.genlayer.com/api-references/genlayer-js/contracts
- https://docs.genlayer.com/understand-genlayer-protocol/core-concepts/transactions/transaction-execution
