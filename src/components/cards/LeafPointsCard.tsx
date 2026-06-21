import { useGuest } from "@/app/providers";
import { getLevelProgress } from "@/logic/leafPoints";
import { P } from "@/theme/palette";

const DISPLAY_FONT = "Plus Jakarta Sans, sans-serif";

export function LeafPointsCard() {
  const points = useGuest().state.profile?.stats.totalLeafPoints ?? 0;
  const levelProgress = getLevelProgress(points);
  const milestone = levelProgress.nextMilestone?.points ?? points;
  const progress = levelProgress.progressPercent;

  return (
    <article
      className="rounded-[1.25rem] border p-4"
      style={{
        background: "linear-gradient(145deg, rgba(253,250,244,0.96), rgba(246,235,255,0.72))",
        borderColor: "rgba(228, 237, 232, 0.95)",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold" style={{ color: P.charcoal, fontFamily: DISPLAY_FONT }}>
          LeafPoints
        </p>
        <span className="text-lg" aria-hidden="true">
          🍃
        </span>
      </div>

      <p className="mt-3 text-3xl font-extrabold" style={{ color: "#6D35A8", fontFamily: DISPLAY_FONT }}>
        {points.toLocaleString()}
      </p>
      <p className="mt-1 text-xs" style={{ color: P.mutedText }}>
        Level {levelProgress.level} · {levelProgress.levelName}
      </p>

      <div className="mt-3">
        <div className="mb-1 flex justify-between text-[10px]" style={{ color: P.faintText }}>
          <span>
            {levelProgress.nextMilestone
              ? `Next: ${levelProgress.nextMilestone.name} at ${milestone.toLocaleString()}`
              : "Top milestone reached"}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full" style={{ background: P.sage }}>
          <div className="h-full rounded-full" style={{ width: `${progress}%`, background: "#7B3FB3" }} />
        </div>
      </div>
    </article>
  );
}
