import { createThirdwebClient } from "thirdweb";
import { createWallet } from "thirdweb/wallets";
import { inAppWallet } from "thirdweb/wallets/in-app";
import { defineChain } from "thirdweb/chains";
import { lightTheme } from "thirdweb/react";

// Hospital theme with teal color scheme
export const hospitalTheme = lightTheme({
    colors: {
        primaryButtonBg: "#0d9488", // teal-600
        primaryButtonText: "#ffffff",
        accentButtonBg: "#14b8a6", // teal-500
        accentButtonText: "#ffffff",
        accentText: "#0d9488",
        borderColor: "#99f6e4", // teal-200
        modalBg: "#ffffff",
        primaryText: "#1D242B",
        secondaryText: "#6b7280",
        separatorLine: "#e5e7eb",
        connectedButtonBg: "#f0fdfa", // teal-50
        connectedButtonBgHover: "#ccfbf1", // teal-100
    },
});


export const liskSepolia = defineChain({
    id: 4202, 
    name: "Lisk Sepolia Testnet",
    nativeCurrency: {
        name: "ETH",
        symbol: "ETH",
        decimals: 18,
    },
    rpcUrls: {
        default: { http: ["https://rpc.sepolia-api.lisk.com"]}
    },
    blockExplorers: {
        default: { name: "Lisk Explorer", url: "https://sepolia-blockscout.lisk.com" }
    }
},

)

export const client = createThirdwebClient({
    clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID as string
});


export const wallets = [
    inAppWallet({
        auth: {
            options: ["google", "x"]
        },
        executionMode: {
            mode: "EIP4337",
            smartAccount: {
                chain: liskSepolia, // chain required for EIP-4337
                sponsorGas: true,
            }
        },
    }),
    createWallet("io.metamask"),
    createWallet("com.coinbase.wallet"),
];