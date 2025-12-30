"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ConnectButton, useActiveAccount, lightTheme, useConnect } from "thirdweb/react";
import { client, wallets, liskSepolia } from "@/lib/thirdWeb";
import { inAppWallet } from "thirdweb/wallets";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, User, ArrowLeft, ChevronRight, Sparkles, Fingerprint } from "lucide-react";
import { DotPattern } from "@/components/ui/dot-pattern";
import { cn } from "@/lib/utils";

type UserRole = "patient" | "hospital" | null;

export default function AuthPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);
  const account = useActiveAccount();
  const router = useRouter();

  useEffect(() => {
    if (account && selectedRole) {
      router.push(`/dashboard/${selectedRole}`);
    }
  }, [account, selectedRole, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 relative overflow-hidden">
      {/* Background Orbs - static, no animation */}
      <div className="absolute top-20 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 -right-32 w-96 h-96 bg-secondary/40 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary/5 to-secondary/20 rounded-full blur-3xl" />
      
      {/* Simple Decorative Shapes - no animation */}
      <div className="absolute top-1/4 left-[15%] w-16 h-16 border border-primary/15 rounded-2xl" />
      <div className="absolute top-1/3 right-[12%] w-12 h-12 border border-secondary/30 rounded-full" />
      <div className="absolute bottom-1/4 left-[20%] w-10 h-10 bg-primary/5 rounded-xl" />
      <div className="absolute bottom-1/3 right-[18%] w-20 h-20 border border-primary/10 rounded-3xl" />

      {/* Dot Pattern */}
      <DotPattern
        className={cn(
          "[mask-image:radial-gradient(700px_circle_at_center,white,transparent)]",
          "opacity-30"
        )}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* Back to Home */}
        <Link
          href="/"
          className="absolute top-8 left-8 flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <AnimatePresence mode="wait">
          {!selectedRole ? (
            <RoleSelection onSelectRole={setSelectedRole} />
          ) : (
            <WalletConnection
              role={selectedRole}
              onBack={() => setSelectedRole(null)}
            />
          )}
        </AnimatePresence>

        {/* Decorative Bottom Line */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-32 h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent rounded-full" />
      </div>
    </div>
  );
}

function RoleSelection({
  onSelectRole,
}: {
  onSelectRole: (role: UserRole) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="w-full max-w-md"
    >
      {/* Glassmorphism Card */}
      <div className="backdrop-blur-xl bg-card/80 border border-border/50 rounded-3xl p-8 shadow-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-primary to-[#0077C0] text-transparent bg-clip-text">
            Welcome to MediChain
          </h1>
          <p className="text-muted-foreground">
            Choose your role to continue
          </p>
        </div>

        {/* Role Options */}
        <div className="space-y-4">
          <button
            onClick={() => onSelectRole("patient")}
            className="w-full flex items-center gap-4 p-5 bg-gradient-to-r from-secondary/50 to-secondary/30 border border-border/50 rounded-2xl hover:border-primary/50 hover:shadow-md transition-all duration-200 text-left group"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-primary to-[#0077C0] rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <User className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-primary text-lg">I&apos;m a Patient</p>
              <p className="text-sm text-muted-foreground">Access & manage your medical records securely</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>

          <button
            onClick={() => onSelectRole("hospital")}
            className="w-full flex items-center gap-4 p-5 bg-gradient-to-r from-secondary/50 to-secondary/30 border border-border/50 rounded-2xl hover:border-emerald-500/50 hover:shadow-md transition-all duration-200 text-left group"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-lg text-emerald-500">I&apos;m a Hospital</p>
              <p className="text-sm text-foreground">Manage and access patient data with consent</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
          </button>
        </div>

        {/* Decorative Separator */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="w-1.5 h-1.5 rounded-full bg-primary/30" />
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        {/* Info */}
        <p className="text-center text-muted-foreground text-xs">
          Your data is protected by blockchain technology
        </p>
      </div>
    </motion.div>
  );
}

function WalletConnection({
  role,
  onBack,
}: {
  role: UserRole;
  onBack: () => void;
}) {
  const isPatient = role === "patient";
  const Icon = isPatient ? User : Building2;
  const { connect, isConnecting } = useConnect();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="w-full max-w-md"
    >
      {/* Glassmorphism Card */}
      <div className="backdrop-blur-xl bg-card/80 border border-border/50 rounded-3xl p-8 shadow-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className={cn(
              "w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg",
              isPatient
                ? "bg-gradient-to-br from-primary to-[#0077C0] shadow-primary/25"
                : "bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/25"
            )}
          >
            <Icon className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {isPatient ? "Patient Access" : "Hospital Access"}
          </h1>
          <p className="text-muted-foreground text-sm">
            Connect your wallet to continue
          </p>
        </div>

        {/* Biometric Login Option - Only for Patient */}
        {isPatient && (
          <>
            <div className="mb-6">
              <button
                onClick={() => {
                  connect(async () => {
                    const wallet = inAppWallet();
                    await wallet.connect({
                      client,
                      chain: liskSepolia,
                      strategy: "passkey",
                      type: "sign-in",
                    });
                    return wallet;
                  });
                }}
                disabled={isConnecting}
                className={cn(
                  "w-full flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all duration-300",
                  "bg-primary/5 border-primary/30 hover:bg-primary/10 hover:border-primary/50",
                  isConnecting && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
                  <Fingerprint className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-primary">
                    {isConnecting ? "Connecting..." : "Login with Biometric"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Fingerprint, Face ID, or Windows Hello
                  </p>
                </div>
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or connect wallet</span>
              <div className="flex-1 h-px bg-border" />
            </div>
          </>
        )}

        {/* Wallet Providers - Thirdweb ConnectButton */}
        <div className="flex justify-center mb-6">
          <ConnectButton
            client={client}
            wallets={wallets}
            theme={lightTheme({
              colors: {
                primaryButtonBg: isPatient ? "#0077C0" : "#10b981",
                primaryButtonText: "#ffffff",
              },
            })}
            connectButton={{
              label: "Connect Wallet",
              style: {
                width: "100%",
                padding: "16px 24px",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: "600",
              },
            }}
            connectModal={{
              size: "wide",
              title: `Connect to MediChain`,
              showThirdwebBranding: false,
            }}
            showAllWallets={false}
          />
        </div>

        {/* Features */}
        <div className="space-y-3 mb-6">
          <Feature
            icon={<Sparkles className="w-4 h-4" />}
            text={
              isPatient
                ? "Secure access to your health records"
                : "Manage patient data with consent"
            }
          />
          <Feature
            icon={<Sparkles className="w-4 h-4" />}
            text="Powered by blockchain technology"
          />
        </div>

        {/* Back button */}
        <button
          onClick={onBack}
          className="w-full flex items-center justify-center gap-2 py-3 text-muted-foreground hover:text-primary transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Choose different role
        </button>
      </div>
    </motion.div>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
        {icon}
      </div>
      <span>{text}</span>
    </div>
  );
}