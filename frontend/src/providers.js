const SUPPORTED = Object.freeze([
  { key: "okx", label: "OKX Wallet", rdns: ["com.okex.wallet", "com.okx.wallet"], legacyFlags: ["isOkxWallet", "isOKExWallet"], icon: "/wallets/okx.svg" },
  { key: "metamask", label: "MetaMask", rdns: ["io.metamask"], legacyFlags: ["isMetaMask"], icon: "/wallets/metamask.svg" },
  { key: "rabby", label: "Rabby", rdns: ["io.rabby"], legacyFlags: ["isRabby"], icon: "/wallets/rabby.svg" },
]);

const EMPTY = Object.freeze([]);

function isProvider(value) {
  return Boolean(value && typeof value === "object" && typeof value.request === "function");
}

function isAnnouncement(value) {
  if (!value || typeof value !== "object") return false;
  const detail = value;
  const info = detail.info;
  return Boolean(
    info &&
      typeof info.uuid === "string" && info.uuid.trim() &&
      typeof info.name === "string" && info.name.trim() &&
      typeof info.icon === "string" && info.icon.startsWith("data:image/") &&
      typeof info.rdns === "string" && info.rdns.trim() &&
      isProvider(detail.provider),
  );
}

function walletFromAnnouncement(info) {
  const rdns = String(info.rdns).trim().toLowerCase();
  const name = String(info.name).trim().toLowerCase();
  return SUPPORTED.find((wallet) => wallet.rdns.includes(rdns) && wallet.label.toLowerCase() === name) || null;
}

function walletFromLegacyFlags(provider) {
  const matches = SUPPORTED.filter((wallet) => wallet.legacyFlags.some((flag) => provider[flag] === true));
  return matches.length === 1 ? matches[0] : null;
}

function accountFrom(value) {
  const account = Array.isArray(value) ? String(value[0] || "") : "";
  if (!/^0x[0-9a-fA-F]{40}$/.test(account)) throw new Error("The selected wallet did not return a valid account.");
  return account.toLowerCase();
}

function errorCode(error) {
  return typeof error === "object" && error !== null ? Number(error.code) : undefined;
}

function chainIdHex(chain) {
  return `0x${Number(chain.id).toString(16)}`;
}

export async function switchToChain(provider, chain) {
  const chainId = chainIdHex(chain);
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
  } catch (error) {
    if (errorCode(error) !== 4902) throw error;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId,
        chainName: chain.name,
        nativeCurrency: chain.nativeCurrency,
        rpcUrls: chain.rpcUrls,
        blockExplorerUrls: chain.blockExplorerUrls,
      }],
    });
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
  }
}

export async function connectSelectedProvider(option, chain) {
  const accounts = await option.provider.request({ method: "eth_requestAccounts" });
  const account = accountFrom(accounts);
  await switchToChain(option.provider, chain);
  return { account, provider: option.provider, option };
}

export function createProviderDiscovery(root = window) {
  const byWallet = new Map();
  const providerByUuid = new Map();
  const walletByProvider = new WeakMap();
  const listeners = new Set();
  let snapshot = EMPTY;

  const publish = () => {
    snapshot = Object.freeze(SUPPORTED.flatMap((wallet) => {
      const option = byWallet.get(wallet.key);
      return option ? [option] : [];
    }));
    listeners.forEach((listener) => listener(snapshot));
  };

  const accept = (detail, legacy = false) => {
    const wallet = legacy ? walletFromLegacyFlags(detail.provider) : walletFromAnnouncement(detail.info);
    if (!wallet) return;

    const providerObject = detail.provider;
    const uuid = String(detail.info.uuid).trim();
    const priorProviderForUuid = providerByUuid.get(uuid);
    const priorWalletForProvider = walletByProvider.get(providerObject);
    const current = byWallet.get(wallet.key);
    if (priorProviderForUuid && priorProviderForUuid !== providerObject) return;
    if (priorWalletForProvider && priorWalletForProvider !== wallet.key) return;
    if (current && current.provider !== providerObject && !current.legacy) return;

    if (current?.legacy && current.provider !== providerObject) providerByUuid.delete(current.uuid);
    providerByUuid.set(uuid, providerObject);
    walletByProvider.set(providerObject, wallet.key);
    byWallet.set(wallet.key, {
      key: wallet.key,
      label: wallet.label,
      uuid,
      icon: wallet.icon,
      provider: providerObject,
      legacy,
    });
    publish();
  };

  const announce = (event) => {
    const detail = event?.detail;
    if (isAnnouncement(detail)) accept(detail);
  };

  const discoverLegacy = () => {
    const injected = root.ethereum;
    const candidates = [
      ...(Array.isArray(injected?.providers) ? injected.providers : []),
      injected,
      root.metamask,
      root.okxwallet,
      root.rabby,
    ].filter(isProvider);
    for (const provider of new Set(candidates)) {
      const wallet = walletFromLegacyFlags(provider);
      if (!wallet || byWallet.has(wallet.key)) continue;
      accept({
        info: { uuid: `legacy-${wallet.key}`, name: wallet.label, icon: wallet.icon, rdns: wallet.rdns[0] },
        provider,
      }, true);
    }
  };

  // EIP-6963 requires this listener to stay active for the page lifetime.
  root.addEventListener("eip6963:announceProvider", announce);
  root.dispatchEvent(new Event("eip6963:requestProvider"));
  queueMicrotask(discoverLegacy);

  return {
    request() {
      root.dispatchEvent(new Event("eip6963:requestProvider"));
      discoverLegacy();
    },
    getOptions: () => snapshot.slice(),
    subscribe(listener) {
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    },
  };
}

export const supportedWallets = SUPPORTED;
