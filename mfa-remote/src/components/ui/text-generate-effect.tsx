"use client"

import { useEffect } from "react"
import { motion, stagger, useAnimate } from "motion/react"
import { cn } from "@/lib/utils"

interface TextGenerateEffectProps {
  words: string
  className?: string
  filter?: boolean
  duration?: number
}

export function TextGenerateEffect({
  words,
  className,
  filter = true,
  duration = 0.5,
}: TextGenerateEffectProps) {
  const [scope, animate] = useAnimate()
  const wordsArray = words.split(" ")

  useEffect(() => {
    animate(
      "span",
      { opacity: 1, filter: filter ? "blur(0px)" : "none" },
      { duration, delay: stagger(0.08) },
    )
  }, [animate, duration, filter])

  return (
    <div className={cn("font-bold", className)}>
      <div className="mt-4">
        <div className="leading-snug tracking-wide" ref={scope}>
          {wordsArray.map((word, idx) => (
            <motion.span
              key={`${word}-${idx}`}
              className="inline-block opacity-0"
              style={{ filter: filter ? "blur(10px)" : "none" }}
            >
              {word}
              {idx < wordsArray.length - 1 && "\u00A0"}
            </motion.span>
          ))}
        </div>
      </div>
    </div>
  )
}
