import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Guards against a bare year/ID leaking into a "title" field from upstream
// merges or bad data — a real title is never purely numeric.
export function isDisplayableTitle(value?: string | null): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return !/^\d+$/.test(trimmed);
}
