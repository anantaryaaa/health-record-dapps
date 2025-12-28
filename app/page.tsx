"use client"

import { useState } from "react"
import { LandingSection } from "@/components/landing-section"
import { Navbar } from "@/components/navbar"

export default function Home() {
  const [activeTab, setActiveTab] = useState<"patient" | "hospital">("patient")

  return (
    <div className="relative min-h-screen ">
      <Navbar activeTab={activeTab} />
      <LandingSection activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  )
}