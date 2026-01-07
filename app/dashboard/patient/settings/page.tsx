"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { useActiveAccount } from "thirdweb/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { 
  User, 
  CreditCard, 
  Droplets, 
  Calendar,
  Save,
  Loader2,
  CheckCircle,
  Wallet,
  ArrowLeft
} from "lucide-react"
import { getPatientData, savePatientData, PatientData } from "@/lib/patientStorage"

export default function SettingsPage() {
  const account = useActiveAccount()
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  
  const [formData, setFormData] = useState<Partial<PatientData>>({
    name: "",
    nik: "",
    bloodType: undefined,
    gender: undefined,
    age: 0,
  })

  useEffect(() => {
    if (account?.address) {
      const data = getPatientData(account.address)
      if (data) {
        setFormData({
          name: data.name,
          nik: data.nik,
          bloodType: data.bloodType || undefined,
          gender: data.gender?.trim() as any,
          age: data.age,
        })
      }
    }
  }, [account])

  const handleSave = async () => {
    if (!account) return
    setIsSaving(true)
    setSaveSuccess(false)
    
    // Get existing data to preserve linkedAddresses
    const existingData = getPatientData(account.address)
    
    // Create updated patient data object
    const updatedData: PatientData = {
      name: formData.name || "",
      nik: formData.nik || "",
      bloodType: formData.bloodType || "",
      gender: formData.gender || "",
      age: Number(formData.age) || 0,
      walletAddress: existingData?.walletAddress || account.address,
      linkedAddresses: existingData?.linkedAddresses || [], // Preserve linked addresses
      registeredAt: existingData?.registeredAt || new Date().toISOString()
    }

    // Save actual data
    savePatientData(updatedData)
    
    // Simulate network delay for UX
    await new Promise(resolve => setTimeout(resolve, 800))
    
    setIsSaving(false)
    setSaveSuccess(true)
    
    // Reset success message after 3 seconds
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push("/dashboard/patient")}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back</span>
            </button>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground mt-1">
              Manage your profile and account settings
            </p>
          </div>

          {/* Wallet Info Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                Connected Wallet
              </CardTitle>
              <CardDescription>
                Your blockchain identity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Wallet Address</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    {account?.address || "Not connected"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Edit Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Edit Profile
              </CardTitle>
              <CardDescription>
                Update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-11"
                  />
                </div>

                {/* NIK */}
                <div className="space-y-2">
                  <Label htmlFor="nik" className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    ID Card Number (NIK)
                  </Label>
                  <Input
                    id="nik"
                    placeholder="Enter your 16 digit NIK"
                    value={formData.nik}
                    onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                    className="h-11 font-mono"
                    maxLength={16}
                  />
                </div>

                {/* Blood Type & Gender Row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Blood Type */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-primary" />
                      Blood Type
                    </Label>
                    <Select
                      value={formData.bloodType}
                      onValueChange={(value) => setFormData({ ...formData, bloodType: value })}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Gender */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      Gender
                    </Label>
                    <Select
                      value={formData.gender || undefined}
                      onValueChange={(value) => setFormData({ ...formData, gender: value as any })}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        {/* Fallback for unknown values/formats */}
                        {formData.gender && formData.gender !== "Male" && formData.gender !== "Female" && (
                           <SelectItem value={formData.gender}>{formData.gender}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Age */}
                <div className="space-y-2">
                  <Label htmlFor="age" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    Age
                  </Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="Enter your age"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                    className="h-11"
                    min={1}
                    max={150}
                  />
                </div>

                {/* Save Button */}
                <div className="flex items-center gap-4 pt-4">
                  <Button 
                    type="submit"
                    disabled={isSaving}
                    className="min-w-[140px]"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                  
                  {saveSuccess && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-2 text-green-600"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">Saved successfully!</span>
                    </motion.div>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
      </motion.div>
    </div>
  )
}
