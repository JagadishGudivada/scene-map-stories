import { CSSProperties } from "react";
import iconUrl from "@/assets/sarevista-icon.png";

export interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "full" | "icon" | "wordmark";
  showBeta?: boolean;
  className?: string;
}

const SIZE_MAP: Record<NonNullable<LogoProps["size"]>, { icon: number; font: number }> = {
  xs: { icon: 22, font: 16 },
  sm: { icon: 28, font: 20 },
  md: { icon: 36, font: 26 },
  lg: { icon: 48, font: 34 },
  xl: { icon: 64, font: 44 },
};

/** Public URL of the brand icon — useful for share images, OG, favicon. */
export const LogoIconUrl = iconUrl;

export default function Logo({
  size = "md",
  variant = "full",
  showBeta = false,
  className = "",
}: LogoProps) {
  const { icon, font } = SIZE_MAP[size];

  const iconEl = (
    <img
      src={iconUrl}
      width={icon}
      height={Math.round(icon * (118 / 81))}
      alt=""
      aria-hidden="true"
      className="sarevista-logo-icon select-none"
      style={{
        filter: "drop-shadow(0 4px 12px rgba(232, 168, 56, 0.25))",
        willChange: "transform",
      }}
      draggable={false}
    />
  );

  const wordmark = (
    <span
      className="sarevista-logo-wordmark font-serif"
      style={
        {
          fontFamily: '"Instrument Serif", Georgia, serif',
          fontSize: `${font}px`,
          letterSpacing: "-0.01em",
          color: "currentColor",
          lineHeight: 1,
        } as CSSProperties
      }
    >
      sarevista
    </span>
  );

  const beta = showBeta && (
    <span className="bg-amber/15 border border-amber/40 text-amber rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ml-2">
      BETA
    </span>
  );

  return (
    <span className={`sarevista-logo inline-flex items-center gap-2 ${className}`}>
      {variant !== "wordmark" && iconEl}
      {variant !== "icon" && (
        <span className="inline-flex items-center">
          {wordmark}
          {beta}
        </span>
      )}
    </span>
  );
}
