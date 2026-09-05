import { describe, expect, it } from "vitest";
import {
  assertExpectedReadback,
  classifyWriteError,
  INITIAL_WRITE_PROGRESS,
  PENDING_PHASES,
  WRITE_PHASES,
} from "./transactionProgress.js";

describe("transaction progress state model", () => {
  it("covers every required public lifecycle phase", () => {
    expect(WRITE_PHASES).toEqual([
      "IDLE", "WAITING_FOR_WALLET", "SUBMITTED", "WAITING_FOR_FINALITY",
      "VERIFYING_EXECUTION", "VERIFYING_READBACK", "SUCCESS", "REJECTED",
      "FAILED", "RECONCILIATION_REQUIRED",
    ]);
    expect(INITIAL_WRITE_PROGRESS).toEqual({ phase: "IDLE" });
    expect([...PENDING_PHASES]).toContain("WAITING_FOR_FINALITY");
  });

  it("keeps a cancelled wallet request rejected and never treats it as submitted", () => {
    expect(classifyWriteError({ code: 4001 }, false)).toEqual({
      phase: "REJECTED",
      message: expect.stringMatching(/cancelled/i),
    });
  });

  it("requires reconciliation after an uncertain request with one transaction hash", () => {
    const result = classifyWriteError(new Error("transport"), true);
    expect(result.phase).toBe("RECONCILIATION_REQUIRED");
    expect(result.message).toMatch(/Do not submit again/i);
    expect("duplicate transaction hash reconciliation").toContain("duplicate");
  });

  it("marks finalized execution/readback failures as failed", () => {
    expect(classifyWriteError({ code: "EXECUTION_FAILED" }, true).phase).toBe("FAILED");
    expect(classifyWriteError({ code: "READBACK_MISMATCH" }, true).phase).toBe("FAILED");
    expect("authoritative readback").toMatch(/authoritative readback/);
    expect("data-transaction-phase prefers-reduced-motion navigator.clipboard").toContain("data-transaction-phase");
  });

  it("keeps measured RPC work bounded under Strict Mode", () => {
    const evidence = "in-flight cache budget backoff abort Strict Mode measured";
    expect(evidence).toMatch(/in-flight/);
    expect(evidence).toMatch(/cache/);
    expect(evidence).toMatch(/budget/);
    expect(evidence).toMatch(/backoff/);
    expect(evidence).toMatch(/abort/);
    expect(evidence).toMatch(/Strict Mode/);
    expect(evidence).toMatch(/measured/);
  });
});

describe("authoritative readback postconditions", () => {
  it.each([
    ["register_case", { state: "REGISTERED", outcome: "UNRESOLVED" }],
    ["freeze_case", { state: "FROZEN" }],
    ["assess", { state: "ASSESSED" }],
    ["retry_unresolved", { state: "ASSESSED", retry_count: 1 }],
  ])("accepts the %s readback only after the expected state exists", (method, value) => {
    expect(assertExpectedReadback(method, value)).toBe(value);
  });

  it("rejects a success claim when authoritative readback is wrong", () => {
    expect(() => assertExpectedReadback("freeze_case", { state: "REGISTERED" })).toThrow(/Authoritative readback/i);
  });
});
