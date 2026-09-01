import { describe, expect, it, vi } from "vitest";
import { connectSelectedProvider, createProviderDiscovery } from "./providers.js";

const ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E";
const CHAIN = {
  id: 61999,
  name: "GenLayer Studio Network",
  nativeCurrency: { name: "GEN Token", symbol: "GEN", decimals: 18 },
  rpcUrls: ["https://studio.genlayer.com/api"],
  blockExplorerUrls: ["https://genlayer-explorer.vercel.app"],
};

function rootWith(ethereum) {
  const root = new EventTarget();
  if (ethereum) root.ethereum = ethereum;
  return root;
}

function provider() { return { request: async () => [] }; }

function announce(root, info, value) {
  root.dispatchEvent(new CustomEvent("eip6963:announceProvider", {
    detail: { info: { icon: ICON, ...info }, provider: value },
  }));
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

  it("shows only the three supported wallets and keeps each provider selectable", () => {
    const root = rootWith();
    const discovery = createProviderDiscovery(root);
    announce(root, { uuid: "mm", name: "MetaMask", rdns: "io.metamask" }, provider());
    announce(root, { uuid: "okx", name: "OKX Wallet", rdns: "com.okex.wallet" }, provider());
    announce(root, { uuid: "rb", name: "Rabby", rdns: "io.rabby" }, provider());
    expect(discovery.getOptions().map((item) => item.label)).toEqual(["MetaMask", "OKX Wallet", "Rabby"]);
    expect(discovery.getOptions().every((item) => item.icon === ICON)).toBe(true);
  });

  it("rejects a UUID/provider identity collision", () => {
    const root = rootWith();
    const discovery = createProviderDiscovery(root);
    const first = provider();
    announce(root, { uuid: "same", name: "MetaMask", rdns: "io.metamask" }, first);
    announce(root, { uuid: "same", name: "Rabby", rdns: "io.rabby" }, provider());
    announce(root, { uuid: "other", name: "Rabby", rdns: "io.rabby" }, first);
    expect(discovery.getOptions()).toEqual([expect.objectContaining({ label: "MetaMask", provider: first })]);
  });

  it("uses legacy window.ethereum only when no EIP-6963 provider exists", async () => {
    const wallet = Object.assign(provider(), { isRabby: true });
    const root = rootWith(wallet);
    const discovery = createProviderDiscovery(root);
    discovery.request();
    await new Promise((resolve) => setTimeout(resolve, 110));
    expect(discovery.getOptions()[0]).toEqual(expect.objectContaining({ label: "Rabby", legacy: true }));
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

describe("explicit wallet connection", () => {
  it("requests accounts only from the selected provider and switches after selection", async () => {
    const calls = [];
    const first = { request: vi.fn(async (args) => { calls.push(["first", args.method]); return []; }) };
    const second = { request: vi.fn(async (args) => {
      calls.push(["second", args.method]);
      return args.method === "eth_requestAccounts" ? [`0x${"1".repeat(40)}`] : null;
    }) };
    const session = await connectSelectedProvider({ label: "Rabby", provider: second }, CHAIN);
    expect(session.account).toBe(`0x${"1".repeat(40)}`);
    expect(first.request).not.toHaveBeenCalled();
    expect(calls.map((item) => item[1])).toEqual(["eth_requestAccounts", "wallet_switchEthereumChain"]);
  });

  it("adds an unknown chain and retries switching once", async () => {
    let switches = 0;
    const provider = { request: vi.fn(async ({ method }) => {
      if (method === "eth_requestAccounts") return [`0x${"2".repeat(40)}`];
      if (method === "wallet_switchEthereumChain" && switches++ === 0) throw { code: 4902 };
      return null;
    }) };
    await connectSelectedProvider({ label: "MetaMask", provider }, CHAIN);
    expect(provider.request.mock.calls.map(([args]) => args.method)).toEqual([
      "eth_requestAccounts", "wallet_switchEthereumChain", "wallet_addEthereumChain", "wallet_switchEthereumChain",
    ]);
  });

  it("does not switch or retry after a user rejection", async () => {
    const provider = { request: vi.fn(async ({ method }) => {
      if (method === "eth_requestAccounts") throw { code: 4001, message: "Rejected" };
      return null;
    }) };
    await expect(connectSelectedProvider({ label: "OKX Wallet", provider }, CHAIN)).rejects.toMatchObject({ code: 4001 });
    expect(provider.request).toHaveBeenCalledOnce();
  });
});
