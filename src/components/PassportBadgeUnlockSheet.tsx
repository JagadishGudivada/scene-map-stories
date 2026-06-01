import { AnimatePresence, motion } from "framer-motion";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import PassportStampBadge from "@/components/PassportStampBadge";
import type { PassportBadge } from "@/hooks/usePassportBadges";
import { useToast } from "@/hooks/use-toast";

type PassportBadgeUnlockSheetProps = {
  open: boolean;
  badge: PassportBadge | null;
  onClose: () => void;
  onViewPassport: () => void;
};

export default function PassportBadgeUnlockSheet({
  open,
  badge,
  onClose,
  onViewPassport,
}: PassportBadgeUnlockSheetProps) {
  const { toast } = useToast();

  const handleShare = async () => {
    if (!badge) return;

    const shareTitle = `${badge.country} Filming Scout`;
    const shareText =
      badge.tier === "bronze"
        ? `I unlocked the ${badge.country} passport stamp in Sarevista!`
        : `I unlocked the ${badge.country} ${badge.tier} passport stamp in Sarevista!`;

    try {
      if (navigator.share) {
        await navigator.share({ title: shareTitle, text: shareText, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(`${shareTitle} - ${shareText}`);
        toast({ title: "Copied", description: "Badge text copied to clipboard." });
      }
    } catch {
      // User cancelled share flow.
    }
  };

  return (
    <AnimatePresence>
      {open && badge && (
        <motion.div
          className="fixed inset-0 z-[70] bg-background/80 backdrop-blur-sm p-4 flex items-end md:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="w-full max-w-md glass rounded-3xl border border-border p-5 sm:p-6"
          >
            <p className="text-center text-xs uppercase tracking-[0.22em] text-amber mb-2">Badge Unlocked</p>
            <h3 className="text-center font-serif text-2xl text-foreground">{badge.country} Filming Scout</h3>
            <p className="text-center text-sm text-muted-foreground mt-1">
              You have visited your first filming location in {badge.country}.
            </p>

            <motion.div
              initial={{ y: -180, opacity: 0, rotate: -8 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.08 }}
              className="mt-5 flex justify-center"
            >
              <PassportStampBadge badge={badge} country={badge.country} size="md" generateOnMiss />
            </motion.div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button variant="outline" onClick={handleShare} className="rounded-xl">
                <Share2 className="w-4 h-4 mr-1.5" /> Share Badge
              </Button>
              <Button variant="outline" onClick={onViewPassport} className="rounded-xl">
                View My Passport
              </Button>
              <Button onClick={onClose} className="rounded-xl">
                Continue
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
