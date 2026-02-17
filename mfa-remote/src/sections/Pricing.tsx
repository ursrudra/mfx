import { Badge } from "@/components/ui/badge"
import { MovingBorder } from "@/components/ui/moving-border"
import { motion } from "motion/react"
import { Cog, Rocket, Terminal } from "lucide-react"

const steps = [
  {
    step: 1,
    icon: Terminal,
    title: "Install",
    description: "One command scaffolds Module Federation into any Vite + React project.",
    code: "npx mfx init",
  },
  {
    step: 2,
    icon: Cog,
    title: "Configure",
    description:
      "Answer a few prompts — role, name, port, shared deps — or drop in an mfa.config.json for zero-prompt setup.",
    code: "? Role:  remote\n? Name:  my-app\n? Port:  5001",
  },
  {
    step: 3,
    icon: Rocket,
    title: "Ship",
    description:
      "Start your dev server. Module Federation is live — share components across apps at runtime.",
    code: "npm run dev",
  },
]

export function PricingSection() {
  return (
    <section id="quickstart" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-4">Quickstart</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Get up and running in 60 seconds
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Three steps from zero to a fully federated micro-frontend. No manual config required.
          </p>
        </div>

        {/* Step cards with MovingBorder and staggered entrance */}
        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {steps.map((s, idx) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: idx * 0.15 }}
            >
              <MovingBorder
                as="div"
                duration={4000 + idx * 500}
                borderRadius="0.75rem"
                containerClassName="h-full w-full"
                className="flex h-full w-full flex-col p-0"
              >
                <div className="relative flex h-full flex-col p-6">
                  {/* Step number accent */}
                  <div className="absolute -right-1 -top-1 flex size-14 items-center justify-center rounded-full bg-primary/5 text-2xl font-bold text-primary/20">
                    {s.step}
                  </div>

                  <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <s.icon className="size-5" />
                  </div>
                  <h3 className="mb-1 text-xl font-semibold">
                    <span className="mr-2 text-sm font-normal text-muted-foreground">
                      Step {s.step}
                    </span>
                    {s.title}
                  </h3>

                  <p className="mb-4 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {s.description}
                  </p>
                  <pre className="overflow-x-auto rounded-lg bg-foreground p-4 font-mono text-xs leading-relaxed text-background">
                    {s.code}
                  </pre>
                </div>
              </MovingBorder>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default PricingSection
