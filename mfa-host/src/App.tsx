import * as React from "react"
import { useThemeStore } from "@/store/theme"
import { Navbar } from "@/components/Navbar"
import { Skeleton } from "@/components/ui/skeleton"

// ─── Lazy-load sections from mfa-remote (Module Federation) ─────────────────

const HeroSection = React.lazy(() =>
  import("mfa-remote/Hero").then((m) => ({ default: m.HeroSection ?? m.default })),
)

const FeaturesSection = React.lazy(() =>
  import("mfa-remote/Features").then((m) => ({ default: m.FeaturesSection ?? m.default })),
)

const PricingSection = React.lazy(() =>
  import("mfa-remote/Pricing").then((m) => ({ default: m.PricingSection ?? m.default })),
)

const TestimonialsSection = React.lazy(() =>
  import("mfa-remote/Testimonials").then((m) => ({
    default: m.TestimonialsSection ?? m.default,
  })),
)

const CTASection = React.lazy(() =>
  import("mfa-remote/CTA").then((m) => ({ default: m.CTASection ?? m.default })),
)

const FooterSection = React.lazy(() =>
  import("mfa-remote/Footer").then((m) => ({ default: m.FooterSection ?? m.default })),
)

// ─── Loading fallback ───────────────────────────────────────────────────────

function SectionLoader() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-6 py-16">
      <Skeleton className="mx-auto h-5 w-24 rounded-full" />
      <Skeleton className="mx-auto h-9 w-80" />
      <Skeleton className="mx-auto h-4 w-96" />
      <div className="flex justify-center gap-4 pt-4">
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
    </div>
  )
}

// ─── Error boundary for remote module failures ─────────────────────────────

class RemoteErrorBoundary extends React.Component<
  { name: string; children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { name: string; children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 bg-muted/30 text-center">
          <div className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
            Failed to load <strong>{this.props.name}</strong>
          </div>
          <p className="text-xs text-muted-foreground">
            Make sure <code>mfa-remote</code> is running on{" "}
            <code>http://localhost:5001</code>
          </p>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Remote section wrapper ─────────────────────────────────────────────────

function RemoteSection({
  name,
  children,
}: {
  name: string
  children: React.ReactNode
}) {
  return (
    <RemoteErrorBoundary name={name}>
      <React.Suspense fallback={<SectionLoader />}>{children}</React.Suspense>
    </RemoteErrorBoundary>
  )
}

// ─── App ────────────────────────────────────────────────────────────────────

function App() {
  const { theme } = useThemeStore()

  // Apply dark class to document for Tailwind dark mode
  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
  }, [theme])

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <Navbar />

      <main>
        <RemoteSection name="Hero">
          <HeroSection />
        </RemoteSection>

        <RemoteSection name="Features">
          <FeaturesSection />
        </RemoteSection>

        <RemoteSection name="Pricing">
          <PricingSection />
        </RemoteSection>

        <RemoteSection name="Testimonials">
          <TestimonialsSection />
        </RemoteSection>

        <RemoteSection name="CTA">
          <CTASection />
        </RemoteSection>

        <RemoteSection name="Footer">
          <FooterSection />
        </RemoteSection>
      </main>
    </div>
  )
}

export default App
