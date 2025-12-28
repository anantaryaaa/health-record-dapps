"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

interface NavbarProps {
  activeTab?: "patient" | "hospital"
}

export function Navbar({ activeTab = "patient" }: NavbarProps) {
  const isHospital = activeTab === "hospital"
  
  return (
    <motion.nav 
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-background/80 backdrop-blur-md border-b border-border/50"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="flex items-center gap-12 font-sans">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-sans font-bold text-xl tracking-tight text-foreground">
          <span>MediChain</span>
        </Link>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Link href="/auth">
            <Button 
              size="sm" 
              className={`font-semibold px-6 transition-all duration-300 cursor-pointer ${
                isHospital 
                  ? "bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 shadow-md shadow-teal-500/20 hover:shadow-lg hover:shadow-teal-500/30" 
                  : "bg-gradient-to-r from-primary to-[#0077C0] shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30"
              }`}
            >
              Get Started
            </Button>
          </Link>
        </motion.div>
      </div>
    </motion.nav>
  )
}
