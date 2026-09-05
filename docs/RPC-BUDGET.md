# RPC Budget

RPC_BUDGET_REVISION: 80f80ac5b6a06c2b3c694d8c663b955f5b42e134
RPC_BUDGET_REVISION_ROLE: FRONTEND_SOURCE_COMMIT
PACKAGE_BASE_HEAD: 0bbdbefdd63874ce23fd85ddcf30ef65751c46b1
PACKAGE_HEAD: 1bc1a9eae648f786d8b5094d1af7660c3483d5bb
PACKAGE_HEAD_NOTE: current pushed candidate; source, contract, configuration, deployment and Vercel evidence are unchanged from the package base
OFFICIAL_DOCS_CHECKED: GenLayerJS package `1.1.8` README and installed types checked 2026-09-05; current GenLayer transaction guidance is recorded in `E:\Genlayer\brain\Engineering and UI Quality Rules.md` and the compatibility form `waitForTransactionReceipt` is used because the installed package exposes that API.
STUDIO_SCOPE: APPLICABLE
FRONTEND_SCOPE: APPLICABLE
VERCEL_DEPLOYMENT_ID: dpl_25cHLvk5cBPpS5gaaNUYXXwCtF4z
VERCEL_ALIAS: https://research-dataset-revision-checker.vercel.app
VERCEL_INSPECTOR: https://vercel.com/pcong/research-dataset-revision-checker/25cHLvk5cBPpS5gaaNUYXXwCtF4z
FRONTEND_E2E_CASE: vercel-e2e-final-20260905-01
FRONTEND_E2E_ACCOUNT: 0x5D598f10a428fB2039edbC3aCE83351650B286E0

## STUDIO RPC MEASUREMENT CAPABILITY PROBE

STUDIO_CAPABILITY_PROBE_STATUS: COMPLETE
STUDIO_MEASUREMENT_MODE: OBSERVABLE_ACTION_LEDGER
STUDIO_MEASUREMENT_TIMING: RETROSPECTIVE_LEGACY
STUDIO_CAPABILITY_PROBE_AT: 2026-09-05T23:35:14+07:00
STUDIO_FIRST_ACTION_AT: NOT_RECOVERABLE_RETROSPECTIVE
STUDIO_E2E_STARTED_AT: NOT_RECOVERABLE_RETROSPECTIVE
STUDIO_CAPABILITY_TOOL_OR_API: retained Studio terminal views and the deployment/evidence manifest
STUDIO_CAPABILITY_CHECK: inspected retained Studio deployment, transaction, terminal-receipt and authoritative-readback evidence; no request-level telemetry was exposed
STUDIO_CAPABILITY_RESULT: physical network requests are not exposed; primary-AI Studio actions and outcomes are observable
STUDIO_PHYSICAL_COUNT_SOURCE: NOT_APPLICABLE
STUDIO_PHYSICAL_COUNT_CLAIM: NONE
STUDIO_REPLAY_FOR_MEASUREMENT: NO

## STUDIO RPC ACTION LEDGER

STUDIO_ACTION_LEDGER_STATUS: COMPLETE
STUDIO_PHYSICAL_REQUESTS: NOT_APPLICABLE
STUDIO_ACTIONS: 8
STUDIO_TRANSACTIONS: 6
STUDIO_TRANSACTION_HASHES: [0x0b5a8f7183dd05b075eba9c7cdb5d0fdb05715a4085b3e5d0cd379f9902a675d, 0xfce9894ad68cf2c6d12952e4df4fce188e95095634ede37c7fb7bfc990fc75a4, 0xb96a2d12d803d3e3fdef0ba3f324af09879fb7e7223beae6a04b99ad0e4f97b5, 0x7ce720dd76863326805eea905d82117117bd1b6f24616443bab2164957ad0864, 0x3d20f4ec8cd42c61cc0f405ba4ebd6b082976b659cc2033df5eccb67c9014366, 0xc05a10a684381750293c45db0119acb0c7a3e8dddbe4a466de902fce777838d6]
STUDIO_STATUS_POLL_ATTEMPTS: 0
STUDIO_TERMINAL_RECEIPT_READS: 6
STUDIO_AUTHORITATIVE_READBACKS: 7
STUDIO_RETRIES: 0
STUDIO_DUPLICATE_TRANSACTIONS: 1
STUDIO_MATRIX_VARIANCE: retrospective legacy ledger; exact historical status-poll telemetry is not recoverable; zero status-poll attempts means no separately retained primary-AI poll attempt, not zero physical requests; one duplicate register replay was intentional evidence, not an accidental resubmission; no deployment or write was replayed for measurement

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

Studio evidence is complete for the unique deployed paths above: 6 transaction submissions (deployment, four successful state transitions, and the expected-error replay), accepted consensus/finality, terminal lifecycle results, and authoritative readbacks are recorded in the manifest. No rate-limit retry or duplicate deployment occurred.

## FRONTEND RPC BUDGET MATRIX

FRONTEND_MATRIX_STATUS: COMPLETE
MULTI_CLIENT_JUSTIFICATION: One shared `readClient` is used for reads, finality and balance checks; the write client is recreated only for the selected account/network because writes require the active wallet session.

| Screen/workflow | Request source | RPC method | Trigger | Cache key / TTL | In-flight dedupe | Invalidation | Poll interval / attempts | Retry/backoff/cancel | Planned maximum | Transaction count | Terminal/readback condition |
|---|---|---|---|---|---|---|---|---|---:|---:|---|
| Initial app | shared read client | none | page load | none | n/a | n/a | none | n/a | 0 | 0 | disconnected; no automatic account request |
| Wallet selector | page discovery registry | `eip6963:requestProvider` event; no account RPC | explicit Connect wallet | none | late announcements update the open snapshot | discovery snapshot only | none | none | 0 account requests | 0 | exactly one live `OKX Wallet` option in this browser; no false MetaMask tile |
| Wallet connection | selected wallet provider | `eth_requestAccounts`, `wallet_switchEthereumChain`, `eth_accounts` | explicit OKX Wallet selection | no cache for identity | no duplicate selection flow | clear on account/network/disconnect/reload | none | one explicit user retry | 3 normal-path provider requests; unknown-chain add path max 5 | 0 | selected account and supported network |
| Write preflight | selected provider + shared read client | `eth_chainId`, `eth_getBalance` | one explicit write button | no cache for balance/chain | single-flight UI state | invalidate on write/account/network/disconnect | none | no retry | 2 per write; 8 across 4 writes | 0 | selected provider, Studionet and funded account verified |
| SDK submission | installed `genlayer-js@1.1.8` | `eth_getTransactionCount`, `eth_estimateGas`, `eth_gasPrice`, `eth_sendTransaction` | one explicit write button | no cache | one submission per action | n/a | none | no automatic resubmission | 4 per write; 16 across 4 writes | 1 per write | wallet returns one hash |
| Finality and semantic verification | shared read client | `waitForTransactionReceipt` → one `eth_getTransactionByHash` per poll | returned hash | no transaction cache | 3s, max 50 attempts | bounded SDK surface; no resubmission | invalidate after terminal write | one retained hash | 1 app-level wait per write; raw poll count is bounded by 50 and not exposed by installed SDK | 0 | `FINALIZED`, semantic success and consensus checked |
| Authoritative readback | shared read client | `gen_call` (`get_case`) | post-write reconciliation or explicit View saved case details | `chain:contract:method:args`, 5s safe TTL | identical in-flight reads coalesce | invalidate after every write | none | user-triggered retry only | 6 observed app-level readbacks: 1 configuration preflight + 4 post-write + 1 post-reconnect lookup | 0 | expected case state/outcome/retry count |

## FRONTEND RPC BUDGET EVIDENCE

FRONTEND_EVIDENCE_STATUS: COMPLETE
FRONTEND_E2E_STATUS: PASS

The exact configured Vercel deployment was tested continuously in Chrome with the separate OKX Wallet account above. The browser journey recorded: clean load and reload with zero contract reads and zero automatic account requests; two picker openings with zero account requests before explicit selection; two successful explicit provider selections; two observed wallet cancellations during assess recovery with no submission; four unique state-changing writes; one wallet confirmation for each successful write; four retained transaction hashes; four terminal `FINALIZED`/semantic-success/readback outcomes; one configuration readback before the journey; one post-reconnect saved-case readback; Disconnect; reload to disconnected; and fresh picker selection/reconnect. No duplicate write or automatic resubmission occurred. The deployment includes the Production `VITE_CONTRACT_ADDRESS` binding for the exact deployed contract, and the exact bundle/configuration readback was verified before the journey. The installed SDK owns the per-attempt `eth_getTransactionByHash` loop and exposes no public per-attempt counter; the exact interval/max-attempt contract and terminal condition are recorded above rather than inventing a timestamp-derived count.

| Screen/workflow | Request source/method | Actual requests | Cache hit/miss | In-flight dedupe | Poll attempts | Retry/delay | Invalidations | Readback calls | Actual transactions | Variance/result |
|---|---|---:|---|---|---:|---|---:|---:|---:|---|
| Exact configured Vercel release: clean load, picker, reconnect, register, freeze, assess, retry, readback, disconnect, reload/reconnect | Chrome UI + selected OKX provider + shared `genlayer-js@1.1.8` client | 2 successful provider selections; 2 preflight calls + 4 SDK submission calls + 1 `gen_call` readback per write; 1 `eth_getTransactionByHash` per bounded 3s poll | no cache for identity, balance or transaction; safe case-read cache invalidated after writes | single-flight write and coalesced case reads | 3s, max 50; terminal polling stopped before readback | 0 transaction retries/resubmissions; 2 wallet-cancelled attempts had no submission | 4 write invalidations; 2 explicit lookups | 6 `get_case` calls at app boundary | 4 (`register_case`, `freeze_case`, `assess`, `retry_unresolved`) | PASS; all four hashes independently checked as `FINALIZED`, `MAJORITY_AGREE`, successful validator execution, EVM `0x1`; readbacks `REGISTERED`, `FROZEN`, `ASSESSED`, `ASSESSED` with retry `1` |
| Local functional regression | Vitest provider/progress/recovery fixtures | measured test calls only | n/a | covered | n/a | rejection and reconciliation covered | covered by source assertions | covered by postcondition tests | 0 | PASS; 50/50 tests |

### Exact Vercel write evidence

| Operation | Transaction hash | Browser terminal/readback | Independent RPC terminal evidence |
|---|---|---|---|
| Register case | `0x76b782bba4c46d9c50a9734aeb81953d02be50bff11f4c5512fe1282a063a311` | `REGISTERED`, `UNRESOLVED`, retry `0` | `FINALIZED`, `MAJORITY_AGREE`, successful validator execution, EVM receipt `0x1` |
| Freeze case | `0xe68f6314e5ec8259e5313cc3963bbc9cb9e31dcaf8f198188c3fa64368c35416` | `FROZEN`, `UNRESOLVED`, retry `0` | `FINALIZED`, `MAJORITY_AGREE`, successful validator execution, EVM receipt `0x1` |
| Assess case | `0x4c0dc3e6d9e962fb07362387e6581e778dd78df8b08b2619e066556eef9bd47e` | `ASSESSED`, `UNRESOLVED`, retry `0` | `FINALIZED`, `MAJORITY_AGREE`, successful validator execution, EVM receipt `0x1` |
| Retry unresolved | `0xd5762d9e97fe85b60187200817dbf2a7c018a13fceca6f147d4819e224178174` | `ASSESSED`, `UNRESOLVED`, retry `1` | `FINALIZED`, `MAJORITY_AGREE`, successful validator execution, EVM receipt `0x1` |

All four transaction and contract links use `https://explorer-studio.genlayer.com` and resolved successfully during the exact configured release preflight/E2E checks. The two cancelled assess attempts are recorded as rejection coverage with no transaction hash and no state change.

## Closure

- One shared read client/configuration; write client exists only for the selected wallet session.
- One canonical wallet-session store atomically owns provider, account, chain validity and write-client eligibility; disconnect or invalid account/network state disables writes without an RPC retry.
- Cache keys include chain, contract, method and normalized arguments; writes invalidate the affected case.
- Finality polling is bounded at 3-second intervals and 50 attempts; reconciliation retains one transaction hash and never resubmits automatically.
- `429`/transport retry remains bounded by the installed SDK wait surface; no custom retry storm is introduced.
- Mandatory finality, semantic execution and authoritative readback remain intact.
