"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Menu, X } from "lucide-react"

interface NavbarProps {
  activeTab?: "patient" | "hospital"
  onSelectRole?: (role: "patient" | "hospital") => void
}

export function Navbar({ activeTab = "patient", onSelectRole }: NavbarProps) {
  const isHospital = activeTab === "hospital"
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  return (
    <>
      <motion.nav 
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-8 py-4 bg-background/80 backdrop-blur-md border-b border-border/50"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="flex items-center gap-12 font-sans">
          {/* Logo */}
          <Link href="/" className="flex items-center font-sans font-bold text-xl tracking-tight text-foreground">
            <span className='text-primary'>Medi</span>
            <span className='text-teal-600'>Chain</span>
          </Link>
        </div>

        {/* Center Tabs - Hidden on mobile */}
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 gap-8">
          <div className="relative flex gap-10">
            <button
              onClick={() => onSelectRole?.("patient")}
              className={cn(
                "text-sm font-semibold transition-all duration-300 pb-2 cursor-pointer",
                activeTab === "patient"
                  ? "text-primary "
                  : "text-muted-foreground hover:text-teal-600/80"
              )}
            >
              For Patients
            </button>
            <button
              onClick={() => onSelectRole?.("hospital")}
              className={cn(
                "text-sm font-semibold transition-all duration-300 pb-2 cursor-pointer",
                activeTab === "hospital"
                  ? "text-teal-600"
                  : "text-muted-foreground hover:text-primary/80"
              )}
            >
              For Hospitals
            </button>
            
            {/* Sliding underline */}
            <div 
              className={cn(
                "absolute bottom-0 h-0.5 rounded-full transition-all duration-300 ease-out",
                activeTab === "patient" 
                  ? "left-[15px] w-[50px] bg-primary" 
                  : "left-[130px] w-[50px] bg-teal-600"
              )}
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          {/* Get Started - Hidden on mobile */}
          <motion.div
            className="hidden md:block"
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

          {/* Hamburger Menu */}
                   {/* Hamburger Menu */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted/50 transition-colors relative w-10 h-10 flex items-center justify-center"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <div className="relative w-5 h-4 flex flex-col justify-between">
              <span
                className={cn(
                  "absolute top-0 left-0 h-0.5 w-5 bg-foreground rounded-full transition-all duration-300 ease-out origin-center",
                  mobileMenuOpen ? "rotate-45 top-1/2 -translate-y-1/2" : ""
                )}
              />
              <span
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 left-0 h-0.5 w-5 bg-foreground rounded-full transition-all duration-300 ease-out",
                  mobileMenuOpen ? "opacity-0 scale-0" : "opacity-100 scale-100"
                )}
              />
              <span
                className={cn(
                  "absolute bottom-0 left-0 h-0.5 w-5 bg-foreground rounded-full transition-all duration-300 ease-out origin-center",
                  mobileMenuOpen ? "-rotate-45 top-1/2 -translate-y-1/2" : ""
                )}
              />
            </div>
          </button>
        </div>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-[65px] z-40 md:hidden bg-background/95 backdrop-blur-lg border-b border-border/50 shadow-lg"
          >
            <div className="flex flex-col p-4 gap-2">
              {/* Role Tabs */}
              <button
                onClick={() => {
                  onSelectRole?.("patient")
                  setMobileMenuOpen(false)
                }}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-lg font-medium transition-all",
                  activeTab === "patient"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                For Patients
              </button>
              <button
                onClick={() => {
                  onSelectRole?.("hospital")
                  setMobileMenuOpen(false)
                }}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-lg font-medium transition-all",
                  activeTab === "hospital"
                    ? "bg-teal-500/10 text-teal-600"
                    : "text-muted-foreground hover:text-foreground hover:text-teal-600"
                )}
              >
                For Hospitals
              </button>
              
              {/* Divider */}
              <div className="h-px bg-border my-2" />
              
              {/* Get Started Button */}
              <Link href="/auth" onClick={() => setMobileMenuOpen(false)}>
                <Button 
                  className={`w-full font-semibold transition-all duration-300 ${
                    isHospital 
                      ? "bg-gradient-to-r from-teal-600 to-teal-500" 
                      : "bg-gradient-to-r from-primary to-[#0077C0]"
                  }`}
                >
                  Get Started
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}