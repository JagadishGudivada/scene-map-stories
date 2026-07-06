export interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "full" | "icon" | "wordmark";
  showBeta?: boolean;
  responsive?: boolean;
  /** Force the pin+eye stroke color. Defaults to gold on any surface. */
  markTone?: "gold" | "ink" | "cream";
  className?: string;
}

const ICON_HEIGHT: Record<NonNullable<LogoProps["size"]>, number> = {
  xs: 20,
  sm: 26,
  md: 32,
  lg: 44,
  xl: 60,
};

const WORDMARK_SIZE: Record<NonNullable<LogoProps["size"]>, number> = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 30,
  xl: 44,
};

const RESPONSIVE_ICON: Record<NonNullable<LogoProps["size"]>, string> = {
  xs: "h-5 sm:h-5 md:h-6",
  sm: "h-6 sm:h-6 md:h-7",
  md: "h-7 sm:h-8 md:h-9",
  lg: "h-9 sm:h-10 md:h-12",
  xl: "h-12 sm:h-14 md:h-16",
};

const RESPONSIVE_TEXT: Record<NonNullable<LogoProps["size"]>, string> = {
  xs: "text-xs sm:text-xs md:text-sm",
  sm: "text-sm sm:text-sm md:text-base",
  md: "text-base sm:text-lg md:text-[22px]",
  lg: "text-lg sm:text-xl md:text-[28px]",
  xl: "text-2xl sm:text-3xl md:text-[44px]",
};

// Shared, page-scoped gradient def id (safe to inline multiple times — same id resolves).
const GRAD_ID = "sarevistaGoldGrad";

function Mark({
  height,
  tone = "gold",
  className,
}: {
  height: number;
  tone?: "gold" | "ink" | "cream";
  className?: string;
}) {
  // width : height ratio from 120x140 viewbox
  const width = Math.round((height * 120) / 140);
  const strokeColor =
    tone === "ink"
      ? "#14100D"
      : tone === "cream"
      ? "hsl(var(--ivory))"
      : `url(#${GRAD_ID})`;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 120 140"
      className={`sarevista-mark shrink-0 ${className ?? ""}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={GRAD_ID} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F4C77B" />
          <stop offset="100%" stopColor="#D3771F" />
        </linearGradient>
      </defs>
      {/* Pin */}
      <path
        d="M60 132 C46 112 22 80 22 48 C22 23.7 39.7 6 60 6 C80.3 6 98 23.7 98 48 C98 80 74 112 60 132 Z"
        fill="none"
        stroke={strokeColor}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Eye */}
      <path
        d="M37 48 C44 35 76 35 83 48 C76 61 44 61 37 48 Z"
        fill="none"
        stroke={strokeColor}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Pupil — always gold */}
      <circle cx="60" cy="48" r="9" fill={`url(#${GRAD_ID})`} />
    </svg>
  );
}

export default function Logo({
  size = "md",
  variant = "full",
  showBeta = false,
  responsive = false,
  markTone = "gold",
  className = "",
}: LogoProps) {
  const iconH = ICON_HEIGHT[size];
  const fontSize = WORDMARK_SIZE[size];

  const wordmark = (
    <span
      className={`sarevista-wordmark font-serif italic ${responsive ? RESPONSIVE_TEXT[size] : ""}`}
      style={
        responsive
          ? { lineHeight: 1 }
          : { fontSize: `${fontSize}px`, lineHeight: 1 }
      }
    >
      <span className="sarevista-wm-base">Sa</span>
      <span className="sarevista-wm-base">re</span>
      <span className="sarevista-wm-accent">vista</span>
    </span>
  );

  return (
    <>
      <style>{`
        .sarevista-wordmark {
          font-family: 'Lora', serif;
          font-style: italic;
          font-weight: 500;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          display: inline-flex;
          align-items: baseline;
          color: hsl(var(--foreground));
        }
        .sarevista-wm-base { color: currentColor; }
        .sarevista-wm-accent {
          background: linear-gradient(120deg, #F4C77B 0%, #D3771F 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
        }
        .sarevista-beta {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 999px;
          border: 1px solid #D3771F;
          color: #F4C77B;
          font-family: 'Inter', sans-serif;
          font-style: normal;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          line-height: 1;
          transform: translateY(-2px);
          margin-left: 2px;
        }
      `}</style>
      <span
        className={`sarevista-logo inline-flex items-center gap-2 ${className}`}
      >
        {variant !== "wordmark" && (
          <span
            className={responsive ? `inline-flex items-end ${RESPONSIVE_ICON[size]}` : "inline-flex items-end"}
            style={responsive ? undefined : { height: iconH }}
          >
            <Mark height={iconH} tone={markTone} />
          </span>
        )}
        {variant !== "icon" && (
          <span className="inline-flex items-baseline gap-1">
            {wordmark}
            {showBeta && <span className="sarevista-beta">BETA</span>}
          </span>
        )}
      </span>
    </>
  );
}
