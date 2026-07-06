import transparentLogo from "@/assets/sarevista-logo-transparent-cropped.png";




export interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "full" | "icon" | "wordmark";
  showBeta?: boolean;
  responsive?: boolean;
  className?: string;
}

const SIZE_PX: Record<NonNullable<LogoProps["size"]>, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 72,
};

const WORDMARK_SIZE: Record<NonNullable<LogoProps["size"]>, number> = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 28,
  xl: 48,
};

const RESPONSIVE_ICON: Record<NonNullable<LogoProps["size"]>, string> = {
  xs: "h-5 sm:h-6 md:h-6",
  sm: "h-6 sm:h-7 md:h-8",
  md: "h-7 sm:h-8 md:h-10",
  lg: "h-8 sm:h-10 md:h-14",
  xl: "h-10 sm:h-12 md:h-[72px]",
};

const RESPONSIVE_TEXT: Record<NonNullable<LogoProps["size"]>, string> = {
  xs: "text-xs sm:text-xs md:text-sm",
  sm: "text-sm sm:text-sm md:text-base",
  md: "text-base sm:text-lg md:text-[22px]",
  lg: "text-lg sm:text-xl md:text-[28px]",
  xl: "text-xl sm:text-2xl md:text-[48px]",
};

export default function Logo({
  size = "md",
  variant = "full",
  showBeta = false,
  responsive = false,
  className = "",
}: LogoProps) {
  const px = SIZE_PX[size];
  const fontSize = WORDMARK_SIZE[size];

  const icon = (
    <img
      src={transparentLogo}
      alt="Sarevista"
      width={px}
      height={px}
      className={`sarevista-logo-img select-none w-auto ${responsive ? RESPONSIVE_ICON[size] : ""}`}
      style={responsive ? undefined : { height: px, width: "auto", display: "block" }}
      draggable={false}
    />
  );

  const wordmark = (
    <span
      className={`sarevista-logo-wordmark font-share tracking-tight ${responsive ? RESPONSIVE_TEXT[size] : ""}`}
      style={
        responsive
          ? { lineHeight: 1, color: "currentColor" }
          : { fontSize: `${fontSize}px`, lineHeight: 1, color: "currentColor" }
      }
    >
      Sarevista
    </span>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..9001,400..900&display=swap');

        .sarevista-logo-wordmark {
          font-family: 'Playfair Display', serif;
        }
      `}</style>
      <span className={`sarevista-logo inline-flex items-center gap-1 ${className}`}>
        {variant !== "wordmark" && icon}
        {variant !== "icon" && (
          <span className="inline-flex items-center gap-1 text-foreground">
            {wordmark}
            {/* {showBeta && (
              <span className="bg-amber/15 border border-amber/40 text-amber rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                BETA
              </span>
            )} */}
          </span>
        )}
      </span>
    </>
  );
}


