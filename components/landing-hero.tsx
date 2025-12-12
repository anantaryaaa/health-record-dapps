"use client"

import { Button } from "@/components/ui/button"
import { Shield, Zap, Database } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { DotPattern } from "./ui/dot-pattern"
import { InteractiveHoverButton } from "./ui/interactive-hover-button"
import { cn } from "@/lib/utils"

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

  // Floating animation for image
  const floatingAnimation = {
    y: [0, -15, 0],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut" as const
    }
  }

  return (
    <motion.div 
      className="relative min-h-screen flex flex-col justify-center px-4 md:px-12 lg:px-20 py-20 bg-gradient-to-br from-background via-background to-secondary/20 overflow-hidden"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient Orbs */}
        <div className="absolute top-20 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 -right-32 w-96 h-96 bg-blue-400/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary/5 to-blue-300/10 rounded-full blur-3xl" />
      </div>

      <DotPattern
        className={cn(
          "[mask-image:radial-gradient(800px_circle_at_center,white,transparent)]",
          "opacity-60"
        )}
      />
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto w-full flex flex-col lg:flex-row items-center justify-between gap-16 z-10 relative">
        
        {/* Left Column - Text Content */}
        <div className="flex-1 flex flex-col items-start text-left max-w-2xl">
         
         
          {/* Hero text */}
          <motion.h1
            variants={itemVariants}
            className="text-4xl md:text-5xl lg:text-6xl font-bold font-sans mb-6 tracking-tight leading-[1.1] text-foreground"
          >
            Secure Health Data
            <br />
            <span className="bg-gradient-to-r from-primary via-blue-500 to-primary bg-clip-text text-transparent">
              On The Chain
            </span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-lg md:text-xl text-muted-foreground font-sans mb-10 max-w-xl leading-relaxed"
          >
            Empowering hospitals with decentralized patient data management. 
            <span className="text-foreground font-medium"> Secure, transparent,</span> and always accessible.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center gap-8"
          >
            <Link href="/dashboard">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <InteractiveHoverButton className="rounded-md font-sans">
                  Connect Hospital Node
                </InteractiveHoverButton>
              </motion.div>
            </Link>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button variant="outline" size="lg" className="font-semibold px-6 h-12 text-base border hover:bg-secondary/50 transition-all duration-300 rounded-sm">
                Learn More
              </Button>
            </motion.div>
          </motion.div>

          
         
        </div>

        {/* Right Column - Image with Glassmorphism */}
        <motion.div 
          variants={itemVariants}
          className="flex-1 flex items-center justify-center relative"
        >
          {/* Glow effect behind image */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-blue-400/20 to-primary/20 rounded-3xl blur-2xl scale-90" />
          
          {/* Glassmorphism container */}
          <motion.div
            animate={floatingAnimation}
            className="relative p-4 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl"
          >
            <Image
              src="/landing-page-photo.png"
              alt="MediChain Healthcare Illustration"
              width={550}
              height={550}
              className="object-contain max-w-full h-auto rounded-2xl"
              priority
            />
          </motion.div>

          {/* Decorative floating elements */}
          <motion.div 
            className="absolute -top-4 -right-4 p-3 rounded-xl bg-white shadow-lg border border-border/50"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          >
            <Shield className="w-6 h-6 text-primary" />
          </motion.div>
          <motion.div 
            className="absolute -bottom-4 -left-4 p-3 rounded-xl bg-white shadow-lg border border-border/50"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          >
            <Database className="w-6 h-6 text-primary" />
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