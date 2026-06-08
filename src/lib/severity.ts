import type { Severity } from "../types";

// Tailwind class sets per severity, tuned for a stone-dark theme.
export const SEVERITY_STYLES: Record<
  Severity,
  { badge: string; border: string; dot: string; text: string }
> = {
  danger: {
    badge: "bg-red-950 text-red-300 ring-1 ring-red-900",
    border: "border-red-900/60",
    dot: "bg-red-500",
    text: "text-red-300",
  },
  warning: {
    badge: "bg-amber-950 text-amber-300 ring-1 ring-amber-900",
    border: "border-amber-900/60",
    dot: "bg-amber-500",
    text: "text-amber-300",
  },
  info: {
    badge: "bg-stone-800 text-stone-300 ring-1 ring-stone-700",
    border: "border-stone-700",
    dot: "bg-stone-500",
    text: "text-stone-300",
  },
  good: {
    badge: "bg-emerald-950 text-emerald-300 ring-1 ring-emerald-900",
    border: "border-emerald-900/60",
    dot: "bg-emerald-500",
    text: "text-emerald-300",
  },
};
