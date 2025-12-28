"use client"

import { motion } from "framer-motion"
import { Wallet, FileText, QrCode, Share, ScanLine, ClipboardList, CheckCircle } from "lucide-react"

interface UserFlowProps {
  activeTab: "patient" | "hospital"
}

export function UserFlow({ activeTab }: UserFlowProps) {
  const patientSteps = [
    { icon: Wallet, title: "Connect Wallet", desc: "Hubungkan wallet Anda" },
    { icon: FileText, title: "Isi Data Diri", desc: "Lengkapi informasi dasar" },
    { icon: QrCode, title: "Dapatkan QR Code", desc: "Identitas digital Anda" },
    { icon: Share, title: "Bagikan ke RS", desc: "Izinkan akses data" },
  ]

  const hospitalSteps = [
    { icon: Wallet, title: "Connect Wallet", desc: "Login dengan wallet RS" },
    { icon: ScanLine, title: "Scan QR Pasien", desc: "Atau input NIK manual" },
    { icon: ClipboardList, title: "Input Rekam Medis", desc: "Catat diagnosa & resep" },
    { icon: CheckCircle, title: "Push to Chain", desc: "Data tersimpan aman" },
  ]

  const steps = activeTab === "patient" ? patientSteps : hospitalSteps
  const accentColor = activeTab === "patient" ? "primary" : "teal"

  return (
    <section className="py-20 px-4 md:px-12 lg:px-20 bg-gradient-to-b from-background via-secondary/5 to-background relative overflow-hidden">
      {/* Background subtle pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl ${
          activeTab === "patient" ? "bg-primary/5" : "bg-teal-500/5"
        }`} />
        <div className={`absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl ${
          activeTab === "patient" ? "bg-blue-400/5" : "bg-teal-400/5"
        }`} />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
         
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            {activeTab === "patient" ? "Mulai dalam 4 Langkah" : "Akses Data dalam 4 Langkah"}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {activeTab === "patient" 
              ? "Proses sederhana untuk mengamankan data kesehatan Anda"
              : "Alur kerja yang efisien untuk mengakses dan mengelola data pasien"
            }
          </p>
        </motion.div>

        {/* Steps Flow - Timeline Style */}
        <div className="relative">
          {/* Connection Line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-border to-transparent hidden md:block" />
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-4">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                className="relative"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
              >
                {/* Step Card */}
                <motion.div 
                  className="flex flex-col items-center text-center p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-border hover:shadow-md transition-all duration-300"
                  whileHover={{ y: -5 }}
                >
                  {/* Number + Icon Combined */}
                  <div className="relative mb-5">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                      activeTab === "patient"
                        ? "bg-gradient-to-br from-primary/20 to-primary/10"
                        : "bg-gradient-to-br from-teal-500/20 to-teal-500/10"
                    }`}>
                      <step.icon className={`w-8 h-8 ${
                        activeTab === "patient" ? "text-primary" : "text-teal-600"
                      }`} />
                    </div>
                    {/* Number Badge */}
                    <div className={`absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg ${
                      activeTab === "patient" 
                        ? "bg-primary" 
                        : "bg-teal-600"
                    }`}>
                      {index + 1}
                    </div>
                  </div>
                  
                  {/* Text */}
                  <h3 className="font-bold text-foreground text-base mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
