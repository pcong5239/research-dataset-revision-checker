# Verification

This is the consolidated reviewer-facing verification record for the exact final package, deployed contract, and configured Vercel release.

## Revision and deployment

- Reviewed package base HEAD before this documentation-only correction: bfa7ef949ebc881b84626c34b31e783f7be6e46e
- Documentation correction scope: `docs/VERIFICATION.md`, `docs/RPC-BUDGET.md` and ignored local governance pointer only; frontend source, contract source, configuration, deployment and Vercel E2E evidence are unchanged.
- Frontend source commit: 80f80ac5b6a06c2b3c694d8c663b955f5b42e134
- Contract source commit: 08d759023c807e783d2bbb42059e1cb20a3a025f
- Contract source SHA-256: ECE513F2132168517E178F737EEEFC951BE370B415508D2604A7C62585E7C7C7
- Network: Studionet, chain ID 61999
- Contract: https://explorer-studio.genlayer.com/address/0x3d5Ff07e8492d8a9eE8E333bdBCFb0B447447ea1
- Deployment transaction: https://explorer-studio.genlayer.com/tx/0x0b5a8f7183dd05b075eba9c7cdb5d0fdb05715a4085b3e5d0cd379f9902a675d
- Vercel deployment: dpl_25cHLvk5cBPpS5gaaNUYXXwCtF4z
- Vercel inspector: https://vercel.com/pcong/research-dataset-revision-checker/25cHLvk5cBPpS5gaaNUYXXwCtF4z
- Live app: https://research-dataset-revision-checker.vercel.app/
- Public repository: https://github.com/pcong5239/research-dataset-revision-checker
- Vercel Production configuration binds `VITE_CONTRACT_ADDRESS` to the exact deployed contract above; the bundle contains that address and uses the canonical Studionet Explorer.
- Final frontend scope covers detected-wallet selection, atomic connect/disconnect/account/network state, explicit transaction progress, bounded finality/readback, canonical Explorer links, duplicate-write prevention, and reload-safe reconciliation.
- Current public release is a frozen contract; a defect requires replacement deployment and has no public upgrade method.

## Live Studio proof matrix

| ID | Requirement / actor | Studio action | Transaction | Lifecycle / result | Authoritative readback |
|---|---|---|---|---|---|
| S0 | Empty initial index / deployer | get_case_ids before writes | — | Finalized read [] | No cases |
| S1 | Maintainer registers a case | register_case with case studio-e2e-unresolved-20260901-01 | 0xfce9894ad68cf2c6d12952e4df4fce188e95095634ede37c7fb7bfc990fc75a4 | FINALIZED, SUCCESS, accepted consensus | REGISTERED; owner matches the Studio account |
| S2 | Owner freezes references | freeze_case | 0xb96a2d12d803d3e3fdef0ba3f324af09879fb7e7223beae6a04b99ad0e4f97b5 | FINALIZED, SUCCESS, accepted consensus | FROZEN |
| S3 | Anyone assesses unavailable sources | assess | 0x7ce720dd76863326805eea905d82117117bd1b6f24616443bab2164957ad0864 | FINALIZED, SUCCESS; consensus output UNRESOLVED | ASSESSED, UNRESOLVED, retry_count=0 |
| S4 | Caller retries unresolved once | retry_unresolved | 0x3d20f4ec8cd42c61cc0f405ba4ebd6b082976b659cc2033df5eccb67c9014366 | FINALIZED, SUCCESS; consensus output UNRESOLVED | ASSESSED, UNRESOLVED, retry_count=1 |
| S5 | Duplicate replay is rejected | identical register_case replay | 0xc05a10a684381750293c45db0119acb0c7a3e8dddbe4a466de902fce777838d6 | FINALIZED, execution ERROR, accepted consensus with CASE_ALREADY_EXISTS | State unchanged; final index contains exactly one case |
| S6 | Final index / authoritative read | get_case_ids after replay | — | Finalized read | ["studio-e2e-unresolved-20260901-01"] |

## Vercel E2E evidence (exact final release)

The exact final Vercel deployment `dpl_25cHLvk5cBPpS5gaaNUYXXwCtF4z` was tested continuously in one Chrome tab from a clean load with the separate OKX Wallet account `0x5D598f10a428fB2039edbC3aCE83351650B286E0`. Final E2E case: `vercel-e2e-final-20260905-01`.

- Clean load and reload began `Disconnected`; no automatic account request or session restore occurred, and writes were disabled until explicit connection.
- The picker showed exactly one actually detected supported wallet, `OKX Wallet`, with no false MetaMask option. Picker opening made zero account requests; explicit selection connected the displayed account.
- Two wallet cancellations during assess recovery were observed as terminal rejection coverage; the UI reported that nothing was submitted and no hash or state change resulted.
- Four successful writes each retained its real hash, copy action, canonical Studionet Explorer link, finality status, semantic execution success and authoritative readback. The final readback was `ASSESSED`, `UNRESOLVED`, `retry_count=1`.
- Disconnect returned `Disconnected` and disabled writes. Reload again returned `Disconnected`; explicit picker selection/reconnect restored the wallet session and a saved-case readback.
- The public UI sweep found no implementation, provider, RPC, technical chain, routing, debug, test-state or internal reviewer wording. Desktop, responsive, keyboard, dialog, focus, and public-link checks passed.

| Operation | Transaction hash | Browser readback | Independent RPC evidence |
|---|---|---|---|
| Register case | `0x76b782bba4c46d9c50a9734aeb81953d02be50bff11f4c5512fe1282a063a311` | `REGISTERED`, `UNRESOLVED`, retry `0` | `FINALIZED`, `MAJORITY_AGREE`, successful validator execution, receipt `0x1` |
| Freeze case | `0xe68f6314e5ec8259e5313cc3963bbc9cb9e31dcaf8f198188c3fa64368c35416` | `FROZEN`, `UNRESOLVED`, retry `0` | `FINALIZED`, `MAJORITY_AGREE`, successful validator execution, receipt `0x1` |
| Assess case | `0x4c0dc3e6d9e962fb07362387e6581e778dd78df8b08b2619e066556eef9bd47e` | `ASSESSED`, `UNRESOLVED`, retry `0` | `FINALIZED`, `MAJORITY_AGREE`, successful validator execution, receipt `0x1` |
| Retry unresolved | `0xd5762d9e97fe85b60187200817dbf2a7c018a13fceca6f147d4819e224178174` | `ASSESSED`, `UNRESOLVED`, retry `1` | `FINALIZED`, `MAJORITY_AGREE`, successful validator execution, receipt `0x1` |

All transaction and contract links use `https://explorer-studio.genlayer.com`. No live `MATCHING_REVISION` claim is made.

## Local verification

- npm test -- --run: 50 tests passed across 7 files.
- npm run build: Vite production build passed.
- genvm-lint check contracts/revision_checker.py: passed in the exact-source package.
- genvm-lint schema contracts/revision_checker.py --json: passed.
- genvm-lint typecheck contracts/revision_checker.py: passed.
- py -3.13 -m pytest -q -p no:cacheprovider: 13 tests passed.
- npm audit --omit=dev: 0 vulnerabilities in the reviewed package.
- Final governance audit: PASS.
- Post-push GitHub review: PASS for the public repository, default `main`, exact source/deployment links and the documentation-correction candidate; the candidate HEAD is supplied in the accompanying anonymous re-review receipt.

## Scope and limitations

The live matrix proves the unique registered, frozen, unresolved, bounded retry and duplicate-rejection paths. No live MATCHING_REVISION claim is made. The exact Direct Mode nested sandbox decoder limitation remains documented in PRE-DEPLOY-MANIFEST.md and was not used as Studionet proof. Frontend RPC evidence is complete for the exact configured Vercel release and is measured in docs/RPC-BUDGET.md. The frontend source commit is `80f80ac5b6a06c2b3c694d8c663b955f5b42e134`; the reviewed package base is `bfa7ef949ebc881b84626c34b31e783f7be6e46e`, and the current candidate is its documentation-only descendant.
