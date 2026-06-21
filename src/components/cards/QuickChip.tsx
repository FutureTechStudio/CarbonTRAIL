import type { ButtonHTMLAttributes } from "react";
import { P } from "@/theme/palette";

export function QuickChip({
  active,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className="rounded-full border px-3 py-1.5 text-sm focus-visible:outline-2"
      style={{
        background: active ? P.green : "white",
        borderColor: active ? P.green : "#d9cbb7",
        color: active ? "white" : P.charcoal,
      }}
    >
      {children}
    </button>
  );
}
