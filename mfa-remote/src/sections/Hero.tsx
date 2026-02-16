import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Github, Terminal } from "lucide-react"
import heroBg from "@/assets/hero.png"
import heroBgDark from "@/assets/hero_dark.png"

/* ────────────────────────────────────────────────────────────
   Floating tech-icon cards (positioned around the hero dome)
   ──────────────────────────────────────────────────────────── */

function FloatingIcon({
  children,
  className,
}: {
  children: React.ReactNode
  className: string
}) {
  return (
    <div
      className={`absolute flex size-12 items-center justify-center rounded-xl bg-white/90 shadow-xl shadow-black/10 ring-1 ring-black/[0.06] backdrop-blur-sm transition-transform duration-700 hover:scale-110 sm:size-14 ${className}`}
    >
      {children}
    </div>
  )
}

/* Inline SVG logos – lightweight, no external deps */
const ReactLogo = () => (
  <svg viewBox="0 0 32 32" className="size-7 sm:size-8">
    <circle cx="16" cy="16" r="3.2" fill="#61DAFB" />
    <g fill="none" stroke="#61DAFB" strokeWidth="1.6">
      <ellipse cx="16" cy="16" rx="13" ry="5" />
      <ellipse cx="16" cy="16" rx="13" ry="5" transform="rotate(60 16 16)" />
      <ellipse cx="16" cy="16" rx="13" ry="5" transform="rotate(120 16 16)" />
    </g>
  </svg>
)

const ViteLogo = () => (
  <svg viewBox="0 0 32 32" className="size-7 sm:size-8">
    <path d="M28.3 4.7 16.8 28.3a.6.6 0 0 1-1.1 0L3.4 5a.6.6 0 0 1 .6-.9l11.8 2.1a.6.6 0 0 0 .2 0L27.7 3.8a.6.6 0 0 1 .6.9Z" fill="url(#v1)" />
    <path d="m21.5 3-9.4 1.8a.4.4 0 0 0-.3.3l-.6 10.4a.4.4 0 0 0 .4.4l3-.6a.4.4 0 0 1 .4.5l-.8 4.1a.4.4 0 0 0 .5.4l1.8-.5a.4.4 0 0 1 .5.4L16.2 26a.2.2 0 0 0 .4.1l.2-.3 6.4-13a.4.4 0 0 0-.3-.5l-3 .5a.4.4 0 0 1-.4-.4l.7-5a.4.4 0 0 0-.4-.5l-2.5.5" fill="none" stroke="url(#v2)" strokeWidth="0" />
    <path d="m21.5 3-9.4 1.8a.4.4 0 0 0-.3.3l-.6 10.4a.4.4 0 0 0 .4.4l3-.6a.4.4 0 0 1 .4.5l-.8 4.1a.4.4 0 0 0 .5.4l1.8-.5a.4.4 0 0 1 .5.4L16.2 26a.2.2 0 0 0 .4.1l.2-.3 6.4-13a.4.4 0 0 0-.3-.5l-3 .5a.4.4 0 0 1-.4-.4l.7-5a.4.4 0 0 0-.4-.5Z" fill="url(#v2)" />
    <defs>
      <linearGradient id="v1" x1="2" y1="5" x2="18" y2="27" gradientUnits="userSpaceOnUse">
        <stop stopColor="#41D1FF" />
        <stop offset="1" stopColor="#BD34FE" />
      </linearGradient>
      <linearGradient id="v2" x1="14" y1="3" x2="17" y2="26" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFBD4F" />
        <stop offset="1" stopColor="#FF9640" />
      </linearGradient>
    </defs>
  </svg>
)

const TypeScriptLogo = () => (
  <svg viewBox="0 0 32 32" className="size-7 sm:size-8">
    <rect x="2" y="2" width="28" height="28" rx="4" fill="#3178C6" />
    <path
      d="M22.8 23.3c.6.3 1.3.6 2 .7.8.2 1.5.2 2.1.1.6 0 1.1-.2 1.6-.5s.8-.7 1-1.2c.2-.5.2-1 .1-1.5-.1-.4-.3-.8-.6-1.1-.3-.3-.7-.6-1.1-.8-.4-.2-.9-.4-1.4-.7-.4-.2-.7-.3-1-.5-.3-.2-.5-.3-.6-.5a.9.9 0 0 1-.2-.6c0-.2.1-.4.2-.5s.3-.3.5-.3c.2-.1.5-.1.8-.1.4 0 .8.1 1.2.2.4.2.7.4 1 .7l1.3-1.7c-.5-.4-1-.7-1.7-.9-.6-.2-1.3-.3-2-.3-.7 0-1.3.1-1.9.4-.5.2-1 .6-1.3 1-.3.5-.5 1-.5 1.6 0 .6.1 1 .4 1.4.3.4.6.7 1 .9.4.3.9.5 1.4.7.4.2.7.3 1 .5s.5.3.7.5c.2.2.3.4.3.6 0 .3-.1.5-.3.7-.2.2-.6.3-1 .3-.5 0-1-.1-1.5-.4-.4-.3-.8-.6-1.1-1l-1.4 1.7ZM17 16.7h-3.2V28h-2.5V16.7H8v-2.2h9v2.2Z"
      fill="white"
    />
  </svg>
)

const TailwindLogo = () => (
  <svg viewBox="0 0 32 32" className="size-7 sm:size-8">
    <path
      d="M16 8c-4.3 0-6.9 2.1-8 6.4 1.6-2.1 3.5-2.9 5.6-2.4 1.2.3 2 1.1 3 2.1 1.5 1.6 3.3 3.5 7.1 3.5 4.3 0 6.9-2.1 8-6.4-1.6 2.1-3.5 2.9-5.6 2.4-1.2-.3-2-1.1-3-2.1C21.6 9.9 19.8 8 16 8ZM8 17.6c-4.3 0-6.9 2.1-8 6.4 1.6-2.1 3.5-2.9 5.6-2.4 1.2.3 2 1.1 3 2.1 1.5 1.6 3.3 3.5 7.1 3.5 4.3 0 6.9-2.1 8-6.4-1.6 2.1-3.5 2.9-5.6 2.4-1.2-.3-2-1.1-3-2.1-1.5-1.6-3.3-3.5-7.1-3.5Z"
      fill="#06B6D4"
    />
  </svg>
)

const FederationLogo = () => (
  <svg viewBox="0 0 32 32" className="size-7 sm:size-8">
    <rect width="32" height="32" rx="6" fill="#3B82F6" fillOpacity="0.12" />
    <path
      d="M16 6 26 12v8l-10 6-10-6v-8l10-6Z"
      stroke="#3B82F6"
      strokeWidth="1.6"
      fill="none"
    />
    <path
      d="M16 14l5 3v6l-5 3-5-3v-6l5-3Z"
      fill="#3B82F6"
      fillOpacity="0.35"
    />
    <circle cx="16" cy="16" r="2.5" fill="#3B82F6" />
  </svg>
)

/* ────────────────────────────────────────────────────────────
   Hero background image with seamless fade
   ──────────────────────────────────────────────────────────── */

function HeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[55%] select-none sm:h-[60%]">
      {/* Light mode — fades out in dark, stays decoded in DOM */}
      <img
        src={heroBg}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-500 dark:opacity-0"
      />
      {/* Dark mode — fades in, always decoded in DOM */}
      <img
        src={heroBgDark}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover object-center opacity-0 transition-opacity duration-500 dark:opacity-100"
      />

      {/* Top fade — seamless blend into the page background above */}
      <div className="absolute inset-x-0 top-0 z-10 h-40 bg-gradient-to-b from-background to-transparent" />

      {/* Bottom fade — blends into the next section */}
      <div className="absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-background to-transparent" />
    </div>
  )
}

/* ────────────────────────────────────────────────────────────
   Hero Section
   ──────────────────────────────────────────────────────────── */

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] overflow-hidden pb-32 pt-28 sm:min-h-screen sm:pb-0 sm:pt-36 lg:pt-44">
      {/* ── Gradient dome backdrop ────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        {/* Central dome — soft lavender arc */}
        <div
          className="absolute left-1/2 top-[5%] h-[700px] w-[900px] -translate-x-1/2 rounded-[50%] sm:h-[800px] sm:w-[1100px] lg:h-[900px] lg:w-[1300px]"
          style={{
            background:
              "radial-gradient(ellipse at 50% 40%, oklch(0.92 0.03 270 / 0.55), oklch(0.96 0.015 250 / 0.3) 50%, transparent 80%)",
          }}
        />
        {/* Soft warm glow at top */}
        <div className="absolute -top-20 left-1/2 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-primary/[0.04] blur-3xl" />
      </div>

      {/* ── Floating tech icons ───────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 z-10 mx-auto max-w-5xl">
        <FloatingIcon className="left-[3%] top-[18%] animate-[float_6s_ease-in-out_infinite] sm:left-[5%] sm:top-[15%]">
          <ReactLogo />
        </FloatingIcon>
        <FloatingIcon className="left-[12%] top-[42%] animate-[float_7s_ease-in-out_1s_infinite] sm:left-[2%] sm:top-[48%]">
          <TailwindLogo />
        </FloatingIcon>
        <FloatingIcon className="left-[28%] top-[8%] animate-[float_5s_ease-in-out_0.5s_infinite] sm:left-[22%] sm:top-[6%]">
          <ViteLogo />
        </FloatingIcon>
        <FloatingIcon className="right-[28%] top-[6%] animate-[float_6s_ease-in-out_1.5s_infinite] sm:right-[22%] sm:top-[5%]">
          <FederationLogo />
        </FloatingIcon>
        <FloatingIcon className="right-[3%] top-[18%] animate-[float_7s_ease-in-out_0.8s_infinite] sm:right-[5%] sm:top-[15%]">
          <TypeScriptLogo />
        </FloatingIcon>
      </div>

      {/* ── Content ───────────────────────────────────────── */}
      <div className="relative z-20 mx-auto max-w-4xl px-6 text-center">
        {/* Announcement badge */}
        <div className="mb-8 flex justify-center">
          <Badge
            variant="outline"
            className="gap-1.5 border-emerald-200 bg-emerald-50/80 px-4 py-1.5 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400"
          >
            Open Source — MIT Licensed
          </Badge>
        </div>

        {/* Headline */}
        <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-[3.75rem]">
          Module Federation,{" "}
          <br className="hidden sm:block" />
          <span className="italic text-primary">One Command&nbsp;</span>
          Away
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          The CLI toolkit for Vite + React micro&#8209;frontends. Interactive wizard, web GUI
          studio, workspace batch mode, and diagnostics — from zero to federated in 60 seconds.
        </p>

        {/* Install command + GitHub CTA */}
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button
            size="lg"
            className="gap-2.5 rounded-xl px-6 font-mono text-sm shadow-lg"
            onClick={() => {
              navigator.clipboard.writeText("npx mfx init")
            }}
          >
            <Terminal className="size-4 shrink-0 opacity-60" />
            npx mfx init
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="gap-2 rounded-lg px-6 text-sm"
            asChild
          >
            <a href="https://github.com" target="_blank" rel="noopener noreferrer">
              <Github className="size-4" />
              View on GitHub
            </a>
          </Button>
        </div>
      </div>

      {/* ── Landscape background ─────────────────────────── */}
      <HeroBackground />
    </section>
  )
}

export default HeroSection
