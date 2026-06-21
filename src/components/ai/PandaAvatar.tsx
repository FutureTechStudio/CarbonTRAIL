import { P } from "@/theme/palette";

type PandaAvatarProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE_MAP = {
  sm: "h-7 w-7 text-sm",
  md: "h-9 w-9 text-base",
  lg: "h-11 w-11 text-lg",
};

export function PandaAvatar({ size = "md", className = "" }: PandaAvatarProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${SIZE_MAP[size]} ${className}`}
      style={{ background: `${P.green}18`, boxShadow: `0 0 0 2px ${P.sage}` }}
      aria-hidden="true"
    >
      🐼
    </span>
  );
}
