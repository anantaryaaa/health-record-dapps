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
  Printer
} from "lucide-react"

// Medical record type
export interface MedicalRecord {
  id: number
  date: string
  dateSort: Date
  title: string
  status: string
  symptoms: string
  treatment: string
  hospital: string
  category: "Diagnose" | "Lab"
}

// Mock data for medical records
export const medicalRecords: MedicalRecord[] = [
  {
    id: 1,
    date: "15 Desember 2024",
    dateSort: new Date("2024-12-15"),
    title: "Influenza A",
    status: "Completed",
    symptoms: "Demam tinggi, batuk kering, nyeri otot, sakit kepala, lemas",
    treatment: "Paracetamol 500mg 3x1, Oseltamivir 75mg 2x1, Istirahat total 5 hari",
    hospital: "RS Siloam Jakarta Selatan",
    category: "Diagnose"
  },
  {
    id: 2,
    date: "28 November 2024",
    dateSort: new Date("2024-11-28"),
    title: "Gastritis Akut",
    status: "Completed",
    symptoms: "Nyeri ulu hati, mual, kembung, tidak nafsu makan",
    treatment: "Omeprazole 20mg 1x1, Antasida 3x1, Hindari makanan pedas & asam",
    hospital: "RS Pondok Indah Bintaro",
    category: "Diagnose"
  },
  {
    id: 3,
    date: "5 Oktober 2024",
    dateSort: new Date("2024-10-05"),
    title: "Tension Headache",
    status: "Completed",
    symptoms: "Sakit kepala tegang, leher kaku, mata lelah, sulit konsentrasi",
    treatment: "Ibuprofen 400mg bila perlu, Myonal 50mg 2x1, Fisioterapi leher",
    hospital: "Klinik Medika Surabaya",
    category: "Diagnose"
  },
  {
    id: 4,
    date: "10 Desember 2024",
    dateSort: new Date("2024-12-10"),
    title: "Complete Blood Count (CBC)",
    status: "Completed",
    symptoms: "Pemeriksaan rutin",
    treatment: "Hemoglobin: 14.5 g/dL, Leukosit: 7.200/µL, Trombosit: 250.000/µL",
    hospital: "Lab Prodia Jakarta",
    category: "Lab"
  },
  {
    id: 5,
    date: "1 November 2024",
    dateSort: new Date("2024-11-01"),
    title: "Lipid Profile",
    status: "Completed",
    symptoms: "Pemeriksaan kolesterol",
    treatment: "Total Cholesterol: 195 mg/dL, HDL: 55 mg/dL, LDL: 120 mg/dL, Triglycerides: 100 mg/dL",
    hospital: "Lab Prodia Jakarta",
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
      record.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.symptoms.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.hospital.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = selectedCategory === "All" || record.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  // Print medical history as PDF
  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const recordsHtml = filteredRecords.map(record => `
      <div class="record">
        <div class="record-header">
          <div>
            <span class="date">${record.date}</span>
            <h3 class="title">${record.title}</h3>
          </div>
          <span class="category ${record.category.toLowerCase()}">${record.category}</span>
        </div>
        <div class="record-body">
          <div class="field">
            <label>${record.category === "Diagnose" ? "Symptoms" : "Purpose"}</label>
            <p>${record.symptoms}</p>
          </div>
          <div class="field">
            <label>${record.category === "Diagnose" ? "Treatment / Prescription" : "Results"}</label>
            <p>${record.treatment}</p>
          </div>
        </div>
        <div class="record-footer">
          <span>🏥 ${record.hospital}</span>
          <span class="status">${record.status}</span>
        </div>
      </div>
    `).join('')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Medical History - ${patientData.name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: system-ui, -apple-system, sans-serif;
              padding: 40px;
              background: #fff;
              color: #1a1a1a;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 32px;
              padding-bottom: 24px;
              border-bottom: 2px solid #0077C0;
            }
            .logo {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .logo-icon {
              width: 48px;
              height: 48px;
              background: linear-gradient(135deg, #0077C0, #005a94);
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 24px;
            }
            .logo-text h1 {
              font-size: 24px;
              color: #0077C0;
            }
            .logo-text p {
              font-size: 12px;
              color: #666;
            }
            .patient-info {
              text-align: right;
            }
            .patient-info h2 {
              font-size: 20px;
              margin-bottom: 4px;
            }
            .patient-info p {
              font-size: 12px;
              color: #666;
            }
            .patient-info .nik {
              font-family: monospace;
              background: #f5f5f5;
              padding: 4px 8px;
              border-radius: 4px;
              margin-top: 8px;
              display: inline-block;
            }
            .summary {
              background: #f8fafc;
              padding: 16px 24px;
              border-radius: 8px;
              margin-bottom: 24px;
              display: flex;
              gap: 24px;
            }
            .summary-item {
              text-align: center;
            }
            .summary-item .value {
              font-size: 24px;
              font-weight: bold;
              color: #0077C0;
            }
            .summary-item .label {
              font-size: 12px;
              color: #666;
            }
            .records-title {
              font-size: 16px;
              margin-bottom: 16px;
              color: #333;
            }
            .record {
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              margin-bottom: 16px;
              overflow: hidden;
              page-break-inside: avoid;
            }
            .record-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              padding: 16px;
              background: #f8fafc;
              border-bottom: 1px solid #e5e7eb;
            }
            .date {
              font-size: 12px;
              color: #666;
            }
            .title {
              font-size: 16px;
              margin-top: 4px;
            }
            .category {
              font-size: 11px;
              padding: 4px 12px;
              border-radius: 12px;
              font-weight: 600;
            }
            .category.diagnose {
              background: #dbeafe;
              color: #1d4ed8;
            }
            .category.lab {
              background: #d1fae5;
              color: #059669;
            }
            .record-body {
              padding: 16px;
            }
            .field {
              margin-bottom: 12px;
            }
            .field:last-child {
              margin-bottom: 0;
            }
            .field label {
              font-size: 11px;
              color: #666;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              display: block;
              margin-bottom: 4px;
            }
            .field p {
              font-size: 14px;
              line-height: 1.5;
            }
            .record-footer {
              display: flex;
              justify-content: space-between;
              padding: 12px 16px;
              background: #f8fafc;
              border-top: 1px solid #e5e7eb;
              font-size: 12px;
              color: #666;
            }
            .status {
              color: #059669;
              font-weight: 500;
            }
            .footer {
              margin-top: 32px;
              padding-top: 16px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              font-size: 11px;
              color: #999;
            }
            @media print {
              body { padding: 20px; }
              .record { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">
              <div class="logo-icon">✦</div>
              <div class="logo-text">
                <h1>MediChain</h1>
                <p>Decentralized Health Record</p>
              </div>
            </div>
            <div class="patient-info">
              <h2>${patientData.name}</h2>
              <p>Blood Type: ${patientData.bloodType} | Gender: ${patientData.gender} | Age: ${patientData.age}</p>
              <span class="nik">NIK: ${patientData.nik}</span>
            </div>
          </div>
          
          <div class="summary">
            <div class="summary-item">
              <div class="value">${filteredRecords.length}</div>
              <div class="label">Total Records</div>
            </div>
            <div class="summary-item">
              <div class="value">${filteredRecords.filter(r => r.category === "Diagnose").length}</div>
              <div class="label">Diagnoses</div>
            </div>
            <div class="summary-item">
              <div class="value">${filteredRecords.filter(r => r.category === "Lab").length}</div>
              <div class="label">Lab Results</div>
            </div>
          </div>

          <h3 class="records-title">Medical History</h3>
          ${recordsHtml}

          <div class="footer">
            <p>Generated on ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })} • MediChain - Decentralized Health Record System</p>
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
      {/* Search, Filter, and Print Section */}
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

        {/* Results Count and Print Button */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredRecords.length}</span> record{filteredRecords.length !== 1 ? 's' : ''}
            {searchQuery && <span> for &quot;{searchQuery}&quot;</span>}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintPDF}
            className="gap-2"
            disabled={filteredRecords.length === 0}
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print PDF</span>
            <span className="sm:hidden">Print</span>
          </Button>
        </div>
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
                  {/* Date and Status */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {record.date}
                    </div>
                    <span className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded-full font-medium">
                      {record.status}
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="font-bold text-lg text-foreground mb-2 group-hover:text-primary transition-colors">
                    {record.title}
                  </h4>

                  {/* Category Badge */}
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md font-medium mb-3 ${
                    record.category === "Diagnose" 
                      ? "bg-blue-500/10 text-blue-600" 
                      : "bg-emerald-500/10 text-emerald-600"
                  }`}>
                    {record.category === "Diagnose" ? <Stethoscope className="w-3 h-3" /> : <FlaskConical className="w-3 h-3" />}
                    {record.category}
                  </span>

                  {/* Preview */}
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {record.category === "Diagnose" ? record.symptoms : record.treatment}
                  </p>

                  {/* Hospital */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-3 border-t border-border">
                    <Building2 className="w-3 h-3 text-primary" />
                    <span className="truncate">{record.hospital}</span>
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
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Calendar className="w-4 h-4" />
                      {selectedRecord.date}
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">{selectedRecord.title}</h2>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md font-medium ${
                        selectedRecord.category === "Diagnose" 
                          ? "bg-blue-500/20 text-blue-600" 
                          : "bg-emerald-500/20 text-emerald-600"
                      }`}>
                        {selectedRecord.category === "Diagnose" ? <Stethoscope className="w-3 h-3" /> : <FlaskConical className="w-3 h-3" />}
                        {selectedRecord.category}
                      </span>
                      <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-600 rounded-md font-medium">
                        {selectedRecord.status}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedRecord(null)} className="p-2 rounded-full hover:bg-muted/50 transition-colors">
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {selectedRecord.category === "Diagnose" ? "Symptoms" : "Purpose"}
                  </h4>
                  <p className="text-foreground">{selectedRecord.symptoms}</p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {selectedRecord.category === "Diagnose" ? "Treatment / Prescription" : "Results"}
                  </h4>
                  <p className="text-foreground">{selectedRecord.treatment}</p>
                </div>

                <div className="pt-4 border-t border-border flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="w-4 h-4 text-primary" />
                  {selectedRecord.hospital}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
