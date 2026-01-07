// components/footer.tsx
"use client"

import Link from "next/link"
import { Github, Linkedin, Twitter, LucideIcon, Mail, MapPin, Shield, Heart, Lock, Zap } from "lucide-react"
import { NetworkLisk } from "@web3icons/react"

interface FooterProps {
  activeTab?: "patient" | "hospital"
}

const socialIcons: { icon: LucideIcon; href: string; label: string }[] = [
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Github, href: "https://github.com", label: "GitHub" },
]

const footerLinks = {
  product: [
    { label: "Features", href: "#features" },
    { label: "Security", href: "#security" },
    { label: "Roadmap", href: "#roadmap" },
    { label: "Pricing", href: "#pricing" },
  ],
  resources: [
    { label: "Documentation", href: "#docs" },
    { label: "API Reference", href: "#api" },
    { label: "Guides", href: "#guides" },
    { label: "Support", href: "#support" },
  ],
  company: [
    { label: "About Us", href: "#about" },
    { label: "Careers", href: "#careers" },
    { label: "Blog", href: "#blog" },
    { label: "Contact", href: "#contact" },
  ],
  legal: [
    { label: "Privacy Policy", href: "#privacy" },
    { label: "Terms of Service", href: "#terms" },
    { label: "HIPAA Compliance", href: "#hipaa" },
  ],
}

export function Footer({ activeTab = "patient" }: FooterProps) {
  const isHospital = activeTab === "hospital"
  const primaryColor = isHospital ? "teal" : "blue"
  
  return (
    <footer className="relative overflow-hidden">
      {/* Fluid Background Text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <h1 
          className={`text-[20vw] font-black uppercase tracking-tighter opacity-[0.03] select-none whitespace-nowrap ${
            isHospital ? "text-teal-500" : "text-blue-500"
          }`}
          style={{ 
            background: isHospital 
              ? "linear-gradient(135deg, #14b8a6 0%, #0d9488 50%, #0f766e 100%)"
              : "linear-gradient(135deg, #3b82f6 0%, #0077C0 50%, #1d4ed8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            opacity: 0.04
          }}
        >
          MEDICHAIN
        </h1>
      </div>

      {/* Main Footer Content */}
      <div className="relative border-t border-border/50 bg-gradient-to-b from-background to-muted/20">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 lg:gap-8">
            
            {/* Brand Section */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isHospital 
                    ? "bg-gradient-to-br from-teal-500 to-teal-600" 
                    : "bg-gradient-to-br from-blue-500 to-blue-600"
                }`}>
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className={`font-bold text-2xl bg-clip-text text-transparent ${
                  isHospital
                    ? "bg-gradient-to-r from-teal-600 to-teal-400"
                    : "bg-gradient-to-r from-blue-600 to-blue-400"
                }`}>
                  MediChain
                </span>
              </div>
              
              <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
                Revolutionizing healthcare data management with blockchain technology. 
                Secure, transparent, and patient-centric medical records for the future of healthcare.
              </p>

              {/* Key Features */}
              <div className="flex flex-wrap gap-3">
                {[
                  { icon: Lock, label: "Encrypted" },
                  { icon: Zap, label: "Gasless" },
                  { icon: Heart, label: "Patient-First" },
                ].map(({ icon: Icon, label }) => (
                  <div 
                    key={label}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                      isHospital 
                        ? "bg-teal-500/10 text-teal-600" 
                        : "bg-blue-500/10 text-blue-600"
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {label}
                  </div>
                ))}
              </div>

              {/* Contact Info */}
              <div className="space-y-3 pt-2">
                <a href="mailto:hello@medichain.io" className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <Mail className="w-4 h-4" />
                  hello@medichain.io
                </a>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  Jakarta, Indonesia
                </div>
              </div>
            </div>

            {/* Product Links */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Product</h4>
              <ul className="space-y-3">
                {footerLinks.product.map(({ label, href }) => (
                  <li key={label}>
                    <Link 
                      href={href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources Links */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Resources</h4>
              <ul className="space-y-3">
                {footerLinks.resources.map(({ label, href }) => (
                  <li key={label}>
                    <Link 
                      href={href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company Links */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Company</h4>
              <ul className="space-y-3">
                {footerLinks.company.map(({ label, href }) => (
                  <li key={label}>
                    <Link 
                      href={href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal Links */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Legal</h4>
              <ul className="space-y-3">
                {footerLinks.legal.map(({ label, href }) => (
                  <li key={label}>
                    <Link 
                      href={href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border/50">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Copyright */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>© {new Date().getFullYear()} MediChain.</span>
                <span className="hidden sm:inline">All rights reserved.</span>
                <span className="hidden md:inline">•</span>
                <span className="hidden md:inline items-center gap-1.5 flex">
                  <span>Built on</span>
                  <NetworkLisk size={16} />
                  <span>Lisk Blockchain</span>
                </span>
              </div>

              {/* Social Icons */}
              <div className="flex items-center gap-2">
                {socialIcons.map(({ icon: Icon, href, label }, index) => (
                  <Link
                    key={index}
                    href={href}
                    aria-label={label}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground transition-all ${
                      isHospital 
                        ? "hover:bg-teal-500/10 hover:text-teal-600" 
                        : "hover:bg-blue-500/10 hover:text-blue-600"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Large Fluid Text at Very Bottom */}
      <div className={`relative py-8 overflow-hidden ${
        isHospital 
          ? "bg-gradient-to-r from-teal-600 via-teal-500 to-teal-600" 
          : "bg-gradient-to-r from-blue-600 via-[#0077C0] to-blue-600"
      }`}>
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative flex items-center justify-center">
          <h2 className="text-4xl md:text-6xl lg:text-8xl font-black text-white/90 tracking-tight">
            MEDICHAIN
          </h2>
        </div>
        <p className="text-center text-white/60 text-sm mt-2">
          The Future of Healthcare Data
        </p>
      </div>
    </footer>
  )
}