import { describe, expect, it, vi } from "vitest";
import { connectSelectedProvider, createProviderDiscovery } from "./providers.js";

const ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E";
const CHAIN = {
  id: 61999,
  name: "GenLayer Studio Network",
  nativeCurrency: { name: "GEN Token", symbol: "GEN", decimals: 18 },
  rpcUrls: ["https://studio.genlayer.com/api"],
  blockExplorerUrls: ["https://explorer-studio.genlayer.com"],
};

function rootWith(ethereum, extras = {}) {
  const root = new EventTarget();
  if (ethereum) root.ethereum = ethereum;
  Object.assign(root, extras);
  return root;
}

function provider() { return { request: async () => [] }; }

function announce(root, info, value) {
  root.dispatchEvent(new CustomEvent("eip6963:announceProvider", {
    detail: { info: { icon: ICON, ...info }, provider: value },
  }));
}

describe("EIP-6963 provider discovery", () => {
  it("starts with no options when no supported provider is detected", () => {
    const discovery = createProviderDiscovery(rootWith());
    discovery.request();
    expect(discovery.getOptions()).toEqual([]);
  });

  it.each([
    ["OKX Wallet", "okx", "com.okex.wallet"],
    ["MetaMask", "metamask", "io.metamask"],
    ["Rabby", "rabby", "io.rabby"],
  ])("keeps one detected %s provider as one selectable option", (label, key, rdns) => {
    const root = rootWith();
    const discovery = createProviderDiscovery(root);
    const wallet = provider();
    announce(root, { uuid: key, name: label, rdns }, wallet);
    expect(discovery.getOptions()).toEqual([expect.objectContaining({ key, label, provider: wallet, icon: `/wallets/${key}.svg` })]);
  });

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
    expect(discovery.getOptions().map((item) => item.label)).toEqual(["OKX Wallet", "MetaMask", "Rabby"]);
    expect(discovery.getOptions().map((item) => item.icon)).toEqual([
      "/wallets/okx.svg", "/wallets/metamask.svg", "/wallets/rabby.svg",
    ]);
  });

  it.each([
    [["OKX Wallet", "okx", "com.okex.wallet"], ["MetaMask", "metamask", "io.metamask"]],
    [["OKX Wallet", "okx", "com.okex.wallet"], ["Rabby", "rabby", "io.rabby"]],
    [["MetaMask", "metamask", "io.metamask"], ["Rabby", "rabby", "io.rabby"]],
  ])("keeps each detected two-wallet combination exact", (first, second) => {
    const root = rootWith();
    const discovery = createProviderDiscovery(root);
    for (const [label, key, rdns] of [first, second]) announce(root, { uuid: key, name: label, rdns }, provider());
    expect(discovery.getOptions().map((item) => item.label)).toEqual(
      ["OKX Wallet", "MetaMask", "Rabby"].filter((label) => [first[0], second[0]].includes(label)),
    );
  });

  it("deduplicates a canonical wallet across different UUIDs", () => {
    const root = rootWith();
    const discovery = createProviderDiscovery(root);
    const first = provider();
    announce(root, { uuid: "mm-one", name: "MetaMask", rdns: "io.metamask" }, first);
    announce(root, { uuid: "mm-two", name: "MetaMask", rdns: "io.metamask" }, provider());
    expect(discovery.getOptions()).toEqual([expect.objectContaining({ key: "metamask", provider: first })]);
  });

  it("hides unsupported and conflicting announced identities", () => {
    const root = rootWith();
    const discovery = createProviderDiscovery(root);
    announce(root, { uuid: "unknown", name: "Unknown Wallet", rdns: "com.example.wallet" }, provider());
    announce(root, { uuid: "conflict", name: "Rabby", rdns: "io.metamask" }, provider());
    announce(root, { uuid: "generic", name: "Browser Wallet", rdns: "io.metamask" }, provider());
    expect(discovery.getOptions()).toEqual([]);
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

  it("discovers identified legacy providers from the provider collection and named injections", () => {
    const metamask = Object.assign(provider(), { isMetaMask: true });
    const okx = Object.assign(provider(), { isOKExWallet: true });
    const rabby = Object.assign(provider(), { isRabby: true });
    const root = rootWith({ providers: [metamask] }, { metamask, okxwallet: okx, rabby });
    const discovery = createProviderDiscovery(root);
    discovery.request();
    expect(discovery.getOptions()).toEqual([
      expect.objectContaining({ label: "OKX Wallet", provider: okx, legacy: true, icon: "/wallets/okx.svg" }),
      expect.objectContaining({ label: "MetaMask", provider: metamask, legacy: true, icon: "/wallets/metamask.svg" }),
      expect.objectContaining({ label: "Rabby", provider: rabby, legacy: true, icon: "/wallets/rabby.svg" }),
    ]);
  });

  it("does not invent MetaMask from an OKX compatibility facade", () => {
    const compatibility = Object.assign(provider(), { isMetaMask: true });
    const okx = Object.assign(provider(), { isOkxWallet: true });
    const root = rootWith(compatibility, { okxwallet: okx });
    const discovery = createProviderDiscovery(root);
    discovery.request();
    expect(discovery.getOptions()).toEqual([
      expect.objectContaining({ label: "OKX Wallet", provider: okx, legacy: true }),
    ]);
  });

  it("suppresses a MetaMask-compatible provider-collection facade when named OKX is present", () => {
    const compatibility = Object.assign(provider(), { isMetaMask: true });
    const okx = Object.assign(provider(), { isOkxWallet: true });
    const root = rootWith({ providers: [compatibility] }, { okxwallet: okx });
    const discovery = createProviderDiscovery(root);
    discovery.request();
    expect(discovery.getOptions()).toEqual([
      expect.objectContaining({ label: "OKX Wallet", provider: okx, legacy: true }),
    ]);
  });

  it("keeps a lone legacy MetaMask fallback", () => {
    const metamask = Object.assign(provider(), { isMetaMask: true });
    const discovery = createProviderDiscovery(rootWith(metamask));
    discovery.request();
    expect(discovery.getOptions()).toEqual([
      expect.objectContaining({ label: "MetaMask", provider: metamask, legacy: true }),
    ]);
  });

  it("lets a late announcement replace only its matching legacy wallet", () => {
    const okxLegacy = Object.assign(provider(), { isOkxWallet: true });
    const rabbyLegacy = Object.assign(provider(), { isRabby: true });
    const root = rootWith({ providers: [okxLegacy, rabbyLegacy] });
    const discovery = createProviderDiscovery(root);
    discovery.request();
    const okxAnnouncement = provider();
    announce(root, { uuid: "okx-announced", name: "OKX Wallet", rdns: "com.okx.wallet" }, okxAnnouncement);
    expect(discovery.getOptions()).toEqual([
      expect.objectContaining({ label: "OKX Wallet", provider: okxAnnouncement, legacy: false }),
      expect.objectContaining({ label: "Rabby", provider: rabbyLegacy, legacy: true }),
    ]);
  });

  it("hides a legacy provider with conflicting wallet flags", () => {
    const conflicting = Object.assign(provider(), { isMetaMask: true, isRabby: true });
    const root = rootWith(conflicting);
    const discovery = createProviderDiscovery(root);
    discovery.request();
    expect(discovery.getOptions()).toEqual([]);
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
