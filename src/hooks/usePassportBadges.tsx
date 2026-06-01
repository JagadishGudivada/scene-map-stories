import { useMemo } from "react";
import type { VisitedSpotRow } from "@/hooks/useSaved";

export type BadgeTier = "bronze" | "silver" | "gold";

export type PassportBadge = {
  id: string;
  country: string;
  countryCode: string;
  tier: BadgeTier;
  visitCount: number;
  earnedAt: string;
};

const COUNTRY_TO_CODE: Record<string, string> = {
  "united states": "US",
  usa: "US",
  "united kingdom": "GB",
  uk: "GB",
  france: "FR",
  italy: "IT",
  japan: "JP",
  india: "IN",
  canada: "CA",
  australia: "AU",
  brazil: "BR",
  spain: "ES",
};

const CODE_TO_FLAG: Record<string, string> = {
  US: "🇺🇸",
  GB: "🇬🇧",
  FR: "🇫🇷",
  IT: "🇮🇹",
  JP: "🇯🇵",
  IN: "🇮🇳",
  CA: "🇨🇦",
  AU: "🇦🇺",
  BR: "🇧🇷",
  ES: "🇪🇸",
};

export function requiredVisitsForTier(tier: BadgeTier): number {
  if (tier === "gold") return 6;
  if (tier === "silver") return 3;
  return 1;
}

export function getBadgeTierForVisits(visitCount: number): BadgeTier {
  if (visitCount >= requiredVisitsForTier("gold")) return "gold";
  if (visitCount >= requiredVisitsForTier("silver")) return "silver";
  return "bronze";
}

export function countryToCode(country: string): string {
  const key = country.trim().toLowerCase();
  const mapped = COUNTRY_TO_CODE[key];
  if (mapped) return mapped;
  const letters = key.replace(/[^a-z]/g, "").slice(0, 2).toUpperCase();
  return letters || "UN";
}

export function countryCodeToFlag(countryCode: string): string {
  const normalized = countryCode.toUpperCase();
  if (CODE_TO_FLAG[normalized]) return CODE_TO_FLAG[normalized];
  if (!/^[A-Z]{2}$/.test(normalized)) return "📍";
  return String.fromCodePoint(...normalized.split("").map((c) => 127397 + c.charCodeAt(0)));
}

export function usePassportBadges(spots: VisitedSpotRow[], userId?: string) {
  const badges = useMemo<PassportBadge[]>(() => {
    if (!userId || spots.length === 0) return [];

    const grouped = new Map<string, VisitedSpotRow[]>();
    for (const spot of spots) {
      const country = (spot.country || "Unknown Country").trim();
      if (!grouped.has(country)) grouped.set(country, []);
      grouped.get(country)!.push(spot);
    }

    return Array.from(grouped.entries())
      .map(([country, entries]) => {
        const visitCount = entries.length;
        const countryCode = countryToCode(country);
        const tier = getBadgeTierForVisits(visitCount);
        return {
          id: `${countryCode}-${country.toLowerCase().replace(/\s+/g, "-")}`,
          country,
          countryCode,
          tier,
          visitCount,
          earnedAt: new Date().toISOString(),
        } satisfies PassportBadge;
      })
      .sort((a, b) => a.country.localeCompare(b.country));
  }, [spots, userId]);

  return { badges };
}
