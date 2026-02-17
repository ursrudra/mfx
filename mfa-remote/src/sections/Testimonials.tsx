import { Badge } from "@/components/ui/badge"
import { InfiniteMovingCards } from "@/components/ui/infinite-moving-cards"

const testimonials = [
  {
    name: "Sarah Chen",
    title: "Engineering Lead at TechFlow",
    quote:
      "mfx transformed how we onboard teams to Module Federation. What used to take a full day of config is now a single npx mfx init. We went from 45-minute deploys to independent releases in under 3 minutes.",
  },
  {
    name: "Marcus Rodriguez",
    title: "Principal Engineer at ScaleUp.io",
    quote:
      "The mfx gui studio is a game-changer for our design system team. They configure federation visually without touching vite.config.ts. Our bundle sizes dropped by 40% with proper shared deps.",
  },
  {
    name: "Aisha Patel",
    title: "Frontend Architect at DataViz Corp",
    quote:
      "We configured 12 micro-frontends in a single afternoon using mfx workspace apply. The batch mode plus mfa.workspace.json made our monorepo migration painless. Incredible developer experience.",
  },
  {
    name: "Erik Johansson",
    title: "CTO at NordStack",
    quote:
      "We evaluated multiple micro-frontend solutions. mfx with Vite was the clear winner — the doctor command catches misconfigurations before CI, and the config-file approach means our setup is versioned and reproducible.",
  },
  {
    name: "Priya Sharma",
    title: "Staff Engineer at Finova",
    quote:
      "Migrating 8 React apps to Module Federation seemed daunting. With mfx workspace apply, we had everything wired in a single afternoon. The zero lock-in philosophy sealed the deal for us.",
  },
  {
    name: "James O'Brien",
    title: "DevOps Lead at CloudScale",
    quote:
      "mfx doctor saved our last release — caught a port conflict and shared-dep mismatch before anything hit staging. It's part of our CI pipeline now.",
  },
]

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <Badge variant="outline" className="mb-4">Testimonials</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Loved by developers
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Hear from teams who ship micro-frontends with mfx.
          </p>
        </div>

        {/* Row 1 — scrolls left */}
        <InfiniteMovingCards
          items={testimonials.slice(0, 3)}
          direction="left"
          speed="slow"
          className="mb-6"
        />

        {/* Row 2 — scrolls right */}
        <InfiniteMovingCards
          items={testimonials.slice(3)}
          direction="right"
          speed="slow"
        />
      </div>
    </section>
  )
}

export default TestimonialsSection
