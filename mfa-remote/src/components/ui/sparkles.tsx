"use client"

import { useEffect, useId, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface SparklesProps {
  className?: string
  particleSize?: number
  minSize?: number
  maxSize?: number
  speed?: number
  particleColor?: string
  particleDensity?: number
  background?: string
}

interface Particle {
  x: number
  y: number
  size: number
  speedX: number
  speedY: number
  opacity: number
  fadeSpeed: number
}

export function SparklesCore({
  className,
  particleSize,
  minSize = 0.4,
  maxSize = 1.4,
  speed = 1,
  particleColor = "#ffffff",
  particleDensity = 100,
  background = "transparent",
}: SparklesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const id = useId()
  const [, setDimensions] = useState({ w: 0, h: 0 })
  const particles = useRef<Particle[]>([])
  const animationRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setDimensions({ w: width, h: height })
        canvas.width = width
        canvas.height = height
        initParticles(width, height)
      }
    })

    resizeObserver.observe(canvas.parentElement ?? canvas)

    function initParticles(w: number, h: number) {
      particles.current = Array.from({ length: particleDensity }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        size: particleSize ?? Math.random() * (maxSize - minSize) + minSize,
        speedX: (Math.random() - 0.5) * speed * 0.3,
        speedY: (Math.random() - 0.5) * speed * 0.3,
        opacity: Math.random(),
        fadeSpeed: Math.random() * 0.02 + 0.005,
      }))
    }

    function animate() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const p of particles.current) {
        p.x += p.speedX
        p.y += p.speedY
        p.opacity += p.fadeSpeed

        if (p.opacity >= 1 || p.opacity <= 0) p.fadeSpeed *= -1
        if (p.x < 0 || p.x > canvas.width) p.speedX *= -1
        if (p.y < 0 || p.y > canvas.height) p.speedY *= -1

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = particleColor
        ctx.globalAlpha = Math.max(0, Math.min(1, p.opacity))
        ctx.fill()
      }

      ctx.globalAlpha = 1
      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      resizeObserver.disconnect()
      cancelAnimationFrame(animationRef.current)
    }
  }, [particleColor, particleDensity, particleSize, minSize, maxSize, speed])

  return (
    <div className={cn("relative h-full w-full", className)} style={{ background }}>
      <canvas
        ref={canvasRef}
        id={id}
        className="absolute inset-0 h-full w-full"
      />
    </div>
  )
}
