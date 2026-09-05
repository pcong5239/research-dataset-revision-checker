export const WRITE_PHASES = Object.freeze([
  "IDLE",
  "WAITING_FOR_WALLET",
  "SUBMITTED",
  "WAITING_FOR_FINALITY",
  "VERIFYING_EXECUTION",
  "VERIFYING_READBACK",
  "SUCCESS",
  "REJECTED",
  "FAILED",
  "RECONCILIATION_REQUIRED",
]);

export const PENDING_PHASES = new Set([
  "WAITING_FOR_WALLET",
  "SUBMITTED",
  "WAITING_FOR_FINALITY",
  "VERIFYING_EXECUTION",
  "VERIFYING_READBACK",
]);

export const INITIAL_WRITE_PROGRESS = Object.freeze({ phase: "IDLE" });

export const TRANSACTION_COPY = Object.freeze({
  IDLE: { title: "Ready", detail: "No transaction is in progress." },
  WAITING_FOR_WALLET: { title: "Confirm in your wallet", detail: "Review the request and confirm or reject it in your wallet." },
  SUBMITTED: { title: "Transaction submitted", detail: "Your wallet accepted the request." },
  WAITING_FOR_FINALITY: { title: "Waiting for confirmation", detail: "The network is confirming the transaction." },
  VERIFYING_EXECUTION: { title: "Checking the result", detail: "The transaction is finalized; checking that it completed successfully." },
  VERIFYING_READBACK: { title: "Verifying saved details", detail: "Checking the saved case details before reporting completion." },
  SUCCESS: { title: "Transaction complete", detail: "The saved case details were verified." },
  REJECTED: { title: "Request cancelled", detail: "The wallet request was cancelled. Nothing was submitted." },
  FAILED: { title: "Transaction failed", detail: "The request did not complete. Review the details and try again." },
  RECONCILIATION_REQUIRED: { title: "Verification interrupted", detail: "Do not submit again. Check the existing transaction before retrying." },
});

export function classifyWriteError(error, hasHash) {
  if (Number(error?.code) === 4001) return { phase: "REJECTED", message: TRANSACTION_COPY.REJECTED.detail };
  if (error?.code === "EXECUTION_FAILED" || error?.code === "READBACK_MISMATCH") {
    return { phase: "FAILED", message: TRANSACTION_COPY.FAILED.detail };
  }
  if (hasHash) return { phase: "RECONCILIATION_REQUIRED", message: TRANSACTION_COPY.RECONCILIATION_REQUIRED.detail };
  return { phase: "FAILED", message: TRANSACTION_COPY.FAILED.detail };
}

export function assertExpectedReadback(functionName, value) {
  const state = String(value?.state || "");
  const outcome = String(value?.outcome || "");
  const valid = {
    register_case: state === "REGISTERED" && outcome === "UNRESOLVED",
    freeze_case: state === "FROZEN",
    assess: state === "ASSESSED",
    retry_unresolved: state === "ASSESSED" && Number(value?.retry_count) >= 1,
  }[functionName];
  if (!valid) {
    const error = new Error("Authoritative readback did not confirm the expected transition.");
    error.code = "READBACK_MISMATCH";
    throw error;
  }
  return value;
}
