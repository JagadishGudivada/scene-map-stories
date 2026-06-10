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
    <linearGradient id="sarevista-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1A1A1A"/>
      <stop offset="100%" stop-color="#3D8B8B"/>
    </linearGradient>
    <linearGradient id="sarevista-sun" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#F4C56B"/>
      <stop offset="100%" stop-color="#C4821E"/>
    </linearGradient>
  </defs>
  <circle cx="24" cy="24" r="22" fill="url(#sarevista-sky)"/>
  <circle cx="24" cy="26" r="9" fill="url(#sarevista-sun)"/>
  <path d="M2 34 L14 26 L22 31 L34 21 L46 30 L46 46 L2 46 Z" fill="#0D0D0D" opacity="0.85"/>
  <path d="M2 38 L10 33 L18 36 L28 30 L38 34 L46 31 L46 46 L2 46 Z" fill="#0D0D0D"/>
  <path d="M30 8 Q33 11 30 14 Q33 17 30 20" fill="none" stroke="#E8A838" stroke-width="1.5" stroke-linecap="round"/>
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
      style={{ filter: "drop-shadow(0 4px 12px rgba(232, 168, 56, 0.35))", willChange: "transform" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sarevista-sky-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1A1A1A" />
          <stop offset="100%" stopColor="#3D8B8B" />
        </linearGradient>
        <linearGradient id="sarevista-sun-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F4C56B" />
          <stop offset="100%" stopColor="#C4821E" />
        </linearGradient>
        <clipPath id="sarevista-circle-clip">
          <circle cx="24" cy="24" r="22" />
        </clipPath>
      </defs>
      {/* Sky disc — horizon */}
      <circle cx="24" cy="24" r="22" fill="url(#sarevista-sky-grad)" />
      {/* Setting sun */}
      <circle className="sarevista-logo-sun" cx="24" cy="26" r="9" fill="url(#sarevista-sun-grad)" style={{ transformOrigin: "24px 26px", willChange: "transform" }} />
      {/* Distant mountain ridge */}
      <path
        d="M2 34 L14 26 L22 31 L34 21 L46 30 L46 46 L2 46 Z"
        fill="#0D0D0D"
        opacity="0.55"
        clipPath="url(#sarevista-circle-clip)"
      />
      {/* Foreground ridge */}
      <path
        d="M2 38 L10 33 L18 36 L28 30 L38 34 L46 31 L46 46 L2 46 Z"
        fill="#0D0D0D"
        clipPath="url(#sarevista-circle-clip)"
      />
      {/* Paper-plane trail (travel) */}
      <path
        className="sarevista-logo-trail"
        d="M8 14 Q16 10 22 14 T36 12"
        fill="none"
        stroke="#E8A838"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeDasharray="2 3"
        opacity="0.85"
      />
      {/* Paper plane */}
      <path
        className="sarevista-logo-plane"
        d="M36 12 L40 8 L38 14 L34 13 Z"
        fill="#E8A838"
        style={{ transformOrigin: "37px 11px", willChange: "transform" }}
      />
      {/* Outer ring */}
      <circle cx="24" cy="24" r="22" fill="none" stroke="#E8A838" strokeWidth="1" opacity="0.4" />
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
