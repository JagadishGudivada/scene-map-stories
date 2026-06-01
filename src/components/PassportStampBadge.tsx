import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { countryCodeToFlag, type PassportBadge } from "@/hooks/usePassportBadges";
import { invokeCached } from "@/lib/aiClientCache";

type PassportStampBadgeProps = {
  badge?: PassportBadge;
  country: string;
  countryCode?: string;
  locked?: boolean;
  generateOnMiss?: boolean;
  className?: string;
  size?: "sm" | "md";
};

const AI_STAMP_STYLE_VERSION = "v3-vertex-ai";

function toStampDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "EST. RECENT";
  return `EST. ${parsed.getFullYear()}`;
}

function getTierInk(tier: string, isLocked: boolean) {
  if (isLocked) return "#2f2f31";
  if (tier === "gold") return "#8a5b00";
  if (tier === "silver") return "#12538c";
  return "#9a3412";
}

export default function PassportStampBadge({
  badge,
  country,
  countryCode,
  locked = false,
  generateOnMiss = false,
  className,
  size = "md",
}: PassportStampBadgeProps) {
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const isLocked = locked || !badge;
  const badgeCountry = badge?.country ?? country;
  const badgeCountryCode = (badge?.countryCode ?? countryCode ?? "UN").toUpperCase();
  const tier = badge?.tier ?? "bronze";

  const stampSizeClass = size === "sm" ? "w-36 h-36" : "w-48 h-48";
  const inkColor = useMemo(() => getTierInk(tier, isLocked), [tier, isLocked]);
  const stampedAngle = useMemo(() => ((badgeCountry.length % 7) - 3) * 0.8, [badgeCountry.length]);
  const earnedYear = useMemo(() => {
    const parsed = new Date(badge?.earnedAt || "");
    if (Number.isNaN(parsed.getTime())) return "recent";
    return String(parsed.getFullYear());
  }, [badge?.earnedAt]);

  useEffect(() => {
    let cancelled = false;

    if (isLocked) {
      setGeneratedImageUrl(null);
      return () => {
        cancelled = true;
      };
    }

    const modeKey = generateOnMiss ? "gen" : "cache-only";
    const cacheKey = `${AI_STAMP_STYLE_VERSION}|${modeKey}|${badgeCountryCode}|${tier}|${badgeCountry}|${earnedYear}`;

    (async () => {
      try {
        const result = await invokeCached<{ imageDataUrl?: string }>(
          "passport-stamp-art",
          {
            country: badgeCountry,
            countryCode: badgeCountryCode,
            tier,
            earnedAt: badge?.earnedAt,
            generate: generateOnMiss,
          },
          cacheKey,
          { ttlSeconds: 60 * 60 * 24 * 30, persist: "local" }
        );

        if (cancelled) return;
        setGeneratedImageUrl(result?.imageDataUrl || null);
      } catch {
        if (!cancelled) setGeneratedImageUrl(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [badge?.earnedAt, badgeCountry, badgeCountryCode, earnedYear, generateOnMiss, isLocked, tier]);

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn("relative rounded-full overflow-hidden", stampSizeClass)}
        style={{ boxShadow: isLocked ? undefined : "0 0 0 1px rgba(255,255,255,0.12)" }}
      >
        {generatedImageUrl ? (
          <img
            src={generatedImageUrl}
            alt={`${badgeCountry} passport stamp`}
            className="w-full h-full object-cover"
            style={{ transform: `scale(1.28) rotate(${stampedAngle}deg)` }}
          />
        ) : (
          <svg
            viewBox="0 0 220 220"
            className="w-full h-full"
            style={{ transform: `rotate(${stampedAngle}deg)` }}
            role="img"
            aria-label={`${badgeCountry} passport stamp`}
          >
            <circle cx="110" cy="110" r="104" fill={inkColor} opacity={isLocked ? 0.7 : 0.9} />
            <circle cx="110" cy="110" r="86" fill={isLocked ? "#1f1f21" : "#f5ecd8"} />
            <circle cx="110" cy="110" r="80" fill="none" stroke={inkColor} strokeWidth="2.4" />
            <circle cx="110" cy="110" r="66" fill="none" stroke={inkColor} strokeWidth="1.6" />
            <text x="110" y="62" textAnchor="middle" fontSize="11" fontWeight="800" fill={inkColor}>
              {badgeCountry.toUpperCase().slice(0, 18)}
            </text>
            <text x="110" y="95" textAnchor="middle" fontSize="26">
              {isLocked ? "🔒" : countryCodeToFlag(badgeCountryCode)}
            </text>
            <text x="110" y="115" textAnchor="middle" fontSize="9" letterSpacing="1" fill={inkColor}>
              SAREVISTA FILMING SCOUT
            </text>
            <text x="110" y="144" textAnchor="middle" fontSize="8" letterSpacing="1" fill={inkColor}>
              {isLocked ? "LOCKED STAMP" : `MEMORABLE JOURNEYS • ${toStampDate(badge?.earnedAt || "")}`}
            </text>
          </svg>
        )}
      </div>
    </div>
  );
}
