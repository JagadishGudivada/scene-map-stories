import { CSSProperties } from "react";

export interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "full" | "icon" | "wordmark";
  showBeta?: boolean;
  className?: string;
}

const SIZE_MAP: Record<NonNullable<LogoProps["size"]>, { icon: number; font: number; showNotches: boolean }> = {
  xs: { icon: 20, font: 14, showNotches: false },
  sm: { icon: 28, font: 18, showNotches: false },
  md: { icon: 36, font: 22, showNotches: true },
  lg: { icon: 48, font: 28, showNotches: true },
  xl: { icon: 64, font: 36, showNotches: true },
};

/** Raw icon SVG markup string (useful for favicon / og:image generation). */
export const LogoIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <defs>
    <linearGradient id="sarevista-pin" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(160 .5 .5)">
      <stop offset="0%" stop-color="#E8A838"/>
      <stop offset="100%" stop-color="#C4821E"/>
    </linearGradient>
  </defs>
  <path d="M24 2 C13.5 2 6 9.8 6 19.5 C6 29 14 36 22 45 C23 46.2 25 46.2 26 45 C34 36 42 29 42 19.5 C42 9.8 34.5 2 24 2 Z" fill="url(#sarevista-pin)"/>
  <path d="M3 14 H7 V18 H3 Z M3 21 H7 V25 H3 Z M3 28 H7 V32 H3 Z M41 14 H45 V18 H41 Z M41 21 H45 V25 H41 Z M41 28 H45 V32 H41 Z" fill="rgba(0,0,0,0.25)"/>
  <path d="M14 19.5 C16.5 15.5 20 14 24 14 C28 14 31.5 15.5 34 19.5 C31.5 23.5 28 25 24 25 C20 25 16.5 23.5 14 19.5 Z" fill="none" stroke="#0D0D0D" stroke-width="1.5" stroke-linejoin="round"/>
  <circle cx="24" cy="19.5" r="4" fill="#0D0D0D"/>
  <circle cx="24" cy="19.5" r="1.6" fill="#F5F0E8"/>
  <circle cx="25.4" cy="18.2" r="0.9" fill="#FFFFFF" opacity="0.2"/>
</svg>
`.trim();

export default function Logo({
  size = "md",
  variant = "full",
  showBeta = false,
  className = "",
}: LogoProps) {
  const { icon, font, showNotches } = SIZE_MAP[size];

  const iconSvg = (
    <svg
      width={icon}
      height={icon}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="sarevista-logo-icon"
      style={{ filter: "drop-shadow(0 4px 12px rgba(232, 168, 56, 0.4))", willChange: "transform" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sarevista-pin-grad" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(160 .5 .5)">
          <stop offset="0%" stopColor="#E8A838" />
          <stop offset="100%" stopColor="#C4821E" />
        </linearGradient>
      </defs>
      {/* Pin body (teardrop) */}
      <path
        className="sarevista-logo-pin"
        d="M24 2 C13.5 2 6 9.8 6 19.5 C6 29 14 36 22 45 C23 46.2 25 46.2 26 45 C34 36 42 29 42 19.5 C42 9.8 34.5 2 24 2 Z"
        fill="url(#sarevista-pin-grad)"
      />
      {/* Film perforations */}
      {showNotches && (
        <path
          d="M3 14 H7 V18 H3 Z M3 21 H7 V25 H3 Z M3 28 H7 V32 H3 Z M41 14 H45 V18 H41 Z M41 21 H45 V25 H41 Z M41 28 H45 V32 H41 Z"
          fill="rgba(0,0,0,0.25)"
        />
      )}
      {/* Eye outline */}
      <path
        d="M14 19.5 C16.5 15.5 20 14 24 14 C28 14 31.5 15.5 34 19.5 C31.5 23.5 28 25 24 25 C20 25 16.5 23.5 14 19.5 Z"
        fill="none"
        stroke="#0D0D0D"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Iris */}
      <circle cx="24" cy="19.5" r="4" fill="#0D0D0D" />
      {/* Pupil */}
      <circle className="sarevista-logo-pupil" cx="24" cy="19.5" r="1.6" fill="#F5F0E8" style={{ transformOrigin: "24px 19.5px", willChange: "transform" }} />
      {/* Highlight */}
      <circle cx="25.4" cy="18.2" r="0.9" fill="#FFFFFF" opacity="0.2" />
    </svg>
  );

  const wordmark = (
    <span
      className="sarevista-logo-wordmark font-serif italic"
      style={
        {
          fontSize: `${font}px`,
          letterSpacing: "-0.02em",
          color: "currentColor",
          lineHeight: 1,
        } as CSSProperties
      }
    >
      Sarevista
    </span>
  );

  const beta = showBeta && (
    <span className="bg-amber/15 border border-amber/40 text-amber rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ml-2">
      BETA
    </span>
  );

  return (
    <span className={`sarevista-logo inline-flex items-center gap-2 ${className}`}>
      <style>{`
        .sarevista-logo:hover .sarevista-logo-pin {
          animation: sarevista-pin-bounce 0.3s ease-out;
        }
        .sarevista-logo:hover .sarevista-logo-pupil {
          animation: sarevista-pupil-pulse 0.6s ease-in-out;
        }
        @keyframes sarevista-pin-bounce {
          0% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
          100% { transform: translateY(0); }
        }
        @keyframes sarevista-pupil-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `}</style>
      {variant !== "wordmark" && iconSvg}
      {variant !== "icon" && (
        <span className="inline-flex items-center">
          {wordmark}
          {beta}
        </span>
      )}
    </span>
  );
}
