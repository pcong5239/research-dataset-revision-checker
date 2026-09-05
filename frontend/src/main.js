import "./style.css";
import { connectSelectedProvider, createProviderDiscovery, switchToChain } from "./providers.js";
import {
  assertExpectedReadback,
  classifyWriteError,
  INITIAL_WRITE_PROGRESS,
  PENDING_PHASES,
  TRANSACTION_COPY,
} from "./transactionProgress.js";

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
let lastOperation = "";
let lastDatasetId = "";
let reconciling = false;
let connecting = false;

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
  return String(error?.shortMessage || error?.message || error || "The request could not be completed.")
    .replace(/0x[a-f-f0-9]{64}/gi, "[transaction hash]")
    .replace(/\s+/g, " ")
    .trim();
}

function connectionErrorMessage(error) {
  if (Number(error?.code) === 4001) return "Wallet connection was cancelled. Choose a wallet to try again.";
  if (Number(error?.code) === 4902) return "This wallet does not support the selected network.";
  return "Wallet connection could not be completed. Choose a wallet to try again.";
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

function renderTransaction(hash = "", phase = "IDLE", detail = "") {
  const element = $("#transactionStatus");
  element.setAttribute("data-transaction-phase", phase);
  element.setAttribute("role", phase === "REJECTED" || phase === "FAILED" ? "alert" : "status");
  element.setAttribute("aria-live", phase === "REJECTED" || phase === "FAILED" ? "assertive" : "polite");
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) element.classList.add("reduced-motion");
  else element.classList.remove("reduced-motion");
  element.replaceChildren();
  if (PENDING_PHASES.has(phase)) {
    const spinner = document.createElement("span");
    spinner.className = "transaction-spinner";
    spinner.setAttribute("aria-hidden", "true");
    element.append(spinner);
  }
  const copy = TRANSACTION_COPY[phase] || TRANSACTION_COPY.IDLE;
  const text = document.createElement("span");
  text.className = "transaction-copy";
  text.textContent = detail || copy.detail;
  element.append(text);
  if (hash) {
    const hashText = document.createElement("code");
    hashText.className = "transaction-hash";
    hashText.textContent = hash;
    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "button button-quiet copy-button";
    copyButton.textContent = "Copy hash";
    copyButton.addEventListener("click", async () => {
      await navigator.clipboard.writeText(hash);
      copyButton.textContent = "Copied";
    });
    element.append(hashText, copyButton);
    if (studionet?.blockExplorers?.default?.url) {
      const link = document.createElement("a");
      link.href = `${studionet.blockExplorers.default.url}/tx/${hash}`;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = "View transaction";
      element.append(link);
    }
  }
  if (phase === "RECONCILIATION_REQUIRED") {
    const reconcile = document.createElement("button");
    reconcile.type = "button";
    reconcile.className = "button button-quiet reconcile-button";
    reconcile.textContent = "Check existing transaction";
    reconcile.addEventListener("click", reconcileLastTransaction);
    element.append(reconcile);
  }
}

function setTransactionPhase(phase, detail = "", hash = lastTxHash) {
  renderTransaction(hash, phase, detail);
}

function showWriteError(error, hash = lastTxHash) {
  const result = classifyWriteError(error, Boolean(hash));
  setTransactionPhase(result.phase, result.message, hash);
  notice(result.message, "error");
  return result;
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
    button.disabled = connecting;
    const icon = document.createElement("img");
    icon.src = option.icon;
    icon.alt = "";
    icon.width = 40;
    icon.height = 40;
    const copy = document.createElement("span");
    copy.className = "provider-copy";
    const name = document.createElement("strong");
    name.textContent = option.label;
    copy.append(name);
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
  if (connecting) return;
  connecting = true;
  renderProviders(discovery.getOptions());
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
    $("#walletError").textContent = connectionErrorMessage(error);
  } finally {
    connecting = false;
    renderProviders(discovery.getOptions());
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
  lastTxHash = "";
  lastOperation = functionName;
  lastDatasetId = datasetId;
  setTransactionPhase(INITIAL_WRITE_PROGRESS.phase);
  let txHash = "";
  try {
    await ensureWriteReady();
    const action = ACTION_LABELS[functionName] || "Continue";
    setTransactionPhase("WAITING_FOR_WALLET");
    notice(`Confirm ${action.toLowerCase()} in your wallet.`);
    const candidate = await writeClient.writeContract({ address: requireAddress(), functionName, args, value: 0n });
    if (!/^0x[a-fA-F0-9]{64}$/.test(String(candidate))) throw new Error("The wallet did not return a transaction reference.");
    txHash = String(candidate);
    lastTxHash = txHash;
    setTransactionPhase("SUBMITTED", "Your wallet accepted the request.", txHash);
    notice(`${action} submitted.`);
    setTransactionPhase("WAITING_FOR_FINALITY", "The network is confirming the transaction.", txHash);
    const receipt = await readClient.waitForTransactionReceipt({ hash: txHash, status: TransactionStatus.FINALIZED, interval: 3000, retries: 50 });
    setTransactionPhase("VERIFYING_EXECUTION", "The transaction is finalized; checking that it completed successfully.", txHash);
    if (receipt.txExecutionResultName !== ExecutionResult.FINISHED_WITH_RETURN) {
      const error = new Error("The finalized transaction did not complete successfully.");
      error.code = "EXECUTION_FAILED";
      throw error;
    }
    setTransactionPhase("VERIFYING_READBACK", "Checking the saved case details before reporting completion.", txHash);
    invalidateCase(datasetId);
    const readback = await loadCase(datasetId);
    assertExpectedReadback(functionName, readback);
    setTransactionPhase("SUCCESS", "The saved case details were verified.", txHash);
    notice(`${action} confirmed. Case details were refreshed.`, "success");
  } catch (error) {
    showWriteError(error, txHash);
    throw error;
  }
}

async function reconcileLastTransaction() {
  if (reconciling || !lastTxHash || !lastOperation || !lastDatasetId) return;
  reconciling = true;
  const hash = lastTxHash;
  try {
    setTransactionPhase("WAITING_FOR_FINALITY", "Checking the existing transaction.", hash);
    const receipt = await readClient.waitForTransactionReceipt({ hash, status: TransactionStatus.FINALIZED, interval: 3000, retries: 50 });
    setTransactionPhase("VERIFYING_EXECUTION", "The transaction is finalized; checking that it completed successfully.", hash);
    if (receipt.txExecutionResultName !== ExecutionResult.FINISHED_WITH_RETURN) {
      const error = new Error("The finalized transaction did not complete successfully.");
      error.code = "EXECUTION_FAILED";
      throw error;
    }
    setTransactionPhase("VERIFYING_READBACK", "Checking the saved case details before reporting completion.", hash);
    invalidateCase(lastDatasetId);
    const readback = await loadCase(lastDatasetId);
    assertExpectedReadback(lastOperation, readback);
    setTransactionPhase("SUCCESS", "The saved case details were verified.", hash);
    notice("The existing transaction was verified successfully.", "success");
  } catch (error) {
    showWriteError(error, hash);
  } finally {
    reconciling = false;
  }
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
    link.textContent = "View transaction";
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
dialog.addEventListener("keydown", (event) => {
  if (event.key !== "Tab") return;
  const controls = [...dialog.querySelectorAll("button:not([disabled]), [href], input, select, textarea")]
    .filter((control) => !control.hasAttribute("hidden") && control.getAttribute("aria-hidden") !== "true");
  if (!controls.length) return;
  const first = controls[0];
  const last = controls[controls.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});
discovery.subscribe(renderProviders);

$("#registerForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  try {
    await write("register_case", [...data.values()], String(data.get("dataset_id")).trim());
    $("#caseId").value = String(data.get("dataset_id")).trim();
  } catch (error) {
    showWriteError(error, lastTxHash);
  }
});

$("#caseForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try { await loadCase(caseId()); notice("Readback loaded from the configured contract."); }
  catch (error) { notice(error?.message?.startsWith("Enter a dataset ID") ? errorMessage(error) : "Case details could not be loaded. Try again.", "error"); }
});

for (const [id, method] of [["freezeButton", "freeze_case"], ["assessButton", "assess"], ["retryButton", "retry_unresolved"]]) {
  $("#" + id).addEventListener("click", async () => {
    try {
      const idValue = caseId();
      await write(method, [idValue], idValue);
    } catch (error) {
      if (error?.message?.startsWith("Enter a dataset ID")) notice(errorMessage(error), "error");
      else showWriteError(error, lastTxHash);
    }
  });
}

setWalletState("Disconnected");
setTransactionPhase(INITIAL_WRITE_PROGRESS.phase);
