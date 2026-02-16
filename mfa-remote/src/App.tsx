import { HeroSection } from "./sections/Hero"
import { FeaturesSection } from "./sections/Features"
import { PricingSection } from "./sections/Pricing"
import { TestimonialsSection } from "./sections/Testimonials"
import { CTASection } from "./sections/CTA"
import { FooterSection } from "./sections/Footer"

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <TestimonialsSection />
      <CTASection />
      <FooterSection />
    </div>
  )
}

export default App
