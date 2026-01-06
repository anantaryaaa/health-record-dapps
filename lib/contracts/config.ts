/**
 * Smart Contract Configuration for Medichain
 * Deployed on Lisk Sepolia Testnet (Chain ID: 4202)
 */

export const CHAIN_CONFIG = {
  chainId: 4202,
  name: "Lisk Sepolia Testnet",
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.sepolia-api.lisk.com",
  blockExplorer: "https://sepolia-blockscout.lisk.com",
  nativeCurrency: {
    name: "ETH",
    symbol: "ETH",
    decimals: 18,
  },
};

export const CONTRACT_ADDRESSES = {
  forwarder: process.env.NEXT_PUBLIC_MEDICHAIN_FORWARDER_ADDRESS || "0x1E3Dfb508CadbFAa60c913876Bd4766c30E56562",
  hospitalRegistry: process.env.NEXT_PUBLIC_HOSPITAL_REGISTRY_ADDRESS || "0x96B68425028A4cEB4E1ACFc393390fE730f89DbE",
  patientIdentity: process.env.NEXT_PUBLIC_PATIENT_IDENTITY_ADDRESS || "0x985c859bFe24bb0Ca8b922b57f6aCfeEf5DC314e",
} as const;
