"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { User, Building2 } from "lucide-react"

export function MVPShowcase() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut" as const
      }
    },
  }

  const features = [
    {
      title: "Patient Dashboard",
      description: "Full access to your personal medical records with blockchain security. View visit history, active prescriptions, and allergy status in one unified view.",
      image: "/mvp-patient-dashboard.png",
      highlights: [
        "QR Code for instant identity verification",
        "Encrypted data — only you hold the keys",
        "Real-time medical activity tracking",
      ],
      gradient: "from-blue-500/20 to-primary/20",
      badge: "For Patients",
      icon: User
    },
    {
      title: "Hospital Portal",
      description: "Manage patient queues efficiently. Scan QR codes for instant medical record access, eliminating time-consuming manual processes.",
      image: "/mvp-hospital-portal.png",
      highlights: [
        "Real-time patient queue management",
        "Automatic identity verification",
        "Access medical data with patient consent",
      ],
      gradient: "from-primary/20 to-blue-400/20",
      badge: "For Hospitals",
      icon: Building2
    }
  ]

  return (
    <section className="relative py-24 px-4 md:px-12 lg:px-20 bg-gradient-to-b from-background to-secondary/10 overflow-hidden">
      {/* Background decorative */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-40 -left-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-40 -right-20 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl" />
      </div>

      <motion.div 
        className="max-w-7xl mx-auto relative z-10"
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
      >
        {/* Section Header */}
        <motion.div variants={itemVariants} className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            One Platform, Two{" "}
            <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
              Integrated Solutions
            </span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            MediChain connects patients and hospitals in a secure and transparent healthcare ecosystem.
          </p>
        </motion.div>

        {/* Feature Cards */}
        <div className="space-y-20">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-12`}
            >
              {/* Image */}
              <div className="flex-1 relative group">
                <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} rounded-3xl blur-2xl opacity-50 group-hover:opacity-70 transition-opacity duration-500`} />
                <motion.div 
                  className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-white/5 backdrop-blur-sm"
                  whileHover={{ y: -5, scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                >
                  <Image
                    src={feature.image}
                    alt={feature.title}
                    width={600}
                    height={400}
                    className="w-full h-auto object-cover"
                  />
                </motion.div>
              </div>

              {/* Content */}
              <div className="flex-1 space-y-6">
                <span className="inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary rounded-full">
                  <feature.icon className="w-3.5 h-3.5" />
                  {feature.badge}
                </span>
                <h3 className="text-2xl md:text-3xl font-bold">{feature.title}</h3>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  {feature.description}
                </p>
                
                {/* Highlights - Simple list */}
                <ul className="space-y-2 pt-4">
                  {feature.highlights.map((highlight, i) => (
                    <motion.li 
                      key={i}
                      className="flex items-center gap-3 text-foreground"
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      viewport={{ once: true }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      {highlight}
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}