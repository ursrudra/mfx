import * as React from "react"
import { Button } from "@/components/ui/button"
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
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="absolute top-0 left-1/4 h-[400px] w-[400px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full bg-primary/8 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
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
          <div className="mx-auto mt-10 flex max-w-md items-stretch overflow-hidden rounded-xl border border-border shadow-lg">
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

          {/* Secondary CTA */}
          <div className="mt-6">
            <Button variant="outline" size="lg" className="gap-2 rounded-lg px-6 text-sm" asChild>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                <Github className="size-4" />
                Star on GitHub
              </a>
            </Button>
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
