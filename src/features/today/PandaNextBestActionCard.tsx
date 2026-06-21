import { PandaAvatar } from "@/components/ai/PandaAvatar";
import type { PandaNextBestAction } from "@/features/today/todayHelpers";
import { P } from "@/theme/palette";

const DISPLAY_FONT = "Plus Jakarta Sans, sans-serif";

type PandaNextBestActionCardProps = {
  action: PandaNextBestAction;
  onAskPanda: () => void;
};

export function PandaNextBestActionCard({ action, onAskPanda }: PandaNextBestActionCardProps) {
  return (
    <article
      className="rounded-[1.25rem] border p-4"
      style={{ background: P.sage, borderColor: "#c8e0c4" }}
    >
      <div className="mb-3 flex items-center gap-2">
        <PandaAvatar />
        <h2 className="text-sm font-bold" style={{ color: P.charcoal, fontFamily: DISPLAY_FONT }}>
          Panda AI
        </h2>
        <span className="ml-auto" aria-hidden="true" style={{ color: P.faintText }}>›</span>
      </div>

      <p className="text-sm leading-relaxed" style={{ color: P.charcoal }}>
        {action.nextStep || action.summary}
      </p>

      <button
        type="button"
        onClick={onAskPanda}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ background: P.green, outlineColor: P.green }}
      >
        <span aria-hidden="true">💬</span>
        {action.ctaLabel}
      </button>
    </article>
  );
}
