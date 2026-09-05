import { describe, expect, it } from "vitest";
import { isSuccessfulTransaction } from "./transactionOutcome.js";

describe("transaction outcome adapter", () => {
  it("accepts the installed Studionet SDK response shape", () => {
    expect(isSuccessfulTransaction({
      status: 7,
      result: 6,
      consensus_data: {
        leader_receipt: [{ mode: "leader", execution_result: "SUCCESS" }],
      },
    })).toBe(true);
  });

  it("rejects a legacy response without successful leader execution", () => {
    expect(isSuccessfulTransaction({
      status: 7,
      result: 6,
      consensus_data: {
        leader_receipt: [{ mode: "leader", execution_result: "ERROR" }],
      },
    })).toBe(false);
  });

  it("preserves the modern execution-result contract", () => {
    expect(isSuccessfulTransaction({
      statusName: "FINALIZED",
      txExecutionResultName: "FINISHED_WITH_RETURN",
    })).toBe(true);
    expect(isSuccessfulTransaction({
      statusName: "FINALIZED",
      txExecutionResultName: "FINISHED_WITH_ERROR",
    })).toBe(false);
  });
});
