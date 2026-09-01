# PRE_DEPLOY draft manifest

- Classification: INTENTIONALLY FROZEN — pending explicit user confirmation
- Network: Studionet
- Chain/RPC: use the current Studio Studionet configuration at deployment time; record the observed chain ID and RPC in the final manifest
- Source commit: `ed3443910458209e18489abd9b0919acc0c4ab00`
- Contract source SHA-256: `BF6C9F438DF11E715D8D72965B485E7563E75E098793FECFBF4AC4BB19B184BD`
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
