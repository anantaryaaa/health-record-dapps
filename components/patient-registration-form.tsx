"use client"

import { useState, useEffect } from "react"
import { useForm } from "@tanstack/react-form"
import * as z from "zod"
import { useActiveAccount } from "thirdweb/react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { savePatientData, PatientData } from "@/lib/patientStorage"
import { 
  selfRegisterPatient, 
  hasPatientIdentity, 
  getExplorerUrl,
  hasPatientProfile,
  getPatientProfileEncrypted,
  setPatientProfile,
  encodePatientProfile,
  decodePatientProfile,
  type PatientProfileData
} from "@/lib/services/blockchain"
import { User, CreditCard, Calendar, Loader2, CheckCircle2, AlertCircle, ExternalLink, RefreshCw } from "lucide-react"

// Define Schema
const patientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  nik: z.string()
    .min(1, "Government ID is required")
    .regex(/^[a-zA-Z0-9]+$/, "Government ID must contain only letters and numbers"),
  bloodType: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]),
  gender: z.enum(["Male", "Female"]),
  age: z.number().min(1, "Age must be valid").max(120, "Age must be valid"),
})

interface PatientRegistrationFormProps {
  walletAddress: string;
  onComplete: (data: PatientData) => void;
}

export function PatientRegistrationForm({ walletAddress, onComplete }: PatientRegistrationFormProps) {
  const account = useActiveAccount()
  const [isMinting, setIsMinting] = useState(false)
  const [mintError, setMintError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  
  // New states for checking existing registration
  const [isCheckingBlockchain, setIsCheckingBlockchain] = useState(true)
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false)
  const [hasExistingProfile, setHasExistingProfile] = useState(false)
  const [existingProfileData, setExistingProfileData] = useState<PatientProfileData | null>(null)
  
  // Check if patient is already registered on blockchain
  useEffect(() => {
    const checkRegistration = async () => {
      if (!walletAddress) return
      
      setIsCheckingBlockchain(true)
      try {
        // Check if has identity NFT
        const registered = await hasPatientIdentity(walletAddress)
        setIsAlreadyRegistered(registered)
        
        // If registered, also check if has profile on-chain
        if (registered) {
          const profileExists = await hasPatientProfile(walletAddress)
          setHasExistingProfile(profileExists)
          
          // If profile exists, fetch and decode it
          if (profileExists) {
            const encryptedProfile = await getPatientProfileEncrypted(walletAddress)
            if (encryptedProfile) {
              const decoded = decodePatientProfile(encryptedProfile)
              setExistingProfileData(decoded)
            }
          }
        }
      } catch (error) {
        console.error("Error checking registration:", error)
        // Assume not registered if check fails
        setIsAlreadyRegistered(false)
        setHasExistingProfile(false)
      } finally {
        setIsCheckingBlockchain(false)
      }
    }
    
    checkRegistration()
  }, [walletAddress])
  
  const form = useForm({
    defaultValues: {
      name: "",
      nik: "",
      bloodType: "O+" as const,
      gender: "Male" as const,
      age: "" as unknown as number,
    },
    validators: {
      onChange: patientSchema as never,
    },
    onSubmit: async ({ value }) => {
      if (!account) {
        setMintError("Wallet not connected")
        return
      }
      
      setIsMinting(true)
      setMintError(null)
      setTxHash(null)
      
      try {
        // If NOT already registered, mint NFT first
        if (!isAlreadyRegistered) {
          console.log("Minting patient identity NFT...")
          const mintResult = await selfRegisterPatient(account)
          
          if (!mintResult.success) {
            throw new Error(mintResult.error || "Failed to mint identity NFT")
          }
          
          console.log("NFT minted successfully:", mintResult.txHash)
          setTxHash(mintResult.txHash || null)
        } else {
          console.log("Patient already registered on blockchain, skipping minting...")
        }
        
        // Prepare profile data for blockchain
        const profileData: PatientProfileData = {
          name: value.name,
          nik: value.nik,
          bloodType: value.bloodType,
          gender: value.gender,
          dateOfBirth: "", // Can be added later
        }
        
        // Save profile to blockchain (if not already exists or updating)
        if (!hasExistingProfile) {
          console.log("Saving profile to blockchain...")
          const encodedProfile = encodePatientProfile(profileData)
          const profileResult = await setPatientProfile(account, encodedProfile)
          
          if (!profileResult.success) {
            console.warn("Failed to save profile to blockchain:", profileResult.error)
            // Don't throw - localStorage backup will still work
          } else {
            console.log("Profile saved to blockchain:", profileResult.txHash)
          }
        } else {
          console.log("Profile already exists on blockchain, skipping...")
        }
        
        // Save to localStorage (for both new and existing patients)
        const newData: PatientData = {
          name: value.name,
          nik: value.nik,
          bloodType: value.bloodType,
          gender: value.gender,
          age: Number(value.age),
          walletAddress: walletAddress,
          linkedAddresses: [],
          registeredAt: new Date().toISOString(),
        }
        
        savePatientData(newData)
        
        // Complete registration
        onComplete(newData)
      } catch (error) {
        console.error("Registration error:", error)
        setMintError(error instanceof Error ? error.message : "Failed to register")
      } finally {
        setIsMinting(false)
      }
    },
  })

  // Update form values when existingProfileData is loaded from blockchain
  useEffect(() => {
    if (existingProfileData) {
      form.setFieldValue("name", existingProfileData.name || "")
      form.setFieldValue("nik", existingProfileData.nik || "")
      if (existingProfileData.bloodType) {
        form.setFieldValue("bloodType", existingProfileData.bloodType as never)
      }
      if (existingProfileData.gender) {
        form.setFieldValue("gender", existingProfileData.gender as never)
      }
    }
  }, [existingProfileData, form])

  // Loading state while checking blockchain
  if (isCheckingBlockchain) {
    return (
      <Card className="w-full max-w-lg mx-auto shadow-lg border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="py-16">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Checking blockchain registration...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-lg mx-auto shadow-lg border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-2xl font-bold">
          <div className="p-2 bg-primary/10 rounded-lg">
             <User className="w-6 h-6 text-primary" />
          </div>
          {isAlreadyRegistered ? "Sync Your Profile" : "Patient Registration"}
        </CardTitle>
        <CardDescription>
          {isAlreadyRegistered ? (
            <>
              Your wallet is already registered on the blockchain. 
              Please fill in your profile details to sync with this device.
            </>
          ) : (
            "Complete your profile to access decentralized health records."
          )}
        </CardDescription>
        
        {/* Already Registered Badge */}
        {isAlreadyRegistered && (
          <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="text-sm text-emerald-600 font-medium">
              Identity NFT already exists on blockchain
            </span>
          </div>
        )}
        
        {/* Profile exists on blockchain */}
        {hasExistingProfile && existingProfileData && (
          <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-600 font-medium">
                Profile found on blockchain
              </span>
            </div>
            <p className="text-xs text-blue-600/80">
              Your profile data has been pre-filled from the blockchain. 
              Just verify and sync to this device.
            </p>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <form
          id="patient-registration-form"
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
        >
          {/* Name Field */}
          <form.Field
            name="name"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name} className="flex items-center gap-2 font-medium">
                   Full Name
                </Label>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Enter full name"
                  className={field.state.meta.errors.length ? "border-destructive focus-visible:ring-destructive text-muted-foreground" : ""}
                />
                {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                  <ul className="text-xs text-destructive list-disc list-inside bg-destructive/5 p-2 rounded-md">
                    {field.state.meta.errors.map((err: unknown, i: number) => (
                      <li key={i}>{typeof err === 'object' && err !== null && 'message' in err ? (err as {message: string}).message : String(err)}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          />

          {/* Government ID Field */}
          <form.Field
            name="nik"
            children={(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name} className="flex items-center gap-2 font-medium">
                   Government ID Number
                </Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Enter your Government ID"
                    maxLength={16}
                    className={`pl-9 ${field.state.meta.errors.length ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  />
                </div>
                {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                  <ul className="text-xs text-destructive list-disc list-inside bg-destructive/5 p-2 rounded-md">
                    {field.state.meta.errors.map((err: unknown, i: number) => (
                      <li key={i}>{typeof err === 'object' && err !== null && 'message' in err ? (err as {message: string}).message : String(err)}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
             {/* Blood Type */}
             <form.Field
                name="bloodType"
                children={(field) => (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 font-medium">Blood Type</Label>
                    <Select
                       value={field.state.value}
                       onValueChange={(val) => field.handleChange(val as never)}
                    >
                      <SelectTrigger className={field.state.meta.errors.length ? "border-destructive" : ""}>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                     {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                      <ul className="text-xs text-destructive list-disc list-inside bg-destructive/5 p-2 rounded-md">
                        {field.state.meta.errors.map((err: unknown, i: number) => (
                          <li key={i}>{typeof err === 'object' && err !== null && 'message' in err ? (err as {message: string}).message : String(err)}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
             />

             {/* Gender */}
              <form.Field
                name="gender"
                children={(field) => (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 font-medium">Gender</Label>
                    <Select
                       value={field.state.value}
                       onValueChange={(val) => field.handleChange(val as never)}
                    >
                      <SelectTrigger className={field.state.meta.errors.length ? "border-destructive" : ""}>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {["Male", "Female"].map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                     {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                      <ul className="text-xs text-destructive list-disc list-inside bg-destructive/5 p-2 rounded-md">
                        {field.state.meta.errors.map((err: unknown, i: number) => (
                          <li key={i}>{typeof err === 'object' && err !== null && 'message' in err ? (err as {message: string}).message : String(err)}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
             />
          </div>

          {/* Age */}
          <form.Field
             name="age"
             children={(field) => (
               <div className="space-y-2">
                 <Label htmlFor={field.name} className="flex items-center gap-2 font-medium">Age</Label>
                 <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                       id={field.name}
                       name={field.name}
                       type="number"
                       value={field.state.value}
                       onBlur={field.handleBlur}
                       onChange={(e) => field.handleChange(e.target.value === "" ? "" as unknown as number : Number(e.target.value))}
                       placeholder="Enter your age..."
                       min={1}
                       max={120}
                       className={`pl-9 ${field.state.meta.errors.length ? "border-destructive focus-visible:ring-destructive text-muted-foreground" : ""}`}
                     />
                 </div>
                  {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                    <ul className="text-xs text-destructive list-disc list-inside bg-destructive/5 p-2 rounded-md">
                      {field.state.meta.errors.map((err: unknown, i: number) => (
                        <li key={i}>{typeof err === 'object' && err !== null && 'message' in err ? (err as {message: string}).message : String(err)}</li>
                      ))}
                    </ul>
                  )}
               </div>
             )}
          />

        </form>
        
        {/* Error Message */}
        {mintError && (
          <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive">
                {isAlreadyRegistered ? "Sync Failed" : "Registration Failed"}
              </p>
              <p className="text-sm text-destructive/80">{mintError}</p>
            </div>
          </div>
        )}
        
        {/* Success Message with TX Hash */}
        {txHash && (
          <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-emerald-600">Identity NFT Minted!</p>
              <a 
                href={getExplorerUrl(txHash)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-emerald-600/80 hover:underline flex items-center gap-1"
              >
                View on Explorer <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex flex-col gap-4 border-t border-border/50 pt-6">
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <Button 
               type="submit" 
               form="patient-registration-form"
               disabled={!canSubmit || isMinting || !account}
               className="w-full bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 min-w-[200px] h-12 text-base font-semibold"
            >
              {isMinting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {isAlreadyRegistered ? "Syncing Profile..." : "Minting Identity NFT..."}
                </>
              ) : isSubmitting ? (
                "Processing..."
              ) : isAlreadyRegistered ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Sync Profile to Device
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Register & Mint Identity NFT
                </>
              )}
            </Button>
          )}
        />
        <p className="text-xs text-muted-foreground text-center">
          {isAlreadyRegistered 
            ? "Your profile data will be saved locally on this device."
            : "This will create a Soulbound NFT (non-transferable) as your identity on the blockchain."
          }
        </p>
      </CardFooter>
    </Card>
  )
}
