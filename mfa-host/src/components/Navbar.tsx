import { Github, Menu, Moon, Sun, Terminal, X } from "lucide-react"
import * as React from "react"
import { useThemeStore } from "@/store/theme"

const navLinks = [
  { name: "Features", href: "#features" },
  { name: "Quickstart", href: "#quickstart" },
  { name: "Testimonials", href: "#testimonials" },
  { name: "GitHub", href: "https://github.com/nicholasgriffintn/mfx", external: true },
]

export function Navbar() {
  const { theme, toggleTheme } = useThemeStore()
  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 text-lg font-semibold">
          <div className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background">
            <Terminal className="size-4" />
          </div>
          <span>mfx</span>
        </a>

        {/* Desktop links */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.name}
            </a>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? (
              <Moon className="size-4" />
            ) : (
              <Sun className="size-4" />
            )}
          </button>

          {/* CTA button */}
          <a
            href="#quickstart"
            className="hidden items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-xs font-medium text-background transition-colors hover:bg-foreground/85 md:inline-flex"
          >
            <Terminal className="size-3" />
            npx mfx init
          </a>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t bg-background px-6 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.name}
              </a>
            ))}
            <a
              href="#quickstart"
              className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-xs font-medium text-background"
            >
              <Terminal className="size-3" />
              npx mfx init
            </a>
          </div>
        </div>
      )}
    </header>
  )
}
