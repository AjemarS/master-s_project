"use client";

import { motion } from "framer-motion";

import { cn } from "~/lib/cn"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <motion.div
      data-slot="skeleton"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={cn("bg-accent animate-pulse rounded-md", className)}
      {...(props as React.ComponentProps<typeof motion.div>)}
    />
  )
}

export { Skeleton }
