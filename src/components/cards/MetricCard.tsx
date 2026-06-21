import { P } from "@/theme/palette";

const DISPLAY_FONT = "Plus Jakarta Sans, sans-serif";

export function MetricCard({
  label,
  value,
  sub,
  emoji,
  accent = P.green,
}: {
  label: string;
  value: string;
  sub?: string;
  emoji?: string;
  accent?: string;
}) {
  return (
    <article
      className="flex h-full min-h-[116px] flex-col gap-1.5 rounded-2xl border p-4"
      style={{
        background: `linear-gradient(155deg, ${accent}18 0%, rgba(253,250,244,0.96) 58%)`,
        borderColor: `${accent}30`,
        boxShadow: "0 6px 20px rgba(42, 54, 40, 0.04)",
      }}
    >
      <div className="flex items-center gap-1.5">
        {emoji ? (
          <span className="text-lg leading-none" aria-hidden="true">
            {emoji}
          </span>
        ) : null}
        <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: P.mutedText }}>
          {label}
        </p>
      </div>
      <p className="mt-auto text-[1.65rem] font-extrabold leading-tight sm:text-3xl" style={{ color: P.charcoal, fontFamily: DISPLAY_FONT }}>
        {value}
      </p>
      {sub ? (
        <p className="text-xs font-medium" style={{ color: P.faintText }}>
          {sub}
        </p>
      ) : null}
    </article>
  );
}
