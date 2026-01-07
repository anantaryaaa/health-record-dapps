"use client"

import { motion, AnimatePresence } from "framer-motion"
import { DotPattern } from "./ui/dot-pattern"
import { cn } from "@/lib/utils"
import { LandingHeroPatient } from "./landing-hero-patient"
import { LandingHeroHospital } from "./landing-hero-hospital"

interface LandingHeroProps {
  activeTab: "patient" | "hospital"
  setActiveTab: (tab: "patient" | "hospital") => void
}

export function LandingSection({ activeTab, setActiveTab }: LandingHeroProps) {

  return (
    <motion.div 
      className="relative min-h-screen flex flex-col items-center justify-center px-4 md:px-12 lg:px-20 pt-24 pb-8 bg-gradient-to-br from-background via-background to-secondary/20 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={cn(
          "absolute top-20 -left-32 w-96 h-96 rounded-full blur-3xl transition-colors duration-500",
          activeTab === "patient" ? "bg-primary/10" : "bg-teal-500/10"
        )} />
        <div className={cn(
          "absolute bottom-20 -right-32 w-96 h-96 rounded-full blur-3xl transition-colors duration-500",
          activeTab === "patient" ? "bg-blue-400/15" : "bg-teal-400/15"
        )} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary/5 to-secondary/30 rounded-full blur-3xl" />
      </div>

      <DotPattern className={`opacity-40 ${
        activeTab === "patient" ? "fill-primary/30" : "fill-teal-500/30"
      }`} />

      {/* Content based on active tab */}
      <AnimatePresence mode="wait">
        {activeTab === "patient" ? (
          <motion.div
            key="patient"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <LandingHeroPatient />
          </motion.div>
        ) : (
          <motion.div
            key="hospital"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <LandingHeroHospital />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}