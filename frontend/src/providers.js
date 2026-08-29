const SUPPORTED = [
  { key: "metamask", label: "MetaMask", rdns: "io.metamask" },
  { key: "okx", label: "OKX Wallet", rdns: "com.okex.wallet" },
  { key: "rabby", label: "Rabby", rdns: "io.rabby" },
];

function isProvider(value) {
  return value && typeof value.request === "function";
}

function kindFor(info) {
  const rdns = String(info?.rdns || "").toLowerCase();
  const name = String(info?.name || "").toLowerCase();
  return SUPPORTED.find((item) => rdns === item.rdns || name.includes(item.label.toLowerCase())) || null;
}

export function createProviderDiscovery(root = window) {
  const entries = [];
  const listeners = new Set();
  let fallbackAdded = false;
  let fallbackTimer = null;

  const publish = () => listeners.forEach((listener) => listener(entries.slice()));
  const removeFallback = () => {
    const index = entries.findIndex((entry) => entry.legacy);
    if (index >= 0) entries.splice(index, 1);
    fallbackAdded = false;
  };
  const announce = (event) => {
    const detail = event?.detail || {};
    const provider = detail.provider;
    const match = kindFor(detail.info);
    if (!isProvider(provider) || !match) return;
    removeFallback();
    const uuid = String(detail.info?.uuid || "");
    const existing = entries.find((entry) => (uuid && entry.uuid === uuid) || entry.provider === provider);
    const next = { key: match.key, label: match.label, uuid, provider, legacy: false };
    if (existing) Object.assign(existing, next);
    else entries.push(next);
    publish();
  };

  root.addEventListener("eip6963:announceProvider", announce);
  root.dispatchEvent(new Event("eip6963:requestProvider"));

  const addLegacyFallbackIfNeeded = () => {
    if (entries.length || fallbackAdded || !isProvider(root.ethereum)) return;
    entries.push({ key: "legacy", label: "Legacy injected wallet", uuid: "", provider: root.ethereum, legacy: true });
    fallbackAdded = true;
    publish();
  };
  const scheduleLegacyFallback = () => {
    if (fallbackTimer || entries.length || !isProvider(root.ethereum)) return;
    fallbackTimer = setTimeout(() => {
      fallbackTimer = null;
      addLegacyFallbackIfNeeded();
    }, 100);
  };

  return {
    request() {
      root.dispatchEvent(new Event("eip6963:requestProvider"));
      scheduleLegacyFallback();
    },
    getOptions() {
      return entries.slice();
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(entries.slice());
      return () => listeners.delete(listener);
    },
  };
}

export const supportedWallets = SUPPORTED;
