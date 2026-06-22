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

export default function Logo({
  size = "md",
  variant = "full",
  showBeta = false,
  className = "",
}: LogoProps) {
  const { theme } = useTheme();
  const src = theme === "light" ? logoLight : logoDark;
  const px = SIZE_PX[size];

  return (
    <span className={`sarevista-logo inline-flex items-center gap-2 ${className}`}>
      <img
        src={src}
        alt="Sarevista"
        width={px}
        height={px}
        className="sarevista-logo-img select-none"
        style={{ height: px, width: "auto", display: "block" }}
        draggable={false}
      />
      {showBeta && variant !== "icon" && (
        <span className="bg-amber/15 border border-amber/40 text-amber rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">
          BETA
        </span>
      )}
    </span>
  );
}
