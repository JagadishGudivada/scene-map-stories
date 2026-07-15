import { useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

interface StatCardProps {
  label: string;
  value: number;
  color?: string;
  delay?: number;
  onClick?: () => void;
}

export default function StatCard({ label, value, color = "text-amber", delay = 0, onClick }: StatCardProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.floor(v).toLocaleString());

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 1.4,
      delay,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [value, delay, count]);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      className="relative overflow-hidden bg-[#121212]/70 dark:bg-[#121212]/70 border border-white/[0.06] px-2 sm:px-4 py-3 sm:py-6 rounded-2xl flex flex-col items-center justify-center gap-0.5 sm:gap-1.5 backdrop-blur-xl group shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6)]"
    >
      {/* Glass reflection */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/[0.06] to-transparent" aria-hidden />
      {/* Amber corner glow on hover */}
      <div className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full bg-amber/0 group-hover:bg-amber/20 blur-2xl transition-all duration-500" aria-hidden />

      <motion.span
        className={`relative font-sans font-semibold tabular-nums text-2xl sm:text-4xl leading-none tracking-tight ${color}`}
        style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}
      >
        <motion.span>{rounded}</motion.span>
      </motion.span>
      <span className="relative font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.18em] text-white/50">
        {label}
      </span>
    </motion.button>
  );
}
