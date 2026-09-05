import { describe, expect, it } from "vitest";
import {
  PENDING_STORAGE_KEY,
  clearPendingWrite,
  preparePendingStorage,
  readPendingWrite,
  savePendingWrite,
} from "./transactionRecovery.js";

const CONTRACT = `0x${"a".repeat(40)}`;
const ACCOUNT = `0x${"b".repeat(40)}`;
const HASH = `0x${"c".repeat(64)}`;
const PENDING = { hash: HASH, operation: "register_case", datasetId: "dataset-1", account: ACCOUNT, contract: CONTRACT };

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

describe("transaction recovery storage", () => {
  it("preflights storage before signing and round-trips one pending hash", () => {
    const target = storage();
    preparePendingStorage(target);
    expect(savePendingWrite(target, PENDING)).toBe(true);
    expect(readPendingWrite(target, CONTRACT, ["register_case"])).toEqual({
      hash: HASH, operation: "register_case", datasetId: "dataset-1", account: ACCOUNT,
    });
  });

  it("rejects malformed, wrong-contract, and unsupported-operation records", () => {
    const target = storage();
    savePendingWrite(target, { ...PENDING, contract: `0x${"d".repeat(40)}` });
    expect(readPendingWrite(target, CONTRACT, ["register_case"])).toBeNull();
    savePendingWrite(target, { ...PENDING, operation: "unknown" });
    expect(readPendingWrite(target, CONTRACT, ["register_case"])).toBeNull();
    target.setItem(PENDING_STORAGE_KEY, "not-json");
    expect(readPendingWrite(target, CONTRACT, ["register_case"])).toBeNull();
  });

  it("clears only after terminal reconciliation and retains state when cleanup fails", () => {
    const target = storage();
    savePendingWrite(target, PENDING);
    expect(clearPendingWrite(target)).toBe(true);
    expect(target.getItem(PENDING_STORAGE_KEY)).toBeNull();
    const unavailable = { removeItem: () => { throw new Error("blocked"); } };
    expect(clearPendingWrite(unavailable)).toBe(false);
  });
});
