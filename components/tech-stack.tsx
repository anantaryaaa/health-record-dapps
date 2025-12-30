// components/tech-stack.tsx
"use client"

import { motion } from "framer-motion"

import Image from "next/image"

const techStacks = [
  {
    name: "Next.js",
    description: "High-performance React framework for scalable web applications",
    icon: (
      <div className="relative w-10 h-10">
        <Image 
          src="/icons/nextjs.png" 
          alt="Next.js" 
          fill 
          className="object-contain"
        />
      </div>
    ),
  },
  {
    name: "Thirdweb",
    description: "Web3 SDK for Wallets & Smart Contracts",
    icon: (
      <div className="relative w-10 h-10">
        <Image 
          src="/icons/thirdweb.png" 
          alt="Thirdweb" 
          fill 
          className="object-contain"
        />
      </div>
    ),
  },
  {
    name: "Lisk Sepolia",
    description: "Layer 2 network for scalable transactions",
    icon: (
      <div className="relative w-10 h-10">
        <Image 
          src="/icons/lisk.png" 
          alt="Lisk" 
          fill 
          className="object-contain"
        />
      </div>
    ),
  },
  {
    name: "Pinata IPFS",
    description: "Secure decentralized storage ensuring immutable data availability",
    icon: (
      <div className="relative w-10 h-10">
        <Image 
          src="/icons/pinata.png" 
          alt="Pinata" 
          fill 
          className="object-contain"
        />
      </div>
    ),
  },
]

interface TechStackProps {
  activeTab: "patient" | "hospital"
}

export function TechStack({ activeTab }: TechStackProps) {
  return (
    <section className="py-20 px-4 md:px-12 lg:px-20 bg-gradient-to-b from-background to-secondary/10 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {/* Flex Container - Text Left, Tech Right */}
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-12 lg:gap-20">
          
          {/* Left Side - Text Content */}
          <motion.div 
            className="flex-1 lg:max-w-md text-center lg:text-left"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
           
            <h2 className="text-5xl md:text-6xl lg:text-8xl font-semibold tracking-tight mt-3 mb-6">
              <span className={`bg-clip-text text-transparent ${
                activeTab === "patient" 
                  ? "bg-gradient-to-r from-primary to-[#0077C0]"    
                  : "bg-gradient-to-r from-teal-600 to-teal-500"
              }`}>
                Our Tech Stack
              </span>
            </h2>
            
            {/* Decorative element */}
            <div className={`hidden lg:block w-16 h-1 rounded-full ${
              activeTab === "patient" 
                ? "bg-gradient-to-r from-primary to-[#0077C0]" 
                : "bg-gradient-to-r from-teal-600 to-teal-500"
            }`} />
          </motion.div>

          <div className="flex-1 relative lg:pl-12">
            {/* Main vertical line (trunk) - positioned on the left */}
            <div className={`hidden lg:block absolute left-0 top-4 bottom-4 w-0.5 rounded-full ${
              activeTab === "patient" 
                ? "bg-gradient-to-b from-primary via-primary/50 to-primary/20" 
                : "bg-gradient-to-b from-teal-600 via-teal-500/50 to-teal-500/20"
            }`} />
            
            {/* Tech Stack Vertical List */}
            <div className="flex flex-col gap-4">
              {techStacks.map((tech, index) => (
                <motion.div
                  key={tech.name}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="relative group"
                >
                  {/* Horizontal branch line connecting to trunk */}
                  <div className={`hidden lg:block absolute -left-12 top-1/2 w-12 h-0.5 ${
                    activeTab === "patient" 
                      ? "bg-gradient-to-r from-primary/60 to-primary/30" 
                      : "bg-gradient-to-r from-teal-600/60 to-teal-500/30"
                  }`} />
                  
                  {/* Branch node on trunk */}
                  <div className={`hidden lg:block absolute -left-12 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-background shadow-sm ${
                    activeTab === "patient" ? "bg-primary" : "bg-teal-600"
                  }`} />

                  {/* Card */}
                  <div className={`relative p-4 bg-card border border-border rounded-2xl transition-all duration-300 hover:shadow-lg ${
                    activeTab === "patient" 
                      ? "hover:border-primary/50 hover:shadow-primary/5" 
                      : "hover:border-teal-500/50 hover:shadow-teal-500/5"
                  }`}>
                    {/* Glow effect on hover */}
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl ${
                      activeTab === "patient" 
                        ? "bg-gradient-to-br from-primary/5 to-transparent" 
                        : "bg-gradient-to-br from-teal-500/5 to-transparent"
                    }`} />
                    
                    <div className="relative flex items-center gap-4">
                      {/* Icon */}
                      <div className={`p-2.5 flex-shrink-0 `}>
                        {tech.icon}
                      </div>
                      
                      {/* Text */}
                      <div>
                        <h3 className={`font-bold text-foreground transition-colors ${
                          activeTab === "patient" ? "group-hover:text-primary" : "group-hover:text-teal-600"
                        }`}>
                          {tech.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {tech.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}