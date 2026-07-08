import { getTier, nextTier } from "@/lib/tiers";

export default function TierBadge({ count, className = "" }: { count: number; className?: string }) {
  const tier = getTier(count);
  const next = nextTier(count);
  const Icon = tier.icon;
  return (
    <span
      title={next ? `${next.min - count} more to reach ${next.label}` : "Max tier reached"}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-[0.14em] border border-amber/40 bg-gradient-to-r from-amber/15 to-amber/5 text-amber ${className}`}
    >
      <Icon className="w-3 h-3" />
      {tier.label}
    </span>
  );
}
