"use client"

import { useState, useRef, useEffect } from "react"
import jsQR from "jsqr"
import { X, ScanLine, Camera, CheckCircle2, ImagePlus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ScannedPatientData {
  type: string
  walletAddress: string
  name: string
  nik: string
  gender: string
  age: number
  bloodType: string
}

interface QRScannerProps {
  isOpen: boolean
  onClose: () => void
  onScanSuccess: (data: ScannedPatientData) => void
}

export function QRScanner({ isOpen, onClose, onScanSuccess }: QRScannerProps) {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manualInput, setManualInput] = useState("")
  const [processing, setProcessing] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (isOpen && scanning) {
      startCamera()
    } else {
      stopCamera()
    }

    return () => stopCamera()
  }, [isOpen, scanning])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        scanQRCode()
      }
    } catch {
      setError("Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.")
      setScanning(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  const scanQRCode = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const scan = () => {
      if (!scanning || !video.videoWidth) {
        requestAnimationFrame(scan)
        return
      }

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)

      if (code) {
        try {
          const data = JSON.parse(code.data)
          if (data.type === "medichain_patient") {
            stopCamera()
            setScanning(false)
            onScanSuccess(data)
            onClose()
            return
          }
        } catch {
          // Continue scanning
        }
      }

      requestAnimationFrame(scan)
    }

    requestAnimationFrame(scan)
  }

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setProcessing(true)
    setError(null)

    try {
      const image = new Image()
      image.src = URL.createObjectURL(file)

      await new Promise((resolve, reject) => {
        image.onload = resolve
        image.onerror = reject
      })

      const canvas = document.createElement("canvas")
      canvas.width = image.width
      canvas.height = image.height
      const ctx = canvas.getContext("2d")
      
      if (!ctx) {
        throw new Error("Cannot get canvas context")
      }

      ctx.drawImage(image, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)

      if (code) {
        const data = JSON.parse(code.data)
        if (data.type === "medichain_patient") {
          onScanSuccess(data)
          onClose()
        } else {
          setError("QR Code tidak valid. Pastikan ini adalah QR Code MediChain.")
        }
      } else {
        setError("Tidak dapat membaca QR Code dari gambar. Pastikan gambar jelas.")
      }
    } catch {
      setError("Gagal memproses gambar. Pastikan format gambar valid.")
    } finally {
      setProcessing(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleManualSubmit = () => {
    setError(null)
    try {
      const data = JSON.parse(manualInput)
      if (data.type === "medichain_patient") {
        onScanSuccess(data)
        onClose()
      } else {
        setError("QR Code tidak valid. Pastikan ini adalah QR Code MediChain.")
      }
    } catch {
      setError("Format data tidak valid.")
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4 p-6 bg-card border border-border rounded-2xl shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
            <ScanLine className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Scan QR Pasien</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Scan QR code pasien untuk melihat data
          </p>
        </div>

        {scanning ? (
          <>
            {/* Camera View */}
            <div className="relative aspect-square bg-black rounded-xl overflow-hidden mb-4">
              <video 
                ref={videoRef} 
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Scan overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-primary rounded-2xl relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg" />
                  {/* Scanning line animation */}
                  <div className="absolute inset-x-2 h-0.5 bg-primary/80 animate-pulse" style={{ top: '50%' }} />
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setScanning(false)}
            >
              Batal
            </Button>
          </>
        ) : (
          <>
            {/* Start Scanning */}
            <div className="space-y-3">
              <Button
                className="w-full gap-2 bg-gradient-to-r from-primary to-[#0077C0]"
                onClick={() => setScanning(true)}
              >
                <Camera className="w-4 h-4" />
                Scan dengan Kamera
              </Button>

              {/* Gallery Upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleGalleryUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <ImagePlus className="w-4 h-4" />
                    Upload dari Gallery
                  </>
                )}
              </Button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">atau input manual</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Manual Input */}
              <div className="space-y-2">
                <textarea
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder='Paste data QR (JSON format)...'
                  className="w-full h-20 p-3 bg-muted/30 border border-border rounded-xl text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleManualSubmit}
                  disabled={!manualInput}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Verifikasi Data
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Error */}
        {error && (
          <p className="text-sm text-red-500 text-center mt-4">{error}</p>
        )}
      </div>
    </div>
  )
}
