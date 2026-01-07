"use client"

import { useState } from "react"
import { LandingSection } from "@/components/landing-section"
import { Navbar } from "@/components/navbar"
import { UserFlow } from "@/components/user-flow"
import { MVPShowcase } from "@/components/mvp-showcase"
import { TechStack } from "@/components/tech-stack"
import { Footer } from "@/components/footer"

export default function Home() {
  const [activeTab, setActiveTab] = useState<"patient" | "hospital">("patient")

  return (
    <div className="relative min-h-screen ">
      <Navbar activeTab={activeTab} onSelectRole={setActiveTab} />
      <LandingSection activeTab={activeTab} setActiveTab={setActiveTab} />
      <MVPShowcase activeTab={activeTab} />
      <UserFlow activeTab={activeTab} />
      <TechStack activeTab={activeTab} />
      <Footer activeTab={activeTab} />
    </div>
  )
}