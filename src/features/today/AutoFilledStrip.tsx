import { Leaf } from "lucide-react";
import { P } from "@/theme/palette";

type AutoFilledStripProps = {
  confidence: number;
  onConfirm: () => void;
  onEdit: () => void;
};

export function AutoFilledStrip({ confidence, onConfirm, onEdit }: AutoFilledStripProps) {
  return (
    <div
      className="flex flex-col gap-3 rounded-[1.15rem] border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      style={{
        background: "linear-gradient(90deg, rgba(228,239,231,0.95) 0%, rgba(253,250,244,0.92) 100%)",
        borderColor: "#c8e0c4",
      }}
      role="status"
      aria-live="polite"
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <div
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `${P.green}18`, color: P.green }}
          aria-hidden="true"
        >
          <Leaf size={16} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: P.charcoal }}>
            Today was auto-filled from your usual routine.
          </p>
          <p className="text-xs" style={{ color: P.mutedText }}>
            Confidence: {Math.round(confidence * 100)}%
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 sm:shrink-0">
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-xl px-3 py-1.5 text-xs font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: P.green, outlineColor: P.green }}
        >
          Confirm day
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-xl border px-3 py-1.5 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ borderColor: P.border, color: P.charcoal, outlineColor: P.green }}
        >
          Edit activities
        </button>
      </div>
    </div>
  );
}
