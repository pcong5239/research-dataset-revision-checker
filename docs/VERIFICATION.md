# Verification

This is the consolidated reviewer-facing verification record for the deployed contract and current frontend release candidate.

## Revision and deployment

- Current package HEAD: aeec7f7
- Evidence baseline package: 9c10927e1760aa84195cbafa5b87198eed3bcc11
- Contract source commit: 08d759023c807e783d2bbb42059e1cb20a3a025f
- Contract source SHA-256: ECE513F2132168517E178F737EEEFC951BE370B415508D2604A7C62585E7C7C7
- Network: Studionet, chain ID 61999
- Contract: https://explorer-studio.genlayer.com/address/0x3d5Ff07e8492d8a9eE8E333bdBCFb0B447447ea1
- Deployment transaction: https://explorer-studio.genlayer.com/tx/0x0b5a8f7183dd05b075eba9c7cdb5d0fdb05715a4085b3e5d0cd379f9902a675d
- Functional frontend baseline: 76ed133425336443af4155dceef87813c521ed6f
- Functional frontend release commit: b26d9dc
- Functional frontend correction scope: canonical wallet discovery/options/icons, duplicate-write prevention, and persisted transaction-hash reconciliation.
- Public repository: https://github.com/pcong5239/research-dataset-revision-checker
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

## Vercel E2E plan

The exact final Vercel release will be tested from a clean first-time judge perspective after the matching public deployment. The primary AI will keep one browser session and one release tab open for the complete run.

1. Load the release and confirm the initial state is disconnected, the public guide is readable, and no account request occurs on page load.
2. Choose Connect wallet and verify the picker requires an explicit choice, shows only detected supported wallet choices with their names and icons, and does not request accounts merely because the picker opened. Exercise cancellation and wallet rejection without a transaction.
3. Using the user's separate supported browser-wallet account, choose a wallet, confirm the supported network, register a fresh case with public URLs and expected metadata, and verify the visible progress sequence, transaction hash/copy action, Explorer link, finality, semantic success and REGISTERED readback.
4. Use the same case to verify Freeze, Assess, and the unresolved/retry path where the selected public sources are unavailable; verify each visible result from authoritative readback and do not submit an automatic duplicate.
5. Reload and confirm the page is disconnected and requires a fresh explicit wallet selection. Check account change, network change, disconnect, empty readback, validation errors, interrupted verification and the safe existing-transaction reconciliation action.
6. Sweep desktop/mobile layout, keyboard focus, dialog escape/cancel, reduced motion, accessible status/error announcements, public copy, links and absence of internal implementation wording. Record bounded request counts in docs/RPC-BUDGET.md.

Expected release result: every required case is PASS only after the final UI result, transaction lifecycle, and authoritative contract readback agree. No live MATCHING_REVISION claim is made.

## Local verification

- npm test -- --run: 30 tests passed.
- npm run build: Vite production build passed.
- genvm-lint check contracts/revision_checker.py: passed in the exact-source package.
- genvm-lint schema contracts/revision_checker.py --json: passed.
- genvm-lint typecheck contracts/revision_checker.py: passed.
- py -3.13 -m pytest -q -p no:cacheprovider: 13 tests passed.
- npm audit --omit=dev: 0 vulnerabilities in the reviewed package.
- Pre-push gate audit at PostDeployTest: PASS.

## Scope and limitations

The live matrix proves the unique registered, frozen, unresolved, bounded retry and duplicate-rejection paths. No live MATCHING_REVISION claim is made. The exact Direct Mode nested sandbox decoder limitation remains documented in PRE-DEPLOY-MANIFEST.md and was not used as Studionet proof. Frontend RPC measurements remain open until the matching Vercel release is deployed and tested.
