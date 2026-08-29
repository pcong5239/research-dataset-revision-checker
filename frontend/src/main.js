import "./style.css";
import { createProviderDiscovery } from "./providers.js";

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
    empty.textContent = "No supported injected provider detected. Install MetaMask, OKX Wallet, or Rabby, then reload.";
    providerOptions.append(empty);
    return;
  }
  options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "provider-option";
    button.textContent = option.label;
    button.addEventListener("click", () => connect(option));
    providerOptions.append(button);
  });
}

async function connect(option) {
  $("#walletError").textContent = "";
  try {
    await loadSdk();
    const accounts = await option.provider.request({ method: "eth_requestAccounts" });
    if (!Array.isArray(accounts) || !accounts[0]) throw new Error("The wallet returned no account.");
    sessionCleanup();
    account = String(accounts[0]).toLowerCase();
    selected = option.provider;
    writeClient = createClient({ chain: studionet, account, provider: selected });
    const onAccountsChanged = (next) => {
      account = Array.isArray(next) && next[0] ? String(next[0]).toLowerCase() : "";
      writeClient = account ? createClient({ chain: studionet, account, provider: selected }) : null;
      setWalletState(account ? option.label : "Disconnected", Boolean(account));
      notice(account ? "Wallet account changed; verify the actor before writing." : "Wallet disconnected.", account ? "warning" : "");
    };
    const onChainChanged = (chainId) => notice(`Wallet network changed to ${String(chainId)}. Studionet writes require chain ${studionet.id}.`, "warning");
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
    notice("Wallet selected. The write client is bound to this provider and account.");
  } catch (error) {
    $("#walletError").textContent = errorMessage(error);
  }
}

async function ensureWriteReady() {
  await loadSdk();
  requireAddress();
  if (!selected || !writeClient || !account) throw new Error("Choose a wallet before writing.");
  const currentChain = await selected.request({ method: "eth_chainId" });
  if (Number.parseInt(currentChain, 16) !== studionet.id) {
    await writeClient.connect("studionet");
    const afterSwitch = await selected.request({ method: "eth_chainId" });
    if (Number.parseInt(afterSwitch, 16) !== studionet.id) throw new Error("Wallet is not connected to Studionet.");
  }
  const balance = await readClient.getBalance({ address: account });
  if (balance === 0n) throw new Error("This wallet has no GEN for the transaction.");
}

async function write(functionName, args, datasetId) {
  await ensureWriteReady();
  notice(`Requesting wallet signature for ${functionName}…`);
  const txHash = await writeClient.writeContract({ address: requireAddress(), functionName, args, value: 0n });
  lastTxHash = txHash;
  renderTransaction(txHash, "Awaiting finality");
  notice(`Submitted ${functionName}. Transaction: ${txHash}`);
  const receipt = await readClient.waitForTransactionReceipt({ hash: txHash, status: TransactionStatus.FINALIZED, interval: 3000, retries: 50 });
  if (receipt.txExecutionResultName !== ExecutionResult.FINISHED_WITH_RETURN) {
    throw new Error(`Finalized transaction did not succeed: ${receipt.txExecutionResultName || "unknown execution result"}.`);
  }
  invalidateCase(datasetId);
  await loadCase(datasetId);
  renderTransaction(txHash, "Finalized with successful execution");
  notice(`${functionName} finalized with successful execution and authoritative readback.`, "success");
}

async function loadCase(datasetId) {
  const value = await readContract("get_case", [datasetId]);
  const readback = $("#caseReadback");
  readback.replaceChildren();
  Object.entries(value || {}).forEach(([key, item]) => {
    const row = document.createElement("div");
    row.className = "readback-row";
    const label = document.createElement("span");
    label.textContent = key;
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
  setTimeout(() => providerOptions.querySelector("button")?.focus(), 0);
});
$("#closeDialog").addEventListener("click", () => dialog.close());
dialog.addEventListener("close", () => initiatingControl?.focus());
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

if (!CONTRACT_ADDRESS) notice("Frontend configuration is incomplete: set VITE_CONTRACT_ADDRESS for this deployment.", "warning");
setWalletState("Disconnected");
