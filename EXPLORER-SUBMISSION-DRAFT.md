# GENLAYER PROJECT EXPLORER — SUBMISSION DRAFT
**Project:** Research Dataset Revision Checker · **Prepared:** 2026-09-06 · **Status: DO NOT SUBMIT YET**

## ⛔ BLOCKERS BEFORE SUBMIT
| # | Blocker | Owner | Status |
|---|---|---|---|
| 1 | Anonymous `EXPLORER_PRE_SUBMISSION` review and same-package `DUAL_APPROVED` | AI chính / existing reviewer route | Pending |

## PUBLIC-JOURNEY EVIDENCE (internal; không copy vào form)
- Normal starting state: a fresh load starts disconnected; write controls remain unavailable until the user explicitly selects an available wallet.
- Cách người dùng mới tự tạo hoặc nhận từng dynamic value: after connecting, the user creates a new public GitHub repository, makes an initial commit, adds two JSON files in a later commit, copies their Raw HTTPS URLs, and enters a fresh dataset ID plus the values in those files; the app then returns the case lifecycle and transaction links.
- Public/reproducible input source: the user-created landing and repository JSON objects both contain the same fresh `dataset_id`, `version`, `license_id`, `release_ref`, and `commit_id`; the landing object also contains the exact public repository URL, while the repository object contains its matching owner and name.
- Duplicate/already-used handling: a duplicate dataset ID is rejected without changing the existing case; the public journey uses a new ID created by the user.
- Interruption/resumption handling: the user can reload the saved case details and retry only when the displayed outcome is `UNRESOLVED`; the retry count is read back from the contract.
- Evidence rằng không phụ thuộc fixed ID/account/record/seed hoặc đặc quyền của Task: the final Vercel journey used a newly entered case, explicit wallet selection, public inputs, and dynamic transaction results; no fixed test ID, account, transaction hash, or seed appears in the public path.

---

## Logo requirement
- Submission asset: `frontend/public/brand-mark-1024.png` (PNG, 1024 × 1024 px, opaque background, no text, under 2 MB).
- Alternate inspected asset: `frontend/public/brand-mark-512.png` (PNG, 512 × 512 px, opaque background, no text, under 2 MB).
- Visual QA: each asset contains one high-contrast shield mark that remains legible at the required minimum size.

## Project Name
Research Dataset Revision Checker

## Primary Tag
AI & Agents

### PRIMARY TAG DECISION RECORD
- `DeFi`: rejected; the contract has no financial asset, lending, liquidity, or settlement mechanism.
- `AI & Agents`: selected; validator execution independently fetches bounded public sources through `gl.nondet.web.get`, compares them with `gl.eq_principle.strict_eq`, and persists a consensus-authorized assessment outcome.
- `Prediction Markets`: rejected; there is no market, wager, odds, or prediction settlement.
- `Dispute Resolution`: rejected; the workflow verifies provenance and does not adjudicate competing parties or appeals.
- `Governance`: rejected; there is no voting, delegation, proposal, or policy decision.
- `Gaming`: rejected; there is no game or player progression mechanic.
- `Marketplaces`: rejected; the contract does not match buyers and sellers or exchange goods.
- `Social`: rejected; there is no social graph, posting, or community interaction.
- `Identity/Reputation`: rejected; the contract does not establish identity or calculate reputation.
- `Developer Tools`: considered adjacent, but rejected as the primary category because the public product is a validator-backed provenance check for dataset maintainers and reviewers, not a general development lifecycle tool.
- `Other`: rejected; a specific live category and focus describe the mechanism more accurately.

## Tag 1
Source Verification

## Tag 2

## Tag mapping evidence
- `Source Verification`: `register_case` stores bounded references and expected metadata; the assessment path fetches the landing and repository JSON documents with `gl.nondet.web.get`, compares normalized version, license, release, and commit fields using `gl.eq_principle.strict_eq`, and stores the resulting outcome and evidence digests.
- Tag 2 is intentionally blank because no second live specific-focus option has an equally strong, distinct mapping to the implemented workflow.

## One-liner (107 characters / cap 180)
Check whether a research dataset landing page matches its canonical repository through validator consensus.

## Description (759 characters / cap 1000)
Research Dataset Revision Checker binds a dataset landing page to a canonical repository, freezes the expected version and license, and asks GenLayer validators to compare bounded metadata from both public sources. The contract stores the normalized result, evidence digests, and a clear lifecycle state such as REGISTERED, FROZEN, or ASSESSED with an outcome. It is built for researchers, dataset maintainers, and reviewers who need a repeatable provenance check instead of trusting a manually copied version or license claim. GenLayer is essential because validators independently fetch the two sources and use consensus to authorize the comparison result; a conventional frontend or single server would not provide that decentralized verification boundary.

## YouTube URL (optional)

## How-to Step 1 — Heading
Connect wallet

## How-to Step 1 — Instruction
Select Connect wallet, choose an available wallet, and confirm that the page shows your connected account.

## How-to Step 2 — Heading
Create public JSON inputs

## How-to Step 2 — Instruction
In the GitHub web interface, create a new public repository with a name you choose and make one initial commit. In a later commit, add two JSON object files. The landing file must contain dataset_id, version, license_id, release_ref, commit_id, and repository_url. The repository file must contain dataset_id, version, license_id, release_ref, commit_id, repository_owner, and repository_name. Use a fresh dataset_id you choose, use the same version, license_id, release_ref, and initial-commit commit_id in both files, set repository_url to the exact HTTPS URL of this repository, and set repository_owner and repository_name to its matching owner and name. Open each saved file's Raw view and copy the two resulting HTTPS URLs.

## How-to Step 3 — Heading
Register a case

## How-to Step 3 — Instruction
Enter the fresh dataset ID, the landing-file Raw URL, the repository-file Raw URL, the expected version, and the expected license. Select Register case and wait until the page shows REGISTERED.

## How-to Step 4 — Heading
Freeze the case

## How-to Step 4 — Instruction
In Dataset ID to inspect, use the ID just registered. Select Freeze and wait until the saved case state reads FROZEN.

## How-to Step 5 — Heading
Assess the sources

## How-to Step 5 — Instruction
Select Assess. Keep the page open while the transaction reaches finality and contract readback completes. The page then shows ASSESSED and the validator outcome.

## How-to Step 6 — Heading
Review the saved result

## How-to Step 6 — Instruction
Select View saved case details to reload the authoritative state and inspect the outcome, retry count, evidence digests, and verified transaction link.

## How-to Step 7 — Heading
Retry an unresolved assessment

## How-to Step 7 — Instruction
If the outcome is UNRESOLVED, select Retry unresolved after the public sources are available again. Wait for finality and readback; the retry count increases without an automatic duplicate submission.

## Expected verification outcome (423 characters / cap 500)
The case remains bound to the references you entered, progresses from REGISTERED to FROZEN to ASSESSED, and shows a validator outcome such as MATCHING_REVISION, REVISION_MISMATCH, LICENSE_MISMATCH, METADATA_MISSING, or UNRESOLVED. The page exposes the final state, retry count, evidence digests, transaction link, and finalized execution result; an UNRESOLVED result remains explicit rather than being presented as a match.

## Contract Link 1
https://explorer-studio.genlayer.com/address/0x3d5Ff07e8492d8a9eE8E333bdBCFb0B447447ea1

## Website
https://research-dataset-revision-checker.vercel.app/

## GitHub
https://github.com/pcong5239/research-dataset-revision-checker

## X


## Discord


## Telegram

---

## INTERNAL EXACT-REVISION EVIDENCE
- Current approved release package before this Explorer-only draft: `1a38dddfb7b93a6f2cf42c1f6e71d5eeb301e5c0`.
- Contract source commit: `08d759023c807e783d2bbb42059e1cb20a3a025f`; source SHA-256: `ECE513F2132168517E178F737EEEFC951BE370B415508D2604A7C62585E7C7`.
- Frontend source commit: `80f80ac5b6a06c2b3c694d8c663b955f5b42e134`.
- Deployment: `0x3d5Ff07e8492d8a9eE8E333bdBCFb0B447447ea1` on Studionet, chain ID `61999`; deployment transaction: `0x0b5a8f7183dd05b075eba9c7cdb5d0fdb05715a4085b3e5d0cd379f9902a675d`.
- Live application: `https://research-dataset-revision-checker.vercel.app/`; final Vercel E2E journey: `vercel-e2e-final-20260905-01`.
- Final Vercel E2E writes reached finalized execution success and authoritative readback for register, freeze, assess, and retry; the observed final outcome was explicit `UNRESOLVED` with retry count `1`.
- The rendered Studionet Explorer contract page was independently checked and showed finalized transaction rows with successful execution and accepted consensus.
- The public form intentionally makes no claim that `MATCHING_REVISION` has been observed live; it lists the contract's supported outcomes and describes the tested `UNRESOLVED` branch accurately.
- The six official Explorer form reference images were opened and compared: identity/summary, video/how-to, verification/links/social, primary tag, and both AI & Agents specific-focus option screens.

## INTERNAL RELEASE ROUTE
- `POST_GITHUB_VERCEL_FINAL`: APPROVED, same-package `DUAL_APPROVED: YES` for the prior exact release package.
- `EXPLORER_PRE_SUBMISSION`: pending anonymous review of this exact draft/package.
- Manual Explorer submission: prohibited until `EXPLORER_PRE_SUBMISSION APPROVED` and same-package `DUAL_APPROVED: YES`; AI chính will provide the final fields as separate copy-ready code blocks and will not submit the form.
