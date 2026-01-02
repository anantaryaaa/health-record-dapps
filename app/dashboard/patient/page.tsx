"use client"

import { useState, useEffect } from "react"
import { useActiveAccount, useDisconnect, ConnectButton, lightTheme } from "thirdweb/react"
import { client, wallets } from "@/lib/thirdWeb"
import { useRouter } from "next/navigation"
import { PatientRegistrationForm } from "@/components/patient-registration-form"
import { PatientQRCode } from "@/components/patient-qr-code"
import { PatientProfileSection } from "@/components/patient-profile-section"
import { MedicalHistorySection } from "@/components/medical-history-section"
import { getPatientData, PatientData, getBiometricEnabled, setBiometricEnabled as saveBiometricEnabled, linkWalletToPatient } from "@/lib/patientStorage"
import { useBiometricAuth } from "@/hooks/use-biometric-auth"
import { User, Loader2 } from "lucide-react"

export default function PatientDashboard() {
  const [activeTab, setActiveTab] = useState<"profile" | "history">("profile")
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [patientData, setPatientData] = useState<PatientData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showQR, setShowQR] = useState(false)
  const account = useActiveAccount()
  const { disconnect } = useDisconnect()
  const router = useRouter()

  const { registerBiometric, isAuthenticating } = useBiometricAuth()
  const isRegistering = isAuthenticating
  const [isMigrating, setIsMigrating] = useState(false)

  // Handle biometric toggle
  const handleBiometricToggle = async (enabled: boolean) => {
    if (enabled && account) {
      setIsMigrating(true)
      const currentAddress = account.address
      const currentData = getPatientData(currentAddress)
      
      const newWallet = await registerBiometric()
      
      if (newWallet) {
        const newAccount = newWallet.getAccount()
        const newAddress = newAccount?.address

        if (newAddress && currentData) {
          console.log("Linking new wallet", newAddress, "to existing patient")
          const updatedData = linkWalletToPatient(currentData, newAddress)
          setPatientData(updatedData)
        }
        
        setBiometricEnabled(true)
        saveBiometricEnabled(true)
      } else {
        setBiometricEnabled(false)
        saveBiometricEnabled(false)
      }
      setIsMigrating(false)
    } else {
      setBiometricEnabled(false)
      saveBiometricEnabled(false)
    }
  }

  useEffect(() => {
    if (!account && !isRegistering) {
      router.push("/auth")
      return
    }

    setBiometricEnabled(getBiometricEnabled() ?? false)

    if (account) {
      const existingData = getPatientData(account.address)
      setPatientData(existingData)
    }
    setIsLoading(false)
  }, [account, router, isRegistering])

  if (!account && !isRegistering) {
    return null
  }

  if (isLoading || isRegistering || isMigrating || !account) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-primary font-medium">
          {isMigrating ? "Migrating data..." : "Loading..."}
        </span>
      </div>
    )
  }

  if (!patientData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8">
          <PatientRegistrationForm
            walletAddress={account.address}
            onComplete={(data) => setPatientData(data)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
          {/* Logo */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
            </div>
            <div className="hidden xs:block">
              <h1 className="font-bold text-foreground text-sm sm:text-base">MediChain Patient</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Decentralized Health Record</p>
            </div>
          </div>

          {/* Tabs - Desktop */}
          <div className="hidden md:flex items-center gap-1 bg-muted rounded-lg p-1">
            <button
              onClick={() => setActiveTab("profile")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === "profile"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Account & Profile
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === "history"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Medical History
            </button>
          </div>

          {/* Thirdweb Connect Button */}
          <ConnectButton
            client={client}
            wallets={wallets}
            theme={lightTheme({
              colors: {
                primaryButtonBg: "#0077C0",
                primaryButtonText: "#ffffff",
              },
            })}
            detailsButton={{
              style: {
                padding: "8px 16px",
                borderRadius: "12px",
              },
            }}
            onDisconnect={() => {
              router.push("/auth")
            }}
          />
        </div>

        {/* Mobile Tabs */}
        <div className="md:hidden flex border-t border-border">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "profile"
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-muted-foreground"
            }`}
          >
            Account & Profile
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "history"
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-muted-foreground"
            }`}
          >
            Medical History
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {activeTab === "profile" ? (
          <PatientProfileSection
            patientData={patientData}
            biometricEnabled={biometricEnabled}
            onBiometricToggle={handleBiometricToggle}
            onShowPatientCard={() => setShowQR(true)}
            onEditProfile={() => router.push("/dashboard/patient/settings")}
          />
        ) : (
          <MedicalHistorySection patientData={patientData} />
        )}
      </main>

      {/* Patient Card Modal */}
      {patientData && (
        <PatientQRCode
          patientData={patientData}
          isOpen={showQR}
          onClose={() => setShowQR(false)}
        />
      )}
    </div>
  )
}