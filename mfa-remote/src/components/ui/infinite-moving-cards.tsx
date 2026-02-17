"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface InfiniteMovingCardsProps {
  items: {
    quote: string
    name: string
    title: string
  }[]
  direction?: "left" | "right"
  speed?: "fast" | "normal" | "slow"
  pauseOnHover?: boolean
  className?: string
}

export function InfiniteMovingCards({
  items,
  direction = "left",
  speed = "normal",
  pauseOnHover = true,
  className,
}: InfiniteMovingCardsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLUListElement>(null)
  const [start, setStart] = useState(false)

  useEffect(() => {
    if (!containerRef.current || !scrollerRef.current) return

    const scrollerContent = Array.from(scrollerRef.current.children)
    for (const item of scrollerContent) {
      const dup = item.cloneNode(true)
      scrollerRef.current.appendChild(dup)
    }

    const container = containerRef.current
    container.style.setProperty(
      "--animation-direction",
      direction === "left" ? "forwards" : "reverse",
    )

    const speedMap = { fast: "20s", normal: "40s", slow: "80s" }
    container.style.setProperty("--animation-duration", speedMap[speed])

    setStart(true)
  }, [direction, speed])

  return (
    <div
      ref={containerRef}
      className={cn(
        "scroller relative z-20 max-w-7xl overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]",
        className,
      )}
    >
      <ul
        ref={scrollerRef}
        className={cn(
          "flex w-max min-w-full shrink-0 gap-4 py-4",
          start && "animate-scroll",
          pauseOnHover && "hover:[animation-play-state:paused]",
        )}
      >
        {items.map((item, idx) => (
          <li
            className="relative w-[350px] max-w-full shrink-0 rounded-2xl border border-border bg-card px-8 py-6 md:w-[450px]"
            key={`${item.name}-${idx}`}
          >
            <blockquote>
              <span className="relative z-20 text-sm leading-[1.6] text-muted-foreground">
                &ldquo;{item.quote}&rdquo;
              </span>
              <div className="relative z-20 mt-6 flex flex-row items-center">
                <span className="flex flex-col gap-1">
                  <span className="text-sm font-medium leading-[1.6] text-foreground">
                    {item.name}
                  </span>
                  <span className="text-sm leading-[1.6] text-muted-foreground">
                    {item.title}
                  </span>
                </span>
              </div>
            </blockquote>
          </li>
        ))}
      </ul>
    </div>
  )
}
