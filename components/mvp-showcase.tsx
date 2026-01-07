// components/mvp-showcase.tsx
"use client"

import { motion } from "framer-motion"
import { Shield, QrCode, Lock, History, FileCheck, Share2, Building2, ClipboardCheck } from "lucide-react"

interface MVPShowcaseProps {
  activeTab: "patient" | "hospital"
}

const patientFeatures = [
  {
    icon: QrCode,
    title: "QR Code Access",
    description: "Generate secure QR codes for instant healthcare data sharing",
  },
  {
    icon: Shield,
    title: "Data Ownership",
    description: "Full control over who can access your medical records",
  },
  {
    icon: Lock,
    title: "Blockchain Security",
    description: "Your health data encrypted and stored on decentralized network",
  },
  {
    icon: History,
    title: "Access History",
    description: "Track every access to your medical records in real-time",
  },
]

const hospitalFeatures = [
  {
    icon: FileCheck,
    title: "Consent Verification",
    description: "Access patient data only with verified blockchain consent",
  },
  {
    icon: Share2,
    title: "Instant Access",
    description: "Scan QR code to instantly retrieve patient records",
  },
  {
    icon: Building2,
    title: "Multi-Hospital",
    description: "Seamless data sharing across healthcare networks",
  },
  {
    icon: ClipboardCheck,
    title: "HIPAA Compliant",
    description: "Enterprise-grade security meeting healthcare standards",
  },
]

export function MVPShowcase({ activeTab }: MVPShowcaseProps) {
  const features = activeTab === "patient" ? patientFeatures : hospitalFeatures
  const isPatient = activeTab === "patient"

  return (
    <section className={`py-20 px-4 md:px-12 lg:px-20 overflow-hidden transition-colors duration-500 ${
      isPatient 
        ? "bg-gradient-to-br from-primary/10 via-primary/5 to-background" 
        : "bg-gradient-to-br from-teal-600/10 via-teal-500/5 to-background"
    }`}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row items-start gap-12 lg:gap-20">
          
          {/* Left Side - Text Content */}
          <motion.div 
            className="flex-1 lg:max-w-md"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            {/* Tagline */}
            <p className={`text-xs md:text-sm font-semibold tracking-[0.2em] uppercase mb-4 ${
              isPatient ? "text-primary" : "text-teal-600"
            }`}>
              {isPatient 
                ? "Secure. Control. Share. Track." 
                : "Verify. Access. Connect. Comply."}
            </p>
            
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              <span className="text-foreground">
                {isPatient ? "Your Health, " : "Patient Data, "}
              </span>
              <br />
              <span className={`bg-clip-text text-transparent ${
                isPatient 
                  ? "bg-gradient-to-r from-primary to-[#0077C0]"    
                  : "bg-gradient-to-r from-teal-600 to-teal-500"
              }`}>
                {isPatient ? "Your Control" : "With Consent"}
              </span>
            </h2>
            
            <p className="text-muted-foreground text-sm md:text-base">
              {isPatient 
                ? "Take ownership of your medical records with blockchain technology."
                : "Access verified patient data securely through decentralized consent."}
            </p>
          </motion.div>

          {/* Right Side - Feature Grid */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="group"
              >
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors ${
                  isPatient 
                    ? "bg-primary/10 text-primary" 
                    : "bg-teal-500/10 text-teal-600"
                }`}>
                  <feature.icon className="w-5 h-5" />
                </div>
                
                {/* Title */}
                <h3 className="font-bold text-foreground mb-2 uppercase tracking-wide text-sm">
                  {feature.title}
                </h3>
                
                {/* Description */}
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}