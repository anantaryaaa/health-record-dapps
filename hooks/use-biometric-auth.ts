import { useConnect } from "thirdweb/react";
import { inAppWallet, Wallet } from "thirdweb/wallets";
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
  const registerBiometric = async (): Promise<Wallet | null> => {
    try {
      let wallet: Wallet | undefined;
      await connect(async () => {
        const w = inAppWallet();
        await w.connect({
          client,
          chain: liskSepolia,
          strategy: "passkey",
          type: "sign-up",
        });
        wallet = w;
        return w;
      });
      return wallet || null;
    } catch (err) {
      console.error("Biometric registration failed:", err);
      return null;
    }
  };

  return {
    loginWithBiometric,
    registerBiometric,
    isAuthenticating,
    error: error?.message || null,
  };
}
