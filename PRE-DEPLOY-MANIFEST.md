# PRE_DEPLOY draft manifest

- Classification: INTENTIONALLY FROZEN — Codex decision under user-delegated technical authority
- Decision basis: Stage 2 specifies no upgrade lifecycle; the user delegated primary-AI technical decision authority in this Task.
- Consequence: a post-deployment defect requires a new contract deployment; no public upgrade method exists.
- User confirmation: "Xác nhận phân loại INTENTIONALLY FROZEN; nếu có defect sau deploy, phải triển khai contract mới và không có upgrade method công khai."
- Network: Studionet
- Chain/RPC: use the current Studio Studionet configuration at deployment time; record the observed chain ID and RPC in the final manifest
- Source commit: `08d759023c807e783d2bbb42059e1cb20a3a025f`
- Contract source SHA-256: `ECE513F2132168517E178F737EEEFC951BE370B415508D2604A7C62585E7C7C7`
- Constructor arguments: none
- Studio deployer/E2E account: `0x34b92E6553eaCA11A00A9d86d75d8a7881779D78`
- Account role: deployer and Studio E2E operator
- Functional frontend commit: `76ed133425336443af4155dceef87813c521ed6f`
- Linked contracts: none
- Deployment transaction: to be recorded after approved deployment
- Contract address: to be recorded after approved deployment
- Explorer link: to be recorded after approved deployment

## Exact local runtime evidence note

The installed `genlayer-test 0.29.2` Direct Mode successfully exercised calldata/storage round-trip, storage retrieval, web mocks and the captured `strict_eq` validator. Its nested sandbox decoder currently returns an undecodable `ok` envelope for this SDK's `strict_eq` validator, so the validator assertions use the actual captured SDK validator with only `spawn_sandbox` reduced to a direct call in the test. This limitation is not treated as Studio or Studionet proof; the real consensus result must be verified after deployment.

## Runtime provenance and response-field resolution

- Checked: `2026-09-01T16:24:12+07:00` (Asia/Saigon).
- Host packages: `genlayer-test 0.29.2`, `genlayer-py 0.16.3`; `genlayer-test` requires `genlayer-py>=0.13.0,<0.17.0`.
- Direct runner: `genvm-universal-v0.3.0-rc7`; contract header selects `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`, whose runner selects `py-lib-genlayer-std:11rhn002yfajawsz7fai6mykznbxkxs6l91iskj5cm82c92qhy3v`.
- Exact std source `genlayer/gl/nondet/web.py` defines `Response.status`; its SHA-256 is `FA561B021345B803B7425DFEC455B299CA55436C698E9457BFD872D6A116157B`.
- Official Web Access documentation checked at the same review window documents `status_code`: https://docs.genlayer.com/developers/intelligent-contracts/features/web-access. The source now supports both shapes, preferring the exact selected runner's `status` and falling back to documented `status_code`; unknown shapes fail closed as `UNAVAILABLE`.
- An unmodified probe on the exact runner reproduced `AssertionError: unknown type 14` while decoding the nested sandbox envelope `0e 02 6f 6b 00` from `genlayer.gl.vm.spawn_sandbox`. This is recorded as a Direct Mode limitation, not suppressed as a pass. The official Direct Mode API still documents `run_validator()`: https://docs.genlayer.com/api-references/genlayer-test/direct.

No private key, seed phrase, credential, token or other secret belongs in this manifest.
