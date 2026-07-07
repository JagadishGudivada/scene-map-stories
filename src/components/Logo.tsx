import logoAsset from "@/assets/sarevista-logo-transparent-cropped.png.asset.json";

export interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "full" | "icon" | "wordmark";
  showBeta?: boolean;
  responsive?: boolean;
  /** Kept for API compatibility; ignored because the mark is baked into the image. */
  markTone?: "gold" | "ink" | "cream";
  className?: string;
}

const HEIGHT: Record<NonNullable<LogoProps["size"]>, number> = {
  xs: 20,
  sm: 26,
  md: 32,
  lg: 44,
  xl: 60,
};

const RESPONSIVE_HEIGHT: Record<NonNullable<LogoProps["size"]>, string> = {
  xs: "h-5 sm:h-5 md:h-6",
  sm: "h-6 sm:h-6 md:h-7",
  md: "h-7 sm:h-8 md:h-9",
  lg: "h-9 sm:h-10 md:h-12",
  xl: "h-12 sm:h-14 md:h-16",
};

const WORDMARK_SIZE: Record<NonNullable<LogoProps["size"]>, string> = {
  xs: "text-base",
  sm: "text-lg",
  md: "text-xl",
  lg: "text-3xl",
  xl: "text-4xl",
};

const RESPONSIVE_WORDMARK: Record<NonNullable<LogoProps["size"]>, string> = {
  xs: "text-sm sm:text-base md:text-base",
  sm: "text-base sm:text-lg md:text-lg",
  md: "text-lg sm:text-xl md:text-2xl",
  lg: "text-2xl sm:text-3xl md:text-4xl",
  xl: "text-3xl sm:text-4xl md:text-5xl",
};

export default function Logo({
  size = "md",
  variant = "full",
  showBeta = false,
  responsive = false,
  className = "",
}: LogoProps) {
  const height = HEIGHT[size];
  const showMark = variant !== "wordmark";
  const showWord = variant !== "icon";

  return (
    <>
      <style>{`
        .sarevista-logo {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }
        .sarevista-logo-img {
          width: auto;
          height: 100%;
          object-fit: contain;
        }
        .sarevista-wordmark {
          font-family: 'Lora', 'Instrument Serif', serif;
          font-style: italic;
          font-weight: 500;
          letter-spacing: 0.02em;
          line-height: 1;
          color: #F5F0E8;
          text-transform: none;
          white-space: nowrap;
        }
        .sarevista-wordmark .vista {
          background: linear-gradient(135deg, #F4C77B 0%, #D3771F 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
        }
        :root.light .sarevista-wordmark {
          color: #14100D;
        }
        .sarevista-beta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
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
          flex-shrink: 0;
        }
      `}</style>
      <span className={`sarevista-logo ${className}`} aria-label="Sarevista">
        {showMark && (
          <span
            className={`inline-flex items-center ${responsive ? RESPONSIVE_HEIGHT[size] : ""}`}
            style={responsive ? undefined : { height }}
          >
            <img
              src={logoAsset.url}
              alt="Sarevista"
              className="sarevista-logo-img"
              loading="eager"
              decoding="async"
              width={height}
              height={height}
            />
          </span>
        )}
        {showWord && (
          <span className={`sarevista-wordmark ${responsive ? RESPONSIVE_WORDMARK[size] : WORDMARK_SIZE[size]}`}>
            Sare<span className="vista">vista</span>
          </span>
        )}
        {showBeta && <span className="sarevista-beta">BETA</span>}
      </span>
    </>
  );
}
