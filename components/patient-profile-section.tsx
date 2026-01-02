"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { PatientData } from "@/lib/patientStorage"
import { 
  User, 
  ShieldCheck, 
  Fingerprint, 
  QrCode,
  Settings
} from "lucide-react"

interface PatientProfileSectionProps {
  patientData: PatientData
  biometricEnabled: boolean
  onBiometricToggle: (enabled: boolean) => void
  onShowPatientCard: () => void
  onEditProfile: () => void
}

export function PatientProfileSection({
  patientData,
  biometricEnabled,
  onBiometricToggle,
  onShowPatientCard,
  onEditProfile
}: PatientProfileSectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Profile Card */}
      <Card className="h-fit">
        <CardContent className="p-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border-4 border-background shadow-lg flex items-center justify-center mb-4">
              <User className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">{patientData.name}</h2>
            <p className="text-sm text-muted-foreground font-mono">{patientData.nik}</p>
          </div>

          {/* Stats Row */}
          <div className="flex justify-center gap-4 mb-6">
            <div className="px-4 py-2 bg-muted/50 rounded-lg text-center">
              <span className="text-xs text-muted-foreground uppercase block">Blood</span>
              <p className="font-bold text-foreground">{patientData.bloodType}</p>
            </div>
            <div className="px-4 py-2 bg-muted/50 rounded-lg text-center">
              <span className="text-xs text-muted-foreground uppercase block">Gender</span>
              <p className="font-bold text-foreground">{patientData.gender}</p>
            </div>
            <div className="px-4 py-2 bg-muted/50 rounded-lg text-center">
              <span className="text-xs text-muted-foreground uppercase block">Age</span>
              <p className="font-bold text-foreground">{patientData.age}</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-2">
            <Button 
              className="w-full gap-2 bg-gradient-to-r from-primary to-[#0077C0] hover:opacity-90"
              onClick={onShowPatientCard}
            >
              <QrCode className="w-4 h-4" />
              View Patient Card
            </Button>
            <Button 
              variant="outline"
              className="w-full gap-2"
              onClick={onEditProfile}
            >
              <Settings className="w-4 h-4" />
              Edit Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Right: Security Settings */}
      <Card className="h-fit">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Security Settings</h3>
          </div>

          {/* Biometric Login */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl mb-4">
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
              onCheckedChange={onBiometricToggle}
            />
          </div>

          {/* Private Key Info Notice */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Private key is stored securely on this device. Make sure to back up for recovery on other devices.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
