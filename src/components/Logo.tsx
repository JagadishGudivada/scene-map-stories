import { useTheme } from "@/hooks/use-theme";
import logoDark from "@/assets/sarevista-logo-dark.png";
import logoLight from "@/assets/sarevista-logo-light.png";

export interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "full" | "icon" | "wordmark";
  showBeta?: boolean;
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
  xl: 36,
};

export default function Logo({
  size = "md",
  variant = "full",
  showBeta = false,
  className = "",
}: LogoProps) {
  const { theme } = useTheme();
  const src = theme === "light" ? logoLight : logoDark;
  const px = SIZE_PX[size];
  const fontSize = WORDMARK_SIZE[size];

  const icon = (
    <img
      src={src}
      alt="Sarevista"
      width={px}
      height={px}
      className="sarevista-logo-img select-none"
      style={{ height: px, width: "auto", display: "block" }}
      draggable={false}
    />
  );

  const wordmark = (
    <span
      className="sarevista-logo-wordmark font-mono tracking-tight"
      style={{
        fontSize: `${fontSize}px`,
        lineHeight: 1,
        color: "currentColor",
      }}
    >
      sarevista
    </span>
  );

  return (
    <span className={`sarevista-logo inline-flex items-center gap-2 ${className}`}>
      {variant !== "wordmark" && icon}
      {variant !== "icon" && (
        <span className="inline-flex items-center gap-2">
          {wordmark}
          {showBeta && (
            <span className="bg-amber/15 border border-amber/40 text-amber rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">
              BETA
            </span>
          )}
        </span>
      )}
    </span>
  );
}

