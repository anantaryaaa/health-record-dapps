"use client";

import { useActiveAccount, ConnectButton } from "thirdweb/react";
import { client, hospitalTheme, wallets, liskSepolia } from "@/lib/thirdWeb";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import jsQR from "jsqr";
import { 
  Search, 
  QrCode, 
  ArrowLeft, 
  CheckCircle2, 
  ShieldCheck,
  Info,
  ImagePlus,
  Camera,
  X,
  Stethoscope,
  FileText,
  AlertCircle,
  Send,
  Printer,
  RefreshCw,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isHospitalRegistered, getHospitalData, saveHospitalData, HospitalData } from "@/lib/hospitalStorage";
import { getPatientData } from "@/lib/patientStorage";
import { 
  requestPatientAccess, 
  checkAccess, 
  hasPatientIdentity,
  addMedicalRecord,
  createDataHash,
  getPatientRecords,
  hasHospitalProfile,
  getHospitalProfile as getHospitalProfileFromChain
} from "@/lib/services/blockchain";
import { uploadMedicalRecord, getMedicalRecord, type MedicalRecordData } from "@/lib/services/ipfs";

// Types
interface ScannedPatientData {
  type: string;
  walletAddress: string;
  name: string;
  nik: string;
  gender: string;
  age: number;
  bloodType: string;
  isManualEntry?: boolean; // Flag to indicate if data came from manual wallet entry
}

interface MedicalRecordInput {
  // Basic Info
  noRekamMedik: string;
  tanggalMasuk: string;
  tanggalKeluar: string;
  // Diagnosis
  diagnosisUtama: string;
  icdCode: string;
  diagnosisSekunder: string;
  // Clinical Details
  keluhan: string;
  riwayatAlergi: string;
  tindakan: string;
  // Treatment
  resepObat: string;
  // Outcome
  keadaanKeluar: "sembuh" | "membaik" | "belumSembuh" | "meninggal" | "";
  dokterPenanggungJawab: string;
}

type FlowStep = "search" | "input" | "success";

export default function HospitalDashboard() {
  const account = useActiveAccount();
  const router = useRouter();
  
  // Flow state
  const [currentStep, setCurrentStep] = useState<FlowStep>("search");
  const [patient, setPatient] = useState<ScannedPatientData | null>(null);
  const [medicalRecord, setMedicalRecord] = useState<MedicalRecordInput>({
    noRekamMedik: "",
    tanggalMasuk: new Date().toISOString().split('T')[0],
    tanggalKeluar: "",
    diagnosisUtama: "",
    icdCode: "",
    diagnosisSekunder: "",
    keluhan: "",
    riwayatAlergi: "",
    tindakan: "",
    resepObat: "",
    keadaanKeluar: "",
    dokterPenanggungJawab: "",
  });
  
  // Search state
  const [nikInput, setNikInput] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // Hospital data
  const [hospitalData, setHospitalData] = useState<HospitalData | null>(null);
  const [isLoadingHospital, setIsLoadingHospital] = useState(true);

  useEffect(() => {
    const checkAndLoadHospital = async () => {
      if (!account) {
        router.push("/auth");
        return;
      }
      
      setIsLoadingHospital(true);
      
      // First check localStorage
      let localData = getHospitalData(account.address);
      
      if (localData) {
        setHospitalData(localData);
        setIsLoadingHospital(false);
        return;
      }
      
      // If not in localStorage, check blockchain
      try {
        const hasProfile = await hasHospitalProfile(account.address);
        
        if (hasProfile) {
          // Fetch from blockchain and save to localStorage
          const profileData = await getHospitalProfileFromChain(account.address);
          
          if (profileData) {
            const hospitalDataFromChain: HospitalData = {
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
            
            // Save to localStorage for future use
            saveHospitalData(hospitalDataFromChain);
            setHospitalData(hospitalDataFromChain);
            setIsLoadingHospital(false);
            return;
          }
        }
        
        // Not registered anywhere, redirect to registration
        router.push("/dashboard/hospital/registration");
      } catch (error) {
        console.error("Error checking hospital profile:", error);
        // If blockchain check fails, redirect to registration
        router.push("/dashboard/hospital/registration");
      } finally {
        setIsLoadingHospital(false);
      }
    };
    
    checkAndLoadHospital();
  }, [account, router]);

  if (!account) {
    return null;
  }
  
  // Show loading while checking registration
  if (isLoadingHospital || !hospitalData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          <p className="text-muted-foreground">Loading hospital data...</p>
        </div>
      </div>
    );
  }

  const handlePatientFound = (data: ScannedPatientData) => {
    setPatient(data);
    setCurrentStep("input");
    setShowScanner(false);
  };

  const handleSubmitRecord = async () => {
    if (!patient || !account || !hospitalData) return;
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // 1. Prepare medical record data for IPFS
      const ipfsRecordData: MedicalRecordData = {
        patientAddress: patient.walletAddress,
        noRekamMedik: medicalRecord.noRekamMedik,
        tanggalMasuk: medicalRecord.tanggalMasuk,
        tanggalKeluar: medicalRecord.tanggalKeluar,
        diagnosisUtama: medicalRecord.diagnosisUtama,
        icdCode: medicalRecord.icdCode,
        diagnosisSekunder: medicalRecord.diagnosisSekunder,
        keluhan: medicalRecord.keluhan,
        riwayatAlergi: medicalRecord.riwayatAlergi,
        tindakan: medicalRecord.tindakan,
        resepObat: medicalRecord.resepObat,
        keadaanKeluar: medicalRecord.keadaanKeluar,
        dokterPenanggungJawab: medicalRecord.dokterPenanggungJawab,
        hospitalAddress: account.address,
        hospitalName: hospitalData.name,
        timestamp: Math.floor(Date.now() / 1000),
        recordType: "DIAGNOSIS",
      };
      
      // 2. Upload encrypted data to IPFS
      console.log("Uploading to IPFS...");
      const ipfsResult = await uploadMedicalRecord(ipfsRecordData);
      
      if (!ipfsResult.success || !ipfsResult.cid || !ipfsResult.dataHash) {
        throw new Error(ipfsResult.error || "Failed to upload to IPFS");
      }
      
      console.log("IPFS upload successful:", ipfsResult.cid);
      
      // 3. Store reference on blockchain
      console.log("Storing reference on blockchain...");
      const blockchainResult = await addMedicalRecord(
        account,
        patient.walletAddress,
        ipfsResult.cid,
        ipfsResult.dataHash,
        medicalRecord.icdCode,
        "DIAGNOSIS"
      );
      
      if (!blockchainResult.success) {
        throw new Error(blockchainResult.error || "Failed to store on blockchain");
      }
      
      console.log("Blockchain transaction successful:", blockchainResult.txHash);
      
      // Success!
      setCurrentStep("success");
    } catch (error) {
      console.error("Error submitting medical record:", error);
      setSubmitError(error instanceof Error ? error.message : "Failed to submit record");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form only (stay on input page with same patient)
  const handleResetForm = () => {
    setMedicalRecord({
      noRekamMedik: "",
      tanggalMasuk: new Date().toISOString().split('T')[0],
      tanggalKeluar: "",
      diagnosisUtama: "",
      icdCode: "",
      diagnosisSekunder: "",
      keluhan: "",
      riwayatAlergi: "",
      tindakan: "",
      resepObat: "",
      keadaanKeluar: "",
      dokterPenanggungJawab: "",
    });
    setCurrentStep("input");
  };

  // Full reset (go back to search)
  const handleFullReset = () => {
    setCurrentStep("search");
    setPatient(null);
    setMedicalRecord({
      noRekamMedik: "",
      tanggalMasuk: new Date().toISOString().split('T')[0],
      tanggalKeluar: "",
      diagnosisUtama: "",
      icdCode: "",
      diagnosisSekunder: "",
      keluhan: "",
      riwayatAlergi: "",
      tindakan: "",
      resepObat: "",
      keadaanKeluar: "",
      dokterPenanggungJawab: "",
    });
    setNikInput("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-600 to-teal-500 rounded-xl flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-foreground">MediChain</span>
              <span className="text-muted-foreground text-sm ml-2">HOSPITAL PORTAL</span>
            </div>
          </div>
          
          {/* Thirdweb Connect Wallet Button */}
          <ConnectButton 
            client={client} 
            theme={hospitalTheme}
            wallets={wallets}
            chain={liskSepolia}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6">
        {currentStep === "search" && (
          <SearchPatientStep
            nikInput={nikInput}
            setNikInput={setNikInput}
            showScanner={showScanner}
            setShowScanner={setShowScanner}
            onPatientFound={handlePatientFound}
          />
        )}

        {currentStep === "input" && patient && (
          <InputRecordStep
            patient={patient}
            medicalRecord={medicalRecord}
            setMedicalRecord={setMedicalRecord}
            onSubmit={handleSubmitRecord}
            onBack={() => setCurrentStep("search")}
            isSubmitting={isSubmitting}
            submitError={submitError}
          />
        )}

        {currentStep === "success" && patient && (
          <SuccessStep 
            patient={patient}
            onAddMore={handleResetForm} 
            onBackToSearch={handleFullReset} 
          />
        )}
      </main>
    </div>
  );
}

import { searchPatients, PatientData as StoragePatientData } from "@/lib/patientStorage";

// Step 1: Search Patient
function SearchPatientStep({
  nikInput,
  setNikInput,
  showScanner,
  setShowScanner,
  onPatientFound,
}: {
  nikInput: string;
  setNikInput: (v: string) => void;
  showScanner: boolean;
  setShowScanner: (v: boolean) => void;
  onPatientFound: (data: ScannedPatientData) => void;
}) {
  const [searchResults, setSearchResults] = useState<StoragePatientData[]>([]);

  // Search effect
  useEffect(() => {
    if (nikInput.length >= 2) {
      const results = searchPatients(nikInput);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [nikInput]);

  const handleSelectResult = (data: StoragePatientData) => {
    // Map StoragePatientData to ScannedPatientData format expected by the dashboard
    onPatientFound({
      type: "medichain_patient",
      walletAddress: data.walletAddress,
      name: data.name,
      nik: data.nik,
      gender: data.gender,
      age: data.age,
      bloodType: data.bloodType
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="w-16 h-16 flex items-center justify-center mx-auto mb-6">
          <Search className="w-8 h-8 text-teal-600" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-foreground mb-3">
          Search Patient Data
        </h1>
        <p className="text-muted-foreground mb-8">
          Scan QR Code from patient&apos;s app or manually input ID/Name to create a new medical record.
        </p>

        {/* NIK Input */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={nikInput}
            onChange={(e) => setNikInput(e.target.value)}
            placeholder="Search Patient Name or ID..."
            className="w-full h-14 pl-12 pr-4 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="w-full bg-card border border-border rounded-xl shadow-lg mb-6 overflow-hidden text-left max-h-60 overflow-y-auto">
             {searchResults.map((result) => (
                <div 
                  key={result.walletAddress}
                  onClick={() => handleSelectResult(result)}
                  className="p-4 hover:bg-muted/50 cursor-pointer border-b last:border-0 transition-colors"
                >
                  <p className="font-semibold text-foreground">{result.name}</p>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>ID: {result.nik}</span>
                    <span>{result.gender} • {result.age} yrs</span>
                  </div>
                </div>
             ))}
          </div>
        )}

        {nikInput.length > 2 && searchResults.length === 0 && (
           <p className="text-sm text-red-600 mb-6">
             No patient found with keyword &quot;{nikInput}&quot;
           </p>
        )}

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-sm text-muted-foreground">OR</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Scan QR Button */}
        <Button
          onClick={() => setShowScanner(true)}
          className="w-full h-14 gap-3 bg-gradient-to-r from-teal-600 to-teal-500 text-lg font-semibold hover:from-teal-700 hover:to-teal-600"
        >
          <QrCode className="w-5 h-5" />
          Scan Patient QR
        </Button>
      </div>

      {/* QR Scanner Modal */}
      {showScanner && (
        <QRScannerModal
          onClose={() => setShowScanner(false)}
          onScanSuccess={onPatientFound}
        />
      )}
    </div>
  );
}

// Step 2: Input Medical Record (with History Tab)
function InputRecordStep({
  patient,
  medicalRecord,
  setMedicalRecord,
  onSubmit,
  onBack,
  isSubmitting = false,
  submitError = null,
}: {
  patient: ScannedPatientData;
  medicalRecord: MedicalRecordInput;
  setMedicalRecord: (v: MedicalRecordInput) => void;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting?: boolean;
  submitError?: string | null;
}) {
  const [activeTab, setActiveTab] = useState<"history" | "new">("history");
  const [medicalHistory, setMedicalHistory] = useState<Array<{
    id: number;
    ipfsCid: string;
    noRekamMedik: string;
    tanggalMasuk: string;
    tanggalKeluar: string;
    diagnosisUtama: string;
    icdCode: string;
    diagnosisSekunder: string;
    keluhan: string;
    riwayatAlergi: string;
    tindakan: string;
    resepObat: string;
    keadaanKeluar: string;
    dokterPenanggungJawab: string;
    hospital: string;
    hospitalAddress: string;
    timestamp: number;
    isVerified: boolean;
  }>>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<typeof medicalHistory[0] | null>(null);
  
  const isFormValid = medicalRecord.diagnosisUtama && medicalRecord.keluhan && medicalRecord.dokterPenanggungJawab;

  // Print single record
  const handlePrintRecord = (record: typeof medicalHistory[0]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Medical Record - ${patient.name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; background: #fff; color: #1a1a1a; font-size: 12px; }
            .container { max-width: 800px; margin: 0 auto; border: 2px solid #333; }
            .header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 2px solid #333; background: linear-gradient(135deg, #0d9488, #0f766e); color: white; }
            .logo h1 { font-size: 18px; font-weight: bold; }
            .logo p { font-size: 10px; opacity: 0.8; }
            .badge { background: #C7EEFF; color: #0d9488; padding: 4px 12px; border-radius: 4px; font-size: 10px; font-weight: 600; }
            .title-bar { text-align: center; padding: 12px; border-bottom: 1px solid #333; background: #f5f5f5; }
            .title-bar h2 { font-size: 14px; font-weight: bold; }
            .content { padding: 0; }
            .row { display: flex; border-bottom: 1px solid #ddd; }
            .row:last-child { border-bottom: none; }
            .cell { padding: 8px 12px; border-right: 1px solid #ddd; flex: 1; }
            .cell:last-child { border-right: none; }
            .cell.label { background: #f9f9f9; font-weight: 600; flex: 0 0 160px; font-size: 11px; color: #555; }
            .cell.value { flex: 1; }
            .section-title { background: #e8e8e8; padding: 8px 12px; font-weight: bold; font-size: 12px; border-bottom: 1px solid #ddd; }
            .footer { padding: 12px; background: #f5f5f5; border-top: 2px solid #333; display: flex; justify-content: space-between; align-items: center; }
            .footer .date { font-size: 10px; color: #666; }
            .footer .signature { text-align: center; }
            .footer .signature .line { width: 150px; border-bottom: 1px solid #333; margin-bottom: 4px; height: 40px; }
            .footer .signature p { font-size: 10px; }
            @media print { body { padding: 0; } .container { border: 1px solid #333; } }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo"><h1>MEDICHAIN</h1><p>Hospital Portal - Medical Record</p></div>
              <span class="badge">MEDICAL RECORD</span>
            </div>
            <div class="title-bar"><h2>MEDICAL RECORD FORM</h2></div>
            <div class="content">
              <div class="section-title">PATIENT DATA</div>
              <div class="row"><div class="cell label">Patient Name</div><div class="cell value">${patient.name}</div></div>
              <div class="row"><div class="cell label">ID Number</div><div class="cell value">${patient.nik}</div></div>
              <div class="row"><div class="cell label">Gender</div><div class="cell value">${patient.gender}</div></div>
              <div class="row"><div class="cell label">Age</div><div class="cell value">${patient.age} Years</div></div>
              <div class="row"><div class="cell label">Blood Type</div><div class="cell value">${patient.bloodType}</div></div>
              <div class="row"><div class="cell label">Allergy History</div><div class="cell value">${record.riwayatAlergi || "-"}</div></div>
              
              <div class="section-title">VISIT DATA</div>
              <div class="row"><div class="cell label">Medical Record No.</div><div class="cell value">${record.noRekamMedik}</div></div>
              <div class="row"><div class="cell label">Admission Date</div><div class="cell value">${record.tanggalMasuk}</div></div>
              <div class="row"><div class="cell label">Discharge Date</div><div class="cell value">${record.tanggalKeluar || "-"}</div></div>
              <div class="row"><div class="cell label">Healthcare Facility</div><div class="cell value">${record.hospital}</div></div>
              
              <div class="section-title">DIAGNOSIS</div>
              <div class="row"><div class="cell label">Primary Diagnosis</div><div class="cell value">${record.diagnosisUtama}</div></div>
              <div class="row"><div class="cell label">ICD-X Code</div><div class="cell value">${record.icdCode || "-"}</div></div>
              <div class="row"><div class="cell label">Secondary Diagnosis</div><div class="cell value">${record.diagnosisSekunder || "-"}</div></div>
              
              <div class="section-title">CLINICAL DATA</div>
              <div class="row"><div class="cell label">Symptoms / Complaints</div><div class="cell value">${record.keluhan}</div></div>
              <div class="row"><div class="cell label">Procedure</div><div class="cell value">${record.tindakan || "-"}</div></div>
              <div class="row"><div class="cell label">Prescription / Therapy</div><div class="cell value">${record.resepObat || "-"}</div></div>
              
              <div class="section-title">VISIT OUTCOME</div>
              <div class="row"><div class="cell label">Discharge Status</div><div class="cell value">${record.keadaanKeluar || "-"}</div></div>
              <div class="row"><div class="cell label">Attending Physician</div><div class="cell value">${record.dokterPenanggungJawab}</div></div>
            </div>
            <div class="footer">
              <div class="date">Printed: ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              <div class="signature"><div class="line"></div><p>Doctor's Signature</p></div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 250);
  };

  // Fetch medical history from blockchain + IPFS
  useEffect(() => {
    const fetchHistory = async () => {
      if (!patient.walletAddress) return;
      
      setIsLoadingHistory(true);
      setHistoryError(null);
      
      try {
        // Get records from blockchain
        const recordRefs = await getPatientRecords(patient.walletAddress);
        
        if (recordRefs.length === 0) {
          setMedicalHistory([]);
          setIsLoadingHistory(false);
          return;
        }
        
        // Fetch and decrypt each record from IPFS
        const history: typeof medicalHistory = [];
        
        for (let i = 0; i < recordRefs.length; i++) {
          const ref = recordRefs[i];
          try {
            const ipfsResult = await getMedicalRecord(ref.ipfsCid, patient.walletAddress);
            
            if (ipfsResult.success && ipfsResult.data) {
              history.push({
                id: i + 1,
                ipfsCid: ref.ipfsCid,
                noRekamMedik: ipfsResult.data.noRekamMedik || `MR-${ref.timestamp}`,
                tanggalMasuk: ipfsResult.data.tanggalMasuk || new Date(ref.timestamp * 1000).toLocaleDateString(),
                tanggalKeluar: ipfsResult.data.tanggalKeluar || "",
                diagnosisUtama: ipfsResult.data.diagnosisUtama || ref.icd10Code,
                icdCode: ipfsResult.data.icdCode || ref.icd10Code,
                diagnosisSekunder: ipfsResult.data.diagnosisSekunder || "",
                keluhan: ipfsResult.data.keluhan || "",
                riwayatAlergi: ipfsResult.data.riwayatAlergi || "",
                tindakan: ipfsResult.data.tindakan || "",
                resepObat: ipfsResult.data.resepObat || "",
                keadaanKeluar: ipfsResult.data.keadaanKeluar || "",
                dokterPenanggungJawab: ipfsResult.data.dokterPenanggungJawab || "",
                hospital: ipfsResult.data.hospitalName || `Hospital ${ref.hospitalAddress.slice(0, 8)}...`,
                hospitalAddress: ref.hospitalAddress,
                timestamp: ref.timestamp,
                isVerified: ref.isVerified,
              });
            } else {
              // Fallback with blockchain data only
              history.push({
                id: i + 1,
                ipfsCid: ref.ipfsCid,
                noRekamMedik: `MR-${ref.timestamp}`,
                tanggalMasuk: new Date(ref.timestamp * 1000).toLocaleDateString(),
                tanggalKeluar: "",
                diagnosisUtama: ref.icd10Code,
                icdCode: ref.icd10Code,
                diagnosisSekunder: "",
                keluhan: "(Encrypted)",
                riwayatAlergi: "",
                tindakan: "",
                resepObat: "(Encrypted)",
                keadaanKeluar: "",
                dokterPenanggungJawab: "",
                hospital: `Hospital ${ref.hospitalAddress.slice(0, 8)}...`,
                hospitalAddress: ref.hospitalAddress,
                timestamp: ref.timestamp,
                isVerified: ref.isVerified,
              });
            }
          } catch (err) {
            console.error("Failed to decrypt record:", err);
          }
        }
        
        // Sort by timestamp descending
        history.sort((a, b) => b.timestamp - a.timestamp);
        
        setMedicalHistory(history);
      } catch (err) {
        console.error("Error fetching medical history:", err);
        setHistoryError("Failed to load medical history");
      } finally {
        setIsLoadingHistory(false);
      }
    };
    
    fetchHistory();
  }, [patient.walletAddress]);

  return (
    <div className="py-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className=" mt-2 flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 mt-2 gap-6">
        {/* Patient Info Sidebar */}
        <Card className="lg:col-span-1 bg-gradient-to-br from-[#1D242B] to-[#2a3441] border-0">
          <CardContent className="p-6 text-white">
            {/* Avatar */}
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-2xl font-bold mb-4">
              {patient.isManualEntry ? "?" : patient.name.charAt(0)}
            </div>

            {/* Name & NIK */}
            {patient.isManualEntry ? (
              <>
                <h2 className="text-xl font-bold mb-1">Verified Patient</h2>
                <p className="text-white/60 font-mono text-sm mb-4">
                  {patient.walletAddress.slice(0, 6)}...{patient.walletAddress.slice(-4)}
                </p>
                <div className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg mb-4">
                  <p className="text-xs text-blue-300">
                    Patient details not available via manual entry. 
                    Scan patient&apos;s QR code for full information.
                  </p>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold mb-1">{patient.name}</h2>
                <p className="text-white/60 font-mono text-sm mb-4">{patient.nik}</p>
              </>
            )}

            {/* Patient Stats - only show if not manual entry */}
            {!patient.isManualEntry && (
              <div className="grid grid-cols-3 gap-2 mb-6">
                <div className="text-center p-2 bg-white/5 rounded-lg">
                  <p className="text-xs text-white/50">Blood</p>
                  <p className="font-bold">{patient.bloodType}</p>
                </div>
                <div className="text-center p-2 bg-white/5 rounded-lg">
                  <p className="text-xs text-white/50">Gender</p>
                  <p className="font-bold">{patient.gender}</p>
                </div>
                <div className="text-center p-2 bg-white/5 rounded-lg">
                  <p className="text-xs text-white/50">Age</p>
                  <p className="font-bold">{patient.age}</p>
                  <p className="text-xs text-white/50">Years</p>
                </div>
              </div>
            )}

            {/* Verified Badge */}
            <div className="flex items-center gap-2 text-emerald-400 mb-6">
              <ShieldCheck className="w-5 h-5" />
              <div>
                <p className="text-xs text-white/60">STATUS IDENTITY</p>
                <p className="font-medium">Verified</p>
              </div>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-white/5 rounded-xl">
              <div className="flex items-start gap-3">
                <Info className="w-10 h-10 text-white/60 mt-2 mb-2"/>
                <div>
                  <p className="text-xs text-white/60 mb-1">Key Info</p>
                  <p className="text-sm text-white/80">
                    As an institution, the hospital&apos;s <span className="font-bold">KMS (Key Management System)</span> is your access key. You don&apos;t need to manage private keys manually.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content with Tabs */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-muted rounded-lg mb-6">
              <button
                onClick={() => setActiveTab("history")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "history"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileText className="w-4 h-4" />
                Medical History
              </button>
              <button
                onClick={() => setActiveTab("new")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "new"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Stethoscope className="w-4 h-4" />
                New Record
              </button>
            </div>

            {activeTab === "history" ? (
              /* Medical History */
              <div className="space-y-4">
                {isLoadingHistory ? (
                  <div className="text-center py-12">
                    <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-muted-foreground">Loading medical history from blockchain...</p>
                  </div>
                ) : historyError ? (
                  <div className="text-center py-12 text-red-500">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>{historyError}</p>
                  </div>
                ) : medicalHistory.length > 0 ? (
                  medicalHistory.map((record) => (
                    <div 
                      key={record.id} 
                      className="p-4 bg-muted/30 border border-border rounded-xl cursor-pointer hover:border-teal-500/50 hover:shadow-md transition-all"
                      onClick={() => setSelectedRecord(record)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{record.tanggalMasuk}</span>
                            {record.icdCode && (
                              <span className="text-xs px-1.5 py-0.5 bg-blue-500/10 text-blue-600 rounded font-mono">
                                {record.icdCode}
                              </span>
                            )}
                          </div>
                          <h4 className="font-semibold text-foreground mt-1">{record.diagnosisUtama}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          {record.isVerified && (
                            <span title="Verified on blockchain" className="text-emerald-500">
                              <ShieldCheck className="w-4 h-4" />
                            </span>
                          )}
                          <span className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded-full font-medium">
                            {record.keadaanKeluar || "Complete"}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Symptoms</p>
                          <p className="text-sm text-foreground line-clamp-2">{record.keluhan}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Treatment</p>
                          <p className="text-sm text-foreground line-clamp-2">{record.resepObat}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <ShieldCheck className="w-3 h-3 text-teal-600" />
                          {record.hospital}
                        </div>
                        <span className="text-xs text-teal-600 font-medium">Click to view details →</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No medical history yet</p>
                  </div>
                )}
              </div>
            ) : (
              /* New Record Form with OCR */
              <div className="space-y-5">
                {/* OCR Upload Section */}
                <OCRUploadSection 
                  onOCRComplete={(data) => setMedicalRecord(data)}
                />

                {/* Divider */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground uppercase">Or Manual Input</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Row 1: No RM & Tanggal */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">MEDICAL RECORD NO.</label>
                    <input
                      type="text"
                      value={medicalRecord.noRekamMedik}
                      onChange={(e) => setMedicalRecord({ ...medicalRecord, noRekamMedik: e.target.value })}
                      placeholder="MR-2024-00001"
                      className="w-full h-10 px-3 bg-muted/30 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">ADMISSION DATE (MRS)</label>
                    <input
                      type="date"
                      value={medicalRecord.tanggalMasuk}
                      onChange={(e) => setMedicalRecord({ ...medicalRecord, tanggalMasuk: e.target.value })}
                      className="w-full h-10 px-3 bg-muted/30 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">DISCHARGE DATE (KRS)</label>
                    <input
                      type="date"
                      value={medicalRecord.tanggalKeluar}
                      onChange={(e) => setMedicalRecord({ ...medicalRecord, tanggalKeluar: e.target.value })}
                      className="w-full h-10 px-3 bg-muted/30 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>
                </div>

                {/* Row 2: Diagnosa */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">PRIMARY DIAGNOSIS *</label>
                    <input
                      type="text"
                      value={medicalRecord.diagnosisUtama}
                      onChange={(e) => setMedicalRecord({ ...medicalRecord, diagnosisUtama: e.target.value })}
                      placeholder="e.g. Acute Bronchitis"
                      className="w-full h-10 px-3 bg-muted/30 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">ICD-X CODE</label>
                    <input
                      type="text"
                      value={medicalRecord.icdCode}
                      onChange={(e) => setMedicalRecord({ ...medicalRecord, icdCode: e.target.value })}
                      placeholder="J20.9"
                      className="w-full h-10 px-3 bg-muted/30 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>
                </div>

                {/* Row 3: Diagnosa Sekunder */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">SECONDARY DIAGNOSIS / COMPLICATIONS</label>
                  <input
                    type="text"
                    value={medicalRecord.diagnosisSekunder}
                    onChange={(e) => setMedicalRecord({ ...medicalRecord, diagnosisSekunder: e.target.value })}
                    placeholder="If any..."
                    className="w-full h-10 px-3 bg-muted/30 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>

                {/* Row 4: Keluhan & Riwayat Alergi */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">SYMPTOMS / COMPLAINTS *</label>
                    <textarea
                      value={medicalRecord.keluhan}
                      onChange={(e) => setMedicalRecord({ ...medicalRecord, keluhan: e.target.value })}
                      placeholder="Detail patient symptoms..."
                      className="w-full h-24 px-3 py-2 bg-muted/30 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">ALLERGY HISTORY</label>
                    <textarea
                      value={medicalRecord.riwayatAlergi}
                      onChange={(e) => setMedicalRecord({ ...medicalRecord, riwayatAlergi: e.target.value })}
                      placeholder="None / Specify..."
                      className="w-full h-24 px-3 py-2 bg-muted/30 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none"
                    />
                  </div>
                </div>

                {/* Row 5: Tindakan & Resep */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">PROCEDURE / SURGERY</label>
                    <textarea
                      value={medicalRecord.tindakan}
                      onChange={(e) => setMedicalRecord({ ...medicalRecord, tindakan: e.target.value })}
                      placeholder="Examination, procedures, surgery..."
                      className="w-full h-24 px-3 py-2 bg-muted/30 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">PRESCRIPTION</label>
                    <textarea
                      value={medicalRecord.resepObat}
                      onChange={(e) => setMedicalRecord({ ...medicalRecord, resepObat: e.target.value })}
                      placeholder="Medications given..."
                      className="w-full h-24 px-3 py-2 bg-muted/30 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none"
                    />
                  </div>
                </div>

                {/* Row 6: Keadaan Keluar & Dokter */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">DISCHARGE STATUS</label>
                    <select
                      value={medicalRecord.keadaanKeluar}
                      onChange={(e) => setMedicalRecord({ ...medicalRecord, keadaanKeluar: e.target.value as MedicalRecordInput["keadaanKeluar"] })}
                      className="w-full h-10 px-3 bg-muted/30 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    >
                      <option value="">Select...</option>
                      <option value="sembuh">Cured</option>
                      <option value="membaik">Improved</option>
                      <option value="belumSembuh">Not Cured</option>
                      <option value="meninggal">Deceased</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">ATTENDING PHYSICIAN *</label>
                    <input
                      type="text"
                      value={medicalRecord.dokterPenanggungJawab}
                      onChange={(e) => setMedicalRecord({ ...medicalRecord, dokterPenanggungJawab: e.target.value })}
                      placeholder="Dr. Full Name, Sp.X"
                      className="w-full h-10 px-3 bg-muted/30 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>
                </div>

                {/* Error Message */}
                {submitError && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-600 mt-4">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm">{submitError}</span>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  onClick={onSubmit}
                  disabled={!isFormValid || isSubmitting}
                  className="w-full h-14 gap-2 bg-emerald-600 hover:bg-emerald-700 text-lg font-semibold mt-4 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Encrypting & Uploading...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Push to Blockchain
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Record Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedRecord(null)}>
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-0">
              {/* Modal Header */}
              <div className="p-6 bg-gradient-to-r from-teal-500/20 to-teal-500/5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <span className="font-mono">{selectedRecord.noRekamMedik}</span>
                      <span>•</span>
                      <span>{selectedRecord.tanggalMasuk}</span>
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">{selectedRecord.diagnosisUtama}</h2>
                    <p className="text-sm text-muted-foreground mt-1">ICD: {selectedRecord.icdCode || "-"}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md font-medium bg-teal-500/20 text-teal-600">
                        <Stethoscope className="w-3 h-3" />
                        Diagnosis
                      </span>
                      {selectedRecord.keadaanKeluar && (
                        <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-600 rounded-md font-medium">
                          {selectedRecord.keadaanKeluar}
                        </span>
                      )}
                      {selectedRecord.isVerified && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md font-medium bg-emerald-500/20 text-emerald-600">
                          <ShieldCheck className="w-3 h-3" />
                          Verified
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setSelectedRecord(null)} className="p-2 rounded-full hover:bg-muted/50 transition-colors">
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5">
                {/* Keluhan */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Symptoms / Complaints</h4>
                  <p className="text-foreground">{selectedRecord.keluhan || "-"}</p>
                </div>

                {/* Riwayat Alergi */}
                {selectedRecord.riwayatAlergi && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Allergy History</h4>
                    <p className="text-foreground">{selectedRecord.riwayatAlergi}</p>
                  </div>
                )}

                {/* Diagnosa Sekunder */}
                {selectedRecord.diagnosisSekunder && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Secondary Diagnosis</h4>
                    <p className="text-foreground">{selectedRecord.diagnosisSekunder}</p>
                  </div>
                )}

                {/* Tindakan */}
                {selectedRecord.tindakan && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Procedure</h4>
                    <p className="text-foreground">{selectedRecord.tindakan}</p>
                  </div>
                )}

                {/* Resep */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Prescription / Therapy</h4>
                  <p className="text-foreground">{selectedRecord.resepObat || "-"}</p>
                </div>

                {/* Hospital & Doctor Info */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Healthcare Facility</h4>
                    <p className="text-foreground">{selectedRecord.hospital}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Attending Physician</h4>
                    <p className="text-foreground">{selectedRecord.dokterPenanggungJawab || "-"}</p>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Admission Date</h4>
                    <p className="text-foreground">{selectedRecord.tanggalMasuk}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Discharge Date</h4>
                    <p className="text-foreground">{selectedRecord.tanggalKeluar || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-border flex justify-end gap-3">
                <Button variant="outline" onClick={() => setSelectedRecord(null)}>
                  Close
                </Button>
                <Button 
                  onClick={() => handlePrintRecord(selectedRecord)}
                  className="gap-2 bg-teal-600 hover:bg-teal-700"
                >
                  <Printer className="w-4 h-4" />
                  Print Record
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// OCR Upload Section Component
import { Upload, FileCheck, Sparkles, AlertTriangle } from "lucide-react";

function OCRUploadSection({
  onOCRComplete,
}: {
  onOCRComplete: (data: MedicalRecordInput) => void;
}) {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrError(null);
    setIsComplete(false);

    // Show preview and get base64
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Image = event.target?.result as string;
      setUploadedImage(base64Image);

      // Call OCR API
      setIsProcessing(true);
      try {
        const response = await fetch("/api/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64Image }),
        });

        const result = await response.json();

        if (result.success && result.data) {
          setIsComplete(true);
          onOCRComplete(result.data);
        } else {
          setOcrError(result.error || "Failed to extract data from image");
        }
      } catch (err) {
        console.error("OCR error:", err);
        setOcrError("Failed to process image. Please try again.");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    setUploadedImage(null);
    setIsProcessing(false);
    setIsComplete(false);
    setOcrError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="border-2 border-dashed border-border rounded-xl p-6 bg-muted/20">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {!uploadedImage ? (
        // Upload State
        <div 
          className="flex flex-col items-center justify-center py-8 cursor-pointer hover:bg-muted/30 rounded-lg transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-16 h-16 bg-teal-500/10 rounded-2xl flex items-center justify-center mb-4">
            <Upload className="w-8 h-8 text-teal-600" />
          </div>
          <h4 className="font-semibold text-foreground mb-1">Upload Medical Document</h4>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            Upload prescription photo, lab results, or diagnosis document for auto-fill
          </p>
          <div className="flex items-center gap-2 mt-4 text-xs text-teal-600">
            <Sparkles className="w-3 h-3" />
            <span>Powered by AI</span>
          </div>
        </div>
      ) : (
        // Preview & Processing State
        <div className="space-y-4">
          {/* Image Preview */}
          <div className="relative aspect-[4/3] w-full max-w-xs mx-auto rounded-lg overflow-hidden bg-black">
            <img 
              src={uploadedImage} 
              alt="Uploaded document" 
              className="w-full h-full object-contain"
            />
            {isProcessing && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-teal-400 animate-spin mb-2" />
                <p className="text-white text-sm">Analyzing with AI...</p>
              </div>
            )}
            {isComplete && (
              <div className="absolute inset-0 bg-emerald-600/80 flex flex-col items-center justify-center">
                <FileCheck className="w-10 h-10 text-white mb-2" />
                <p className="text-white font-semibold">Auto-fill Successful!</p>
              </div>
            )}
            {ocrError && (
              <div className="absolute inset-0 bg-red-600/80 flex flex-col items-center justify-center p-4">
                <AlertTriangle className="w-10 h-10 text-white mb-2" />
                <p className="text-white text-sm text-center">{ocrError}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isProcessing}
            >
              {ocrError ? "Try Again" : "Re-upload"}
            </Button>
          </div>

          {isComplete && (
            <p className="text-xs text-center text-emerald-600">
              ✓ Data extracted successfully. Please review and edit if needed.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Step 3: Success
function SuccessStep({ 
  patient,
  onAddMore, 
  onBackToSearch 
}: { 
  patient: ScannedPatientData;
  onAddMore: () => void;
  onBackToSearch: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
      <div className="w-full max-w-md text-center">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-foreground mb-3">
          Data Saved Successfully!
        </h1>
        <p className="text-muted-foreground mb-2">
          Data has been encrypted and sent to the Patient&apos;s Wallet.
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          Patient: <span className="font-semibold text-foreground">{patient.isManualEntry ? `${patient.walletAddress.slice(0, 6)}...${patient.walletAddress.slice(-4)}` : patient.name}</span>
        </p>

        {/* Buttons */}
        <div className="space-y-3">
          <Button
            onClick={onAddMore}
            className="w-full h-14 gap-2 bg-gradient-to-r from-teal-600 to-teal-500 text-lg font-semibold hover:from-teal-700 hover:to-teal-600"
          >
            <Stethoscope className="w-5 h-5" />
            Back to Patient's Data
          </Button>
          <Button
            onClick={onBackToSearch}
            variant="outline"
            className="w-full h-12"
          >
            Back to Search Patient
          </Button>
        </div>
      </div>
    </div>
  );
}

// QR Scanner Modal Component with Access Request
function QRScannerModal({
  onClose,
  onScanSuccess,
}: {
  onClose: () => void;
  onScanSuccess: (data: ScannedPatientData) => void;
}) {
  const account = useActiveAccount();
  const hospitalData = account ? getHospitalData(account.address) : null;
  
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [scannedPatient, setScannedPatient] = useState<ScannedPatientData | null>(null);
  const [accessStatus, setAccessStatus] = useState<"none" | "checking" | "has_access" | "requesting" | "requested">("none");
  const [requestMessage, setRequestMessage] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [isCheckingApproval, setIsCheckingApproval] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (scanning) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [scanning]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        scanQRCode();
      }
    } catch {
      setError("Cannot access camera.");
      setScanning(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handlePatientScanned = async (data: ScannedPatientData) => {
    setScannedPatient(data);
    setScanning(false);
    stopCamera();
    
    if (!account) return;
    
    // Check if we already have access
    setAccessStatus("checking");
    try {
      const accessResult = await checkAccess(data.walletAddress, account.address);
      if (accessResult.hasAccess) {
        setAccessStatus("has_access");
      } else {
        setAccessStatus("none");
      }
    } catch (err) {
      console.error("Error checking access:", err);
      setAccessStatus("none");
    }
  };

  const handleManualAddressSubmit = async () => {
    if (!manualAddress || !manualAddress.startsWith("0x") || manualAddress.length !== 42) {
      setError("Please enter a valid wallet address (0x...)");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // First, try to get patient data from localStorage
      const localPatientData = getPatientData(manualAddress);
      
      if (localPatientData) {
        // Found in localStorage - use actual patient data
        const patientData: ScannedPatientData = {
          type: "medichain_patient",
          walletAddress: localPatientData.walletAddress,
          name: localPatientData.name,
          nik: localPatientData.nik,
          bloodType: localPatientData.bloodType,
          gender: localPatientData.gender,
          age: localPatientData.age,
          isManualEntry: false,
        };
        await handlePatientScanned(patientData);
      } else {
        // Not in localStorage - check if registered on blockchain
        const isRegistered = await hasPatientIdentity(manualAddress);
        
        if (isRegistered) {
          // Patient exists on blockchain but no local data
          // Create entry with wallet address, hospital can still request access
          const manualPatientData: ScannedPatientData = {
            type: "medichain_patient",
            walletAddress: manualAddress,
            name: "Verified Patient",
            nik: manualAddress.slice(0, 10) + "...",
            bloodType: "-",
            gender: "-",
            age: 0,
            isManualEntry: true,
          };
          await handlePatientScanned(manualPatientData);
        } else {
          // Patient not found anywhere
          setError("Patient not found. This wallet address is not registered in Medichain.");
        }
      }
    } catch (err) {
      console.error("Error with manual address:", err);
      setError("Failed to process wallet address.");
    } finally {
      setProcessing(false);
    }
  };

  const scanQRCode = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scan = () => {
      if (!scanning || !video.videoWidth) {
        requestAnimationFrame(scan);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        try {
          const data = JSON.parse(code.data);
          if (data.type === "medichain_patient") {
            handlePatientScanned(data);
            return;
          }
        } catch {
          // Continue scanning
        }
      }

      requestAnimationFrame(scan);
    };

    requestAnimationFrame(scan);
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    setError(null);

    try {
      const image = new Image();
      image.src = URL.createObjectURL(file);

      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
      });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      if (!ctx) throw new Error("Cannot get canvas context");

      // Scale up small images for better QR detection
      const minSize = 600;
      const scale = Math.max(1, minSize / Math.min(image.width, image.height));
      canvas.width = image.width * scale;
      canvas.height = image.height * scale;
      
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      
      // Apply grayscale and contrast enhancement for better detection
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        // Convert to grayscale
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        // Increase contrast
        const contrast = ((avg - 128) * 1.5) + 128;
        const val = Math.max(0, Math.min(255, contrast));
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
      }
      ctx.putImageData(imageData, 0, 0);
      
      const processedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(processedImageData.data, processedImageData.width, processedImageData.height, {
        inversionAttempts: "attemptBoth",
      });

      if (code) {
        const qrData = JSON.parse(code.data);
        if (qrData.type === "medichain_patient") {
          await handlePatientScanned(qrData);
        } else {
          setError("Invalid QR Code.");
        }
      } else {
        setError("Cannot read QR Code from image. Try manual entry below.");
      }
    } catch (err) {
      console.error("QR processing error:", err);
      setError("Failed to process image. Try manual entry below.");
    } finally {
      setProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRequestAccess = async () => {
    if (!account || !scannedPatient || !hospitalData) return;
    
    setAccessStatus("requesting");
    setError(null);
    
    try {
      const result = await requestPatientAccess(
        account,
        scannedPatient.walletAddress,
        hospitalData.name,
        31536000, // 1 year
        requestMessage || `Access request for medical treatment at ${hospitalData.name}`
      );
      
      if (result.success) {
        setAccessStatus("requested");
      } else {
        setError(result.error || "Failed to send access request");
        setAccessStatus("none");
      }
    } catch (err) {
      console.error("Error requesting access:", err);
      setError("Failed to send access request");
      setAccessStatus("none");
    }
  };

  const handleProceedWithAccess = () => {
    if (scannedPatient) {
      onScanSuccess(scannedPatient);
    }
  };

  const handleCheckAccessStatus = async () => {
    if (!account || !scannedPatient) return;
    
    setIsCheckingApproval(true);
    setError(null);
    
    try {
      const accessResult = await checkAccess(scannedPatient.walletAddress, account.address);
      if (accessResult.hasAccess) {
        setAccessStatus("has_access");
      } else {
        setError("Access not yet approved. Please wait for patient approval.");
      }
    } catch (err) {
      console.error("Error checking access:", err);
      setError("Failed to check access status. Please try again.");
    } finally {
      setIsCheckingApproval(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative z-10 w-full max-w-md mx-4 p-6 bg-card border border-border rounded-2xl max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-muted rounded-lg">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Step 1: Scanning */}
        {!scannedPatient && (
          <>
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-teal-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                <QrCode className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Scan Patient QR</h3>
            </div>

            {scanning ? (
              <>
                <div className="relative aspect-square bg-black rounded-xl overflow-hidden mb-4">
                  <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-teal-500 rounded-2xl">
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-teal-500 rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-teal-500 rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-teal-500 rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-teal-500 rounded-br-lg" />
                    </div>
                  </div>
                </div>
                <Button variant="outline" className="w-full" onClick={() => setScanning(false)}>Cancel</Button>
              </>
            ) : (
              <div className="space-y-3">
                <Button className="w-full gap-2 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600" onClick={() => setScanning(true)}>
                  <Camera className="w-4 h-4" />
                  Scan with Camera
                </Button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleGalleryUpload} className="hidden" />
                <Button variant="outline" className="w-full gap-2" onClick={() => fileInputRef.current?.click()} disabled={processing}>
                  {processing ? "Processing..." : <><ImagePlus className="w-4 h-4" /> Upload from Gallery</>}
                </Button>

                {/* Manual Address Entry */}
                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground text-center mb-3">Or enter wallet address manually:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="0x..."
                      value={manualAddress}
                      onChange={(e) => setManualAddress(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground font-mono"
                    />
                    <Button
                      variant="outline"
                      onClick={handleManualAddressSubmit}
                      disabled={processing || !manualAddress}
                    >
                      {processing ? "..." : "Go"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Step 2: Patient Found - Request Access */}
        {scannedPatient && accessStatus !== "has_access" && accessStatus !== "requested" && (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-600 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-3 text-white text-2xl font-bold">
                {scannedPatient.isManualEntry ? "?" : scannedPatient.name.charAt(0)}
              </div>
              {scannedPatient.isManualEntry ? (
                <>
                  <h3 className="text-lg font-bold text-foreground">Verified Patient</h3>
                  <p className="text-sm text-muted-foreground font-mono">
                    {scannedPatient.walletAddress.slice(0, 6)}...{scannedPatient.walletAddress.slice(-4)}
                  </p>
                  <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-xs text-blue-600">
                      Patient details will be available after access is granted. 
                      For full info, scan the patient&apos;s QR code.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-bold text-foreground">{scannedPatient.name}</h3>
                  <p className="text-sm text-muted-foreground font-mono">{scannedPatient.nik}</p>
                </>
              )}
            </div>

            {!scannedPatient.isManualEntry && (
              <div className="flex justify-center gap-3 mb-6">
                <div className="px-3 py-1.5 bg-muted rounded-lg text-center">
                  <span className="text-xs text-muted-foreground">Blood</span>
                  <p className="font-semibold text-foreground">{scannedPatient.bloodType}</p>
                </div>
                <div className="px-3 py-1.5 bg-muted rounded-lg text-center">
                  <span className="text-xs text-muted-foreground">Gender</span>
                  <p className="font-semibold text-foreground">{scannedPatient.gender}</p>
                </div>
                <div className="px-3 py-1.5 bg-muted rounded-lg text-center">
                  <span className="text-xs text-muted-foreground">Age</span>
                  <p className="font-semibold text-foreground">{scannedPatient.age}</p>
                </div>
              </div>
            )}

            {accessStatus === "checking" && (
              <div className="text-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Checking access permissions...</p>
              </div>
            )}

            {accessStatus === "none" && (
              <div className="space-y-4">
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Access Required</p>
                      <p className="text-sm text-muted-foreground">
                        You need patient approval to view and add medical records.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                    Message (optional)
                  </label>
                  <textarea
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                    placeholder="e.g., Routine checkup at outpatient clinic"
                    className="w-full h-20 px-3 py-2 bg-muted/30 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none"
                  />
                </div>

                <Button 
                  className="w-full gap-2 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600"
                  onClick={handleRequestAccess}
                >
                  <Send className="w-4 h-4" />
                  Request Access
                </Button>
              </div>
            )}

            {accessStatus === "requesting" && (
              <div className="text-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Sending access request to blockchain...</p>
              </div>
            )}
          </>
        )}

        {/* Step 3: Access Request Sent */}
        {scannedPatient && accessStatus === "requested" && (
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Request Sent!</h3>
            <p className="text-sm text-muted-foreground mb-6">
              The patient will receive a notification in their app. Once approved, you can proceed with adding medical records.
            </p>
            <div className="space-y-3">
              <Button 
                className="w-full gap-2 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600"
                onClick={handleCheckAccessStatus}
                disabled={isCheckingApproval}
              >
                {isCheckingApproval ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Check if Approved
                  </>
                )}
              </Button>
              <Button variant="outline" className="w-full" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 Alt: Already Has Access */}
        {scannedPatient && accessStatus === "has_access" && (
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Access Granted</h3>
            <p className="text-sm text-muted-foreground mb-6">
              You already have access to this patient&apos;s records. You can proceed with adding medical records.
            </p>
            <Button 
              className="w-full gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600"
              onClick={handleProceedWithAccess}
            >
              <Stethoscope className="w-4 h-4" />
              Proceed to Medical Record
            </Button>
          </div>
        )}

        {error && <p className="text-sm text-red-500 text-center mt-4">{error}</p>}
      </div>
    </div>
  );
}