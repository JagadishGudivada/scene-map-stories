import { Compass, Plane, Camera, Mountain, LucideIcon } from "lucide-react";

export type Tier = {
  id: "explorer" | "wanderer" | "scout" | "trailblazer";
  label: string;
  min: number;
  icon: LucideIcon;
  color: string; // tailwind text color
};

export const TIERS: Tier[] = [
  { id: "explorer",   label: "Explorer",        min: 0,  icon: Compass,  color: "text-teal" },
  { id: "wanderer",   label: "Wanderer",        min: 5,  icon: Plane,    color: "text-amber" },
  { id: "scout",      label: "Location Scout",  min: 15, icon: Camera,   color: "text-amber" },
  { id: "trailblazer",label: "Trailblazer",     min: 40, icon: Mountain, color: "text-amber" },
];

export function getTier(count: number): Tier {
  return [...TIERS].reverse().find((t) => count >= t.min) ?? TIERS[0];
}

export function nextTier(count: number): Tier | null {
  return TIERS.find((t) => t.min > count) ?? null;
}

// Ordered ascending. Each fires once per user.
export const MILESTONES = [1, 5, 10, 25, 50];

export function milestoneMessage(n: number): string {
  switch (n) {
    case 1:  return "First location logged. Your memory map begins.";
    case 5:  return "5 locations added! You're a Location Scout 🎬";
    case 10: return "10 down. Your world is lighting up.";
    case 25: return "25 stops on your cinematic passport 🌍";
    case 50: return "50 locations! True Trailblazer status.";
    default: return `${n} locations logged`;
  }
}
