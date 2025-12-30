import { useConnect } from "thirdweb/react";
import { inAppWallet } from "thirdweb/wallets";
import { client, liskSepolia } from "@/lib/thirdWeb";

export function useBiometricAuth() {
  const { connect, isConnecting: isAuthenticating, error } = useConnect();

  const loginWithBiometric = async () => {
    try {
      await connect(async () => {
        const wallet = inAppWallet();
        await wallet.connect({
          client,
          chain: liskSepolia,
          strategy: "passkey",
          type: "sign-in",
        });
        return wallet;
      });
      return true;
    } catch (err) {
      console.error("Biometric login failed:", err);
      return false;
    }
  };

  // Explicitly for creating a new passkey credential (registration)
  const registerBiometric = async () => {
    try {
      await connect(async () => {
        const wallet = inAppWallet();
        await wallet.connect({
          client,
          chain: liskSepolia,
          strategy: "passkey",
          type: "sign-up",
        });
        return wallet;
      });
      return true;
    } catch (err) {
      console.error("Biometric registration failed:", err);
      return false;
    }
  };

  return {
    loginWithBiometric,
    registerBiometric,
    isAuthenticating,
    error: error?.message || null,
  };
}
