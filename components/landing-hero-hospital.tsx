"use client"

import { Button } from "@/components/ui/button"
import { Shield, QrCode, Stethoscope, ClipboardList, ChevronRight, Building2, Database, FileCheck } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"

export function LandingHeroHospital() {
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  }

  const floatingAnimation = {
    y: [0, -15, 0],
    transition: { duration: 4, repeat: Infinity, ease: "easeInOut" as const }
  }

  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col lg:flex-row items-center justify-between gap-12 z-10 relative py-4 min-h-[500px]">
      
      {/* Left Column - Text Content */}
      <motion.div 
        className="flex-1 flex flex-col items-start text-left max-w-2xl"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.1 } } }}
      >
       

        <motion.h1
          variants={itemVariants}
          className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight leading-[1.1] text-foreground"
        >
          Access Patient Data
          <br />
          <span className="bg-gradient-to-r from-teal-600 to-teal-500 bg-clip-text text-transparent">
            Chained in Blockchain
          </span>
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl leading-relaxed"
        >
          Manage medical records securely and encrypted. 
          <span className="text-foreground font-medium"> No repetitive forms</span> - patient data instantly available via QR scan.
        </motion.p>

       

        {/* CTA */}
        <motion.div variants={itemVariants}>
          <Link href="/auth">
            <Button size="lg" className="h-14 px-8 gap-3 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-lg font-semibold rounded-xl">
              Get Started
              <ChevronRight className="w-5 h-5" />
            </Button>
          </Link>
        </motion.div>
      </motion.div>

      {/* Right Column - Visual */}
      <motion.div 
        className="flex-1 flex items-start justify-center relative"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="relative">
          {/* Subtle glow behind image */}
          <div className="absolute -inset-4 bg-gradient-to-r from-teal-500/20 to-teal-400/20 rounded-3xl blur-2xl opacity-50" />
          
          {/* Floating Icons */}
          <motion.div 
            className="absolute -top-4 -left-4 w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center z-20"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Building2 className="w-6 h-6 text-teal-600" />
          </motion.div>
          
          <motion.div 
            className="absolute top-1/4 -right-6 w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center z-20"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          >
            <QrCode className="w-6 h-6 text-teal-600" />
          </motion.div>
          
          <motion.div 
            className="absolute bottom-1/4 -left-6 w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center z-20"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          >
            <Database className="w-6 h-6 text-teal-600" />
          </motion.div>
          
          <motion.div 
            className="absolute -bottom-4 right-8 w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center z-20"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          >
            <FileCheck className="w-6 h-6 text-teal-600" />
          </motion.div>

          <Image
            src="/assets/landing-hero-hospitals.webp"
            alt="Hospital Healthcare"
            width={900}
            height={900}
            className="object-cover max-w-full h-auto rounded-2xl shadow-xl relative z-10"
            priority
          />
        </div>
      </motion.div>
    </div>
  )
}

function FeatureItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/50 border border-teal-500/10">
      <div className="w-8 h-8 bg-teal-500/10 rounded-lg flex items-center justify-center text-teal-600">
        {icon}
      </div>
      <span className="text-sm font-medium text-foreground">{text}</span>
    </div>
  )
}
