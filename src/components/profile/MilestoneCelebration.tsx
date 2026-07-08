import { useEffect } from "react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { milestoneMessage } from "@/lib/tiers";

export default function MilestoneCelebration({
  milestone,
  onClose,
}: {
  milestone: number | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (milestone == null) return;
    const end = Date.now() + 1500;
    const colors = ["#F4C77B", "#D3771F", "#ffffff"];
    (function frame() {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [milestone, onClose]);

  return (
    <AnimatePresence>
      {milestone != null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] pointer-events-none flex items-start justify-center pt-24"
        >
          <motion.div
            initial={{ y: -20, scale: 0.9, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -20, scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="pointer-events-auto glass border border-amber/40 rounded-2xl px-5 py-4 flex items-center gap-3 shadow-2xl max-w-md mx-4"
            style={{ background: "linear-gradient(135deg, hsl(38 80% 56% / 0.15), hsl(0 0% 0% / 0.7))" }}
          >
            <div className="w-10 h-10 rounded-full bg-amber/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-amber" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber/80">Milestone unlocked</div>
              <div className="text-sm text-foreground font-medium leading-snug">{milestoneMessage(milestone)}</div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
