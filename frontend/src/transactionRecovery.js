export const PENDING_STORAGE_KEY = "research-dataset-revision-checker.pending-write.v1";

export function isTransactionHash(value) {
  return /^0x[a-fA-F0-9]{64}$/.test(String(value || ""));
}

export function preparePendingStorage(storage) {
  try {
    const probeKey = `${PENDING_STORAGE_KEY}.probe`;
    storage.setItem(probeKey, "1");
    if (storage.getItem(probeKey) !== "1") throw new Error("storage mismatch");
    storage.removeItem(probeKey);
  } catch {
    const error = new Error("Transaction recovery storage is unavailable. No write was submitted.");
    error.code = "STORAGE_UNAVAILABLE";
    throw error;
  }
}

export function readPendingWrite(storage, contract, operations) {
  try {
    const value = JSON.parse(storage.getItem(PENDING_STORAGE_KEY) || "null");
    if (!value || value.version !== 1 || typeof value.contract !== "string" || value.contract.toLowerCase() !== contract.toLowerCase()) return null;
    if (!isTransactionHash(value.hash) || !/^0x[a-fA-F0-9]{40}$/.test(String(value.account || ""))) return null;
    if (!operations.includes(value.operation) || !String(value.datasetId || "").trim()) return null;
    return {
      hash: String(value.hash),
      operation: String(value.operation),
      datasetId: String(value.datasetId),
      account: String(value.account).toLowerCase(),
    };
  } catch {
    return null;
  }
}

export function savePendingWrite(storage, pending) {
  try {
    storage.setItem(PENDING_STORAGE_KEY, JSON.stringify({ version: 1, ...pending }));
    return true;
  } catch {
    return false;
  }
}

export function clearPendingWrite(storage) {
  try {
    storage.removeItem(PENDING_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
