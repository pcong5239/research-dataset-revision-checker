import { describe, expect, it } from "vitest";
import { createProviderDiscovery } from "./providers.js";

function rootWith(ethereum) {
  const root = new EventTarget();
  if (ethereum) root.ethereum = ethereum;
  return root;
}

function provider() { return { request: async () => [] }; }

function announce(root, info, value) {
  root.dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail: { info, provider: value } }));
}

describe("EIP-6963 provider discovery", () => {
  it("deduplicates repeated announcements by UUID and provider identity", () => {
    const root = rootWith();
    const discovery = createProviderDiscovery(root);
    const wallet = provider();
    announce(root, { uuid: "one", name: "MetaMask", rdns: "io.metamask" }, wallet);
    announce(root, { uuid: "one", name: "MetaMask", rdns: "io.metamask" }, wallet);
    expect(discovery.getOptions()).toHaveLength(1);
  });

  it("uses legacy window.ethereum only when no EIP-6963 provider exists", async () => {
    const wallet = provider();
    const root = rootWith(wallet);
    const discovery = createProviderDiscovery(root);
    discovery.request();
    await new Promise((resolve) => setTimeout(resolve, 110));
    expect(discovery.getOptions()[0].legacy).toBe(true);
    const announced = provider();
    announce(root, { uuid: "two", name: "Rabby", rdns: "io.rabby" }, announced);
    expect(discovery.getOptions()).toEqual([expect.objectContaining({ label: "Rabby", provider: announced })]);
  });

  it("does not request accounts during discovery", () => {
    let calls = 0;
    const wallet = { request: async () => { calls += 1; return []; } };
    const root = rootWith(wallet);
    createProviderDiscovery(root).request();
    expect(calls).toBe(0);
  });
});
