import { formatGreenImpactMessage, type GreenImpactResult } from "@/logic/greenImpact";
import { P } from "@/theme/palette";

const DISPLAY_FONT = "Plus Jakarta Sans, sans-serif";

export function GreenImpactCard({ impact, onDetails }: { impact: GreenImpactResult; onDetails?: () => void }) {
  const message =
    impact.greenImpactKg > 0
      ? `You're ${impact.greenImpactKg.toFixed(1)} kg CO₂ lower than your usual day.`
      : formatGreenImpactMessage(impact);

  return (
    <article
      className="rounded-[1.25rem] border p-4"
      style={{
        background: `linear-gradient(145deg, ${P.green}10 0%, rgba(255,246,219,0.8) 100%)`,
        borderColor: `${P.green}28`,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold" style={{ color: P.charcoal, fontFamily: DISPLAY_FONT }}>
          Green Impact
        </p>
        <span className="text-lg" aria-hidden="true">
          🌿
        </span>
      </div>

      <p className="mt-1 text-[11px]" style={{ color: P.faintText }}>
        Estimated CO₂ saved vs your usual routine
      </p>

      <p className="mt-2 text-xs leading-relaxed" style={{ color: P.mutedText }}>
        {message}
      </p>
      {onDetails ? (
        <button
          type="button"
          onClick={onDetails}
          className="mt-3 flex w-full items-center justify-between rounded-full border px-3 py-2 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: "rgba(253,250,244,0.72)", borderColor: `${P.green}20`, color: P.charcoal, outlineColor: P.green }}
        >
          See impact details
          <span aria-hidden="true">›</span>
        </button>
      ) : null}
    </article>
  );
}
