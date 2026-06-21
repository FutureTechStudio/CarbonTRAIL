import { useCallback, useState } from "react";
import { Share2 } from "lucide-react";
import { buildShareText, shareTodayTrail } from "@/features/today/todayHelpers";
import { P } from "@/theme/palette";

const DISPLAY_FONT = "Plus Jakarta Sans, sans-serif";

type ShareTodayButtonProps = {
  createdKg: number;
  confidence: number;
  greenImpactKg: number;
};

export function ShareTodayButton({ createdKg, confidence, greenImpactKg }: ShareTodayButtonProps) {
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleShare = useCallback(async () => {
    const text = buildShareText(createdKg, confidence, greenImpactKg);
    const shared = await shareTodayTrail(text);
    setFeedback(shared ? "Copied to share!" : "Share unavailable");
    window.setTimeout(() => setFeedback(null), 2500);
  }, [confidence, createdKg, greenImpactKg]);

  return (
    <div>
      <button
        type="button"
        onClick={handleShare}
        aria-label="Share today's trail"
        className="flex w-full items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold transition-all hover:bg-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ color: P.charcoal, borderColor: "#D4C8B8", fontFamily: DISPLAY_FONT, outlineColor: P.green }}
      >
        <Share2 size={15} aria-hidden="true" />
        Share Today&apos;s Trail
      </button>
      {feedback ? (
        <p className="mt-2 text-center text-xs" style={{ color: P.mutedText }} role="status">
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
