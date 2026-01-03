"use client"

import { useState, useEffect, useRef } from "react"
import QRCode from "qrcode"
import { X, Download, Printer, Sparkles, User, Droplet, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PatientData } from "@/lib/patientStorage"

interface PatientQRCodeProps {
  patientData: PatientData
  isOpen: boolean
  onClose: () => void
}

export function PatientQRCode({ patientData, isOpen, onClose }: PatientQRCodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("")
  const cardRef = useRef<HTMLDivElement>(null)

  // Encode patient data as JSON string
  const qrData = JSON.stringify({
    type: "medichain_patient",
    standard: "ERC-721",
    walletAddress: patientData.walletAddress,
    name: patientData.name,
    nik: patientData.nik,
    gender: patientData.gender,
    age: patientData.age,
    bloodType: patientData.bloodType,
    mintedAt: patientData.registeredAt,
  })

  // Format wallet address for display
  const shortAddress = `${patientData.walletAddress.slice(0, 6)}...${patientData.walletAddress.slice(-4)}`
  
  // Censored NIK for display (show first 4 and last 2, mask the rest)
  const censoredNik = patientData.nik.length > 6 
    ? `${patientData.nik.slice(0, 4)}${'•'.repeat(patientData.nik.length - 6)}${patientData.nik.slice(-2)}`
    : patientData.nik
  
  // Format registered date
  const registeredDate = new Date(patientData.registeredAt).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(qrData, {
        width: 140,
        margin: 1,
        color: {
          dark: "#1D242B",
          light: "#00000000",
        },
        errorCorrectionLevel: "H",
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error(err))
    }
  }, [isOpen, qrData])

  const handlePrint = () => {
    const printContent = cardRef.current
    if (!printContent) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Patient Card - ${patientData.name}</title>
          <style>
            @page { size: 86mm 54mm; margin: 0; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: system-ui, -apple-system, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .card {
              width: 86mm;
              height: 54mm;
              background: linear-gradient(135deg, #0077C0 0%, #005a94 50%, #003d66 100%);
              border-radius: 8px;
              padding: 12px;
              color: white;
              position: relative;
              overflow: hidden;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 8px;
            }
            .logo {
              font-weight: bold;
              font-size: 12px;
              letter-spacing: 1px;
            }
            .badge {
              background: #C7EEFF;
              color: #0077C0;
              padding: 2px 8px;
              border-radius: 12px;
              font-size: 8px;
              font-weight: bold;
            }
            .content {
              display: flex;
              gap: 12px;
            }
            .qr-section {
              background: white;
              padding: 6px;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .qr-section img {
              width: 80px;
              height: 80px;
            }
            .info-section {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .patient-name {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 2px;
            }
            .nik {
              font-size: 9px;
              opacity: 0.8;
              font-family: monospace;
              margin-bottom: 8px;
            }
            .stats {
              display: flex;
              gap: 8px;
            }
            .stat {
              background: rgba(255,255,255,0.15);
              padding: 4px 8px;
              border-radius: 4px;
              text-align: center;
            }
            .stat-label {
              font-size: 6px;
              opacity: 0.8;
              text-transform: uppercase;
            }
            .stat-value {
              font-size: 10px;
              font-weight: bold;
            }
            .footer {
              margin-top: 8px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 7px;
              opacity: 0.7;
            }
            .glow {
              position: absolute;
              width: 60px;
              height: 60px;
              background: rgba(199, 238, 255, 0.2);
              border-radius: 50%;
              filter: blur(20px);
            }
            .glow-1 { top: -20px; right: -20px; }
            .glow-2 { bottom: -20px; left: -20px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="glow glow-1"></div>
            <div class="glow glow-2"></div>
            <div class="header">
              <span class="logo">✦ MEDICHAIN</span>
              <span class="badge">PATIENT CARD</span>
            </div>
            <div class="content">
              <div class="qr-section">
                <img src="${qrDataUrl}" alt="QR Code" />
              </div>
              <div class="info-section">
                <div>
                  <div class="patient-name">${patientData.name}</div>
                  <div class="nik">${patientData.nik}</div>
                </div>
                <div class="stats">
                  <div class="stat">
                    <div class="stat-label">Blood</div>
                    <div class="stat-value">${patientData.bloodType}</div>
                  </div>
                  <div class="stat">
                    <div class="stat-label">Gender</div>
                    <div class="stat-value">${patientData.gender}</div>
                  </div>
                  <div class="stat">
                    <div class="stat-label">Age</div>
                    <div class="stat-value">${patientData.age}</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="footer">
              <span>${shortAddress}</span>
              <span>Registered: ${registeredDate}</span>
            </div>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  const handleDownload = () => {
    const canvas = document.createElement("canvas")
    canvas.width = 500
    canvas.height = 300
    const ctx = canvas.getContext("2d")
    if (!ctx || !qrDataUrl) return

    // Draw gradient background
    const gradient = ctx.createLinearGradient(0, 0, 500, 300)
    gradient.addColorStop(0, "#0077C0")
    gradient.addColorStop(0.5, "#005a94")
    gradient.addColorStop(1, "#003d66")
    ctx.fillStyle = gradient
    ctx.roundRect(0, 0, 500, 300, 16)
    ctx.fill()

    // Draw header
    ctx.fillStyle = "#FFFFFF"
    ctx.font = "bold 14px system-ui"
    ctx.fillText("✦ MEDICHAIN", 20, 30)
    
    // Draw badge
    ctx.fillStyle = "#C7EEFF"
    ctx.roundRect(380, 12, 100, 24, 12)
    ctx.fill()
    ctx.fillStyle = "#0077C0"
    ctx.font = "bold 10px system-ui"
    ctx.fillText("PATIENT CARD", 396, 28)

    // Draw QR code background
    ctx.fillStyle = "#FFFFFF"
    ctx.roundRect(20, 50, 120, 120, 8)
    ctx.fill()

    // Draw QR code
    const qrImg = new Image()
    qrImg.onload = () => {
      ctx.drawImage(qrImg, 30, 60, 100, 100)

      // Draw patient info
      ctx.fillStyle = "#FFFFFF"
      ctx.font = "bold 20px system-ui"
      ctx.fillText(patientData.name, 160, 80)
      
      ctx.font = "12px monospace"
      ctx.fillStyle = "rgba(255,255,255,0.8)"
      ctx.fillText(patientData.nik, 160, 100)

      // Draw stats
      const stats = [
        { label: "Blood", value: patientData.bloodType },
        { label: "Gender", value: patientData.gender },
        { label: "Age", value: patientData.age.toString() }
      ]
      
      stats.forEach((stat, i) => {
        const x = 160 + (i * 80)
        ctx.fillStyle = "rgba(255,255,255,0.2)"
        ctx.roundRect(x, 120, 70, 40, 6)
        ctx.fill()
        
        ctx.fillStyle = "rgba(255,255,255,0.7)"
        ctx.font = "8px system-ui"
        ctx.fillText(stat.label.toUpperCase(), x + 10, 135)
        
        ctx.fillStyle = "#FFFFFF"
        ctx.font = "bold 14px system-ui"
        ctx.fillText(stat.value, x + 10, 152)
      })

      // Draw footer
      ctx.fillStyle = "rgba(255,255,255,0.6)"
      ctx.font = "10px monospace"
      ctx.fillText(shortAddress, 20, 280)
      ctx.textAlign = "right"
      ctx.fillText(`Registered: ${registeredDate}`, 480, 280)

      // Download
      const pngFile = canvas.toDataURL("image/png")
      const downloadLink = document.createElement("a")
      downloadLink.download = `patient-card-${patientData.name.replace(/\s+/g, "-").toLowerCase()}.png`
      downloadLink.href = pngFile
      downloadLink.click()
    }
    qrImg.src = qrDataUrl
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Patient Card */}
        <div 
          ref={cardRef}
          className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#0077C0] via-[#005a94] to-[#003d66] p-4 sm:p-5 shadow-2xl shadow-primary/30"
        >
          {/* Decorative glow */}
          <div className="absolute -top-16 -right-16 w-32 h-32 bg-secondary/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-secondary/20 rounded-full blur-3xl" />
          
          {/* Header */}
          <div className="relative flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              <span className="text-white font-bold tracking-wide text-xs sm:text-sm">MEDICHAIN</span>
            </div>
            <div className="px-2 sm:px-3 py-1 bg-secondary rounded-full">
              <span className="text-primary text-[10px] sm:text-xs font-bold">PATIENT CARD</span>
            </div>
          </div>

          {/* Content - Stack on mobile, side by side on larger */}
          <div className="relative flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* QR Code */}
            <div className="bg-white p-2 sm:p-3 rounded-lg sm:rounded-xl flex-shrink-0 self-center sm:self-start">
              {qrDataUrl ? (
                <img 
                  src={qrDataUrl} 
                  alt="Patient QR Code" 
                  width={80} 
                  height={80}
                  className="rounded-lg w-[80px] h-[80px] sm:w-[100px] sm:h-[100px]"
                />
              ) : (
                <div className="w-[80px] h-[80px] sm:w-[100px] sm:h-[100px] flex items-center justify-center">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Patient Info */}
            <div className="flex-1 flex flex-col justify-between text-center sm:text-left">
              <div>
                <h3 className="text-white font-bold text-base sm:text-lg leading-tight">{patientData.name}</h3>
                <p className="text-white/70 font-mono text-[10px] sm:text-xs mt-1">{censoredNik}</p>
              </div>

              {/* Stats */}
              <div className="flex gap-2 mt-3 justify-center sm:justify-start">
                <div className="px-2 sm:px-3 py-1.5 sm:py-2 bg-white/15 rounded-lg text-center">
                  <Droplet className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-secondary mx-auto mb-0.5 sm:mb-1" />
                  <p className="text-white font-bold text-xs sm:text-sm">{patientData.bloodType}</p>
                </div>
                <div className="px-2 sm:px-3 py-1.5 sm:py-2 bg-white/15 rounded-lg text-center">
                  <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-secondary mx-auto mb-0.5 sm:mb-1" />
                  <p className="text-white font-bold text-xs sm:text-sm">{patientData.gender}</p>
                </div>
                <div className="px-2 sm:px-3 py-1.5 sm:py-2 bg-white/15 rounded-lg text-center">
                  <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-secondary mx-auto mb-0.5 sm:mb-1" />
                  <p className="text-white font-bold text-xs sm:text-sm">{patientData.age} yrs</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="relative flex flex-col sm:flex-row justify-between items-center gap-1 sm:gap-0 mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-white/20">
            <p className="text-white/60 font-mono text-[10px] sm:text-xs">{shortAddress}</p>
            <p className="text-white/60 text-[10px] sm:text-xs">Registered: {registeredDate}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <Button
            onClick={handlePrint}
            className="flex-1 gap-2 bg-secondary text-primary hover:bg-secondary/90 font-semibold justify-center"
            disabled={!qrDataUrl}
          >
            <Printer className="w-4 h-4" />
            Print Card
          </Button>
          
        </div>

        {/* Close button text */}
        <button
          onClick={onClose}
          className="w-full mt-3 py-3 text-white/70 hover:text-red-500  text-sm font-medium transition-colors "
        >
          Close
        </button>
      </div>
    </div>
  )
}
