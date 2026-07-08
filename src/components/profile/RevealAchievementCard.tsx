import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Share2, X, Sparkles } from "lucide-react";
import { shareOrDownloadCard } from "@/lib/shareCard";
import sarevistaLogo from "@/assets/sarevista-logo-transparent-cropped.png.asset.json";

export type RevealPayload = {
  spotName: string;
  city?: string;
  country?: string;
  title?: string;
  type?: "Movie" | "Series" | "Book";
  poster?: string | null;
  lat?: number;
  lng?: number;
};

const typeColor: Record<string, string> = {
  Movie: "#F4C77B",
  Series: "#5DBEBE",
  Book: "#B39DDB",
};

export default function RevealAchievementCard({
  payload,
  onClose,
}: {
  payload: RevealPayload | null;
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!payload) return;
    const t = setTimeout(onClose, 9000);
    return () => clearTimeout(t);
  }, [payload, onClose]);

  const handleShare = async () => {
    if (!cardRef.current) return;
    setSharing(true);
    await shareOrDownloadCard(cardRef.current);
    setSharing(false);
  };

  const accent = typeColor[payload?.type ?? "Movie"] ?? "#F4C77B";

  return (
    <AnimatePresence>
      {payload && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] bg-background/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ rotateY: 90, opacity: 0, scale: 0.9 }}
            animate={{ rotateY: 0, opacity: 1, scale: 1 }}
            exit={{ rotateY: -90, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 200, damping: 22 }}
            className="relative w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
            style={{ perspective: 1200 }}
          >
            <button
              onClick={onClose}
              className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Shareable card (also serves as visible card) */}
            <div
              ref={cardRef}
              className="rounded-2xl overflow-hidden border border-amber/30 shadow-2xl"
              style={{
                background:
                  "linear-gradient(160deg, #0D0D0D 0%, #1a1410 60%, #0D0D0D 100%)",
              }}
            >
              <div className="px-6 pt-6 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber">
                    Location Unlocked
                  </span>
                </div>
                <img
                  src={sarevistaLogo.url}
                  alt="Sarevista"
                  className="h-5 opacity-90"
                  crossOrigin="anonymous"
                />
              </div>

              {payload.poster && (
                <div className="relative mx-6 mb-4 aspect-[3/4] rounded-xl overflow-hidden bg-muted">
                  <img
                    src={payload.poster}
                    alt={payload.title ?? payload.spotName}
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />
                </div>
              )}

              <div className="px-6 pb-6 space-y-3">
                <div
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-[0.14em]"
                  style={{ background: `${accent}20`, color: accent, border: `1px solid ${accent}40` }}
                >
                  {payload.type ?? "Location"}
                  {payload.title ? ` · ${payload.title}` : ""}
                </div>
                <h3 className="font-serif text-2xl text-foreground leading-tight">
                  {payload.spotName}
                </h3>
                {(payload.city || payload.country) && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-amber" />
                    {[payload.city, payload.country].filter(Boolean).join(", ")}
                  </p>
                )}
                <div className="pt-3 border-t border-border/50 flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                    Sarevista · Memory Map
                  </span>
                  {payload.lat != null && payload.lng != null && (
                    <span className="font-mono text-[9px] text-muted-foreground">
                      {payload.lat.toFixed(2)}, {payload.lng.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleShare}
              disabled={sharing}
              className="mt-4 w-full h-11 rounded-full bg-gradient-to-r from-amber to-[#D3771F] text-charcoal font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Share2 className="w-4 h-4" />
              {sharing ? "Preparing…" : "Share this stop"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
