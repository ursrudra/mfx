import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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

        {/* Step cards */}
        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {steps.map((s) => (
            <Card key={s.step} className="relative flex flex-col overflow-hidden">
              {/* Step number accent */}
              <div className="absolute -right-3 -top-3 flex size-14 items-center justify-center rounded-full bg-primary/5 text-2xl font-bold text-primary/20">
                {s.step}
              </div>

              <CardHeader>
                <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <s.icon className="size-5" />
                </div>
                <CardTitle className="text-xl">
                  <span className="mr-2 text-sm font-normal text-muted-foreground">
                    Step {s.step}
                  </span>
                  {s.title}
                </CardTitle>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col">
                <p className="mb-4 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {s.description}
                </p>
                <pre className="overflow-x-auto rounded-lg bg-foreground p-4 font-mono text-xs leading-relaxed text-background">
                  {s.code}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

export default PricingSection
