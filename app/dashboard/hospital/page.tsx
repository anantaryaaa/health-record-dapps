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
  RefreshCw,
  Printer,
  Calendar,
  Building2,
  User,
  FlaskConical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isHospitalRegistered, getHospitalData } from "@/lib/hospitalStorage";
import { 
  requestPatientAccess, 
  checkAccess, 
  hasPatientIdentity,
  addMedicalRecord,
  createDataHash,
  getPatientRecords
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
}

// Medical record type for hospital view
interface HospitalMedicalRecord {
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
  category: "Diagnose" | "Lab";
  timestamp: number;
  isVerified: boolean;
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
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [refreshHistoryTrigger, setRefreshHistoryTrigger] = useState(0);
  
  // Hospital data
  const hospitalData = account ? getHospitalData(account.address) : null;

  useEffect(() => {
    if (!account) {
      router.push("/auth");
      return;
    }
    
    // Check if hospital is registered, redirect to registration if not
    if (!isHospitalRegistered(account.address)) {
      router.push("/dashboard/hospital/registration");
    }
  }, [account, router]);

  if (!account) {
    return null;
  }
  
  // Show loading while checking registration
  if (!hospitalData) {
    return null;
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
      
      // Success! Stay on input page, reset form, show toast, and refresh history
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
      setShowSuccessToast(true);
      setRefreshHistoryTrigger(prev => prev + 1); // Trigger history refresh
      
      // Auto-hide toast after 5 seconds
      setTimeout(() => setShowSuccessToast(false), 5000);
    } catch (error) {
      console.error("Error submitting medical record:", error);
      setSubmitError(error instanceof Error ? error.message : "Failed to submit record");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
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

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3 bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">Medical record saved successfully!</span>
            <button 
              onClick={() => setShowSuccessToast(false)}
              className="ml-2 p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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
            refreshHistoryTrigger={refreshHistoryTrigger}
          />
        )}

        {currentStep === "success" && patient && (
          <SuccessStep 
            onReset={handleReset} 
            patient={patient}
            medicalRecord={medicalRecord}
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
  refreshHistoryTrigger = 0,
}: {
  patient: ScannedPatientData;
  medicalRecord: MedicalRecordInput;
  setMedicalRecord: (v: MedicalRecordInput) => void;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting?: boolean;
  submitError?: string | null;
  refreshHistoryTrigger?: number;
}) {
  const [activeTab, setActiveTab] = useState<"history" | "new">("history");
  const [medicalHistory, setMedicalHistory] = useState<HospitalMedicalRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<HospitalMedicalRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  
  const isFormValid = medicalRecord.diagnosisUtama && medicalRecord.keluhan && medicalRecord.dokterPenanggungJawab;
  const categories = ["All", "Diagnose", "Lab"];

  // Print single record as PDF
  const handlePrintRecord = (record: HospitalMedicalRecord) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Medical Record - ${patient.name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: system-ui, -apple-system, sans-serif;
              padding: 24px;
              background: #fff;
              color: #1a1a1a;
              font-size: 12px;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
              border: 2px solid #333;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 16px 20px;
              border-bottom: 2px solid #333;
              background: linear-gradient(135deg, #0077C0, #005a94);
              color: white;
            }
            .logo h1 { font-size: 18px; font-weight: bold; }
            .logo p { font-size: 10px; opacity: 0.8; }
            .badge {
              background: #C7EEFF;
              color: #0077C0;
              padding: 4px 12px;
              border-radius: 4px;
              font-size: 10px;
              font-weight: 600;
            }
            .title-bar {
              text-align: center;
              padding: 12px;
              border-bottom: 1px solid #333;
              background: #f5f5f5;
            }
            .title-bar h2 { font-size: 14px; font-weight: bold; }
            .content { padding: 0; }
            .row { display: flex; border-bottom: 1px solid #ddd; }
            .row:last-child { border-bottom: none; }
            .cell { padding: 8px 12px; border-right: 1px solid #ddd; flex: 1; }
            .cell:last-child { border-right: none; }
            .cell.label {
              background: #f9f9f9;
              font-weight: 600;
              flex: 0 0 160px;
              font-size: 11px;
              color: #555;
            }
            .section-title {
              background: #e8e8e8;
              padding: 8px 12px;
              font-weight: bold;
              font-size: 12px;
              border-bottom: 1px solid #ddd;
            }
            .patient-info { display: grid; grid-template-columns: 1fr 1fr; }
            .patient-info .cell { padding: 6px 12px; }
            .footer {
              padding: 12px;
              background: #f5f5f5;
              border-top: 2px solid #333;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .footer .date { font-size: 10px; color: #666; }
            .footer .signature { text-align: center; }
            .footer .signature .line {
              width: 150px;
              border-bottom: 1px solid #333;
              margin-bottom: 4px;
              height: 40px;
            }
            .footer .signature p { font-size: 10px; }
            @media print { body { padding: 0; } .container { border: 1px solid #333; } }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">
                <h1>MEDICHAIN</h1>
                <p>Decentralized Health Record</p>
              </div>
              <span class="badge">MEDICAL RECORD</span>
            </div>
            <div class="title-bar"><h2>MEDICAL RECORD FORM</h2></div>
            <div class="content">
              <div class="section-title">PATIENT DATA</div>
              <div class="patient-info">
                <div class="row"><div class="cell label">Patient Name</div><div class="cell value">${patient.name}</div></div>
                <div class="row"><div class="cell label">ID Number</div><div class="cell value">${patient.nik}</div></div>
                <div class="row"><div class="cell label">Gender</div><div class="cell value">${patient.gender}</div></div>
                <div class="row"><div class="cell label">Age</div><div class="cell value">${patient.age} Years</div></div>
                <div class="row"><div class="cell label">Blood Type</div><div class="cell value">${patient.bloodType}</div></div>
                <div class="row"><div class="cell label">Allergy History</div><div class="cell value">${record.riwayatAlergi || "-"}</div></div>
              </div>
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
  const fetchHistory = async () => {
    if (!patient.walletAddress) return;
    
    setIsLoadingHistory(true);
    setHistoryError(null);
    
    try {
      const recordRefs = await getPatientRecords(patient.walletAddress);
      
      if (recordRefs.length === 0) {
        setMedicalHistory([]);
        setIsLoadingHistory(false);
        return;
      }
      
      const history: HospitalMedicalRecord[] = [];
      
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
              category: ref.recordType === "Lab" ? "Lab" : "Diagnose",
              timestamp: ref.timestamp,
              isVerified: ref.isVerified,
            });
          } else {
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
              category: ref.recordType === "Lab" ? "Lab" : "Diagnose",
              timestamp: ref.timestamp,
              isVerified: ref.isVerified,
            });
          }
        } catch (err) {
          console.error("Failed to decrypt record:", err);
        }
      }
      
      history.sort((a, b) => b.timestamp - a.timestamp);
      setMedicalHistory(history);
    } catch (err) {
      console.error("Error fetching medical history:", err);
      setHistoryError("Failed to load medical history");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [patient.walletAddress, refreshHistoryTrigger]);

  // Filter records
  const filteredRecords = medicalHistory.filter(record => {
    const matchesSearch = 
      record.diagnosisUtama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.keluhan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.hospital.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.dokterPenanggungJawab.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === "All" || record.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

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
              {patient.name.charAt(0)}
            </div>

            {/* Name & NIK */}
            <h2 className="text-xl font-bold mb-1">{patient.name}</h2>
            <p className="text-white/60 font-mono text-sm mb-4">{patient.nik}</p>

            {/* Patient Stats */}
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
              /* Medical History - Complete View */
              <div className="space-y-4">
                {/* Header with Refresh */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-foreground">Medical History</h3>
                    <p className="text-xs text-muted-foreground">
                      {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''} found
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchHistory}
                    disabled={isLoadingHistory}
                    className="gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>

                {/* Search & Filter */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search records..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-muted/30"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                          selectedCategory === cat
                            ? "bg-teal-500 text-white"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {isLoadingHistory ? (
                  <div className="text-center py-12">
                    <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-muted-foreground">Loading medical history from blockchain...</p>
                  </div>
                ) : historyError ? (
                  <div className="text-center py-12 text-red-500">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>{historyError}</p>
                    <Button variant="outline" size="sm" onClick={fetchHistory} className="mt-3">
                      Try Again
                    </Button>
                  </div>
                ) : filteredRecords.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredRecords.map((record) => (
                      <Card 
                        key={record.id} 
                        className="group hover:shadow-lg hover:border-teal-500/30 transition-all duration-300 cursor-pointer overflow-hidden"
                        onClick={() => setSelectedRecord(record)}
                      >
                        <CardContent className="p-0">
                          {/* Category Color Bar */}
                          <div className={`h-1.5 ${
                            record.category === "Diagnose" ? "bg-blue-500" : "bg-emerald-500"
                          }`} />
                          
                          <div className="p-4">
                            {/* Date & Verification */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                {record.tanggalMasuk}
                              </div>
                              <div className="flex items-center gap-2">
                                {record.isVerified && (
                                  <span title="Verified on blockchain">
                                    <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                                  </span>
                                )}
                                <span className="text-xs font-mono text-muted-foreground">
                                  {record.noRekamMedik}
                                </span>
                              </div>
                            </div>

                            {/* Title */}
                            <h4 className="font-bold text-foreground mb-2 group-hover:text-teal-600 transition-colors line-clamp-1">
                              {record.diagnosisUtama}
                            </h4>

                            {/* Category & Status */}
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium ${
                                record.category === "Diagnose" 
                                  ? "bg-blue-500/10 text-blue-600" 
                                  : "bg-emerald-500/10 text-emerald-600"
                              }`}>
                                {record.category === "Diagnose" ? <Stethoscope className="w-3 h-3" /> : <FlaskConical className="w-3 h-3" />}
                                {record.category}
                              </span>
                              {record.icdCode && (
                                <span className="text-xs px-2 py-0.5 bg-purple-500/10 text-purple-600 rounded font-mono">
                                  {record.icdCode}
                                </span>
                              )}
                            </div>

                            {/* Preview */}
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                              {record.keluhan}
                            </p>

                            {/* Footer */}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border">
                              <Building2 className="w-3 h-3 text-teal-600" />
                              <span className="truncate">{record.hospital}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>{searchQuery || selectedCategory !== "All" ? "No matching records" : "No medical history yet"}</p>
                    {(searchQuery || selectedCategory !== "All") && (
                      <button
                        onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }}
                        className="mt-2 text-sm text-teal-600 hover:underline"
                      >
                        Clear filters
                      </button>
                    )}
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
              <div className={`p-6 ${
                selectedRecord.category === "Diagnose" 
                  ? "bg-gradient-to-r from-blue-500/20 to-blue-500/5" 
                  : "bg-gradient-to-r from-emerald-500/20 to-emerald-500/5"
              }`}>
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
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md font-medium ${
                        selectedRecord.category === "Diagnose" 
                          ? "bg-blue-500/20 text-blue-600" 
                          : "bg-emerald-500/20 text-emerald-600"
                      }`}>
                        {selectedRecord.category === "Diagnose" ? <Stethoscope className="w-3 h-3" /> : <FlaskConical className="w-3 h-3" />}
                        {selectedRecord.category}
                      </span>
                      {selectedRecord.keadaanKeluar && (
                        <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-600 rounded-md font-medium capitalize">
                          {selectedRecord.keadaanKeluar}
                        </span>
                      )}
                      {selectedRecord.isVerified && (
                        <span className="flex items-center gap-1 text-xs text-green-600">
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
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Symptoms / Complaints
                  </h4>
                  <p className="text-foreground">{selectedRecord.keluhan || "-"}</p>
                </div>

                {/* Riwayat Alergi */}
                {selectedRecord.riwayatAlergi && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Allergy History
                    </h4>
                    <p className="text-foreground">{selectedRecord.riwayatAlergi}</p>
                  </div>
                )}

                {/* Diagnosis Sekunder */}
                {selectedRecord.diagnosisSekunder && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Secondary Diagnosis
                    </h4>
                    <p className="text-foreground">{selectedRecord.diagnosisSekunder}</p>
                  </div>
                )}

                {/* Tindakan */}
                {selectedRecord.tindakan && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Procedure
                    </h4>
                    <p className="text-foreground">{selectedRecord.tindakan}</p>
                  </div>
                )}

                {/* Resep */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Prescription / Therapy
                  </h4>
                  <p className="text-foreground">{selectedRecord.resepObat || "-"}</p>
                </div>

                {/* Footer Info */}
                <div className="pt-4 border-t border-border space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="w-4 h-4 text-teal-600" />
                    {selectedRecord.hospital}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4 text-teal-600" />
                    {selectedRecord.dokterPenanggungJawab || "-"}
                  </div>
                  {selectedRecord.tanggalKeluar && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4 text-teal-600" />
                      Discharge: {selectedRecord.tanggalKeluar}
                    </div>
                  )}
                </div>

                {/* Print Button */}
                <Button
                  onClick={() => handlePrintRecord(selectedRecord)}
                  className="w-full gap-2 mt-4 bg-teal-600 hover:bg-teal-700"
                >
                  <Printer className="w-4 h-4" />
                  Print Medical Record
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
import { Upload, Loader2, FileCheck, Sparkles } from "lucide-react";

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

    // Reset states
    setOcrError(null);
    setIsComplete(false);

    // Show preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Process with Gemini OCR API
    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "OCR processing failed");
      }

      if (result.success && result.data) {
        // Map the extracted data to MedicalRecordInput format
        const extractedData: MedicalRecordInput = {
          noRekamMedik: result.data.noRekamMedik || "",
          tanggalMasuk: result.data.tanggalMasuk || new Date().toISOString().split('T')[0],
          tanggalKeluar: result.data.tanggalKeluar || "",
          diagnosisUtama: result.data.diagnosisUtama || "",
          icdCode: result.data.icdCode || "",
          diagnosisSekunder: result.data.diagnosisSekunder || "",
          keluhan: result.data.keluhan || "",
          riwayatAlergi: result.data.riwayatAlergi || "",
          tindakan: result.data.tindakan || "",
          resepObat: result.data.resepObat || "",
          keadaanKeluar: result.data.keadaanKeluar || "",
          dokterPenanggungJawab: result.data.dokterPenanggungJawab || "",
        };

        setIsComplete(true);
        onOCRComplete(extractedData);
      } else {
        throw new Error("No data extracted from image");
      }
    } catch (error) {
      console.error("OCR Error:", error);
      setOcrError(error instanceof Error ? error.message : "Failed to process image");
    } finally {
      setIsProcessing(false);
    }
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
                <p className="text-white/70 text-xs mt-1">Extracting medical data...</p>
              </div>
            )}
            {isComplete && !ocrError && (
              <div className="absolute inset-0 bg-emerald-600/80 flex flex-col items-center justify-center">
                <FileCheck className="w-10 h-10 text-white mb-2" />
                <p className="text-white font-semibold">Auto-fill Successful!</p>
              </div>
            )}
            {ocrError && (
              <div className="absolute inset-0 bg-red-600/80 flex flex-col items-center justify-center p-4">
                <AlertCircle className="w-10 h-10 text-white mb-2" />
                <p className="text-white font-semibold text-center">Extraction Failed</p>
                <p className="text-white/80 text-xs text-center mt-1">{ocrError}</p>
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

          {isComplete && !ocrError && (
            <p className="text-xs text-center text-emerald-600">
              ✓ Data extracted successfully. Please review and edit if needed.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Step 3: Success - Show submitted data review
function SuccessStep({ 
  onReset,
  patient,
  medicalRecord 
}: { 
  onReset: () => void;
  patient: ScannedPatientData;
  medicalRecord: MedicalRecordInput;
}) {
  return (
    <div className="py-6">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Medical Record Saved!
        </h1>
        <p className="text-muted-foreground">
          Data has been encrypted and stored on IPFS. Record is now on blockchain.
        </p>
      </div>

      {/* Submitted Data Review */}
      <Card className="max-w-3xl mx-auto mb-6">
        <CardContent className="p-6">
          {/* Patient Info Header */}
          <div className="flex items-center gap-4 pb-4 mb-4 border-b border-border">
            <div className="w-12 h-12 bg-teal-500/10 rounded-xl flex items-center justify-center text-lg font-bold text-teal-600">
              {patient.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{patient.name}</h3>
              <p className="text-sm text-muted-foreground font-mono">{patient.nik}</p>
            </div>
            <div className="ml-auto flex items-center gap-2 text-emerald-600">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-sm font-medium">Verified & Saved</span>
            </div>
          </div>

          {/* Record Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Medical Record No.</p>
              <p className="text-sm font-medium text-foreground">{medicalRecord.noRekamMedik || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Visit Date</p>
              <p className="text-sm font-medium text-foreground">{medicalRecord.tanggalMasuk || "-"}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-muted-foreground mb-1">Primary Diagnosis</p>
              <p className="text-sm font-medium text-foreground">{medicalRecord.diagnosisUtama || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">ICD-10 Code</p>
              <p className="text-sm font-medium text-foreground font-mono">{medicalRecord.icdCode || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Discharge Status</p>
              <p className="text-sm font-medium text-foreground capitalize">{medicalRecord.keadaanKeluar || "-"}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-muted-foreground mb-1">Symptoms/Complaints</p>
              <p className="text-sm text-foreground">{medicalRecord.keluhan || "-"}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-muted-foreground mb-1">Treatment/Prescription</p>
              <p className="text-sm text-foreground">{medicalRecord.resepObat || "-"}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-muted-foreground mb-1">Attending Physician</p>
              <p className="text-sm font-medium text-foreground">{medicalRecord.dokterPenanggungJawab || "-"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Back Button */}
      <div className="max-w-3xl mx-auto">
        <Button
          onClick={onReset}
          className="w-full h-12 gap-2 bg-gradient-to-r from-teal-600 to-teal-500 text-base font-semibold hover:from-teal-700 hover:to-teal-600"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Main Menu
        </Button>
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
  const [isCheckingAgain, setIsCheckingAgain] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  
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
      // Create minimal patient data for manual entry
      const manualPatientData: ScannedPatientData = {
        type: "medichain_patient",
        walletAddress: manualAddress,
        name: "Patient",
        nik: "Manual Entry",
        bloodType: "-",
        gender: "-",
        age: 0,
      };
      await handlePatientScanned(manualPatientData);
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

  const handleCheckAccessAgain = async () => {
    if (!scannedPatient || !account) return;
    
    setIsCheckingAgain(true);
    setError(null);
    
    try {
      const accessResult = await checkAccess(scannedPatient.walletAddress, account.address);
      if (accessResult.hasAccess) {
        setAccessStatus("has_access");
      } else {
        // Still pending
        setError("Access not yet approved. Please ask patient to approve the request.");
      }
    } catch (err) {
      console.error("Error checking access:", err);
      setError("Failed to check access status. Try again.");
    } finally {
      setIsCheckingAgain(false);
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
                {scannedPatient.name.charAt(0)}
              </div>
              <h3 className="text-lg font-bold text-foreground">{scannedPatient.name}</h3>
              <p className="text-sm text-muted-foreground font-mono">{scannedPatient.nik}</p>
            </div>

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
            <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Request Sent!</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Waiting for patient approval...
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              Ask the patient to check their Medichain app and approve your access request.
            </p>
            
            {/* Refresh Button */}
            <Button 
              className="w-full gap-2 mb-3 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600"
              onClick={handleCheckAccessAgain}
              disabled={isCheckingAgain}
            >
              {isCheckingAgain ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Check Approval Status
                </>
              )}
            </Button>
            
            <Button variant="outline" className="w-full" onClick={onClose}>
              Close & Scan Later
            </Button>
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