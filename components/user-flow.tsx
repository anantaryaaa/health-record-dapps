// components/user-flow.tsx
"use client"

import { motion } from "framer-motion"
import { Wallet, FileText, QrCode, Share, ScanLine, ClipboardList, CheckCircle } from "lucide-react"

interface UserFlowProps {
  activeTab: "patient" | "hospital"
}

export function UserFlow({ activeTab }: UserFlowProps) {
  const patientSteps = [
    { icon: Wallet, title: "Connect Wallet", desc: "Connect your wallet" },
    { icon: FileText, title: "Fill Your Data", desc: "Complete basic information" },
    { icon: QrCode, title: "Get QR Code", desc: "Your digital identity (ERC-721)" },
    { icon: Share, title: "Share to Hospital", desc: "Grant data access" },
  ]

  const hospitalSteps = [
    { icon: Wallet, title: "Connect Wallet", desc: "Login with hospital wallet" },
    { icon: ScanLine, title: "Scan Patient QR", desc: "Or manual input ID" },
    { icon: ClipboardList, title: "Input Medical Record", desc: "Record diagnosis & prescription" },
    { icon: CheckCircle, title: "Push to Chain", desc: "Data stored securely" },
  ]

  const steps = activeTab === "patient" ? patientSteps : hospitalSteps
  const isPatient = activeTab === "patient"

  return (
    <section className="py-20 px-4 md:px-12 lg:px-20 bg-gradient-to-b from-background to-secondary/5 relative overflow-hidden">
      <style>{`
        @keyframes marchDown {
          0% { background-position: 0 0; }
          100% { background-position: 0 16px; }
        }
        @keyframes marchRight {
          0% { background-position: 0 0; }
          100% { background-position: 16px 0; }
        }
        .march-down {
          animation: marchDown 0.4s linear infinite;
        }
        .march-right {
          animation: marchRight 0.4s linear infinite;
        }
      `}</style>

      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row items-start gap-12 lg:gap-16">
          
          {/* Left Side - Text Content */}
          <motion.div 
            className="flex-1 lg:max-w-sm lg:sticky lg:top-32"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className={`text-xs md:text-sm font-semibold tracking-[0.2em] uppercase mb-4 ${
              isPatient ? "text-primary" : "text-teal-600"
            }`}>
              How It Works
            </p>
            
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
              <span className={`bg-clip-text text-transparent ${
                isPatient 
                  ? "bg-gradient-to-r from-primary to-[#0077C0]" 
                  : "bg-gradient-to-r from-teal-600 to-teal-500"
              }`}>
                {isPatient ? "Just a few steps to secure your data" : "Access Patient Data Securely"}
              </span>
            </h2>
            
            <p className="text-muted-foreground text-sm md:text-base">
              {isPatient 
                ? "Take control of your medical records in just 4 simple steps."
                : "Efficient workflow to access and manage patient data with consent."}
            </p>
          </motion.div>

          {/* Right Side - Flow Container */}
          <div className="flex-1 w-full">
            <div className={`relative rounded-3xl border-2 border-dashed p-6 md:p-8 ${
              isPatient ? "border-primary/30" : "border-teal-500/30"
            }`}>
              {steps.map((step, index) => {
                const isEven = index % 2 === 0
                const isLast = index === steps.length - 1
                const dashColor = isPatient ? "#3b82f6" : "#14b8a6"
                
                return (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.15 }}
                    className="relative"
                  >
                    {/* Step Card - Centered on mobile, alternating on md+ */}
                    <div className={`flex justify-center ${isEven ? "md:justify-start" : "md:justify-end"}`}>
                      <div className={`flex items-center gap-4 p-4 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50 max-w-[280px] ${
                        !isEven ? "md:flex-row-reverse md:text-right" : ""
                      }`}>
                        <div className={`relative flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                          isPatient ? "bg-primary/10" : "bg-teal-500/10"
                        }`}>
                          <step.icon className={`w-5 h-5 ${isPatient ? "text-primary" : "text-teal-600"}`} />
                          <div className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                            isPatient ? "bg-primary" : "bg-teal-600"
                          }`}>
                            {index + 1}
                          </div>
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground text-sm">{step.title}</h3>
                          <p className="text-xs text-muted-foreground">{step.desc}</p>
                        </div>
                      </div>
                    </div>

                    {/* Connector Lines */}
                    {!isLast && (
                      <>
                        {/* Mobile: Simple vertical centered line */}
                        <div className="flex justify-center py-2 md:hidden">
                          <div 
                            className="w-0.5 h-12 march-down"
                            style={{ 
                              background: `repeating-linear-gradient(to bottom, ${dashColor} 0px, ${dashColor} 4px, transparent 4px, transparent 8px)`,
                              opacity: 0.6
                            }}
                          />
                        </div>

                        {/* Desktop: Zigzag connector lines */}
                        <div className="hidden md:block relative h-16 my-1">
                          {/* Vertical line down from current card */}
                          <div 
                            className="absolute w-0.5 march-down"
                            style={{ 
                              height: "20px",
                              top: 0,
                              left: isEven ? "140px" : "auto",
                              right: isEven ? "auto" : "140px",
                              background: `repeating-linear-gradient(to bottom, ${dashColor} 0px, ${dashColor} 4px, transparent 4px, transparent 8px)`,
                              opacity: 0.6
                            }}
                          />
                          
                          {/* Horizontal line */}
                          <div 
                            className="absolute h-0.5 march-right"
                            style={{ 
                              top: "20px",
                              left: "140px",
                              right: "140px",
                              background: `repeating-linear-gradient(to right, ${dashColor} 0px, ${dashColor} 4px, transparent 4px, transparent 8px)`,
                              opacity: 0.6
                            }}
                          />
                          
                          {/* Vertical line down to next card */}
                          <div 
                            className="absolute w-0.5 march-down"
                            style={{ 
                              height: "20px",
                              top: "20px",
                              left: isEven ? "auto" : "140px",
                              right: isEven ? "140px" : "auto",
                              background: `repeating-linear-gradient(to bottom, ${dashColor} 0px, ${dashColor} 4px, transparent 4px, transparent 8px)`,
                              opacity: 0.6
                            }}
                          />
                        </div>
                      </>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
