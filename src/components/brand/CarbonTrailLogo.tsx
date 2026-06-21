import { P } from "@/theme/palette";

type CarbonTrailLogoProps = {
  size?: "sm" | "md" | "lg";
  showBackground?: boolean;
  className?: string;
};

const SIZES = {
  sm: 32,
  md: 36,
  lg: 44,
} as const;

/** Branded mark: winding trail path with leaf — replaces emoji sprout icon. */
export function CarbonTrailLogo({
  size = "md",
  showBackground = true,
  className = "",
}: CarbonTrailLogoProps) {
  const px = SIZES[size];
  const radius = size === "lg" ? "rounded-2xl" : "rounded-xl";

  return (
    <div
      className={`flex shrink-0 items-center justify-center ${showBackground ? radius : ""} ${className}`}
      style={{
        width: px,
        height: px,
        background: showBackground ? P.green : "transparent",
        boxShadow: showBackground ? "0 2px 8px rgba(45, 122, 79, 0.28)" : undefined,
      }}
      aria-hidden="true"
    >
      <svg width={px * 0.62} height={px * 0.62} viewBox="0 0 24 24" fill="none">
        <path
          d="M4 18C7 14 8 10 11 8C14 6 15 4 19 3"
          stroke={showBackground ? "#FFFFFF" : P.green}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M4 18C6.5 16 9 15.5 12 13.5C15 11.5 17.5 10 20 7.5"
          stroke={showBackground ? "rgba(255,255,255,0.45)" : `${P.leaf}88`}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <circle cx="4" cy="18" r="1.6" fill={showBackground ? "#FFFFFF" : P.green} />
        <path
          d="M19 1.5C20.2 2.8 21.5 3.2 21.8 4.6C22.1 6 20.8 6.8 19.6 6.2C18.2 5.5 18.4 3.4 19 1.5Z"
          fill={showBackground ? P.lightGreen : P.leaf}
        />
        <path
          d="M19.8 4.2L21.6 3.4"
          stroke={showBackground ? "#FFFFFF" : P.green}
          strokeWidth="0.9"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
