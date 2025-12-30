"use client";

import { useActiveAccount } from "thirdweb/react";
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
  diagnosis: string;
  symptoms: string;
  treatment: string;
}

type FlowStep = "search" | "input" | "success";

export default function HospitalDashboard() {
  const account = useActiveAccount();
  const router = useRouter();
  
  // Flow state
  const [currentStep, setCurrentStep] = useState<FlowStep>("search");
  const [patient, setPatient] = useState<ScannedPatientData | null>(null);
  const [medicalRecord, setMedicalRecord] = useState<MedicalRecordInput>({
    diagnosis: "",
    symptoms: "",
    treatment: "",
  });
  
  // Search state
  const [nikInput, setNikInput] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    if (!account) {
      router.push("/auth");
    }
  }, [account, router]);

  if (!account) {
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
    setMedicalRecord({ diagnosis: "", symptoms: "", treatment: "" });
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
          
          <button
            onClick={() => router.push("/auth")}
            className="text-teal-600 hover:text-teal-700 font-medium text-sm"
          >
            Keluar
          </button>
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
          Cari Data Pasien
        </h1>
        <p className="text-muted-foreground mb-8">
          Scan QR Code dari aplikasi pasien atau input NIK/Nama manual untuk membuat rekam medis baru.
        </p>

        {/* NIK Input */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={nikInput}
            onChange={(e) => setNikInput(e.target.value)}
            placeholder="Cari Nama atau NIK Pasien..."
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
                    <span>NIK: {result.nik}</span>
                    <span>{result.gender} • {result.age} thn</span>
                  </div>
                </div>
             ))}
          </div>
        )}

        {nikInput.length > 2 && searchResults.length === 0 && (
           <p className="text-sm text-red-600 mb-6">
             Tidak ditemukan pasien dengan kata kunci "{nikInput}"
           </p>
        )}

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-sm text-muted-foreground">ATAU</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Scan QR Button */}
        <Button
          onClick={() => setShowScanner(true)}
          className="w-full h-14 gap-3 bg-gradient-to-r from-teal-600 to-teal-500 text-lg font-semibold hover:from-teal-700 hover:to-teal-600"
        >
          <QrCode className="w-5 h-5" />
          Scan QR Pasien
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
  const isFormValid = medicalRecord.diagnosis && medicalRecord.symptoms && medicalRecord.treatment;

  // Sample medical history data
  const medicalHistory = [
    {
      date: "15 Desember 2024",
      diagnosis: "Influenza A",
      symptoms: "Demam tinggi, batuk kering, nyeri otot, sakit kepala",
      treatment: "Paracetamol 500mg 3x1, Oseltamivir 75mg 2x1",
      hospital: "RS Siloam Jakarta Selatan",
    },
    {
      date: "28 November 2024",
      diagnosis: "Gastritis Akut",
      symptoms: "Nyeri ulu hati, mual, kembung",
      treatment: "Omeprazole 20mg 1x1, Antasida 3x1",
      hospital: "RS Pondok Indah Bintaro",
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
        Kembali
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
                <p className="text-xs text-white/50">Darah</p>
                <p className="font-bold">{patient.bloodType}</p>
              </div>
              <div className="text-center p-2 bg-white/5 rounded-lg">
                <p className="text-xs text-white/50">Gender</p>
                <p className="font-bold">{patient.gender}</p>
              </div>
              <div className="text-center p-2 bg-white/5 rounded-lg">
                <p className="text-xs text-white/50">Usia</p>
                <p className="font-bold">{patient.age}</p>
                <p className="text-xs text-white/50">Tahun</p>
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
                  <p className="text-xs text-white/60 mb-1">Info Kunci</p>
                  <p className="text-sm text-white/80">
                    Sebagai institusi, kunci akses <span className="font-bold">KMS (Key Management System)</span> Rumah Sakit. Anda tidak perlu mengelola kunci pribadi secara manual.
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
                Riwayat Medis
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
                Input Baru
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
                          Selesai
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Keluhan</p>
                          <p className="text-sm text-foreground">{record.symptoms}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Tindakan</p>
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
                    <p>Belum ada riwayat medis</p>
                  </div>
                )}
              </div>
            ) : (
              /* New Record Form */
              <div className="space-y-5">
                {/* Diagnosis */}
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    DIAGNOSA UTAMA
                  </label>
                  <input
                    type="text"
                    value={medicalRecord.diagnosis}
                    onChange={(e) => setMedicalRecord({ ...medicalRecord, diagnosis: e.target.value })}
                    placeholder="Contoh: Influenza A"
                    className="w-full h-12 px-4 bg-muted/30 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>

                {/* Symptoms & Treatment */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      KELUHAN / GEJALA
                    </label>
                    <textarea
                      value={medicalRecord.symptoms}
                      onChange={(e) => setMedicalRecord({ ...medicalRecord, symptoms: e.target.value })}
                      placeholder="Detail keluhan pasien..."
                      className="w-full h-32 px-4 py-3 bg-muted/30 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      TINDAKAN / RESEP
                    </label>
                    <textarea
                      value={medicalRecord.treatment}
                      onChange={(e) => setMedicalRecord({ ...medicalRecord, treatment: e.target.value })}
                      placeholder="Obat yang diberikan..."
                      className="w-full h-32 px-4 py-3 bg-muted/30 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none"
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
          Data Berhasil Disimpan!
        </h1>
        <p className="text-muted-foreground mb-8">
          Data telah dienkripsi dan dikirim ke Wallet Pasien. Hak akses penuh kini berada di tangan pasien.
        </p>

        {/* Back Button */}
        <Button
          onClick={onReset}
          className="w-full h-14 gap-2 bg-gradient-to-r from-teal-600 to-teal-500 text-lg font-semibold hover:from-teal-700 hover:to-teal-600"
        >
          Kembali ke Menu Utama
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
      setError("Tidak dapat mengakses kamera.");
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
          setError("QR Code tidak valid.");
        }
      } else {
        setError("Tidak dapat membaca QR Code dari gambar.");
      }
    } catch {
      setError("Gagal memproses gambar.");
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
          <h3 className="text-lg font-bold text-foreground">Scan QR Pasien</h3>
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
            <Button variant="outline" className="w-full" onClick={() => setScanning(false)}>Batal</Button>
          </>
        ) : (
          <div className="space-y-3">
            <Button className="w-full gap-2 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600" onClick={() => setScanning(true)}>
              <Camera className="w-4 h-4" />
              Scan dengan Kamera
            </Button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleGalleryUpload} className="hidden" />
            <Button variant="outline" className="w-full gap-2" onClick={() => fileInputRef.current?.click()} disabled={processing}>
              {processing ? "Memproses..." : <><ImagePlus className="w-4 h-4" /> Upload dari Gallery</>}
            </Button>
          </div>
        )}

        {error && <p className="text-sm text-red-500 text-center mt-4">{error}</p>}
      </div>
    </div>
  );
}