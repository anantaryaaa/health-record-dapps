"use client"

import { Button } from "@/components/ui/button"
import { Shield, Zap, Database } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import LiquidEther from "./LiquidEther"
import { InteractiveHoverButton } from "./ui/interactive-hover-button"

export function LandingHero() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.5
      }
    },
  }

  return (
    <motion.div 
      className="relative min-h-screen flex flex-col justify-center px-4 md:px-12 py-12"
     
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <LiquidEther className="absolute inset-0 z-0" colors={['#f1f1f3', '#1d1b1d', "#f5f5f5"]} />
      <div className="max-w-3xl mx-auto w-full flex flex-col items-center justify-center text-center z-10 relative">
        {/* Logo */}
        <motion.div variants={itemVariants} className="mb-8">
            
              
          </motion.div>

          {/* Hero text */}
          <motion.h1
            variants={itemVariants}
            className="text-4xl md:text-6xl font-bold mb-6 tracking-tight leading-tight"
          >
            Secure Healthcare
           <br />
            <span className="text-muted-foreground">On The Chain</span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto"
          >
            Empowering hospitals with decentralized patient data management. 
            Secure, transparent, and always accessible.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-3 justify-center mb-16 w-full"
          >
            <Link href="/dashboard">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto"
              >
                <InteractiveHoverButton className="relative overflow-hidden w-full sm:w-auto rounded-md">
                  
                  Connect Hospital Node
                </InteractiveHoverButton>
              </motion.div>
            </Link>
            <motion.div
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
               className="w-full sm:w-auto"
            >
              
            </motion.div>
          </motion.div>
      </div>
    </motion.div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
  delay
}: {
  icon: React.ReactNode
  title: string
  description: string
  delay: number
}) {
  return (
    
    <motion.div 
      className="p-6 rounded-lg border bg-card text-left hover:bg-accent transition-colors"
      whileHover={{ 
        scale: 1.03,
        y: -5,
        transition: { duration: 0.2 }
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 + delay, duration: 0.5 }}
    >
      <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-medium mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </motion.div>
  )
}