import "./style.css";
import { connectSelectedProvider, createProviderDiscovery, switchToChain } from "./providers.js";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "";
const discovery = createProviderDiscovery();
const cache = new Map();
const inflight = new Map();
let sdkPromise = null;
let createClient;
let studionet;
let ExecutionResult;
let TransactionStatus;
let readClient;
let selected = null;
let account = "";
let writeClient = null;
let sessionCleanup = () => {};
let initiatingControl = null;
let lastTxHash = "";

const ACTION_LABELS = {
  register_case: "Register case",
  freeze_case: "Freeze case",
  assess: "Assess case",
  retry_unresolved: "Retry assessment",
};

const READBACK_LABELS = {
  owner: "Owner",
  dataset_id: "Dataset ID",
  landing_url: "Landing page",
  repository_url: "Repository",
  expected_version: "Expected version",
  expected_license: "Expected license",
  state: "Case status",
  outcome: "Assessment result",
  repository_commit: "Repository commit",
  metadata_digest: "Metadata digest",
  evidence_digest: "Evidence digest",
  retry_count: "Retry count",
};

const $ = (selector) => document.querySelector(selector);
const dialog = $("#walletDialog");
const providerOptions = $("#providerOptions");

async function loadSdk() {
  if (!sdkPromise) {
    sdkPromise = Promise.all([
      import("genlayer-js"),
      import("genlayer-js/chains"),
      import("genlayer-js/types"),
    ]).then(([core, chains, types]) => {
      createClient = core.createClient;
      studionet = chains.studionet;
      ExecutionResult = types.ExecutionResult;
      TransactionStatus = types.TransactionStatus;
      readClient = createClient({ chain: studionet });
    });
  }
  await sdkPromise;
}

function notice(message, tone = "") {
  const element = $("#globalNotice");
  element.textContent = message;
  element.className = `notice ${tone}`;
}

function errorMessage(error) {
  return String(error?.shortMessage || error?.message || error || "Unknown error").replace(/0x[a-f-f0-9]{64}/gi, "[transaction hash]");
}

function requireAddress() {
  if (!/^0x[a-fA-F0-9]{40}$/.test(CONTRACT_ADDRESS)) throw new Error("Contract address is not configured for this release.");
  return CONTRACT_ADDRESS;
}

function cacheKey(method, args) {
  return `${studionet.id}:${CONTRACT_ADDRESS}:${method}:${JSON.stringify(args)}`;
}

async function readContract(method, args = [], ttl = 5000) {
  await loadSdk();
  const key = cacheKey(method, args);
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;
  if (inflight.has(key)) return inflight.get(key);
  const request = readClient.readContract({ address: requireAddress(), functionName: method, args })
    .then((value) => {
      cache.set(key, { value, expires: Date.now() + ttl });
      return value;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, request);
  return request;
}

function invalidateCase(datasetId) {
  for (const key of cache.keys()) if (key.endsWith(`get_case:${JSON.stringify([datasetId])}`)) cache.delete(key);
}

function setWalletState(label, connected = false) {
  const state = $("#walletState");
  state.textContent = connected ? `${label} · ${account.slice(0, 6)}…${account.slice(-4)}` : label;
  state.classList.toggle("connected", connected);
}

function chainConfig() {
  return {
    id: studionet.id,
    name: studionet.name,
    nativeCurrency: studionet.nativeCurrency,
    rpcUrls: studionet.rpcUrls.default.http,
    blockExplorerUrls: [studionet.blockExplorers.default.url],
  };
}

function renderTransaction(hash, label) {
  const element = $("#transactionStatus");
  element.replaceChildren();
  const text = document.createElement("span");
  text.textContent = `${label}: ${hash}`;
  const copy = document.createElement("button");
  copy.type = "button";
  copy.className = "button button-quiet copy-button";
  copy.textContent = "Copy hash";
  copy.addEventListener("click", async () => {
    await navigator.clipboard.writeText(hash);
    copy.textContent = "Copied";
  });
  element.append(text, copy);
}

function renderProviders(options) {
  providerOptions.replaceChildren();
  if (!options.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No supported wallet is available in this browser.";
    providerOptions.append(empty);
    return;
  }
  options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "provider-option";
    const icon = document.createElement("img");
    icon.src = option.icon;
    icon.alt = "";
    icon.width = 40;
    icon.height = 40;
    const copy = document.createElement("span");
    copy.className = "provider-copy";
    const name = document.createElement("strong");
    name.textContent = option.label;
    const detail = document.createElement("small");
    detail.textContent = "Browser wallet";
    copy.append(name, detail);
    const arrow = document.createElement("span");
    arrow.className = "provider-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "›";
    button.append(icon, copy, arrow);
    button.addEventListener("click", () => connect(option));
    providerOptions.append(button);
  });
}

async function connect(option) {
  $("#walletError").textContent = "";
  providerOptions.setAttribute("aria-busy", "true");
  try {
    await loadSdk();
    const session = await connectSelectedProvider(option, chainConfig());
    sessionCleanup();
    account = session.account;
    selected = session.provider;
    writeClient = createClient({ chain: studionet, account, provider: selected });
    const onAccountsChanged = (next) => {
      if (!Array.isArray(next) || !next[0] || !/^0x[0-9a-fA-F]{40}$/.test(String(next[0]))) {
        clearWalletSession("Wallet disconnected. Choose a wallet to reconnect.");
        return;
      }
      account = String(next[0]).toLowerCase();
      writeClient = createClient({ chain: studionet, account, provider: selected });
      setWalletState(option.label, true);
      notice("Wallet account changed. Review the active account before continuing.", "warning");
    };
    const onChainChanged = (chainId) => {
      if (String(chainId).toLowerCase() === `0x${studionet.id.toString(16)}`) {
        writeClient = createClient({ chain: studionet, account, provider: selected });
        notice("Wallet network is ready.", "success");
        return;
      }
      writeClient = null;
      notice("Wallet network changed. Reconnect on the supported network before writing.", "warning");
    };
    const onDisconnect = () => onAccountsChanged([]);
    selected.on?.("accountsChanged", onAccountsChanged);
    selected.on?.("chainChanged", onChainChanged);
    selected.on?.("disconnect", onDisconnect);
    sessionCleanup = () => {
      selected.removeListener?.("accountsChanged", onAccountsChanged);
      selected.removeListener?.("chainChanged", onChainChanged);
      selected.removeListener?.("disconnect", onDisconnect);
    };
    setWalletState(option.label, true);
    dialog.close();
    notice("Wallet connected.", "success");
  } catch (error) {
    $("#walletError").textContent = errorMessage(error);
  } finally {
    providerOptions.removeAttribute("aria-busy");
  }
}

function clearWalletSession(message) {
  sessionCleanup();
  sessionCleanup = () => {};
  selected = null;
  writeClient = null;
  account = "";
  setWalletState("Disconnected");
  if (message) notice(message, "warning");
}

async function ensureWriteReady() {
  await loadSdk();
  requireAddress();
  if (!selected || !writeClient || !account) throw new Error("Choose a wallet before writing.");
  const currentChain = await selected.request({ method: "eth_chainId" });
  if (String(currentChain).toLowerCase() !== `0x${studionet.id.toString(16)}`) {
    await switchToChain(selected, chainConfig());
    const afterSwitch = await selected.request({ method: "eth_chainId" });
    if (String(afterSwitch).toLowerCase() !== `0x${studionet.id.toString(16)}`) throw new Error("Wallet network is not ready.");
    writeClient = createClient({ chain: studionet, account, provider: selected });
  }
  const balance = await readClient.getBalance({ address: account });
  if (balance === 0n) throw new Error("This wallet has no GEN for the transaction.");
}

async function write(functionName, args, datasetId) {
  await ensureWriteReady();
  const action = ACTION_LABELS[functionName] || "Continue";
  notice(`Confirm ${action.toLowerCase()} in your wallet.`);
  const txHash = await writeClient.writeContract({ address: requireAddress(), functionName, args, value: 0n });
  lastTxHash = txHash;
  renderTransaction(txHash, "Waiting for confirmation");
  notice(`${action} submitted.`);
  const receipt = await readClient.waitForTransactionReceipt({ hash: txHash, status: TransactionStatus.FINALIZED, interval: 3000, retries: 50 });
  if (receipt.txExecutionResultName !== ExecutionResult.FINISHED_WITH_RETURN) {
    throw new Error(`Finalized transaction did not succeed: ${receipt.txExecutionResultName || "unknown execution result"}.`);
  }
  invalidateCase(datasetId);
  await loadCase(datasetId);
  renderTransaction(txHash, "Confirmed");
  notice(`${action} confirmed. Case details were refreshed.`, "success");
}

async function loadCase(datasetId) {
  const value = await readContract("get_case", [datasetId]);
  const readback = $("#caseReadback");
  readback.replaceChildren();
  Object.entries(value || {}).forEach(([key, item]) => {
    const row = document.createElement("div");
    row.className = "readback-row";
    const label = document.createElement("span");
    label.textContent = READBACK_LABELS[key] || key;
    const content = document.createElement("strong");
    content.textContent = String(item);
    row.append(label, content);
    readback.append(row);
  });
  if (lastTxHash) {
    const link = document.createElement("a");
    link.href = `${studionet.blockExplorers.default.url}/tx/${lastTxHash}`;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = `View transaction ${lastTxHash.slice(0, 10)}…`;
    readback.append(link);
  }
  return value;
}

function caseId() {
  const value = $("#caseId").value.trim();
  if (!value) throw new Error("Enter a dataset ID first.");
  return value;
}

$("#connectButton").addEventListener("click", () => {
  initiatingControl = $("#connectButton");
  $("#walletError").textContent = "";
  discovery.request();
  renderProviders(discovery.getOptions());
  dialog.showModal();
  setTimeout(() => (providerOptions.querySelector("button") || $("#cancelDialog")).focus(), 0);
});
$("#closeDialog").addEventListener("click", () => dialog.close());
$("#cancelDialog").addEventListener("click", () => dialog.close());
dialog.addEventListener("close", () => initiatingControl?.focus());
dialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  dialog.close();
});
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});
discovery.subscribe(renderProviders);

$("#registerForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  try {
    await write("register_case", [...data.values()], String(data.get("dataset_id")).trim());
    $("#caseId").value = String(data.get("dataset_id")).trim();
  } catch (error) {
    notice(errorMessage(error), "error");
  }
});

$("#caseForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try { await loadCase(caseId()); notice("Readback loaded from the configured contract."); }
  catch (error) { notice(errorMessage(error), "error"); }
});

for (const [id, method] of [["freezeButton", "freeze_case"], ["assessButton", "assess"], ["retryButton", "retry_unresolved"]]) {
  $("#" + id).addEventListener("click", async () => {
    try { await write(method, [caseId()], caseId()); }
    catch (error) { notice(lastTxHash ? `${errorMessage(error)} Transaction remains ${lastTxHash}.` : errorMessage(error), "error"); }
  });
}

setWalletState("Disconnected");
