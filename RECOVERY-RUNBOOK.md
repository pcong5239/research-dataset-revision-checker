# Recovery runbook

## Studio/local UI reset while Studionet state remains

Reconnect the recorded Studio account, import the contract by its recorded address, load the exact source from the recorded commit, and verify the source hash and authoritative read views. Because this contract is intended to be frozen, do not claim an upgrade path.

## Studionet/network reset

The old address and state cannot be assumed to survive a GenLayer reset. Redeploy the exact recorded source with no constructor arguments, record the replacement address and transaction, rerun the complete Studio matrix, and update the frontend only after POST_DEPLOY_TEST approval.

## Loss of the recorded Studio account

The contract may remain readable, but no recovery or upgrade authority is claimed. A replacement deployment from the recorded source and manifest is required if future operation needs a new instance.

## Classification consequence

INTENTIONALLY FROZEN requires explicit user confirmation before deployment. A post-deployment defect requires a new contract deployment; there is no public upgrade method.
