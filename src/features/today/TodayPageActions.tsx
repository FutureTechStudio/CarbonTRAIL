import { Sliders } from "lucide-react";
import { ShareTodayButton } from "@/features/today/ShareTodayButton";
import { P } from "@/theme/palette";

const DISPLAY_FONT = "Plus Jakarta Sans, sans-serif";

type TodayPageActionsProps = {
  onAskPanda: () => void;
  onSimulate: () => void;
  createdKg: number;
  confidence: number;
  greenImpactKg: number;
};

export function TodayPageActions({
  onAskPanda,
  onSimulate,
  createdKg,
  confidence,
  greenImpactKg,
}: TodayPageActionsProps) {
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onAskPanda}
        className="flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ background: P.green, fontFamily: DISPLAY_FONT, outlineColor: P.green }}
      >
        Ask Panda
      </button>

      <button
        type="button"
        onClick={onSimulate}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold transition-all hover:bg-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ color: P.charcoal, borderColor: "#D4C8B8", fontFamily: DISPLAY_FONT, outlineColor: P.green }}
      >
        <Sliders size={15} aria-hidden="true" />
        Simulate Changes
      </button>

      <ShareTodayButton createdKg={createdKg} confidence={confidence} greenImpactKg={greenImpactKg} />
    </div>
  );
}
