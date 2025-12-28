"use client"

import { useState } from "react"
import { motion } from "framer-motion"
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
import { Loader2, User, CreditCard, Droplets, Users, Calendar } from "lucide-react"
import { savePatientData, PatientData } from "@/lib/patientStorage"

interface PatientRegistrationFormProps {
  walletAddress: string;
  onComplete: (data: PatientData) => void;
}

export function PatientRegistrationForm({ walletAddress, onComplete }: PatientRegistrationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    nik: "",
    bloodType: "",
    gender: "",
    age: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    await new Promise((resolve) => setTimeout(resolve, 1000))

    const patientData: PatientData = {
      name: formData.name,
      nik: formData.nik,
      bloodType: formData.bloodType,
      gender: formData.gender,
      age: parseInt(formData.age),
      walletAddress: walletAddress,
      registeredAt: new Date().toISOString(),
    }

    savePatientData(patientData)
    onComplete(patientData)
    setIsSubmitting(false)
  }

  const isFormValid =
    formData.name &&
    formData.nik &&
    formData.bloodType &&
    formData.gender &&
    formData.age

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md mx-auto"
    >
      {/* Card with gradient border effect */}
      <div className="relative">
        {/* Gradient glow behind */}
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-secondary/30 to-primary/20 rounded-3xl blur-lg opacity-60" />
        
        {/* Main card */}
        <div className="relative p-8 bg-card/95 backdrop-blur-sm border border-border/50 rounded-2xl shadow-xl">
          {/* Header with icon */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-[#0077C0] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/25">
              <User className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Registrasi Pasien</h2>
            <p className="text-muted-foreground text-sm">
              Lengkapi data diri untuk melanjutkan
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name field */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2 text-sm font-medium">
                <User className="w-4 h-4 text-primary" />
                Nama Lengkap
              </Label>
              <Input
                id="name"
                placeholder="Masukkan nama lengkap"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-11 bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-primary/20"
                required
              />
            </div>

            {/* NIK field */}
            <div className="space-y-2">
              <Label htmlFor="nik" className="flex items-center gap-2 text-sm font-medium">
                <CreditCard className="w-4 h-4 text-primary" />
                Nomor KTP (NIK)
              </Label>
              <Input
                id="nik"
                placeholder="Masukkan 16 digit NIK"
                value={formData.nik}
                onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                className="h-11 bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-primary/20 font-mono"
                minLength={16}
                maxLength={16}
                required
              />
            </div>

            {/* Two columns for Blood Type and Gender */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Droplets className="w-4 h-4 text-primary" />
                  Gol. Darah
                </Label>
                <Select
                  value={formData.bloodType}
                  onValueChange={(value) => setFormData({ ...formData, bloodType: value })}
                >
                  <SelectTrigger className="h-11 bg-muted/30 border-border/50">
                    <SelectValue placeholder="Pilih" />
                  </SelectTrigger>
                  <SelectContent>
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Users className="w-4 h-4 text-primary" />
                  Gender
                </Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => setFormData({ ...formData, gender: value })}
                >
                  <SelectTrigger className="h-11 bg-muted/30 border-border/50">
                    <SelectValue placeholder="Pilih" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pria">Pria</SelectItem>
                    <SelectItem value="Wanita">Wanita</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Age field */}
            <div className="space-y-2">
              <Label htmlFor="age" className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="w-4 h-4 text-primary" />
                Usia
              </Label>
              <Input
                id="age"
                type="number"
                placeholder="Masukkan usia"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                className="h-11 bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-primary/20"
                min={1}
                max={120}
                required
              />
            </div>

            {/* Separator */}
            <div className="flex items-center gap-3 py-2">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              <div className="w-1.5 h-1.5 rounded-full bg-primary/30" />
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-[#0077C0] hover:opacity-90 shadow-lg shadow-primary/25"
              disabled={!isFormValid || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Menyimpan...
                </>
              ) : (
                "Lanjutkan"
              )}
            </Button>
          </form>

          {/* Footer info */}
          <p className="text-center text-muted-foreground text-xs mt-6">
            Data Anda akan tersimpan dengan aman di blockchain
          </p>
        </div>
      </div>
    </motion.div>
  )
}
