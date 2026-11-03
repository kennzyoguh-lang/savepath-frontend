const env = import.meta.env ?? {};
export const CHAIN_ID = Number(env.VITE_CHAIN_ID || 11142220);
export const RPC_URL =
  env.VITE_RPC_URL || "https://forno.celo-sepolia.celo-testnet.org";
export const EXPLORER_URL =
  env.VITE_EXPLORER_URL || "https://celo-sepolia.blockscout.com";
export const CONTRACT_ADDRESS =
  env.VITE_CONTRACT_ADDRESS || "0xf3bF2289BB778bE70829DC4E7C630db4B348f5DE";
export const MOCK_API_BASE_URL = (
  env.VITE_API_BASE_URL ||
  env.VITE_MOCK_API_BASE_URL ||
  ""
).replace(/\/+$/, "");
export const AI_API_URL = (env.VITE_AI_API_URL || "").replace(/\/+$/, "");
export const WC_PROJECT_ID = env.VITE_WALLETCONNECT_PROJECT_ID || "";

export const CELO_SEPOLIA = {
  chainId: "0x" + CHAIN_ID.toString(16),
  chainName: "Celo Sepolia Testnet",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: [RPC_URL],
  blockExplorerUrls: [EXPLORER_URL],
};
