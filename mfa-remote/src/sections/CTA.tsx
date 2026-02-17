import * as React from "react"
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation"
import { SparklesCore } from "@/components/ui/sparkles"
import { MovingBorder } from "@/components/ui/moving-border"
import { Check, Copy, Github, Sparkles, Terminal } from "lucide-react"

export function CTASection() {
  const [copied, setCopied] = React.useState(false)
  const command = "npx mfx init"

  const handleCopy = () => {
    navigator.clipboard.writeText(command).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      {/* Animated gradient background */}
      <BackgroundGradientAnimation
        containerClassName="absolute inset-0 -z-10"
        gradientBackgroundStart="oklch(0.92 0.03 270)"
        gradientBackgroundEnd="oklch(0.96 0.015 40)"
        firstColor="59, 130, 246"
        secondColor="168, 85, 247"
        thirdColor="236, 72, 153"
        fourthColor="249, 115, 22"
        fifthColor="234, 179, 8"
        size="100%"
      />

      {/* Sparkle overlay */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <SparklesCore
          particleDensity={40}
          particleColor="oklch(0.65 0.22 41)"
          minSize={0.3}
          maxSize={1}
          speed={0.4}
          className="h-full w-full opacity-30 dark:opacity-50"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur-sm">
            <Sparkles className="size-4" />
            Start building today
          </div>

          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to get started?
          </h2>

          <p className="mt-4 text-lg text-muted-foreground">
            Set up Module Federation in any Vite + React project with a single command.
            Open source, MIT licensed, zero lock-in.
          </p>

          {/* Install command with copy button */}
          <div className="mx-auto mt-10 flex max-w-md items-stretch overflow-hidden rounded-xl border border-border shadow-lg backdrop-blur-sm">
            <div className="flex flex-1 items-center gap-3 bg-foreground px-5 py-3.5 font-mono text-sm text-background">
              <Terminal className="size-4 shrink-0 opacity-50" />
              {command}
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 bg-foreground/90 px-4 text-xs font-medium text-background transition-colors hover:bg-foreground/80"
              aria-label="Copy install command"
            >
              {copied ? (
                <>
                  <Check className="size-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  Copy
                </>
              )}
            </button>
          </div>

          {/* Secondary CTA with MovingBorder */}
          <div className="mt-8">
            <MovingBorder
              as="a"
              duration={3000}
              borderRadius="0.5rem"
              containerClassName="inline-flex"
              className="gap-2 px-6 py-2.5 text-sm font-medium"
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="size-4" />
              Star on GitHub
            </MovingBorder>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Works with Vite 6+, React 18/19, pnpm / npm / yarn / bun.
          </p>
        </div>
      </div>
    </section>
  )
}

export default CTASection
