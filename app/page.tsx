import { LandingHero } from "@/components/landing-hero"
import { Navbar } from "@/components/navbar"
import { MVPShowcase } from "@/components/mvp-showcase"

export default function Home() {
  return (
    <div className="relative min-h-screen ">
      <Navbar />
      <LandingHero />
      <MVPShowcase />
    </div>
  )
}