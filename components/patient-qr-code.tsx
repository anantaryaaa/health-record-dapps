"use client"

import { useState, useEffect } from "react"
import QRCode from "qrcode"
import { X, Download, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PatientData } from "@/lib/patientStorage"

interface PatientQRCodeProps {
  patientData: PatientData
  isOpen: boolean
  onClose: () => void
}

export function PatientQRCode({ patientData, isOpen, onClose }: PatientQRCodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("")

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
  
  // Format minted date
  const mintedDate = new Date(patientData.registeredAt).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric'
  })

  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(qrData, {
        width: 180,
        margin: 1,
        color: {
          dark: "#1D242B", // Dark Navy
          light: "#00000000", // Transparent
        },
        errorCorrectionLevel: "H",
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error(err))
    }
  }, [isOpen, qrData])

  const handleDownload = () => {
    // Create a canvas to render the full NFT card
    const canvas = document.createElement("canvas")
    canvas.width = 400
    canvas.height = 500
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Draw gradient background (Primary Blue to darker blue)
    const gradient = ctx.createLinearGradient(0, 0, 400, 500)
    gradient.addColorStop(0, "#0077C0") // Primary Blue
    gradient.addColorStop(0.5, "#005a94")
    gradient.addColorStop(1, "#003d66")
    ctx.fillStyle = gradient
    ctx.roundRect(0, 0, 400, 500, 24)
    ctx.fill()

    // Draw header
    ctx.fillStyle = "#FFFFFF"
    ctx.font = "bold 16px system-ui"
    ctx.fillText("MEDICHAIN", 24, 40)
    
    // Draw ERC-721 badge
    ctx.fillStyle = "#C7EEFF" // Light Blue
    ctx.roundRect(300, 20, 80, 28, 14)
    ctx.fill()
    ctx.fillStyle = "#0077C0"
    ctx.font = "bold 12px system-ui"
    ctx.fillText("ERC-721", 316, 38)

    // Draw QR code background
    ctx.fillStyle = "#FAFAFA"
    ctx.roundRect(85, 70, 230, 230, 16)
    ctx.fill()

    // Draw QR code
    if (qrDataUrl) {
      const qrImg = new Image()
      qrImg.onload = () => {
        ctx.drawImage(qrImg, 110, 95, 180, 180)
        
        // Draw wallet address
        ctx.fillStyle = "rgba(255,255,255,0.7)"
        ctx.font = "14px monospace"
        ctx.textAlign = "center"
        ctx.fillText(shortAddress, 200, 330)
        
        // Draw patient info
        ctx.textAlign = "left"
        ctx.fillStyle = "#C7EEFF"
        ctx.font = "12px system-ui"
        ctx.fillText("PATIENT NAME", 24, 380)
        ctx.fillText("MINTED", 300, 380)
        
        ctx.fillStyle = "#FFFFFF"
        ctx.font = "bold 18px system-ui"
        ctx.fillText(patientData.name, 24, 405)
        ctx.font = "bold 16px system-ui"
        ctx.fillText(mintedDate, 300, 405)

        // Download
        const pngFile = canvas.toDataURL("image/png")
        const downloadLink = document.createElement("a")
        downloadLink.download = `medichain-nft-${patientData.name.replace(/\s+/g, "-").toLowerCase()}.png`
        downloadLink.href = pngFile
        downloadLink.click()
      }
      qrImg.src = qrDataUrl
    }
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
      <div className="relative z-10 w-full max-w-sm mx-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* NFT Card - Using color palette */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0077C0] via-[#005a94] to-[#003d66] p-6 shadow-2xl shadow-primary/30">
          {/* Decorative glow */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-secondary/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-secondary/20 rounded-full blur-3xl" />
          
          {/* Header */}
          <div className="relative flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-white" />
              <span className="text-white font-bold tracking-wide">MEDICHAIN</span>
            </div>
            <div className="px-3 py-1 bg-secondary rounded-full">
              <span className="text-primary text-xs font-bold">ERC-721</span>
            </div>
          </div>

          {/* QR Code with white background */}
          <div className="relative flex justify-center mb-4">
            <div className="bg-[#FAFAFA] p-4 rounded-2xl">
              {qrDataUrl ? (
                <img 
                  src={qrDataUrl} 
                  alt="Patient QR Code" 
                  width={160} 
                  height={160}
                  className="rounded-lg"
                />
              ) : (
                <div className="w-[160px] h-[160px] flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Wallet Address */}
          <p className="text-center text-white/70 font-mono text-sm mb-6">
            {shortAddress}
          </p>

          {/* Patient Info */}
          <div className="flex justify-between items-end">
            <div>
              <p className="text-secondary text-xs uppercase tracking-wide mb-1">Patient Name</p>
              <p className="text-white font-bold text-lg">{patientData.name}</p>
            </div>
            <div className="text-right">
              <p className="text-secondary text-xs uppercase tracking-wide mb-1">Minted</p>
              <p className="text-white font-bold">{mintedDate}</p>
            </div>
          </div>
        </div>

        {/* Download button */}
        <Button
          onClick={handleDownload}
          className="w-full mt-4 gap-2 bg-secondary text-primary hover:bg-secondary/90 font-semibold"
          disabled={!qrDataUrl}
        >
          <Download className="w-4 h-4" />
          Download NFT Card
        </Button>

        {/* Close button text */}
        <button
          onClick={onClose}
          className="w-full mt-3 py-3 text-white/70 hover:text-white text-sm font-medium transition-colors"
        >
          Close Card
        </button>
      </div>
    </div>
  )
}
