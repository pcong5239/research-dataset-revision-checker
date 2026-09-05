# Deployment and recovery manifest

- Classification: INTENTIONALLY FROZEN — Codex decision under user-delegated technical authority
- Decision basis: Stage 2 specifies no upgrade lifecycle; the user delegated primary-AI technical decision authority in this Task.
- Consequence: a post-deployment defect requires a new contract deployment; no public upgrade method exists.
- User confirmation: "Xác nhận phân loại INTENTIONALLY FROZEN; nếu có defect sau deploy, phải triển khai contract mới và không có upgrade method công khai."
- Network: Studionet
- Chain ID: `61999`
- RPC: `https://studio.genlayer.com/api`
- Source commit: `08d759023c807e783d2bbb42059e1cb20a3a025f`
- Contract source SHA-256: `ECE513F2132168517E178F737EEEFC951BE370B415508D2604A7C62585E7C7C7`
- Constructor arguments: none
- Studio deployer/E2E account: `0x34b92E6553eaCA11A00A9d86d75d8a7881779D78`
- Account role: deployer and Studio E2E operator
- Functional frontend release commit: c5660a43ba602250c6007ff360295053645e5b76
- Public package commit: bd27cc0419e122b88882d24e1d899c0e43458045
- Functional frontend commit: `76ed133425336443af4155dceef87813c521ed6f`
- Linked contracts: none
- Deployment transaction: `0x0b5a8f7183dd05b075eba9c7cdb5d0fdb05715a4085b3e5d0cd379f9902a675d`
- Contract address: `0x3d5Ff07e8492d8a9eE8E333bdBCFb0B447447ea1`
- Explorer contract link: https://explorer-studio.genlayer.com/address/0x3d5Ff07e8492d8a9eE8E333bdBCFb0B447ea1
- Explorer deployment transaction: https://explorer-studio.genlayer.com/tx/0x0b5a8f7183dd05b075eba9c7cdb5d0fdb05715a4085b3e5d0cd379f9902a675d

## Studio deployment acceptance evidence

- Deployment: `FINALIZED`, execution `SUCCESS`, consensus accepted; no constructor arguments.
- Exact source loaded for deployment: commit `08d759023c807e783d2bbb42059e1cb20a3a025f`, SHA-256 `ECE513F2132168517E178F737EEEFC951BE370B415508D2604A7C62585E7C7C7`.
- Studio account: `0x34b92E6553eaCA11A00A9d86d75d8a7881779D78` (deployer and E2E operator).
- Initial finalized `get_case_ids`: `[]` before case creation.
- Case `studio-e2e-unresolved-20260901-01` was registered with the bounded example landing/repository URLs and expected `v1`/`mit` values. Transaction `0xfce9894ad68cf2c6d12952e4df4fce188e95095634ede37c7fb7bfc990fc75a4`: `FINALIZED`, `SUCCESS`; readback `REGISTERED`, owner matches the recorded account.
- `freeze_case` transaction `0xb96a2d12d803d3e3fdef0ba3f324af09879fb7e7223beae6a04b99ad0e4f97b5`: `FINALIZED`, `SUCCESS`; readback `FROZEN`.
- `assess` transaction `0x7ce720dd76863326805eea905d82117117bd1b6f24616443bab2164957ad0864`: `FINALIZED`, `SUCCESS`, consensus accepted, output `UNRESOLVED`; readback `ASSESSED`, `UNRESOLVED`, `retry_count=0`.
- `retry_unresolved` transaction `0x3d20f4ec8cd42c61cc0f405ba4ebd6b082976b659cc2033df5eccb67c9014366`: `FINALIZED`, `SUCCESS`, consensus accepted, output `UNRESOLVED`; readback remains `ASSESSED`, `UNRESOLVED`, `retry_count=1`.
- Duplicate replay `register_case` transaction `0xc05a10a684381750293c45db0119acb0c7a3e8dddbe4a466de902fce777838d6`: `FINALIZED`, execution `ERROR`, consensus accepted with `CASE_ALREADY_EXISTS`; authoritative readback remained `ASSESSED`, `UNRESOLVED`, `retry_count=1`.
- Finalized `get_case_ids` readback: `["studio-e2e-unresolved-20260901-01"]`; no duplicate case was created.

These rows prove the registered, frozen, unresolved assessment, bounded retry, and duplicate-rejection paths on this exact deployment. A positive `MATCHING_REVISION` path is not claimed because no independently controlled live public source pair was used in Studio.

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
