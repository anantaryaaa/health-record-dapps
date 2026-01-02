// components/footer.tsx
"use client"

import Link from "next/link"
import { Github, Linkedin, Twitter, LucideIcon } from "lucide-react"

interface FooterProps {
  activeTab?: "patient" | "hospital"
}

const socialIcons: { icon: LucideIcon; href: string }[] = [
  { icon: Twitter, href: "#" },
  { icon: Linkedin, href: "#" },
  { icon: Github, href: "#" },
]

export function Footer({ activeTab = "patient" }: FooterProps) {
  const isHospital = activeTab === "hospital"
  
  return (
    <footer className="border-t border-border/50 bg-background/50">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & Copyright */}
          <div className="flex items-center gap-3">
            <span className={`font-bold text-lg bg-clip-text text-transparent ${
              isHospital
                ? "bg-gradient-to-r from-teal-600 to-teal-500"
                : "bg-gradient-to-r from-primary to-[#0077C0]"
            }`}>
              MediChain
            </span>
            <span className="text-muted-foreground text-sm">
              © {new Date().getFullYear()}. All Right Reserved.
            </span>
            
          </div>

          {/* Social Icons */}
          <div className="flex items-center gap-4">
            {socialIcons.map(({ icon: Icon, href }, index) => (
              <Link
                key={index}
                href={href}
                className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
              >
                <Icon className="w-4 h-4" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}