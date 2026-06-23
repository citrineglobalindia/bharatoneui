import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useTransform, animate, motion } from "framer-motion";

type CounterProps = {
  value: number;
  /** Suffix shown after the number (e.g. "+", "K", "L+"). */
  suffix?: string;
  /** Optional formatter applied to the integer value before suffix. */
  format?: (n: number) => string;
  duration?: number;
  className?: string;
};

/**
 * Animated number that ramps from 0 to `value` once it scrolls into view.
 * Uses framer-motion's `animate` so it runs on rAF and won't drop frames.
 */
export function Counter({
  value,
  suffix = "",
  format = (n) => n.toLocaleString("en-IN"),
  duration = 1.6,
  className,
}: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (latest) => format(Math.round(latest)));

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
    });
    return controls.stop;
  }, [inView, value, duration, mv]);

  return (
    <span ref={ref} className={className}>
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}
