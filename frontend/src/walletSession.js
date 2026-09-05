export const WALLET_SESSION_STATE_MACHINE = true;

export const WALLET_PHASES = Object.freeze({
  DISCONNECTED: "DISCONNECTED",
  DISCOVERING: "DISCOVERING",
  CHOOSER_OPEN: "CHOOSER_OPEN",
  CONNECTING: "CONNECTING",
  CONNECTED: "CONNECTED",
  WRONG_CHAIN: "WRONG_CHAIN",
  ERROR: "ERROR",
});

const EMPTY_STATE = Object.freeze({
  phase: WALLET_PHASES.DISCONNECTED,
  providers: Object.freeze([]),
  selected: null,
  account: "",
  chainValid: false,
  writeClient: null,
  error: "",
  publicStatus: "",
});

function validAccount(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(value || ""));
}

export function walletView(state) {
  const connected = state.phase === WALLET_PHASES.CONNECTED;
  return {
    connected,
    canWrite: connected && Boolean(state.writeClient),
    actionLabel: state.selected ? "Disconnect" : "Connect wallet",
    badge: connected
      ? `${state.selected.label} · ${state.account.slice(0, 6)}…${state.account.slice(-4)}`
      : state.phase === WALLET_PHASES.WRONG_CHAIN ? "Network change required" : "Disconnected",
  };
}

export const selectWalletView = walletView;

export function createWalletSessionStore({ connectProvider, createWriteClient, targetChainId, formatError = (error) => String(error?.message || error) }) {
  let state = EMPTY_STATE;
  let cleanup = () => {};
  const listeners = new Set();

  const publish = (next) => {
    state = Object.freeze(next);
    listeners.forEach((listener) => listener(state));
  };

  const getWalletState = () => state;
  const subscribeWalletState = (listener) => {
    listeners.add(listener);
    listener(state);
    return () => listeners.delete(listener);
  };

  const disconnect = (publicStatus = "") => {
    cleanup();
    cleanup = () => {};
    publish({ ...EMPTY_STATE, providers: state.providers, publicStatus });
  };

  const applyChain = (chainId) => {
    if (!state.selected || !state.account) return;
    const chainValid = String(chainId).toLowerCase() === String(targetChainId()).toLowerCase();
    publish({
      ...state,
      phase: chainValid ? WALLET_PHASES.CONNECTED : WALLET_PHASES.WRONG_CHAIN,
      chainValid,
      writeClient: chainValid ? createWriteClient(state.selected.provider, state.account) : null,
      error: chainValid ? "" : "Switch to the supported network to continue.",
      publicStatus: chainValid ? "Wallet network is ready." : "Wallet network changed. Switch to the supported network to continue.",
    });
  };

  return {
    getSnapshot: getWalletState,
    getWalletState,
    subscribe: subscribeWalletState,
    subscribeWalletState,
    setProviders(providers) {
      publish({ ...state, providers: Object.freeze(providers.slice()) });
    },
    openChooser(providers) {
      publish({ ...state, phase: WALLET_PHASES.DISCOVERING, providers: Object.freeze(providers.slice()), error: "", publicStatus: "" });
      publish({ ...state, phase: WALLET_PHASES.CHOOSER_OPEN });
    },
    closeChooser() {
      if (state.phase === WALLET_PHASES.CHOOSER_OPEN || state.phase === WALLET_PHASES.DISCOVERING) {
        publish({ ...state, phase: WALLET_PHASES.DISCONNECTED, error: "", publicStatus: "" });
      }
    },
    async connect(option) {
      cleanup();
      cleanup = () => {};
      publish({ ...state, phase: WALLET_PHASES.CONNECTING, selected: null, account: "", chainValid: false, writeClient: null, error: "", publicStatus: "" });
      try {
        const session = await connectProvider(option);
        const provider = session.provider;
        const account = String(session.account).toLowerCase();
        if (!validAccount(account)) throw new Error("The selected wallet did not return a valid account.");
        const onAccountsChanged = (accounts) => {
          const next = Array.isArray(accounts) ? accounts[0] : "";
          if (!validAccount(next)) return disconnect("Wallet disconnected. Choose a wallet to reconnect.");
          const nextAccount = String(next).toLowerCase();
          publish({ ...state, account: nextAccount, writeClient: state.chainValid ? createWriteClient(provider, nextAccount) : null, publicStatus: "Wallet account changed. Review the active account before continuing." });
        };
        const onChainChanged = applyChain;
        const onDisconnect = () => disconnect("Wallet disconnected. Choose a wallet to reconnect.");
        provider.on?.("accountsChanged", onAccountsChanged);
        provider.on?.("chainChanged", onChainChanged);
        provider.on?.("disconnect", onDisconnect);
        cleanup = () => {
          provider.removeListener?.("accountsChanged", onAccountsChanged);
          provider.removeListener?.("chainChanged", onChainChanged);
          provider.removeListener?.("disconnect", onDisconnect);
        };
        publish({
          ...state,
          phase: WALLET_PHASES.CONNECTED,
          selected: option,
          account,
          chainValid: true,
          writeClient: createWriteClient(provider, account),
          error: "",
          publicStatus: "Wallet connected.",
        });
        return state;
      } catch (error) {
        publish({ ...state, phase: WALLET_PHASES.ERROR, selected: null, account: "", chainValid: false, writeClient: null, error: formatError(error), publicStatus: "" });
        throw error;
      }
    },
    applyChain,
    disconnect,
  };
}
