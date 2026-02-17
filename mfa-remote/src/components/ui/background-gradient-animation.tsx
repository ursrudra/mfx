"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface BackgroundGradientAnimationProps {
  children?: ReactNode
  className?: string
  containerClassName?: string
  gradientBackgroundStart?: string
  gradientBackgroundEnd?: string
  firstColor?: string
  secondColor?: string
  thirdColor?: string
  fourthColor?: string
  fifthColor?: string
  pointerColor?: string
  size?: string
  blendingValue?: string
  interactive?: boolean
}

export function BackgroundGradientAnimation({
  children,
  className,
  containerClassName,
  gradientBackgroundStart = "rgb(108, 0, 162)",
  gradientBackgroundEnd = "rgb(0, 17, 82)",
  firstColor = "18, 113, 255",
  secondColor = "221, 74, 255",
  thirdColor = "100, 220, 255",
  fourthColor = "200, 50, 50",
  fifthColor = "180, 180, 50",
  pointerColor = "140, 100, 255",
  size = "80%",
  blendingValue = "hard-light",
}: BackgroundGradientAnimationProps) {
  return (
    <div
      className={cn("relative overflow-hidden", containerClassName)}
      style={
        {
          "--gradient-background-start": gradientBackgroundStart,
          "--gradient-background-end": gradientBackgroundEnd,
          "--first-color": firstColor,
          "--second-color": secondColor,
          "--third-color": thirdColor,
          "--fourth-color": fourthColor,
          "--fifth-color": fifthColor,
          "--pointer-color": pointerColor,
          "--size": size,
          "--blending-value": blendingValue,
        } as React.CSSProperties
      }
    >
      <div className="absolute inset-0 bg-gradient-animated opacity-30 blur-3xl" />
      <div className={cn("relative z-10", className)}>{children}</div>
    </div>
  )
}
