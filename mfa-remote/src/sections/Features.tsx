import { Badge } from "@/components/ui/badge"
import { GlowingEffect } from "@/components/ui/glowing-effect"
import { motion } from "motion/react"
import {
  FileJson2,
  Globe,
  LayoutDashboard,
  Stethoscope,
  Terminal,
  Unlock,
} from "lucide-react"

const features = [
  {
    icon: Terminal,
    title: "Interactive CLI Wizard",
    description:
      "Run mfx init and answer a few prompts — role, federation name, port, shared deps. Your Vite config is generated and ready to go, no manual wiring required.",
  },
  {
    icon: LayoutDashboard,
    title: "Web GUI Studio",
    description:
      "Prefer a visual approach? Run mfx gui to launch Module Federation Studio — a browser-based configurator for everything the CLI can do, with live preview.",
  },
  {
    icon: Globe,
    title: "Workspace Batch Mode",
    description:
      "Managing a monorepo? Define all your apps in mfa.workspace.json and run mfx workspace apply to configure every micro-frontend in a single pass.",
  },
  {
    icon: Stethoscope,
    title: "Doctor Diagnostics",
    description:
      "Run mfx doctor to validate your config, check port availability, verify dependencies, and catch misconfigurations before they reach production.",
  },
  {
    icon: FileJson2,
    title: "Config File Driven",
    description:
      "Define your setup in mfa.config.json with full JSON Schema support. Get IDE autocompletion, validation, and share config across your team.",
  },
  {
    icon: Unlock,
    title: "Zero Lock-in",
    description:
      "mfx generates standard Vite config with @module-federation/vite. No runtime dependency on the CLI — eject at any time and keep your setup.",
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-4">Features</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to federate
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            A complete toolkit for setting up, managing, and diagnosing Module Federation
            in Vite + React projects.
          </p>
        </div>

        {/* Hover-glow feature grid */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, idx) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
            >
              <GlowingEffect borderRadius="0.75rem">
                <div className="group h-full rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                  <div className="mb-4 flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                    <feature.icon className="size-5" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                  <p className="leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </GlowingEffect>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FeaturesSection
