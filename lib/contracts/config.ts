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
  forwarder: process.env.NEXT_PUBLIC_MEDICHAIN_FORWARDER_ADDRESS || "0xE2446A9d664bC4E160Af2b0F25BF6530b75250d5",
  hospitalRegistry: process.env.NEXT_PUBLIC_HOSPITAL_REGISTRY_ADDRESS || "0x7062ebd5d2796aEA3Aa03281e955994661080108",
  patientIdentity: process.env.NEXT_PUBLIC_PATIENT_IDENTITY_ADDRESS || "0x19Ab8F63ED13ae191A8080c9638eefe86bF8ffbC",
  patientProfile: process.env.NEXT_PUBLIC_PATIENT_PROFILE_ADDRESS || "0x11dB04B254f4e355B07b53c53476b0d3bd864142",
  hospitalProfile: process.env.NEXT_PUBLIC_HOSPITAL_PROFILE_ADDRESS || "0x6040F415CBAd77722F8afF246a16471c10876C2d",
} as const;
