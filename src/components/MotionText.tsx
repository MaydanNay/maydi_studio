import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

export const motionEase = [0.22, 1, 0.36, 1] as const

const viewport = { once: true, amount: 0.15 as const, margin: '0px 0px -40px 0px' }

/** Soft fade + rise — safe, never clips text away */
export function FadeUp({
  children,
  className = '',
  delay = 0,
  duration = 0.7,
  y = 24,
}: {
  children: ReactNode
  className?: string
  delay?: number
  duration?: number
  y?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewport}
      transition={{ duration, delay, ease: motionEase }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/** Word-by-word fade (no overflow mask — can't get stuck invisible) */
export function WordReveal({
  text,
  className = '',
  delay = 0,
  stagger = 0.035,
}: {
  text: string
  className?: string
  delay?: number
  stagger?: number
}) {
  const words = text.trim().split(/\s+/)

  return (
    <span className={className}>
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{
            duration: 0.55,
            delay: delay + i * stagger,
            ease: motionEase,
          }}
          className="mr-[0.28em] inline-block last:mr-0"
        >
          {word}
        </motion.span>
      ))}
    </span>
  )
}

/** Line / phrase fade — for short headlines */
export function LineReveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewport}
      transition={{ duration: 0.7, delay, ease: motionEase }}
      className={className || 'inline-block'}
    >
      {children}
    </motion.span>
  )
}

/** Letter stagger for MAYDI — uses animate (always on first screen) */
export function LetterReveal({
  text,
  className = '',
  delay = 0.2,
  stagger = 0.07,
}: {
  text: string
  className?: string
  delay?: number
  stagger?: number
}) {
  return (
    <span className={className} aria-label={text}>
      {text.split('').map((letter, i) => (
        <motion.span
          key={`${letter}-${i}`}
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.85,
            delay: delay + i * stagger,
            ease: motionEase,
          }}
          className="inline-block"
          aria-hidden
        >
          {letter === ' ' ? '\u00A0' : letter}
        </motion.span>
      ))}
    </span>
  )
}

export const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: motionEase },
  },
}
