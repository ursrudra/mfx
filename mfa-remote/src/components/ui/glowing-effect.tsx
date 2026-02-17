"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface GlowingEffectProps {
  children: ReactNode
  className?: string
  borderRadius?: string
  blur?: number
  spread?: number
  glow?: boolean
}

export function GlowingEffect({
  children,
  className,
  borderRadius = "1rem",
  blur = 10,
  spread = 2,
  glow = true,
}: GlowingEffectProps) {
  return (
    <div
      className={cn("group relative", className)}
      style={{ borderRadius }}
    >
      {glow && (
        <div
          className="pointer-events-none absolute -inset-px rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: `linear-gradient(135deg, 
              hsl(var(--primary) / 0.4), 
              hsl(var(--primary) / 0.1), 
              hsl(var(--primary) / 0.4))`,
            filter: `blur(${blur}px)`,
            margin: `-${spread}px`,
            borderRadius: "inherit",
          }}
        />
      )}
      <div className="relative z-10 rounded-[inherit]">{children}</div>
    </div>
  )
}
