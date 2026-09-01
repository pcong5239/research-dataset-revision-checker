const SUPPORTED = Object.freeze([
  { key: "metamask", label: "MetaMask", rdns: "io.metamask", legacyFlag: "isMetaMask" },
  { key: "okx", label: "OKX Wallet", rdns: "com.okex.wallet", legacyFlag: "isOkxWallet" },
  { key: "rabby", label: "Rabby", rdns: "io.rabby", legacyFlag: "isRabby" },
]);

const LEGACY_UUID = "legacy-window-ethereum";
const EMPTY = Object.freeze([]);
const FALLBACK_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Crect width='48' height='48' rx='12' fill='%2318312f'/%3E%3Cpath d='M14 14h20v20H14z' fill='none' stroke='white' stroke-width='3'/%3E%3Ccircle cx='24' cy='24' r='4' fill='%23d78945'/%3E%3C/svg%3E";

function isProvider(value) {
  return Boolean(value && typeof value === "object" && typeof value.request === "function");
}

function isIcon(value) {
  return typeof value === "string" && value.startsWith("data:image/");
}

function kindFor(info) {
  const rdns = String(info?.rdns || "").toLowerCase();
  const name = String(info?.name || "").toLowerCase();
  return SUPPORTED.find((item) => rdns === item.rdns || name === item.label.toLowerCase()) || null;
}

function legacyKind(provider) {
  return SUPPORTED.find((item) => provider[item.legacyFlag] === true) || null;
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
  const byUuid = new Map();
  const uuidByProvider = new WeakMap();
  const listeners = new Set();
  let snapshot = EMPTY;
  let fallbackTimer = null;

  const publish = () => {
    snapshot = Object.freeze([...byUuid.values()].sort((a, b) => a.label.localeCompare(b.label)));
    listeners.forEach((listener) => listener(snapshot));
  };

  const removeFallback = () => {
    if (byUuid.delete(LEGACY_UUID)) publish();
  };

  const announce = (event) => {
    const detail = event?.detail || {};
    const info = detail.info || {};
    const provider = detail.provider;
    const match = kindFor(info);
    const uuid = String(info.uuid || "");
    if (!match || !uuid || !isProvider(provider) || !isIcon(info.icon)) return;

    const priorUuid = uuidByProvider.get(provider);
    const priorForUuid = byUuid.get(uuid);
    if ((priorUuid && priorUuid !== uuid) || (priorForUuid && priorForUuid.provider !== provider)) return;

    removeFallback();
    uuidByProvider.set(provider, uuid);
    byUuid.set(uuid, {
      key: match.key,
      label: match.label,
      uuid,
      icon: info.icon,
      provider,
      legacy: false,
    });
    publish();
  };

  root.addEventListener("eip6963:announceProvider", announce);
  root.dispatchEvent(new Event("eip6963:requestProvider"));

  const addLegacyFallbackIfNeeded = () => {
    fallbackTimer = null;
    if (byUuid.size || !isProvider(root.ethereum)) return;
    const match = legacyKind(root.ethereum);
    if (!match) return;
    byUuid.set(LEGACY_UUID, {
      key: match.key,
      label: match.label,
      uuid: LEGACY_UUID,
      icon: FALLBACK_ICON,
      provider: root.ethereum,
      legacy: true,
    });
    uuidByProvider.set(root.ethereum, LEGACY_UUID);
    publish();
  };

  const request = () => {
    root.dispatchEvent(new Event("eip6963:requestProvider"));
    if (!fallbackTimer && !byUuid.size && isProvider(root.ethereum)) {
      fallbackTimer = setTimeout(addLegacyFallbackIfNeeded, 100);
    }
  };

  return {
    request,
    getOptions: () => snapshot.slice(),
    subscribe(listener) {
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    },
  };
}

export const supportedWallets = SUPPORTED;
