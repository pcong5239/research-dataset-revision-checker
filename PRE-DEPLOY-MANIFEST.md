# PRE_DEPLOY draft manifest

- Classification: INTENTIONALLY FROZEN — Codex decision under user-delegated technical authority
- Decision basis: Stage 2 specifies no upgrade lifecycle; the user delegated primary-AI technical decision authority in this Task.
- Consequence: a post-deployment defect requires a new contract deployment; no public upgrade method exists.
- Network: Studionet
- Chain/RPC: use the current Studio Studionet configuration at deployment time; record the observed chain ID and RPC in the final manifest
- Source commit: `8bd99b57e12e4b1957bf6f0d1c2dd9f8d35cf089`
- Contract source SHA-256: `E8D68A485AB835B0F0CB389C0E83D4DB9CB3CB02CEEFB846608D77D8287146DD`
- Constructor arguments: none
- Studio deployer/E2E account: `0x34b92E6553eaCA11A00A9d86d75d8a7881779D78`
- Account role: deployer and Studio E2E operator
- Linked contracts: none
- Deployment transaction: to be recorded after approved deployment
- Contract address: to be recorded after approved deployment
- Explorer link: to be recorded after approved deployment

## Exact local runtime evidence note

The installed `gltest` Direct Mode successfully exercised calldata/storage round-trip, storage retrieval, web mocks and the captured `strict_eq` validator. Its nested sandbox decoder currently returns an undecodable `ok` envelope for this SDK's `strict_eq` validator, so the validator assertions use the actual captured SDK validator with only `spawn_sandbox` reduced to a direct call in the test. This limitation is not treated as Studio or Studionet proof; the real consensus result must be verified after deployment.

No private key, seed phrase, credential, token or other secret belongs in this manifest.
