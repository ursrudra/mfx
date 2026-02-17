"use client"

import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react"
import { useRef } from "react"
import { useAnimationFrame } from "motion/react"
import { cn } from "@/lib/utils"

interface MovingBorderProps<T extends ElementType = "button"> {
  as?: T
  children: ReactNode
  duration?: number
  borderRadius?: string
  containerClassName?: string
  borderClassName?: string
  className?: string
}

export function MovingBorder<T extends ElementType = "button">({
  as,
  children,
  duration = 2000,
  borderRadius = "1rem",
  containerClassName,
  borderClassName,
  className,
  ...props
}: MovingBorderProps<T> & Omit<ComponentPropsWithoutRef<T>, keyof MovingBorderProps<T>>) {
  const Component = as ?? "button"
  const pathRef = useRef<SVGRectElement>(null)
  const progressRef = useRef(0)
  const xRef = useRef(0)
  const yRef = useRef(0)
  const dotRef = useRef<HTMLDivElement>(null)

  useAnimationFrame((time) => {
    const rect = pathRef.current
    if (!rect) return
    const length = rect.getTotalLength()
    progressRef.current = (time / duration) % 1
    const point = rect.getPointAtLength(progressRef.current * length)
    xRef.current = point.x
    yRef.current = point.y

    if (dotRef.current) {
      dotRef.current.style.transform = `translate(${xRef.current}px, ${yRef.current}px) translate(-50%, -50%)`
    }
  })

  return (
    <Component
      className={cn(
        "relative overflow-hidden bg-transparent p-[1px] text-xl",
        containerClassName,
      )}
      style={{ borderRadius }}
      {...props}
    >
      <div
        className="absolute inset-0"
        style={{ borderRadius }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="absolute h-full w-full"
          width="100%"
          height="100%"
        >
          <rect
            fill="none"
            width="100%"
            height="100%"
            rx={borderRadius}
            ry={borderRadius}
            ref={pathRef}
          />
        </svg>
        <div
          ref={dotRef}
          className={cn(
            "absolute left-0 top-0 h-20 w-20 rounded-full bg-[radial-gradient(var(--primary)_40%,transparent_60%)] opacity-70 blur-[4px]",
            borderClassName,
          )}
        />
      </div>
      <div
        className={cn(
          "relative z-10 flex items-center justify-center border border-transparent bg-background backdrop-blur-xl",
          className,
        )}
        style={{ borderRadius: `calc(${borderRadius} - 2px)` }}
      >
        {children}
      </div>
    </Component>
  )
}
