import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Star } from "lucide-react"

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Engineering Lead",
    company: "TechFlow",
    avatar: "SC",
    quote:
      "mfx transformed how we onboard teams to Module Federation. What used to take a full day of config is now a single npx mfx init. We went from 45-minute deploys to independent releases in under 3 minutes.",
    rating: 5,
  },
  {
    name: "Marcus Rodriguez",
    role: "Principal Engineer",
    company: "ScaleUp.io",
    avatar: "MR",
    quote:
      "The mfx gui studio is a game-changer for our design system team. They configure federation visually without touching vite.config.ts. Our bundle sizes dropped by 40% with proper shared deps.",
    rating: 5,
  },
  {
    name: "Aisha Patel",
    role: "Frontend Architect",
    company: "DataViz Corp",
    avatar: "AP",
    quote:
      "We configured 12 micro-frontends in a single afternoon using mfx workspace apply. The batch mode plus mfa.workspace.json made our monorepo migration painless. Incredible developer experience.",
    rating: 5,
  },
  {
    name: "Erik Johansson",
    role: "CTO",
    company: "NordStack",
    avatar: "EJ",
    quote:
      "We evaluated multiple micro-frontend solutions. mfx with Vite was the clear winner — the doctor command catches misconfigurations before CI, and the config-file approach means our setup is versioned and reproducible.",
    rating: 5,
  },
]

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="bg-muted/30 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-4">Testimonials</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Loved by developers
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Hear from teams who ship micro-frontends with mfx.
          </p>
        </div>

        {/* Testimonial grid */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          {testimonials.map((testimonial) => (
            <Card
              key={testimonial.name}
              className="transition-all duration-300 hover:shadow-md"
            >
              <CardContent className="pt-6">
                {/* Stars */}
                <div className="mb-4 flex gap-1">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star
                      key={`star-${testimonial.name}-${i}`}
                      className="size-4 fill-primary text-primary"
                    />
                  ))}
                </div>

                {/* Quote */}
                <blockquote className="mb-6 text-sm leading-relaxed text-foreground/90">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{testimonial.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {testimonial.role} at {testimonial.company}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

export default TestimonialsSection
