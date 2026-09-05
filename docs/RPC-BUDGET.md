# RPC Budget

RPC_BUDGET_REVISION: 9c10927e1760aa84195cbafa5b87198eed3bcc11
OFFICIAL_DOCS_CHECKED: GenLayerJS package `1.1.8` README and installed types checked 2026-09-05; current GenLayer transaction guidance is recorded in `E:\Genlayer\brain\Engineering and UI Quality Rules.md` and the compatibility form `waitForTransactionReceipt` is used because the installed package exposes that API.
STUDIO_SCOPE: APPLICABLE
FRONTEND_SCOPE: APPLICABLE

## STUDIO RPC BUDGET MATRIX

STUDIO_MATRIX_STATUS: COMPLETE

The exact Studio operations and measured hashes/readbacks are recorded in `PRE-DEPLOY-MANIFEST.md`. No duplicate deployment or proof transaction was made for this artifact.

| Operation/case | RPC method or Studio action | Trigger | Planned maximum | Poll interval / attempts | Retry/cooldown | Terminal condition | Transaction count | Evidence |
|---|---|---|---:|---|---|---|---:|---|
| Deploy exact source | Studio Deploy | once after PRE_DEPLOY | 1 | Studio terminal receipt | 0 | FINALIZED + SUCCESS + accepted consensus | 1 | `0x0b5a8f7183dd05b075eba9c7cdb5d0fdb05715a4085b3e5d0cd379f9902a675d` |
| Initial index | `get_case_ids` | pre-write read | 1 | none | 0 | finalized `[]` | 0 | manifest |
| Register case | `register_case` | one unique state transition | 1 | Studio terminal receipt | 0 | FINALIZED + SUCCESS + REGISTERED readback | 1 | `0xfce9894ad68cf2c6d12952e4df4fce188e95095634ede37c7fb7bfc990fc75a4` |
| Freeze case | `freeze_case` | one unique state transition | 1 | Studio terminal receipt | 0 | FINALIZED + SUCCESS + FROZEN readback | 1 | `0xb96a2d12d803d3e3fdef0ba3f324af09879fb7e7223beae6a04b99ad0e4f97b5` |
| Assess unavailable source | `assess` | unique UNRESOLVED path | 1 | Studio terminal receipt | 0 | FINALIZED + SUCCESS + ASSESSED/UNRESOLVED readback | 1 | `0x7ce720dd76863326805eea905d82117117bd1b6f24616443bab2164957ad0864` |
| Retry unresolved | `retry_unresolved` | one bounded retry | 1 | Studio terminal receipt | 0 | FINALIZED + SUCCESS + retry_count=1 | 1 | `0x3d20f4ec8cd42c61cc0f405ba4ebd6b082976b659cc2033df5eccb67c9014366` |
| Duplicate replay | duplicate `register_case` | one rejection boundary | 1 | Studio terminal receipt | 0 | FINALIZED + ERROR `CASE_ALREADY_EXISTS` + unchanged readback | 1 | `0xc05a10a684381750293c45db0119acb0c7a3e8dddbe4a466de902fce777838d6` |
| Final index | `get_case_ids` | post-replay authoritative read | 1 | none | 0 | finalized list contains exactly one case | 0 | manifest |

## STUDIO RPC BUDGET EVIDENCE

STUDIO_EVIDENCE_STATUS: COMPLETE

Studio evidence is complete for the unique deployed paths above: 7 write transactions (including deployment and the expected-error replay), accepted consensus/finality, terminal lifecycle results, and authoritative readbacks are recorded in the manifest. No rate-limit retry or duplicate deployment occurred.

## FRONTEND RPC BUDGET MATRIX

FRONTEND_MATRIX_STATUS: COMPLETE
MULTI_CLIENT_JUSTIFICATION: One shared `readClient` is used for reads, finality and balance checks; the write client is recreated only for the selected account/network because writes require the active wallet session.

| Screen/workflow | Request source | RPC method | Trigger | Cache key / TTL | In-flight dedupe | Invalidation | Poll interval / attempts | Retry/backoff/cancel | Planned maximum | Transaction count | Terminal/readback condition |
|---|---|---|---|---|---|---|---|---|---:|---:|---|
| Initial app | shared read client | none | page load | none | n/a | n/a | none | n/a | 0 | 0 | disconnected; no automatic account request |
| Wallet connection | selected wallet provider | `eth_requestAccounts`, chain switch, balance read | explicit wallet choice | no cache for identity/balance | no duplicate selection flow | clear on account/network/disconnect | none | one explicit user retry | 4 provider calls + 1 balance read | 0 | selected account and supported network |
| Case details | shared read client | `get_case` | View saved case details and post-write reconciliation | `chain:contract:method:args`, 5s safe TTL | identical in-flight reads coalesce | invalidate after every write | none | user-triggered retry only | 1 | 0 | authoritative case readback |
| Register/freeze/assess/retry | selected write client + shared read client | `writeContract`, bounded finality wait, `get_case` | one explicit button press | no transaction cache | write action is single-flight by UI state | invalidate case after terminal write | 3s, max 50 SDK attempts | no automatic resubmission; reconciliation reuses one hash | 1 write + 1 finality wait + 1 readback | 1 | FINALIZED, semantic success, expected readback |

## FRONTEND RPC BUDGET EVIDENCE

FRONTEND_EVIDENCE_STATUS: INCOMPLETE

This matrix is implementation-complete for the first public push. Exact final-release measurements will be appended after the matching Vercel deployment and primary-AI browser E2E; the release audit must not be marked complete until this status becomes `COMPLETE`.

| Screen/workflow | Request source/method | Actual requests | Cache hit/miss | In-flight dedupe | Poll attempts | Retry/delay | Invalidations | Readback calls | Actual transactions | Variance/result |
|---|---|---:|---|---|---:|---|---:|---:|---:|---|
| Local functional regression | Vitest provider/progress fixtures | measured test calls only | n/a | covered | n/a | rejection and reconciliation covered | covered by source assertions | covered by postcondition tests | 0 | PASS; exact release browser measurement pending |

## Closure

- One shared read client/configuration; write client exists only for the selected wallet session.
- Cache keys include chain, contract, method and normalized arguments; writes invalidate the affected case.
- Finality polling is bounded at 3-second intervals and 50 attempts; reconciliation retains one transaction hash and never resubmits automatically.
- `429`/transport retry remains bounded by the installed SDK wait surface; no custom retry storm is introduced.
- Mandatory finality, semantic execution and authoritative readback remain intact.
