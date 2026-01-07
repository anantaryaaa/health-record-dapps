"use client";

import { useActiveAccount, ConnectButton } from "thirdweb/react";
import { client, hospitalTheme, wallets, liskSepolia } from "@/lib/thirdWeb";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { 
  Building2, 
  User, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2,
  Stethoscope,
  Phone,
  MapPin,
  FileText,
  Mail,
  Briefcase,
  Loader2,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { saveHospitalData, isHospitalRegistered, HospitalData } from "@/lib/hospitalStorage";
import { 
  setHospitalProfile, 
  hasHospitalProfile, 
  getHospitalProfile as getHospitalProfileFromChain,
  registerHospitalInRegistry,
  isHospitalVerifiedInRegistry,
  getHospitalDetailsFromRegistry
} from "@/lib/services/blockchain";

type Step = 1 | 2;

interface FormData {
  // Step 1: Hospital Info
  name: string;
  type: HospitalData["type"] | "";
  licenseNumber: string;
  address: string;
  city: string;
  phone: string;
  // Step 2: PIC Info
  picName: string;
  picPosition: string;
  picPhone: string;
  picEmail: string;
}

// Get signature from backend for hospital registration
async function getRegistrationSignature(
  hospitalAddress: string, 
  hospitalName: string, 
  licenseNumber: string
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    const response = await fetch("/api/hospital/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hospitalAddress, hospitalName, licenseNumber }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to get signature");
    }

    return { success: true, signature: data.signature };
  } catch (error) {
    console.error("Signature error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Whitelist hospital on blockchain (for patient access)
async function whitelistHospitalOnChain(hospitalAddress: string, hospitalName: string): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const response = await fetch("/api/hospital/whitelist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hospitalAddress, hospitalName }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to whitelist hospital");
    }

    return { success: true, txHash: data.txHash };
  } catch (error) {
    console.error("Whitelist error:", error);
    return { success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export default function HospitalRegistration() {
  const account = useActiveAccount();
  const router = useRouter();
  
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    type: "",
    licenseNumber: "",
    address: "",
    city: "",
    phone: "",
    picName: "",
    picPosition: "",
    picPhone: "",
    picEmail: "",
  });

  useEffect(() => {
    const checkRegistration = async () => {
      if (!account) {
        router.push("/auth");
        return;
      }
      
      // First check localStorage
      if (isHospitalRegistered(account.address)) {
        router.push("/dashboard/hospital");
        return;
      }
      
      // Also check blockchain for existing profile
      try {
        const hasProfile = await hasHospitalProfile(account.address);
        if (hasProfile) {
          // Profile exists on blockchain, fetch and save to localStorage
          const profileData = await getHospitalProfileFromChain(account.address);
          if (profileData) {
            const hospitalData: HospitalData = {
              name: profileData.name,
              type: profileData.hospitalType as HospitalData["type"],
              licenseNumber: profileData.licenseNumber,
              address: profileData.physicalAddress,
              city: profileData.city,
              phone: profileData.phone,
              picName: profileData.picName,
              picPosition: profileData.picPosition,
              picPhone: profileData.picPhone,
              picEmail: profileData.picEmail,
              walletAddress: account.address,
              registeredAt: new Date(profileData.createdAt * 1000).toISOString(),
            };
            saveHospitalData(hospitalData);
            router.push("/dashboard/hospital");
          }
        }
      } catch (error) {
        console.error("Error checking blockchain profile:", error);
      }
    };
    
    checkRegistration();
  }, [account, router]);

  if (!account) {
    return null;
  }

  const isStep1Valid = formData.name && formData.type && formData.licenseNumber && 
                       formData.address && formData.city && formData.phone;
  const isStep2Valid = formData.picName && formData.picPhone && formData.picEmail;

  const handleNext = () => {
    if (currentStep === 1 && isStep1Valid) {
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    }
  };

  const handleSubmit = async () => {
    if (!isStep2Valid || !formData.type || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Step 1: Get signature from backend for AutomatedHospitalRegistry
      console.log("Getting registration signature from backend...");
      const signatureResult = await getRegistrationSignature(
        account.address,
        formData.name,
        formData.licenseNumber
      );

      if (!signatureResult.success || !signatureResult.signature) {
        throw new Error(signatureResult.error || "Failed to get registration signature");
      }

      // Step 2: Register in AutomatedHospitalRegistry (from user's wallet)
      console.log("Registering hospital in AutomatedHospitalRegistry...");
      const registryResult = await registerHospitalInRegistry(
        account,
        formData.name,
        formData.licenseNumber,
        signatureResult.signature
      );

      if (!registryResult.success) {
        // Check if already registered
        const existingDetails = await getHospitalDetailsFromRegistry(account.address);
        if (!existingDetails) {
          throw new Error(registryResult.error || "Failed to register in hospital registry");
        }
        console.log("Hospital already registered in registry");
      } else {
        console.log("Registry TX:", registryResult.txHash);
        setTxHash(registryResult.txHash || null);
      }

      // Step 3: Whitelist hospital in MedichainPatientIdentity (for patient access)
      console.log("Whitelisting hospital for patient access...");
      const whitelistResult = await whitelistHospitalOnChain(account.address, formData.name);
      if (!whitelistResult.success && !whitelistResult.error?.includes("already")) {
        console.warn("Whitelist warning:", whitelistResult.error);
        // Don't throw - continue with profile setup
      }

      // Step 4: Set hospital profile in MedichainHospitalProfile
      console.log("Setting hospital profile on blockchain...");
      const profileResult = await setHospitalProfile(
        account,
        formData.type,
        formData.address,
        formData.city,
        formData.phone,
        formData.picName,
        formData.picPosition || "",
        formData.picPhone,
        formData.picEmail
      );

      if (!profileResult.success) {
        console.warn("Profile setup warning:", profileResult.error);
        // Don't throw - localStorage backup will still work
      } else {
        console.log("Profile TX:", profileResult.txHash);
      }

      // Step 5: Save to localStorage (backup)
      const hospitalData: HospitalData = {
        name: formData.name,
        type: formData.type as HospitalData["type"],
        licenseNumber: formData.licenseNumber,
        address: formData.address,
        city: formData.city,
        phone: formData.phone,
        picName: formData.picName,
        picPosition: formData.picPosition,
        picPhone: formData.picPhone,
        picEmail: formData.picEmail,
        walletAddress: account.address,
        registeredAt: new Date().toISOString(),
      };

      saveHospitalData(hospitalData);
      setShowSuccess(true);

      // Redirect after showing success
      setTimeout(() => {
        router.push("/dashboard/hospital");
      }, 3000);
    } catch (error) {
      console.error("Registration error:", error);
      setSubmitError(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Success Alert
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center p-6">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-3">
              Registration Successful!
            </h1>
            <p className="text-muted-foreground mb-4">
              Your hospital has been registered on the blockchain and whitelisted for patient access.
            </p>
            {txHash && (
              <a
                href={`https://sepolia-blockscout.lisk.com/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 text-sm font-medium"
              >
                <ExternalLink className="w-4 h-4" />
                View on Block Explorer
              </a>
            )}
            <p className="text-muted-foreground text-sm mt-4">
              Redirecting to dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-600 to-teal-500 rounded-xl flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-foreground">MediChain</span>
              <span className="text-muted-foreground text-sm ml-2">HOSPITAL REGISTRATION</span>
            </div>
          </div>
          
          <ConnectButton 
            client={client} 
            theme={hospitalTheme}
            wallets={wallets}
            chain={liskSepolia}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Hospital Registration</h1>
          <p className="text-muted-foreground">Complete the form below to register your healthcare facility</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Step {currentStep} of 2</span>
            <span className="text-sm text-muted-foreground">
              {currentStep === 1 ? "Hospital Information" : "PIC Information"}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-teal-600 to-teal-500 transition-all duration-300 ease-out"
              style={{ width: currentStep === 1 ? "50%" : "100%" }}
            />
          </div>
        </div>

        {/* Form Card */}
        <Card>
          <CardContent className="p-6">
            {currentStep === 1 ? (
              /* Step 1: Hospital Information */
              <div className="space-y-5">
                <div className="flex items-center gap-2 mb-6">
                  <Building2 className="w-5 h-5 text-teal-600" />
                  <h2 className="text-lg font-semibold text-foreground">Hospital Information</h2>
                </div>

                {/* Hospital Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Hospital Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="e.g. Siloam Hospital Jakarta"
                    className="h-11"
                  />
                </div>

                {/* Hospital Type */}
                <div className="space-y-2">
                  <Label>Hospital Type *</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value) => updateField("type", value)}
                  >
                    <SelectTrigger className="w-full h-11">
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Hospital</SelectItem>
                      <SelectItem value="clinic">Clinic</SelectItem>
                      <SelectItem value="laboratory">Laboratory</SelectItem>
                      <SelectItem value="specialist">Specialist Hospital</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* License Number */}
                <div className="space-y-2">
                  <Label htmlFor="license" className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    License Number *
                  </Label>
                  <Input
                    id="license"
                    type="text"
                    value={formData.licenseNumber}
                    onChange={(e) => updateField("licenseNumber", e.target.value)}
                    placeholder="Operating license / SIP number"
                    className="h-11"
                  />
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="address" className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Address *
                  </Label>
                  <textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    placeholder="Full address..."
                    rows={2}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  />
                </div>

                {/* City & Phone - 2 columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      type="text"
                      value={formData.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      placeholder="e.g. Jakarta"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      Phone Number *
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      placeholder="+62 21 xxx xxxx"
                      className="h-11"
                    />
                  </div>
                </div>

                {/* Next Button */}
                <Button
                  onClick={handleNext}
                  disabled={!isStep1Valid}
                  className="w-full h-12 gap-2 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-base font-semibold mt-4"
                >
                  Next Step
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              /* Step 2: PIC Information */
              <div className="space-y-5">
                <div className="flex items-center gap-2 mb-6">
                  <User className="w-5 h-5 text-teal-600" />
                  <h2 className="text-lg font-semibold text-foreground">Person in Charge (PIC)</h2>
                </div>

                {/* PIC Name */}
                <div className="space-y-2">
                  <Label htmlFor="picName">PIC Name *</Label>
                  <Input
                    id="picName"
                    type="text"
                    value={formData.picName}
                    onChange={(e) => updateField("picName", e.target.value)}
                    placeholder="Full name of person in charge"
                    className="h-11"
                  />
                </div>

                {/* PIC Position */}
                <div className="space-y-2">
                  <Label htmlFor="picPosition" className="flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    Position
                  </Label>
                  <Input
                    id="picPosition"
                    type="text"
                    value={formData.picPosition}
                    onChange={(e) => updateField("picPosition", e.target.value)}
                    placeholder="e.g. Admin Manager, IT Director"
                    className="h-11"
                  />
                </div>

                {/* PIC Phone & Email - 2 columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="picPhone" className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      PIC Phone *
                    </Label>
                    <Input
                      id="picPhone"
                      type="tel"
                      value={formData.picPhone}
                      onChange={(e) => updateField("picPhone", e.target.value)}
                      placeholder="+62 812 xxx xxxx"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="picEmail" className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      PIC Email *
                    </Label>
                    <Input
                      id="picEmail"
                      type="email"
                      value={formData.picEmail}
                      onChange={(e) => updateField("picEmail", e.target.value)}
                      placeholder="admin@hospital.com"
                      className="h-11"
                    />
                  </div>
                </div>

                {/* Error Message */}
                {submitError && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
                    {submitError}
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    className="flex-1 h-12 gap-2"
                    disabled={isSubmitting}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!isStep2Valid || isSubmitting}
                    className="flex-1 h-12 gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-base font-semibold"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Registering on Blockchain...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Complete Registration
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
