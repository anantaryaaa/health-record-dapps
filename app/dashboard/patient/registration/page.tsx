"use client"

import { useState, useEffect } from "react"
import { useActiveAccount } from "thirdweb/react"
import { useRouter } from "next/navigation"
import { PatientRegistrationForm } from "@/components/patient-registration-form"
import { getPatientData, PatientData } from "@/lib/patientStorage"
import { Loader2 } from "lucide-react"

export default function RegistrationPage() {
  const account = useActiveAccount()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const [alreadyRegistered, setAlreadyRegistered] = useState(false)

  useEffect(() => {
    if (!account) {
      router.push("/auth")
      return
    }

    // Check if patient already registered
    const existingData = getPatientData(account.address)
    if (existingData) {
      setAlreadyRegistered(true)
      router.replace("/dashboard/patient")
    } else {
      setIsChecking(false)
    }
  }, [account, router])

  // Show loading while checking or redirecting
  if (!account || isChecking || alreadyRegistered) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const handleComplete = (data: PatientData) => {
    // After registration complete, redirect to dashboard
    router.replace("/dashboard/patient")
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8">
        <PatientRegistrationForm
          walletAddress={account.address}
          onComplete={handleComplete}
        />
      </div>
    </div>
  )
}
