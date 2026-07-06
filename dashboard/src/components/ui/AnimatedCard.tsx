"use client"

import { motion } from "framer-motion"

const EASE_CINEMATIC: [number, number, number, number] = [0.16, 1, 0.3, 1]

export default function AnimatedCard({
  children,
  index = 0,
  className = "",
}: {
  children: React.ReactNode
  index?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: EASE_CINEMATIC, delay: index * 0.08 }}
      whileHover={{ scale: 1.03, transition: { type: "spring", stiffness: 300, damping: 22 } }}
      className={`cursor-default ${className}`}
    >
      {children}
    </motion.div>
  )
}
