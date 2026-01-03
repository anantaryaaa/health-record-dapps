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
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isHospitalRegistered, getHospitalData } from "@/lib/hospitalStorage";

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

  const handleSubmitRecord = () => {
    // TODO: Push to blockchain
    console.log("Submitting medical record:", { patient, medicalRecord });
    setCurrentStep("success");
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
          />
        )}

        {currentStep === "success" && (
          <SuccessStep onReset={handleReset} />
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
}: {
  patient: ScannedPatientData;
  medicalRecord: MedicalRecordInput;
  setMedicalRecord: (v: MedicalRecordInput) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"history" | "new">("history");
  const isFormValid = medicalRecord.diagnosisUtama && medicalRecord.keluhan && medicalRecord.dokterPenanggungJawab;

  // Sample medical history data
  const medicalHistory = [
    {
      date: "December 15, 2024",
      diagnosis: "Influenza A",
      symptoms: "High fever, dry cough, muscle pain, headache",
      treatment: "Paracetamol 500mg 3x1, Oseltamivir 75mg 2x1",
      hospital: "Siloam Hospital South Jakarta",
    },
    {
      date: "November 28, 2024",
      diagnosis: "Acute Gastritis",
      symptoms: "Epigastric pain, nausea, bloating",
      treatment: "Omeprazole 20mg 1x1, Antacid 3x1",
      hospital: "Pondok Indah Hospital Bintaro",
    },
  ];

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
              /* Medical History */
              <div className="space-y-4">
                {medicalHistory.length > 0 ? (
                  medicalHistory.map((record, index) => (
                    <div key={index} className="p-4 bg-muted/30 border border-border rounded-xl">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <span className="text-xs text-muted-foreground">{record.date}</span>
                          <h4 className="font-semibold text-foreground mt-1">{record.diagnosis}</h4>
                        </div>
                        <span className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded-full font-medium">
                          Complete
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Symptoms</p>
                          <p className="text-sm text-foreground">{record.symptoms}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Treatment</p>
                          <p className="text-sm text-foreground">{record.treatment}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ShieldCheck className="w-3 h-3 text-teal-600" />
                        {record.hospital}
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

                {/* Submit Button */}
                <Button
                  onClick={onSubmit}
                  disabled={!isFormValid}
                  className="w-full h-14 gap-2 bg-emerald-600 hover:bg-emerald-700 text-lg font-semibold mt-4"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Push to Blockchain
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Simulate OCR processing
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock OCR result - in production this would call Tesseract.js or an API
    const mockResult: MedicalRecordInput = {
      noRekamMedik: "MR-2024-00123",
      tanggalMasuk: new Date().toISOString().split('T')[0],
      tanggalKeluar: "",
      diagnosisUtama: "Acute Bronchitis",
      icdCode: "J20.9",
      diagnosisSekunder: "",
      keluhan: "Productive cough for 5 days, mild fever 37.8°C, mild shortness of breath, chest pain when coughing",
      riwayatAlergi: "None",
      tindakan: "Physical examination, Chest X-ray",
      resepObat: "Ambroxol 30mg 3x1, Salbutamol 2mg 3x1, Paracetamol 500mg 3x1 (if fever)",
      keadaanKeluar: "",
      dokterPenanggungJawab: "Dr. Ahmad Pratama, Sp.P",
    };

    setIsProcessing(false);
    setIsComplete(true);
    onOCRComplete(mockResult);
  };

  const handleReset = () => {
    setUploadedImage(null);
    setIsProcessing(false);
    setIsComplete(false);
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
            <span>Powered by OCR</span>
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
                <p className="text-white text-sm">Processing OCR...</p>
              </div>
            )}
            {isComplete && (
              <div className="absolute inset-0 bg-emerald-600/80 flex flex-col items-center justify-center">
                <FileCheck className="w-10 h-10 text-white mb-2" />
                <p className="text-white font-semibold">Auto-fill Successful!</p>
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
              Re-upload
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
function SuccessStep({ onReset }: { onReset: () => void }) {
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
        <p className="text-muted-foreground mb-8">
          Data has been encrypted and sent to the Patient&apos;s Wallet. Full access rights are now in the patient&apos;s hands.
        </p>

        {/* Back Button */}
        <Button
          onClick={onReset}
          className="w-full h-14 gap-2 bg-gradient-to-r from-teal-600 to-teal-500 text-lg font-semibold hover:from-teal-700 hover:to-teal-600"
        >
          Back to Main Menu
        </Button>
      </div>
    </div>
  );
}

// QR Scanner Modal Component
function QRScannerModal({
  onClose,
  onScanSuccess,
}: {
  onClose: () => void;
  onScanSuccess: (data: ScannedPatientData) => void;
}) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
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
            stopCamera();
            setScanning(false);
            onScanSuccess(data);
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
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d");
      
      if (!ctx) throw new Error("Cannot get canvas context");

      ctx.drawImage(image, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        const data = JSON.parse(code.data);
        if (data.type === "medichain_patient") {
          onScanSuccess(data);
        } else {
          setError("Invalid QR Code.");
        }
      } else {
        setError("Cannot read QR Code from image.");
      }
    } catch {
      setError("Failed to process image.");
    } finally {
      setProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative z-10 w-full max-w-md mx-4 p-6 bg-card border border-border rounded-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-muted rounded-lg">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

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
          </div>
        )}

        {error && <p className="text-sm text-red-500 text-center mt-4">{error}</p>}
      </div>
    </div>
  );
}