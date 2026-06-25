"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type GlassCardProps = {
  children: ReactNode;
  className?: string; // Outer card
  contentClassName?: string; // Inner content wrapper
};

export default function GlassCard({
  children,
  className,
  contentClassName,
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl",
        "bg-white/4",
        "backdrop-blur-3xl",
        "shadow-[0_8px_32px_rgba(0,0,0,0.35)]",
        "border border-white/10",
        "p-6",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/10 to-transparent" />

      <div
        className={cn("relative z-10 flex flex-col gap-2", contentClassName)}
      >
        {children}
      </div>
    </div>
  );
}
