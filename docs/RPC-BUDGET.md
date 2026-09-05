# RPC Budget

RPC_BUDGET_REVISION: 68f55afc1d12640710fa44029fabb2df24f745d2
OFFICIAL_DOCS_CHECKED: GenLayerJS package `1.1.8` README and installed types checked 2026-09-05; current GenLayer transaction guidance is recorded in `E:\Genlayer\brain\Engineering and UI Quality Rules.md` and the compatibility form `waitForTransactionReceipt` is used because the installed package exposes that API.
STUDIO_SCOPE: APPLICABLE
FRONTEND_SCOPE: APPLICABLE
VERCEL_DEPLOYMENT_ID: dpl_Hb7Ussy8DBd4zRvFGUf9sq3nGSeS
VERCEL_ALIAS: https://research-dataset-revision-checker.vercel.app
FRONTEND_E2E_CASE: vercel-e2e-repaired-20260905-01
FRONTEND_E2E_ACCOUNT: 0x5D598f10a428fB2039edbC3aCE83351650B286E0

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
| Wallet selector | page discovery registry | `eip6963:requestProvider` event; no account RPC | explicit Connect wallet | none | late announcements update the open snapshot | discovery snapshot only | none | none | 0 account requests | 0 | exactly one live `OKX Wallet` option in this browser; no false MetaMask tile |
| Wallet connection | selected wallet provider | `eth_requestAccounts`, `wallet_switchEthereumChain`, `eth_accounts` | explicit OKX Wallet selection | no cache for identity | no duplicate selection flow | clear on account/network/disconnect/reload | none | one explicit user retry | 3 normal-path provider requests; unknown-chain add path max 5 | 0 | selected account and supported network |
| Write preflight | selected provider + shared read client | `eth_chainId`, `eth_getBalance` | one explicit write button | no cache for balance/chain | single-flight UI state | invalidate on write/account/network/disconnect | none | no retry | 2 per write; 8 across 4 writes | 0 | selected provider, Studionet and funded account verified |
| SDK submission | installed `genlayer-js@1.1.8` | `eth_getTransactionCount`, `eth_estimateGas`, `eth_gasPrice`, `eth_sendTransaction` | one explicit write button | no cache | one submission per action | n/a | none | no automatic resubmission | 4 per write; 16 across 4 writes | 1 per write | wallet returns one hash |
| Finality and semantic verification | shared read client | `waitForTransactionReceipt` → one `eth_getTransactionByHash` per poll | returned hash | no transaction cache | 3s, max 50 attempts | bounded SDK surface; no resubmission | invalidate after terminal write | one retained hash | 1 app-level wait per write; raw poll count is bounded by 50 and not exposed by installed SDK | 0 | `FINALIZED`, semantic success and consensus checked |
| Authoritative readback | shared read client | `gen_call` (`get_case`) | post-write reconciliation or explicit View saved case details | `chain:contract:method:args`, 5s safe TTL | identical in-flight reads coalesce | invalidate after every write | none | user-triggered retry only | 5 observed app-level readbacks: 4 post-write + 1 explicit lookup | 0 | expected case state/outcome/retry count |

## FRONTEND RPC BUDGET EVIDENCE

FRONTEND_EVIDENCE_STATUS: COMPLETE
FRONTEND_E2E_STATUS: PASS

The exact repaired Vercel deployment was tested continuously in Chrome with the separate OKX Wallet account above. The browser journey recorded: clean load and reload with zero contract reads and zero automatic account requests; two picker openings with zero account requests; one explicit provider selection; four unique state-changing writes; one wallet confirmation for each write; four retained transaction hashes; four terminal `FINALIZED`/semantic-success/readback outcomes; one explicit saved-case lookup; Disconnect; reload to disconnected; and fresh picker selection/reconnect. No duplicate write or automatic resubmission occurred. The installed SDK owns the per-attempt `eth_getTransactionByHash` loop and exposes no public per-attempt counter; the exact interval/max-attempt contract and terminal condition are recorded above rather than inventing a timestamp-derived count.

| Screen/workflow | Request source/method | Actual requests | Cache hit/miss | In-flight dedupe | Poll attempts | Retry/delay | Invalidations | Readback calls | Actual transactions | Variance/result |
|---|---|---:|---|---|---:|---|---:|---:|---:|---|
| Exact Vercel release: clean load, picker, reconnect, register, freeze, assess, retry, readback, disconnect, reload/reconnect | Chrome UI + selected OKX provider + shared `genlayer-js@1.1.8` client | 3 provider selection calls; 2 preflight calls + 4 SDK submission calls + 1 `gen_call` readback per write; 1 `eth_getTransactionByHash` per bounded 3s poll | no cache for identity, balance or transaction; safe case-read cache invalidated after writes | single-flight write and coalesced case reads | 3s, max 50; terminal polling stopped before readback | 0 retries/resubmissions | 4 write invalidations; 1 explicit lookup | 5 `get_case` calls at app boundary | 4 (`register_case`, `freeze_case`, `assess`, `retry_unresolved`) | PASS; all four hashes independently checked as `FINALIZED`, `MAJORITY_AGREE`, leader `SUCCESS`, EVM `0x1`; readbacks `REGISTERED`, `FROZEN`, `ASSESSED`, `ASSESSED` with retry `1` |
| Local functional regression | Vitest provider/progress/recovery fixtures | measured test calls only | n/a | covered | n/a | rejection and reconciliation covered | covered by source assertions | covered by postcondition tests | 0 | PASS; 50/50 tests |

### Exact Vercel write evidence

| Operation | Transaction hash | Browser terminal/readback | Independent RPC terminal evidence |
|---|---|---|---|
| Register case | `0x19641cde6529cd3781374c0f0b37437e059bb0a7a2a5023791cdabb06e42d794` | `REGISTERED`, `UNRESOLVED`, retry `0` | `FINALIZED`, `MAJORITY_AGREE`, leader `SUCCESS`, EVM receipt `0x1` |
| Freeze case | `0xc61fab10c500a2c108ea99d7cd81e66c936a427b8861aae7049913b869ecf074` | `FROZEN`, `UNRESOLVED`, retry `0` | `FINALIZED`, `MAJORITY_AGREE`, leader `SUCCESS`, EVM receipt `0x1` |
| Assess case | `0xcf27a0a3f117cfd8f1b65afa0c639a91acbac4b3fbd96e7a2e4265aeaa8c607e` | `ASSESSED`, `UNRESOLVED`, retry `0` | `FINALIZED`, `MAJORITY_AGREE`, leader `SUCCESS`, EVM receipt `0x1` |
| Retry unresolved | `0xd0221b1c6c4a48147b42920ccd581b86680a3eed69e4f34b7c9ccd58b6a14026` | `ASSESSED`, `UNRESOLVED`, retry `1` | `FINALIZED`, `MAJORITY_AGREE`, leader `SUCCESS`, EVM receipt `0x1` |

All four transaction and contract links use `https://explorer-studio.genlayer.com` and resolved successfully during the release preflight/E2E checks.

## Closure

- One shared read client/configuration; write client exists only for the selected wallet session.
- One canonical wallet-session store atomically owns provider, account, chain validity and write-client eligibility; disconnect or invalid account/network state disables writes without an RPC retry.
- Cache keys include chain, contract, method and normalized arguments; writes invalidate the affected case.
- Finality polling is bounded at 3-second intervals and 50 attempts; reconciliation retains one transaction hash and never resubmits automatically.
- `429`/transport retry remains bounded by the installed SDK wait surface; no custom retry storm is introduced.
- Mandatory finality, semantic execution and authoritative readback remain intact.
