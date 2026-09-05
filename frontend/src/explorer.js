export const STUDIONET_EXPLORER_URL = "https://explorer-studio.genlayer.com";

export const contractExplorerUrl = (address) => `${STUDIONET_EXPLORER_URL}/address/${address}`;
export const transactionExplorerUrl = (hash) => `${STUDIONET_EXPLORER_URL}/tx/${hash}`;
