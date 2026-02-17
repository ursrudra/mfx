import { Separator } from "@/components/ui/separator"
import { BackgroundBeams } from "@/components/ui/background-beams"
import { Github, Terminal, Twitter } from "lucide-react"

const footerLinks = {
  Product: [
    { name: "Features", href: "#features" },
    { name: "Quickstart", href: "#quickstart" },
    { name: "CLI Reference", href: "#" },
    { name: "Web GUI", href: "#" },
    { name: "Changelog", href: "#" },
  ],
  Resources: [
    { name: "Documentation", href: "#" },
    { name: "Getting Started", href: "#" },
    { name: "Config Schema", href: "#" },
    { name: "Examples", href: "#" },
    { name: "Blog", href: "#" },
  ],
  Community: [
    { name: "GitHub", href: "https://github.com" },
    { name: "npm", href: "https://www.npmjs.com" },
    { name: "Discussions", href: "#" },
    { name: "Contributing", href: "#" },
  ],
  Legal: [
    { name: "MIT License", href: "#" },
    { name: "Privacy", href: "#" },
    { name: "Terms", href: "#" },
  ],
}

export function FooterSection() {
  return (
    <footer className="relative border-t bg-muted/20 py-16">
      {/* Subtle animated beams */}
      <BackgroundBeams className="z-0" />

      <div className="relative z-10 mx-auto max-w-6xl px-6">
        {/* Main footer content */}
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-6">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <div className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background">
                <Terminal className="size-4" />
              </div>
              mfx
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              The open-source CLI toolkit for setting up and managing Module Federation
              in Vite + React projects. From init to production.
            </p>
            {/* Social links */}
            <div className="mt-6 flex gap-3">
              <a
                href="https://github.com"
                className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                aria-label="GitHub"
              >
                <Github className="size-4" />
              </a>
              <a
                href="#"
                className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                aria-label="Twitter"
              >
                <Twitter className="size-4" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="mb-4 text-sm font-semibold">{category}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-10" />

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} mfx. Open source under the MIT License.
          </p>
          <p className="text-xs text-muted-foreground">
            Built with Module Federation + Vite + React + TypeScript
          </p>
        </div>
      </div>
    </footer>
  )
}

export default FooterSection
