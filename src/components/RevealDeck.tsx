import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X, ArrowRight, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Kind = "title" | "location" | "spot";
type CardType = "bts" | "didyouknow" | "mood";
type Card = { type: CardType; text: string };

export type RevealContext = {
  kind: Kind;
  slug: string;
  name: string;
  /** Free-form extras passed to the AI prompt (year, type, country, title…) */
  meta?: Record<string, unknown>;
};

const BUTTON_LABELS = [
  "tap me 👀",
  "unlock a secret",
  "wait til you see this",
  "POV: you didn't know",
  "don't tap this",
  "the lore is wild",
  "one more thing…",
  "the internet's lowkey obsessed",
];

const NEXT_LABELS = [
  "next →",
  "one more",
  "ok one more",
  "this is unhinged",
  "keep going",
  "another?",
];

const TYPE_META: Record<CardType, { emoji: string; label: string; chip: string }> = {
  bts: { emoji: "🎬", label: "behind the scenes", chip: "BTS" },
  didyouknow: { emoji: "📍", label: "did you know", chip: "INTEL" },
  mood: { emoji: "🌙", label: "mood", chip: "VIBE" },
};

function pick<T>(arr: T[], i: number) {
  return arr[i % arr.length];
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function RevealButton({
  context,
  variant = "floating",
}: {
  context: RevealContext;
  variant?: "floating" | "inline";
}) {
  const [open, setOpen] = useState(false);
  const [labelIdx, setLabelIdx] = useState(() => Math.floor(Math.random() * BUTTON_LABELS.length));

  useEffect(() => {
    const id = setInterval(() => setLabelIdx((i) => i + 1), 4500);
    return () => clearInterval(id);
  }, []);

  const label = pick(BUTTON_LABELS, labelIdx);

  if (variant === "inline") {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400/90 to-amber-200/90 px-5 py-2.5 text-sm font-semibold text-zinc-900 shadow-lg shadow-amber-500/20 transition-transform hover:scale-105 active:scale-95"
        >
          <Sparkles className="h-4 w-4 transition-transform group-hover:rotate-12" />
          <AnimatePresence mode="wait">
            <motion.span
              key={label}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
            >
              {label}
            </motion.span>
          </AnimatePresence>
        </button>
        {open && <RevealDeck context={context} onClose={() => setOpen(false)} />}
      </>
    );
  }

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6, type: "spring", stiffness: 200, damping: 22 }}
        whileTap={{ scale: 0.94 }}
        className="fixed bottom-20 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-200 px-4 py-3 text-sm font-semibold text-zinc-900 shadow-2xl shadow-amber-500/30 md:bottom-6 md:right-6 md:px-5"
        aria-label="Reveal a fact"
      >
        <motion.span
          animate={{ rotate: [0, -8, 8, -4, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.2 }}
          className="inline-flex"
        >
          <Sparkles className="h-4 w-4" />
        </motion.span>
        <AnimatePresence mode="wait">
          <motion.span
            key={label}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="whitespace-nowrap"
          >
            {label}
          </motion.span>
        </AnimatePresence>
        <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-amber-300/60 animate-ping opacity-40" />
      </motion.button>
      {open && <RevealDeck context={context} onClose={() => setOpen(false)} />}
    </>
  );
}

function RevealDeck({ context, onClose }: { context: RevealContext; onClose: () => void }) {
  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("reveal-cards", {
          body: {
            kind: context.kind,
            slug: context.slug,
            name: context.name,
            context: context.meta || {},
          },
        });
        if (cancelled) return;
        if (error) throw error;
        const list: Card[] = Array.isArray(data?.cards) ? data.cards : [];
        if (!list.length) throw new Error("no cards");
        setCards(shuffle(list));
      } catch (e: any) {
        if (!cancelled) setError("couldn't pull the lore. try again in a sec.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [context.kind, context.slug, context.name]);

  const current = cards.length ? cards[index % cards.length] : null;

  const next = useCallback(() => {
    setIndex((i) => {
      const n = i + 1;
      // Reshuffle every full loop so the deck never feels finite.
      if (cards.length && n % cards.length === 0) {
        setCards((c) => shuffle(c));
      }
      return n;
    });
  }, [cards.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        next();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, onClose]);

  const nextLabel = useMemo(() => pick(NEXT_LABELS, index), [index]);

  async function share() {
    if (!current) return;
    const text = `${TYPE_META[current.type].emoji} ${current.text}\n\nfound on Sarevista — ${context.name}`;
    try {
      if (navigator.share) {
        await navigator.share({ text, title: context.name });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("copied to clipboard");
      }
    } catch {
      /* user cancelled */
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/85 px-4 backdrop-blur-md"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white/80 transition hover:bg-white/20 md:right-6 md:top-6"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between px-1 text-xs uppercase tracking-[0.2em] text-white/50">
          <span>the reveal</span>
          <span>{context.name}</span>
        </div>

        <div className="relative h-[440px]">
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-950 text-white/60"
              >
                <div className="flex flex-col items-center gap-3">
                  <Sparkles className="h-6 w-6 animate-pulse text-amber-300" />
                  <span className="text-sm">shuffling the deck…</span>
                </div>
              </motion.div>
            )}

            {!loading && error && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center rounded-3xl border border-white/10 bg-zinc-900 p-8 text-center text-white/70"
              >
                {error}
              </motion.div>
            )}

            {!loading && !error && current && (
              <motion.div
                key={index}
                ref={cardRef}
                initial={{ opacity: 0, y: 30, rotate: -2, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, y: -30, rotate: 2, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 220, damping: 24 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.35}
                onDragEnd={(_, info) => {
                  if (Math.abs(info.offset.x) > 90) next();
                }}
                onClick={next}
                className="absolute inset-0 cursor-pointer overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 p-7 shadow-2xl shadow-black/40"
              >
                <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />

                <div className="relative flex h-full flex-col">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-amber-400/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
                      {TYPE_META[current.type].chip}
                    </span>
                    <span className="text-xs text-white/40">{TYPE_META[current.type].label}</span>
                  </div>

                  <div className="my-auto">
                    <div className="text-4xl">{TYPE_META[current.type].emoji}</div>
                    <p className="mt-4 font-serif text-2xl leading-snug text-white md:text-[26px]">
                      {current.text}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-white/40">
                    <span>tap card for {nextLabel}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        share();
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-white/80 transition hover:bg-white/20"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      share
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={next}
            disabled={loading || !!error}
            className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-semibold text-zinc-900 shadow-lg shadow-amber-500/20 transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
          >
            {nextLabel}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 text-center text-[11px] text-white/40">
          swipe, tap, or hit space · esc to close
        </p>
      </div>
    </motion.div>
  );
}

export default RevealButton;
