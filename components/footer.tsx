// components/footer.tsx
"use client"

import Link from "next/link"
import { Heart, Shield, ExternalLink } from "lucide-react"
import { SiGithub, SiX } from "@icons-pack/react-simple-icons"
import { NetworkLisk } from "@web3icons/react"

interface FooterProps {
  activeTab?: "patient" | "hospital"
}

const socialLinks = [
  { icon: SiX, href: "https://twitter.com", label: "X (Twitter)" },
  { icon: SiGithub, href: "https://github.com", label: "GitHub" },
]

const footerLinks = {
  product: [
    { label: "Features", href: "#features" },
    { label: "How it Works", href: "#how-it-works" },
    { label: "Tech Stack", href: "#tech-stack" },
  ],
  resources: [
    { label: "Documentation", href: "#" },
    { label: "API Reference", href: "#" },
    { label: "Smart Contracts", href: "#" },
  ],
  legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Cookie Policy", href: "#" },
  ],
}

export function Footer({ activeTab = "patient" }: FooterProps) {
  const isHospital = activeTab === "hospital"
  const gradientClass = isHospital
    ? "from-teal-600 to-teal-500"
    : "from-primary to-[#0077C0]"
  const accentColor = isHospital ? "text-teal-600" : "text-primary"
  const hoverColor = isHospital ? "hover:text-teal-600" : "hover:text-primary"
  
  return (
    <footer className="relative border-t border-border/50 bg-gradient-to-b from-background to-secondary/20">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradientClass} flex items-center justify-center`}>
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className={`font-bold text-2xl bg-clip-text text-transparent bg-gradient-to-r ${gradientClass}`}>
                MediChain
              </span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-sm">
              Decentralized healthcare records platform powered by blockchain technology. 
              Your health data, your control, secured forever.
            </p>
            
            {/* Powered by Lisk */}
            <div className="flex items-center gap-2 px-4 py-2 bg-card/50 rounded-xl border border-border/50 w-fit">
              <span className="text-xs text-muted-foreground">Powered by</span>
              <NetworkLisk variant="branded" size={20} />
              <span className="text-sm font-medium text-foreground">Lisk</span>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Product</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link 
                    href={link.href}
                    className={`text-sm text-muted-foreground ${hoverColor} transition-colors`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Resources</h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <Link 
                    href={link.href}
                    className={`text-sm text-muted-foreground ${hoverColor} transition-colors inline-flex items-center gap-1`}
                  >
                    {link.label}
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link 
                    href={link.href}
                    className={`text-sm text-muted-foreground ${hoverColor} transition-colors`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="my-12 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Copyright */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>© {new Date().getFullYear()} MediChain.</span>
            <span className="hidden sm:inline">All rights reserved.</span>
            <span className="hidden sm:inline-flex items-center gap-1">
              Made with <Heart className={`w-3 h-3 ${accentColor} fill-current`} /> for healthcare
            </span>
          </div>

          {/* Social Icons */}
          <div className="flex items-center gap-2">
            {socialLinks.map(({ icon: Icon, href, label }) => (
              <Link
                key={label}
                href={href}
                aria-label={label}
                className={`w-10 h-10 rounded-xl bg-card/50 border border-border/50 flex items-center justify-center text-muted-foreground ${hoverColor} hover:bg-card hover:border-border transition-all`}
              >
                <Icon className="w-4 h-4" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Fluid Background Text */}
      <div className="relative overflow-hidden py-6 bg-gradient-to-t from-secondary/30 to-transparent">
        <div className="flex justify-center">
          <span 
            className={`text-[6rem] md:text-[10rem] lg:text-[14rem] font-black tracking-tighter select-none ${
              isHospital ? "text-teal-500" : "text-primary"
            }`}
            style={{ opacity: 0.08 }}
          >
            MEDICHAIN
          </span>
        </div>
      </div>
    </footer>
  )
}
