import "./style.css";
import { connectSelectedProvider, createProviderDiscovery, switchToChain } from "./providers.js";
import { transactionExplorerUrl, STUDIONET_EXPLORER_URL } from "./explorer.js";
import { handleWalletDialogKeydown, restoreDialogFocus } from "./walletDialog.js";
import { createWalletSessionStore, WALLET_PHASES, walletView } from "./walletSession.js";
import { isSuccessfulTransaction } from "./transactionOutcome.js";
import {
  assertExpectedReadback,
  classifyWriteError,
  INITIAL_WRITE_PROGRESS,
  PENDING_PHASES,
  TRANSACTION_COPY,
} from "./transactionProgress.js";
import {
  clearPendingWrite,
  isTransactionHash,
  preparePendingStorage,
  readPendingWrite,
  savePendingWrite,
} from "./transactionRecovery.js";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "";
const discovery = createProviderDiscovery();
const cache = new Map();
const inflight = new Map();
let sdkPromise = null;
let createClient;
let studionet;
let TransactionStatus;
let readClient;
let initiatingControl = null;
let lastTxHash = "";
let lastOperation = "";
let lastDatasetId = "";
let reconciling = false;
let writeInFlight = false;
let pendingPersistenceDegraded = false;

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
let lastWalletStatus = "";
const walletStore = createWalletSessionStore({
  connectProvider: async (option) => {
    await loadSdk();
    return connectSelectedProvider(option, chainConfig());
  },
  createWriteClient: (provider, activeAccount) => createClient({ chain: studionet, account: activeAccount, provider }),
  targetChainId: () => `0x${studionet.id.toString(16)}`,
  formatError: connectionErrorMessage,
});

async function loadSdk() {
  if (!sdkPromise) {
    sdkPromise = Promise.all([
      import("genlayer-js"),
      import("genlayer-js/chains"),
      import("genlayer-js/types"),
    ]).then(([core, chains, types]) => {
      createClient = core.createClient;
      studionet = chains.studionet;
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

function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
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

function renderWalletState(snapshot) {
  const view = walletView(snapshot);
  const state = $("#walletState");
  const action = $("#connectButton");
  state.textContent = view.badge;
  state.classList.toggle("connected", view.connected);
  action.textContent = view.actionLabel;
  $("#walletError").textContent = snapshot.phase === WALLET_PHASES.ERROR ? snapshot.error : "";
  if (snapshot.publicStatus && snapshot.publicStatus !== lastWalletStatus) {
    notice(snapshot.publicStatus, snapshot.phase === WALLET_PHASES.CONNECTED ? "success" : "warning");
  }
  lastWalletStatus = snapshot.publicStatus;
  for (const id of ["registerButton", "freezeButton", "assessButton", "retryButton"]) {
    const control = $("#" + id);
    if (control) control.disabled = !view.canWrite || writeInFlight;
  }
}

function chainConfig() {
  return {
    id: studionet.id,
    name: studionet.name,
    nativeCurrency: studionet.nativeCurrency,
    rpcUrls: studionet.rpcUrls.default.http,
    blockExplorerUrls: [STUDIONET_EXPLORER_URL],
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
    const link = document.createElement("a");
    link.href = transactionExplorerUrl(hash);
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "View transaction";
    element.append(link);
    if (pendingPersistenceDegraded) {
      const warning = document.createElement("p");
      warning.className = "transaction-warning";
      warning.textContent = "Keep this page open until verification finishes. Do not reload or submit again.";
      element.append(warning);
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
    empty.className = "muted wallet-empty";
    empty.textContent = "No supported wallet is available in this browser.";
    providerOptions.append(empty);
    return;
  }
  options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "provider-option";
    button.disabled = walletStore.getSnapshot().phase === WALLET_PHASES.CONNECTING;
    const icon = document.createElement("img");
    icon.src = option.icon;
    icon.alt = "";
    icon.width = 42;
    icon.height = 42;
    icon.className = "provider-icon";
    const copy = document.createElement("span");
    copy.className = "provider-copy";
    const name = document.createElement("strong");
    name.className = "provider-name";
    name.textContent = option.label;
    copy.append(name);
    const arrow = document.createElement("span");
    arrow.className = "provider-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
    button.append(icon, copy, arrow);
    button.addEventListener("click", () => connect(option));
    providerOptions.append(button);
  });
}

async function connect(option) {
  if (walletStore.getSnapshot().phase === WALLET_PHASES.CONNECTING) return;
  renderProviders(discovery.getOptions());
  $("#walletError").textContent = "";
  providerOptions.setAttribute("aria-busy", "true");
  try {
    await walletStore.connect(option);
    dialog.close();
  } catch {
    // The canonical wallet store owns and renders the public error.
  } finally {
    renderProviders(discovery.getOptions());
    providerOptions.removeAttribute("aria-busy");
  }
}

function clearWalletSession(message) {
  walletStore.disconnect(message);
}

async function ensureWriteReady() {
  await loadSdk();
  requireAddress();
  let session = walletStore.getSnapshot();
  if (!session.selected || !session.writeClient || !session.account) throw new Error("Choose a wallet before writing.");
  const currentChain = await session.selected.provider.request({ method: "eth_chainId" });
  if (String(currentChain).toLowerCase() !== `0x${studionet.id.toString(16)}`) {
    await switchToChain(session.selected.provider, chainConfig());
    const afterSwitch = await session.selected.provider.request({ method: "eth_chainId" });
    if (String(afterSwitch).toLowerCase() !== `0x${studionet.id.toString(16)}`) throw new Error("Wallet network is not ready.");
    walletStore.applyChain(afterSwitch);
    session = walletStore.getSnapshot();
  }
  const balance = await readClient.getBalance({ address: session.account });
  if (balance === 0n) {
    const error = new Error("This wallet has no GEN for the transaction.");
    error.code = "INSUFFICIENT_FUNDS";
    throw error;
  }
}

function setWriteControlsDisabled(disabled) {
  writeInFlight = disabled;
  renderWalletState(walletStore.getSnapshot());
}

async function write(functionName, args, datasetId) {
  if (writeInFlight) return;
  const storage = browserStorage();
  const pending = readPendingWrite(storage, CONTRACT_ADDRESS, Object.keys(ACTION_LABELS));
  if (pending) {
    lastTxHash = pending.hash;
    lastOperation = pending.operation;
    lastDatasetId = pending.datasetId;
    setTransactionPhase("RECONCILIATION_REQUIRED", "An existing transaction still needs verification.", pending.hash);
    notice("An existing transaction needs verification. Do not submit again.", "warning");
    return;
  }
  writeInFlight = true;
  setWriteControlsDisabled(true);
  lastTxHash = "";
  lastOperation = functionName;
  lastDatasetId = datasetId;
  pendingPersistenceDegraded = false;
  setTransactionPhase(INITIAL_WRITE_PROGRESS.phase);
  let txHash = "";
  try {
    preparePendingStorage(storage);
    await ensureWriteReady();
    const action = ACTION_LABELS[functionName] || "Continue";
    setTransactionPhase("WAITING_FOR_WALLET");
    notice(`Confirm ${action.toLowerCase()} in your wallet.`);
    let candidate;
    try {
      candidate = await walletStore.getSnapshot().writeClient.writeContract({ address: requireAddress(), functionName, args, value: 0n });
    } catch (error) {
      if (Number(error?.code) === 4001 || error?.code) throw error;
      const ambiguous = new Error(error?.message || "The transaction submission result is uncertain.");
      ambiguous.code = "SUBMISSION_AMBIGUOUS";
      throw ambiguous;
    }
    if (!isTransactionHash(candidate)) {
      const error = new Error("The wallet did not return a transaction reference.");
      error.code = "SUBMISSION_AMBIGUOUS";
      throw error;
    }
    txHash = String(candidate);
    lastTxHash = txHash;
    pendingPersistenceDegraded = !savePendingWrite(storage, {
      hash: txHash,
      operation: functionName,
      datasetId,
      account: walletStore.getSnapshot().account,
      contract: requireAddress(),
    });
    setTransactionPhase("SUBMITTED", "Your wallet accepted the request.", txHash);
    notice(
      pendingPersistenceDegraded
        ? "Keep this page open until the transaction is verified."
        : `${action} submitted.`,
      pendingPersistenceDegraded ? "warning" : "",
    );
    setTransactionPhase("WAITING_FOR_FINALITY", "The network is confirming the transaction.", txHash);
    const receipt = await readClient.waitForTransactionReceipt({ hash: txHash, status: TransactionStatus.FINALIZED, interval: 3000, retries: 50 });
    setTransactionPhase("VERIFYING_EXECUTION", "The transaction is finalized; checking that it completed successfully.", txHash);
    if (!isSuccessfulTransaction(receipt)) {
      const error = new Error("The finalized transaction did not complete successfully.");
      error.code = "EXECUTION_FAILED";
      throw error;
    }
    setTransactionPhase("VERIFYING_READBACK", "Checking the saved case details before reporting completion.", txHash);
    invalidateCase(datasetId);
    const readback = await loadCase(datasetId);
    assertExpectedReadback(functionName, readback);
    if (!clearPendingWrite(storage)) {
      const error = new Error("Transaction recovery cleanup is unavailable. Do not submit again.");
      error.code = "CLEANUP_FAILED";
      throw error;
    }
    pendingPersistenceDegraded = false;
    setTransactionPhase("SUCCESS", "The saved case details were verified.", txHash);
    notice(`${action} confirmed. Case details were refreshed.`, "success");
  } catch (error) {
    if (error?.code === "EXECUTION_FAILED" || error?.code === "READBACK_MISMATCH") clearPendingWrite(storage);
    showWriteError(error, txHash);
    throw error;
  } finally {
    writeInFlight = false;
    setWriteControlsDisabled(false);
  }
}

async function reconcileLastTransaction() {
  if (reconciling || !lastTxHash || !lastOperation || !lastDatasetId) return;
  reconciling = true;
  const hash = lastTxHash;
  const storage = browserStorage();
  try {
    await loadSdk();
    setTransactionPhase("WAITING_FOR_FINALITY", "Checking the existing transaction.", hash);
    const receipt = await readClient.waitForTransactionReceipt({ hash, status: TransactionStatus.FINALIZED, interval: 3000, retries: 50 });
    setTransactionPhase("VERIFYING_EXECUTION", "The transaction is finalized; checking that it completed successfully.", hash);
    if (!isSuccessfulTransaction(receipt)) {
      const error = new Error("The finalized transaction did not complete successfully.");
      error.code = "EXECUTION_FAILED";
      throw error;
    }
    setTransactionPhase("VERIFYING_READBACK", "Checking the saved case details before reporting completion.", hash);
    invalidateCase(lastDatasetId);
    const readback = await loadCase(lastDatasetId);
    assertExpectedReadback(lastOperation, readback);
    if (!clearPendingWrite(storage)) {
      const error = new Error("Transaction recovery cleanup is unavailable. Do not submit again.");
      error.code = "CLEANUP_FAILED";
      throw error;
    }
    pendingPersistenceDegraded = false;
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
  const entries = Object.entries(value || {});
  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No case loaded yet.";
    readback.append(empty);
    return value;
  }
  entries.forEach(([key, item]) => {
    const row = document.createElement("div");
    row.className = "readback-row";
    const label = document.createElement("span");
    label.className = "readback-label";
    label.textContent = READBACK_LABELS[key] || key;
    const content = document.createElement("strong");
    content.className = "readback-value";
    if (key === "state" || key === "outcome") {
      content.classList.add("readback-badge-val");
      content.setAttribute("data-status", String(item).toLowerCase());
    } else if (key.includes("digest") || key === "owner" || key === "repository_commit") {
      content.classList.add("readback-code-val");
    }
    content.textContent = String(item);
    row.append(label, content);
    readback.append(row);
  });
  if (lastTxHash) {
    const link = document.createElement("a");
    link.href = transactionExplorerUrl(lastTxHash);
    link.target = "_blank";
    link.rel = "noreferrer";
    link.className = "readback-tx-link";
    link.textContent = "View verified transaction on explorer →";
    readback.append(link);
  }
  return value;
}

function caseId() {
  const value = $("#caseId").value.trim();
  if (!value) throw new Error("Enter a dataset ID first.");
  return value;
}

function restorePendingWrite() {
  const pending = readPendingWrite(browserStorage(), CONTRACT_ADDRESS, Object.keys(ACTION_LABELS));
  if (!pending) return;
  lastTxHash = pending.hash;
  lastOperation = pending.operation;
  lastDatasetId = pending.datasetId;
  setTransactionPhase("RECONCILIATION_REQUIRED", "An existing transaction still needs verification.", pending.hash);
  notice("An existing transaction needs verification. Do not submit again.", "warning");
  void loadSdk().then(() => {
    setTransactionPhase("RECONCILIATION_REQUIRED", "An existing transaction still needs verification.", pending.hash);
  }).catch(() => {});
}

$("#connectButton").addEventListener("click", () => {
  if (walletStore.getSnapshot().selected) {
    clearWalletSession("Wallet disconnected.");
    return;
  }
  initiatingControl = $("#connectButton");
  $("#walletError").textContent = "";
  discovery.request();
  walletStore.openChooser(discovery.getOptions());
  renderProviders(walletStore.getSnapshot().providers);
  dialog.showModal();
  setTimeout(() => (providerOptions.querySelector("button") || $("#cancelDialog")).focus(), 0);
});
$("#closeDialog").addEventListener("click", () => dialog.close());
$("#cancelDialog").addEventListener("click", () => dialog.close());
dialog.addEventListener("close", () => {
  walletStore.closeChooser();
  restoreDialogFocus(initiatingControl);
});
dialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  dialog.close();
});
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});
dialog.addEventListener("keydown", (event) => handleWalletDialogKeydown(event, dialog));
discovery.subscribe((options) => walletStore.setProviders(options));
walletStore.subscribe(renderWalletState);

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

setTransactionPhase(INITIAL_WRITE_PROGRESS.phase);
restorePendingWrite();
