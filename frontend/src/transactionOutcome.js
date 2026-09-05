const FINALIZED_RETURN = "FINISHED_WITH_RETURN";
const SUCCESSFUL_CONSENSUS = new Set(["AGREE", "MAJORITY_AGREE", 1, 6]);

function executionResultName(receipt) {
  return receipt?.txExecutionResultName ?? receipt?.tx_execution_result_name;
}

function legacyLeaderReceipts(receipt) {
  const value = receipt?.consensus_data?.leader_receipt ?? receipt?.consensusData?.leaderReceipt;
  return Array.isArray(value) ? value : value ? [value] : [];
}

export function isSuccessfulTransaction(receipt) {
  const modernExecution = executionResultName(receipt);
  if (modernExecution !== undefined) return modernExecution === FINALIZED_RETURN;

  const legacyExecution = receipt?.txExecutionResult ?? receipt?.tx_execution_result;
  if (legacyExecution !== undefined) return Number(legacyExecution) === 1;

  const consensus = receipt?.resultName ?? receipt?.result_name ?? receipt?.result;
  const hasSuccessfulLeader = legacyLeaderReceipts(receipt).some(
    (entry) => String(entry?.execution_result ?? entry?.executionResult ?? "").toUpperCase() === "SUCCESS",
  );
  return hasSuccessfulLeader && SUCCESSFUL_CONSENSUS.has(consensus);
}
