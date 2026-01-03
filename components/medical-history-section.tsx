"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PatientData } from "@/lib/patientStorage"
import { 
  FileText,
  Search,
  Calendar,
  Building2,
  X,
  Stethoscope,
  FlaskConical,
  Printer,
  User
} from "lucide-react"

// Medical record type - matching rekam medis format
export interface MedicalRecord {
  id: number
  noRekamMedik: string
  tanggalMasuk: string
  tanggalKeluar: string
  diagnosisUtama: string
  icdCode: string
  diagnosisSekunder: string
  keluhan: string
  riwayatAlergi: string
  tindakan: string
  resepObat: string
  keadaanKeluar: string
  dokterPenanggungJawab: string
  hospital: string
  category: "Diagnose" | "Lab"
}

// Mock data for medical records
export const medicalRecords: MedicalRecord[] = [
  {
    id: 1,
    noRekamMedik: "MR-2024-00145",
    tanggalMasuk: "December 15, 2024",
    tanggalKeluar: "December 15, 2024",
    diagnosisUtama: "Influenza A",
    icdCode: "J10.1",
    diagnosisSekunder: "",
    keluhan: "High fever, dry cough, muscle pain, headache, fatigue",
    riwayatAlergi: "None",
    tindakan: "Physical examination, temperature check",
    resepObat: "Paracetamol 500mg 3x1, Oseltamivir 75mg 2x1, Complete rest for 5 days",
    keadaanKeluar: "Improved",
    dokterPenanggungJawab: "dr. Sarah Wijaya, Sp.PD",
    hospital: "Siloam Hospital South Jakarta",
    category: "Diagnose"
  },
  {
    id: 2,
    noRekamMedik: "MR-2024-00098",
    tanggalMasuk: "November 28, 2024",
    tanggalKeluar: "November 28, 2024",
    diagnosisUtama: "Acute Gastritis",
    icdCode: "K29.0",
    diagnosisSekunder: "",
    keluhan: "Epigastric pain, nausea, bloating, loss of appetite",
    riwayatAlergi: "None",
    tindakan: "Endoscopy",
    resepObat: "Omeprazole 20mg 1x1, Antacid 3x1, Avoid spicy & acidic foods",
    keadaanKeluar: "Improved",
    dokterPenanggungJawab: "dr. Budi Santoso, Sp.PD-KGEH",
    hospital: "Pondok Indah Hospital Bintaro",
    category: "Diagnose"
  },
  {
    id: 3,
    noRekamMedik: "MR-2024-00075",
    tanggalMasuk: "October 5, 2024",
    tanggalKeluar: "October 5, 2024",
    diagnosisUtama: "Tension Headache",
    icdCode: "G44.2",
    diagnosisSekunder: "",
    keluhan: "Tension headache, stiff neck, eye fatigue, difficulty concentrating",
    riwayatAlergi: "Ibuprofen allergy",
    tindakan: "Head CT Scan",
    resepObat: "Paracetamol 500mg as needed, Myonal 50mg 2x1, Neck physiotherapy",
    keadaanKeluar: "Improved",
    dokterPenanggungJawab: "dr. Linda Kusuma, Sp.S",
    hospital: "Medika Clinic Surabaya",
    category: "Diagnose"
  },
  {
    id: 4,
    noRekamMedik: "MR-2024-00142",
    tanggalMasuk: "December 10, 2024",
    tanggalKeluar: "December 10, 2024",
    diagnosisUtama: "Complete Blood Count (CBC)",
    icdCode: "Z01.7",
    diagnosisSekunder: "",
    keluhan: "Routine checkup",
    riwayatAlergi: "None",
    tindakan: "Blood sample collection",
    resepObat: "Hemoglobin: 14.5 g/dL, Leukocytes: 7,200/µL, Platelets: 250,000/µL",
    keadaanKeluar: "Complete",
    dokterPenanggungJawab: "dr. Andi Pratama",
    hospital: "Prodia Lab Jakarta",
    category: "Lab"
  },
  {
    id: 5,
    noRekamMedik: "MR-2024-00056",
    tanggalMasuk: "November 1, 2024",
    tanggalKeluar: "November 1, 2024",
    diagnosisUtama: "Lipid Profile",
    icdCode: "Z13.6",
    diagnosisSekunder: "",
    keluhan: "Cholesterol check",
    riwayatAlergi: "None",
    tindakan: "Fasting blood sample collection",
    resepObat: "Total Cholesterol: 195 mg/dL, HDL: 55 mg/dL, LDL: 120 mg/dL, Triglycerides: 100 mg/dL",
    keadaanKeluar: "Complete",
    dokterPenanggungJawab: "dr. Andi Pratama",
    hospital: "Prodia Lab Jakarta",
    category: "Lab"
  }
]

const categories = ["All", "Diagnose", "Lab"]

interface MedicalHistorySectionProps {
  patientData: PatientData
}

export function MedicalHistorySection({ patientData }: MedicalHistorySectionProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null)

  // Filter medical records
  const filteredRecords = medicalRecords.filter(record => {
    const matchesSearch = 
      record.diagnosisUtama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.keluhan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.hospital.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.dokterPenanggungJawab.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = selectedCategory === "All" || record.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  // Print single record as PDF - matching rekam medis layout
  const handlePrintSingleRecord = (record: MedicalRecord) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Medical Record - ${patientData.name}</title>
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
            .logo h1 {
              font-size: 18px;
              font-weight: bold;
            }
            .logo p {
              font-size: 10px;
              opacity: 0.8;
            }
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
            .title-bar h2 {
              font-size: 14px;
              font-weight: bold;
            }
            .content {
              padding: 0;
            }
            .row {
              display: flex;
              border-bottom: 1px solid #ddd;
            }
            .row:last-child {
              border-bottom: none;
            }
            .cell {
              padding: 8px 12px;
              border-right: 1px solid #ddd;
              flex: 1;
            }
            .cell:last-child {
              border-right: none;
            }
            .cell.label {
              background: #f9f9f9;
              font-weight: 600;
              flex: 0 0 160px;
              font-size: 11px;
              color: #555;
            }
            .cell.value {
              flex: 1;
            }
            .cell.full {
              flex: 1 0 100%;
            }
            .section-title {
              background: #e8e8e8;
              padding: 8px 12px;
              font-weight: bold;
              font-size: 12px;
              border-bottom: 1px solid #ddd;
            }
            .patient-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
            }
            .patient-info .cell {
              padding: 6px 12px;
            }
            .footer {
              padding: 12px;
              background: #f5f5f5;
              border-top: 2px solid #333;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .footer .date {
              font-size: 10px;
              color: #666;
            }
            .footer .signature {
              text-align: center;
            }
            .footer .signature .line {
              width: 150px;
              border-bottom: 1px solid #333;
              margin-bottom: 4px;
              height: 40px;
            }
            .footer .signature p {
              font-size: 10px;
            }
            .status-badge {
              display: inline-block;
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 10px;
              font-weight: 600;
            }
            .status-badge.improved { background: #d1fae5; color: #059669; }
            .status-badge.cured { background: #dbeafe; color: #1d4ed8; }
            .status-badge.complete { background: #e0e7ff; color: #4f46e5; }
            @media print {
              body { padding: 0; }
              .container { border: 1px solid #333; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Header -->
            <div class="header">
              <div class="logo">
                <h1>MEDICHAIN</h1>
                <p>Decentralized Health Record</p>
              </div>
              <span class="badge">MEDICAL RECORD</span>
            </div>

            <!-- Title -->
            <div class="title-bar">
              <h2>MEDICAL RECORD FORM</h2>
            </div>

            <!-- Content -->
            <div class="content">
              <!-- Patient Info Section -->
              <div class="section-title">PATIENT DATA</div>
              <div class="patient-info">
                <div class="row">
                  <div class="cell label">Patient Name</div>
                  <div class="cell value">${patientData.name}</div>
                </div>
                <div class="row">
                  <div class="cell label">ID Number</div>
                  <div class="cell value">${patientData.nik}</div>
                </div>
                <div class="row">
                  <div class="cell label">Gender</div>
                  <div class="cell value">${patientData.gender}</div>
                </div>
                <div class="row">
                  <div class="cell label">Age</div>
                  <div class="cell value">${patientData.age} Years</div>
                </div>
                <div class="row">
                  <div class="cell label">Blood Type</div>
                  <div class="cell value">${patientData.bloodType}</div>
                </div>
                <div class="row">
                  <div class="cell label">Allergy History</div>
                  <div class="cell value">${record.riwayatAlergi || "-"}</div>
                </div>
              </div>

              <!-- Record Info Section -->
              <div class="section-title">VISIT DATA</div>
              <div class="row">
                <div class="cell label">Medical Record No.</div>
                <div class="cell value">${record.noRekamMedik}</div>
              </div>
              <div class="row">
                <div class="cell label">Admission Date</div>
                <div class="cell value">${record.tanggalMasuk}</div>
              </div>
              <div class="row">
                <div class="cell label">Discharge Date</div>
                <div class="cell value">${record.tanggalKeluar || "-"}</div>
              </div>
              <div class="row">
                <div class="cell label">Healthcare Facility</div>
                <div class="cell value">${record.hospital}</div>
              </div>

              <!-- Diagnosis Section -->
              <div class="section-title">DIAGNOSIS</div>
              <div class="row">
                <div class="cell label">Primary Diagnosis</div>
                <div class="cell value">${record.diagnosisUtama}</div>
              </div>
              <div class="row">
                <div class="cell label">ICD-X Code</div>
                <div class="cell value">${record.icdCode || "-"}</div>
              </div>
              <div class="row">
                <div class="cell label">Secondary Diagnosis</div>
                <div class="cell value">${record.diagnosisSekunder || "-"}</div>
              </div>

              <!-- Clinical Section -->
              <div class="section-title">CLINICAL DATA</div>
              <div class="row">
                <div class="cell label">Symptoms / Complaints</div>
                <div class="cell value">${record.keluhan}</div>
              </div>
              <div class="row">
                <div class="cell label">Procedure</div>
                <div class="cell value">${record.tindakan || "-"}</div>
              </div>
              <div class="row">
                <div class="cell label">Prescription / Therapy</div>
                <div class="cell value">${record.resepObat}</div>
              </div>

              <!-- Outcome Section -->
              <div class="section-title">VISIT OUTCOME</div>
              <div class="row">
                <div class="cell label">Discharge Status</div>
                <div class="cell value">
                  <span class="status-badge ${record.keadaanKeluar.toLowerCase()}">${record.keadaanKeluar}</span>
                </div>
              </div>
              <div class="row">
                <div class="cell label">Attending Physician</div>
                <div class="cell value">${record.dokterPenanggungJawab}</div>
              </div>
            </div>

            <!-- Footer -->
            <div class="footer">
              <div class="date">
                Printed: ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <div class="signature">
                <div class="line"></div>
                <p>Doctor's Signature</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Section */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all flex items-center gap-1 sm:gap-2 whitespace-nowrap flex-shrink-0 ${
                  selectedCategory === category
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {category === "Diagnose" && <Stethoscope className="w-3 h-3 sm:w-4 sm:h-4" />}
                {category === "Lab" && <FlaskConical className="w-3 h-3 sm:w-4 sm:h-4" />}
                <span className="hidden sm:inline">{category}</span>
                <span className="sm:hidden">{category === "All" ? "All" : category}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{filteredRecords.length}</span> record{filteredRecords.length !== 1 ? 's' : ''}
          {searchQuery && <span> for &quot;{searchQuery}&quot;</span>}
        </p>
      </div>

      {/* Medical Records Cards Grid */}
      {filteredRecords.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredRecords.map((record) => (
            <Card 
              key={record.id} 
              className="group hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer overflow-hidden active:scale-[0.98]"
              onClick={() => setSelectedRecord(record)}
            >
              <CardContent className="p-0">
                {/* Card Header with Category Color */}
                <div className={`h-1.5 sm:h-2 ${
                  record.category === "Diagnose" ? "bg-blue-500" : "bg-emerald-500"
                }`} />
                
                <div className="p-4 sm:p-5">
                  {/* Date and No RM */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {record.tanggalMasuk}
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">
                      {record.noRekamMedik}
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="font-bold text-lg text-foreground mb-2 group-hover:text-primary transition-colors">
                    {record.diagnosisUtama}
                  </h4>

                  {/* Category Badge & Status */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md font-medium ${
                      record.category === "Diagnose" 
                        ? "bg-blue-500/10 text-blue-600" 
                        : "bg-emerald-500/10 text-emerald-600"
                    }`}>
                      {record.category === "Diagnose" ? <Stethoscope className="w-3 h-3" /> : <FlaskConical className="w-3 h-3" />}
                      {record.category}
                    </span>
                    <span className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded-md font-medium">
                      {record.keadaanKeluar}
                    </span>
                  </div>

                  {/* Preview */}
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {record.keluhan}
                  </p>

                  {/* Hospital & Doctor */}
                  <div className="space-y-1 pt-3 border-t border-border">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Building2 className="w-3 h-3 text-primary" />
                      <span className="truncate">{record.hospital}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="w-3 h-3 text-primary" />
                      <span className="truncate">{record.dokterPenanggungJawab}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Empty State */
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">No records found</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {searchQuery 
                ? `No medical records match "${searchQuery}".`
                : "No medical records in this category."}
            </p>
            {(searchQuery || selectedCategory !== "All") && (
              <button
                onClick={() => { setSearchQuery(""); setSelectedCategory("All") }}
                className="mt-4 text-sm text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </CardContent>
        </Card>
      )}

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
                      <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-600 rounded-md font-medium">
                        {selectedRecord.keadaanKeluar}
                      </span>
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
                  <p className="text-foreground">{selectedRecord.keluhan}</p>
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
                    {selectedRecord.category === "Diagnose" ? "Prescription / Therapy" : "Test Results"}
                  </h4>
                  <p className="text-foreground">{selectedRecord.resepObat}</p>
                </div>

                {/* Diagnosa Sekunder */}
                {selectedRecord.diagnosisSekunder && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Secondary Diagnosis
                    </h4>
                    <p className="text-foreground">{selectedRecord.diagnosisSekunder}</p>
                  </div>
                )}

                {/* Footer Info */}
                <div className="pt-4 border-t border-border space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="w-4 h-4 text-primary" />
                    {selectedRecord.hospital}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4 text-primary" />
                    {selectedRecord.dokterPenanggungJawab}
                  </div>
                </div>

                {/* Print Button */}
                <Button
                  onClick={() => handlePrintSingleRecord(selectedRecord)}
                  className="w-full gap-2 mt-4"
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
  )
}
