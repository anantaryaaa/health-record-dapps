"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useActiveAccount, useDisconnect, ConnectButton, lightTheme, useConnect } from "thirdweb/react"
import { inAppWallet } from "thirdweb/wallets"
import { client, wallets, liskSepolia } from "@/lib/thirdWeb"
import { useRouter } from "next/navigation"
import { PatientRegistrationForm } from "@/components/patient-registration-form"
import { PatientQRCode } from "@/components/patient-qr-code"
import { getPatientData, savePatientData, PatientData, clearAllAppData, getBiometricEnabled, setBiometricEnabled as saveBiometricEnabled } from "@/lib/patientStorage"
import { 
  User, 
  ShieldCheck, 
  Fingerprint, 
  ChevronRight, 
  FileText,
  Loader2,
  QrCode,
  Settings
} from "lucide-react"

export default function PatientDashboard() {
  const [activeTab, setActiveTab] = useState<"profile" | "history">("profile")
  const [biometricEnabled, setBiometricEnabled] = useState(true)
  const [patientData, setPatientData] = useState<PatientData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAddress, setShowAddress] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const account = useActiveAccount()
  const { disconnect } = useDisconnect()
  const { connect } = useConnect()
  const router = useRouter()

  const handleLogout = async () => {
    // Clear all app data including patient data and wallet history
    clearAllAppData()
    
    // Properly disconnect the wallet
    if (account) {
      disconnect(account as never)
    }
    
    router.push("/auth")
  }

  // Handle biometric toggle
  const handleBiometricToggle = async (enabled: boolean) => {
    if (enabled && account) {
      const currentAddress = account.address;
      try {
        const wallet = await connect(async () => {
          const w = inAppWallet();
          await w.connect({
            client,
            chain: liskSepolia,
            strategy: "passkey",
            type: "sign-up"
          });
          return w;
        });

        // Sync data to new passkey wallet if exists
        const newAccount = wallet?.getAccount();
        const newAddress = newAccount?.address;
        
        if (newAddress && currentAddress) {
            const oldData = getPatientData(currentAddress);
            if (oldData) {
                const newData = { ...oldData, walletAddress: newAddress };
                savePatientData(newData);
                // Also update local state to reflect change immediately if wallet switched
                setPatientData(newData); 
            }
        }

        setBiometricEnabled(true)
        saveBiometricEnabled(true)
      } catch (e) {
        console.error("Biometric setup failed:", e)
        setBiometricEnabled(false)
        saveBiometricEnabled(false)
      }
    } else {
      setBiometricEnabled(false)
      saveBiometricEnabled(false)
    }
  }

  useEffect(() => {
    if (!account) {
      router.push("/auth")
      return
    }

    // Load biometric preference
    setBiometricEnabled(getBiometricEnabled())

    // Check if patient is already registered
    const existingData = getPatientData(account.address)
    setPatientData(existingData)
    setIsLoading(false)
  }, [account, router])

  if (!account) {
    return null
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // Show registration form if patient is not registered
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

  // Show dashboard if patient is registered
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <User className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-foreground">MediChain Patient</h1>
              <p className="text-xs text-muted-foreground">Decentralized Health Record</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="hidden sm:flex items-center gap-1 bg-muted rounded-lg p-1">
            <button
              onClick={() => setActiveTab("profile")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === "profile"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Profile & Account
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
              clearAllAppData()
              router.push("/auth")
            }}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-6 space-y-6">
        {activeTab === "profile" ? (
          <div className="space-y-6">
            {/* Profile Card - Full Width */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  {/* Avatar */}
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border-4 border-background shadow-lg flex items-center justify-center flex-shrink-0">
                    <User className="w-12 h-12 text-primary" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-2xl font-bold text-foreground mb-1">{patientData.name}</h2>
                    <p className="text-sm text-muted-foreground font-mono mb-4">{patientData.nik}</p>
                    
                    {/* Stats Row */}
                    <div className="flex flex-wrap justify-center md:justify-start gap-3">
                      <div className="px-4 py-2 bg-muted/50 rounded-lg">
                        <span className="text-xs text-muted-foreground uppercase">Blood</span>
                        <p className="font-bold text-foreground">{patientData.bloodType}</p>
                      </div>
                      <div className="px-4 py-2 bg-muted/50 rounded-lg">
                        <span className="text-xs text-muted-foreground uppercase">Gender</span>
                        <p className="font-bold text-foreground">{patientData.gender}</p>
                      </div>
                      <div className="px-4 py-2 bg-muted/50 rounded-lg">
                        <span className="text-xs text-muted-foreground uppercase">Age</span>
                        <p className="font-bold text-foreground">{patientData.age} yrs</p>
                      </div>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex flex-col gap-2 w-full md:w-auto">
                    <Button 
                      className="gap-2 bg-gradient-to-r from-primary to-[#0077C0] hover:opacity-90"
                      onClick={() => setShowQR(true)}
                    >
                      <QrCode className="w-4 h-4" />
                      Show QR Code
                    </Button>
                    <Button 
                      variant="outline"
                      className="gap-2"
                      onClick={() => router.push("/dashboard/patient/settings")}
                    >
                      <Settings className="w-4 h-4" />
                      Edit Profile
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Settings - Below */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Security Settings</h3>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Fingerprint className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Biometric Login</p>
                      <p className="text-xs text-muted-foreground">FaceID / Fingerprint active</p>
                    </div>
                  </div>
                  <Switch
                    checked={biometricEnabled}
                    onCheckedChange={handleBiometricToggle}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Riwayat Medis Tab */
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <FileText className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Medical History</h3>
                </div>
                
                {/* Medical Records List */}
                <div className="space-y-4">
                  {/* Record 1 */}
                  <div className="p-4 bg-muted/30 border border-border rounded-xl">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="text-xs text-muted-foreground">15 Desember 2024</span>
                        <h4 className="font-semibold text-foreground mt-1">Influenza A</h4>
                      </div>
                      <span className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded-full font-medium">
                        Completed
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Symptoms</p>
                        <p className="text-sm text-foreground">Demam tinggi, batuk kering, nyeri otot, sakit kepala, lemas</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Treatment / Prescription</p>
                        <p className="text-sm text-foreground">Paracetamol 500mg 3x1, Oseltamivir 75mg 2x1, Istirahat total 5 hari</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ShieldCheck className="w-3 h-3 text-primary" />
                      RS Siloam Jakarta Selatan
                    </div>
                  </div>

                  {/* Record 2 */}
                  <div className="p-4 bg-muted/30 border border-border rounded-xl">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="text-xs text-muted-foreground">28 November 2024</span>
                        <h4 className="font-semibold text-foreground mt-1">Gastritis Akut</h4>
                      </div>
                      <span className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded-full font-medium">
                        Completed
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Symptoms</p>
                        <p className="text-sm text-foreground">Nyeri ulu hati, mual, kembung, tidak nafsu makan</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Treatment / Prescription</p>
                        <p className="text-sm text-foreground">Omeprazole 20mg 1x1, Antasida 3x1, Hindari makanan pedas & asam</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ShieldCheck className="w-3 h-3 text-primary" />
                      RS Pondok Indah Bintaro
                    </div>
                  </div>

                  {/* Record 3 */}
                  <div className="p-4 bg-muted/30 border border-border rounded-xl">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="text-xs text-muted-foreground">5 Oktober 2024</span>
                        <h4 className="font-semibold text-foreground mt-1">Tension Headache</h4>
                      </div>
                      <span className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded-full font-medium">
                        Completed
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Symptoms</p>
                        <p className="text-sm text-foreground">Sakit kepala tegang, leher kaku, mata lelah, sulit konsentrasi</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Treatment / Prescription</p>
                        <p className="text-sm text-foreground">Ibuprofen 400mg bila perlu, Myonal 50mg 2x1, Fisioterapi leher</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ShieldCheck className="w-3 h-3 text-primary" />
                      Klinik Medika Surabaya
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        
      </main>

      {/* QR Code Modal */}
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