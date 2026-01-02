// components/tech-stack.tsx
"use client"

import { motion } from "framer-motion"
import { SiNextdotjs, SiIpfs, SiThirdweb } from "react-icons/si"
import { RiNftFill } from "react-icons/ri"
import { GiPinata } from "react-icons/gi"

const techStacks = [
  { name: "Next.js", description: "High-performance React framework for scalable web applications", icon: SiNextdotjs },
  { name: "Thirdweb", description: "Web3 SDK for Wallets & Smart Contracts", icon: SiThirdweb },
  { name: "Lisk Sepolia", description: "Layer 2 network for scalable transactions", icon: RiNftFill },
  { name: "Pinata IPFS", description: "Secure decentralized storage ensuring immutable data availability", icon: GiPinata },
]

interface TechStackProps {
  activeTab: "patient" | "hospital"
}

export function TechStack({ activeTab }: TechStackProps) {
  const isPatient = activeTab === "patient"
  
  return (
    <section className="py-20 px-4 md:px-12 lg:px-20 bg-gradient-to-b from-background to-secondary/10 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-12 lg:gap-20">
          
          {/* Left Side - Text Content */}
          <motion.div 
            className="flex-1 lg:max-w-md text-center lg:text-left"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            {/* Badge */}
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-4 ${
              isPatient 
                ? "bg-primary/10 text-primary"
                : "bg-teal-500/10 text-teal-600"
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              Technology
            </div>
           
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
              <span className="text-foreground">Application </span>
              <span className={`bg-clip-text text-transparent ${
                isPatient 
                  ? "bg-gradient-to-r from-primary to-[#0077C0]"    
                  : "bg-gradient-to-r from-teal-600 to-teal-500"
              }`}>
                <br />Tech Stack
              </span>
            </h2>
            
            <p className="text-muted-foreground text-sm md:text-base mb-6">
              Powered by cutting-edge blockchain and web technologies for maximum security and performance.
            </p>
            
            {/* Decorative element */}
            <div className={`hidden lg:block w-16 h-1 rounded-full ${
              isPatient 
                ? "bg-gradient-to-r from-primary to-[#0077C0]" 
                : "bg-gradient-to-r from-teal-600 to-teal-500"
            }`} />
          </motion.div>

          <div className="flex-1 relative lg:pl-12">
            {/* Main vertical line (trunk) */}
            <div className={`hidden lg:block absolute left-0 top-4 bottom-4 w-0.5 rounded-full ${
              isPatient 
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
                  {/* Horizontal branch line */}
                  <div className={`hidden lg:block absolute -left-12 top-1/2 w-12 h-0.5 ${
                    isPatient 
                      ? "bg-gradient-to-r from-primary/60 to-primary/30" 
                      : "bg-gradient-to-r from-teal-600/60 to-teal-500/30"
                  }`} />
                  
                  {/* Branch node */}
                  <div className={`hidden lg:block absolute -left-12 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-background shadow-sm ${
                    isPatient ? "bg-primary" : "bg-teal-600"
                  }`} />

                  {/* Card */}
                  <div className={`relative p-4 bg-card/50 rounded-2xl transition-all duration-300 hover:shadow-lg ${
                    isPatient 
                      ? "hover:shadow-primary/10" 
                      : "hover:shadow-teal-500/10"
                  }`}>
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl ${
                      isPatient 
                        ? "bg-gradient-to-br from-primary/5 to-transparent" 
                        : "bg-gradient-to-br from-teal-500/5 to-transparent"
                    }`} />
                    
                    <div className="relative flex items-center gap-4">
                      {/* Icon */}
                      <div className={`p-2.5 flex-shrink-0 rounded-xl ${
                        isPatient ? "bg-primary/10" : "bg-teal-500/10"
                      }`}>
                        <tech.icon className={`w-8 h-8 ${
                          isPatient ? "text-primary" : "text-teal-600"
                        }`} />
                      </div>
                      
                      {/* Text */}
                      <div>
                        <h3 className={`font-bold text-foreground transition-colors ${
                          isPatient ? "group-hover:text-primary" : "group-hover:text-teal-600"
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