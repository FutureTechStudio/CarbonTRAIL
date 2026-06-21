import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { P } from "@/theme/palette";

type ChipOption = { label: string; value: string | number };

type SetupQuestionCardProps = {
  title: string;
  label: string;
  helperText?: string;
  Icon: LucideIcon;
  options: ChipOption[];
  selected?: string | number;
  onSelect: (value: string | number) => void;
  customInput?: ReactNode;
};

export function SetupQuestionCard({
  title,
  label,
  helperText,
  Icon,
  options,
  selected,
  onSelect,
  customInput,
}: SetupQuestionCardProps) {
  return (
    <article
      className="relative overflow-hidden rounded-[1.35rem] border p-4 shadow-sm sm:p-5"
      style={{
        background: "rgba(253, 250, 244, 0.88)",
        borderColor: "rgba(255,255,255,0.7)",
        boxShadow: "0 10px 32px rgba(42, 54, 40, 0.06)",
      }}
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-40"
        style={{ background: `radial-gradient(circle, ${P.lightGreen}55 0%, transparent 70%)` }}
        aria-hidden="true"
      />

      <div className="relative flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
          style={{ background: `${P.green}14`, color: P.green }}
          aria-hidden="true"
        >
          <Icon size={18} strokeWidth={2.2} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: P.faintText }}>
            {title}
          </p>
          <h2 className="mt-0.5 text-base font-bold leading-snug sm:text-lg" style={{ color: P.charcoal }}>
            {label}
          </h2>
          {helperText ? (
            <p className="mt-1.5 text-xs leading-relaxed" style={{ color: P.mutedText }}>
              {helperText}
            </p>
          ) : null}
        </div>
      </div>

      <div className="relative mt-4 flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected === option.value;
          return (
            <button
              key={`${option.label}-${String(option.value)}`}
              type="button"
              onClick={() => onSelect(option.value)}
              className="rounded-full border px-3 py-2 text-xs font-medium transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:px-3.5 sm:text-sm"
              style={{
                background: active ? P.green : "rgba(255,255,255,0.72)",
                borderColor: active ? P.green : P.border,
                color: active ? "white" : P.charcoal,
                outlineColor: P.green,
                boxShadow: active ? "0 4px 14px rgba(45, 122, 79, 0.22)" : "none",
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {customInput ? <div className="relative mt-3">{customInput}</div> : null}
    </article>
  );
}
