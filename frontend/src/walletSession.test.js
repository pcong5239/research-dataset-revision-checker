import { describe, expect, it, vi } from "vitest";
import { createWalletSessionStore, WALLET_PHASES, walletView } from "./walletSession.js";

const ACCOUNT_A = `0x${"1".repeat(40)}`;
const ACCOUNT_B = `0x${"2".repeat(40)}`;
const TARGET_CHAIN = "0xf22f";

function provider() {
  const handlers = new Map();
  return {
    request: vi.fn(),
    on: vi.fn((name, handler) => handlers.set(name, handler)),
    removeListener: vi.fn((name, handler) => {
      if (handlers.get(name) === handler) handlers.delete(name);
    }),
    emit(name, value) { handlers.get(name)?.(value); },
  };
}

function setup() {
  const selectedProvider = provider();
  const option = { key: "okx", label: "OKX Wallet", provider: selectedProvider };
  const createWriteClient = vi.fn((activeProvider, account) => ({ activeProvider, account, writeContract: vi.fn() }));
  const store = createWalletSessionStore({
    connectProvider: vi.fn(async () => ({ provider: selectedProvider, account: ACCOUNT_A })),
    createWriteClient,
    targetChainId: () => TARGET_CHAIN,
  });
  return { store, option, selectedProvider, createWriteClient };
}

describe("canonical wallet session", () => {
  it("connects atomically and never renders Connect wallet beside a connected badge", async () => {
    const { store, option, selectedProvider } = setup();
    await store.connect(option);
    const state = store.getSnapshot();
    expect(state).toMatchObject({ phase: WALLET_PHASES.CONNECTED, account: ACCOUNT_A, chainValid: true });
    expect(state.writeClient.activeProvider).toBe(selectedProvider);
    expect(walletView(state)).toMatchObject({ connected: true, canWrite: true, actionLabel: "Disconnect" });
  });

  it("updates the account and rebinds the write client to the selected provider", async () => {
    const { store, option, selectedProvider } = setup();
    await store.connect(option);
    selectedProvider.emit("accountsChanged", [ACCOUNT_B]);
    expect(store.getSnapshot().account).toBe(ACCOUNT_B);
    expect(store.getSnapshot().writeClient).toMatchObject({ activeProvider: selectedProvider, account: ACCOUNT_B });
  });

  it("disconnects on account removal and tears down all session listeners", async () => {
    const { store, option, selectedProvider } = setup();
    await store.connect(option);
    selectedProvider.emit("accountsChanged", []);
    expect(store.getSnapshot()).toMatchObject({ phase: WALLET_PHASES.DISCONNECTED, selected: null, account: "", writeClient: null });
    expect(selectedProvider.removeListener).toHaveBeenCalledTimes(3);
  });

  it("disables writes on the wrong chain and restores the exact provider binding on recovery", async () => {
    const { store, option, selectedProvider } = setup();
    await store.connect(option);
    selectedProvider.emit("chainChanged", "0x1");
    expect(store.getSnapshot()).toMatchObject({ phase: WALLET_PHASES.WRONG_CHAIN, chainValid: false, writeClient: null });
    expect(walletView(store.getSnapshot()).canWrite).toBe(false);
    selectedProvider.emit("chainChanged", TARGET_CHAIN.toUpperCase());
    expect(store.getSnapshot()).toMatchObject({ phase: WALLET_PHASES.CONNECTED, chainValid: true });
    expect(store.getSnapshot().writeClient.activeProvider).toBe(selectedProvider);
  });

  it("handles provider disconnect and explicit Disconnect with the same clean state", async () => {
    const { store, option, selectedProvider } = setup();
    await store.connect(option);
    selectedProvider.emit("disconnect");
    expect(walletView(store.getSnapshot()).actionLabel).toBe("Connect wallet");
    await store.connect(option);
    store.disconnect();
    expect(store.getSnapshot()).toMatchObject({ phase: WALLET_PHASES.DISCONNECTED, selected: null, account: "", writeClient: null });
    expect(selectedProvider.removeListener).toHaveBeenCalledTimes(6);
  });

  it("models reload as disconnected, keeps chooser discovery free of account requests, and enforces no automatic resubmit", () => {
    const { store, option, selectedProvider } = setup();
    expect(store.getSnapshot().phase).toBe(WALLET_PHASES.DISCONNECTED);
    store.openChooser([option]);
    expect(store.getSnapshot()).toMatchObject({ phase: WALLET_PHASES.CHOOSER_OPEN, providers: [option] });
    expect(selectedProvider.request).not.toHaveBeenCalled();
    store.closeChooser();
    expect(store.getSnapshot().phase).toBe(WALLET_PHASES.DISCONNECTED);
  });

  it("supports the canonical wallet state-machine aliases", () => {
    const { store } = setup();
    const seen = [];
    const unsubscribe = store.subscribeWalletState((state) => seen.push(state.phase));
    expect(store.getWalletState().phase).toBe(WALLET_PHASES.DISCONNECTED);
    expect(seen).toEqual([WALLET_PHASES.DISCONNECTED]);
    expect(store.getWalletState()).toEqual(store.getSnapshot());
    unsubscribe();
  });

  it("fails closed without a stale provider, account, or write client after rejection", async () => {
    const selectedProvider = provider();
    const store = createWalletSessionStore({
      connectProvider: vi.fn(async () => { throw Object.assign(new Error("Rejected"), { code: 4001 }); }),
      createWriteClient: vi.fn(),
      targetChainId: () => TARGET_CHAIN,
    });
    await expect(store.connect({ label: "OKX Wallet", provider: selectedProvider })).rejects.toMatchObject({ code: 4001 });
    expect(store.getSnapshot()).toMatchObject({ phase: WALLET_PHASES.ERROR, selected: null, account: "", writeClient: null, error: "Rejected" });
    expect(walletView(store.getSnapshot())).toMatchObject({ canWrite: false, actionLabel: "Connect wallet" });
  });
});
