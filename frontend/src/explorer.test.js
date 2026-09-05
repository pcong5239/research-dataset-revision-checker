import { describe, expect, it } from "vitest";
import { contractExplorerUrl, STUDIONET_EXPLORER_URL, transactionExplorerUrl } from "./explorer.js";

describe("canonical Studionet Explorer links", () => {
  it("uses the verified Explorer for contract and transaction routes", () => {
    expect(STUDIONET_EXPLORER_URL).toBe("https://explorer-studio.genlayer.com");
    expect(contractExplorerUrl("0xabc")).toBe("https://explorer-studio.genlayer.com/address/0xabc");
    expect(transactionExplorerUrl("0xdef")).toBe("https://explorer-studio.genlayer.com/tx/0xdef");
  });
});
