import { useMemo } from "react";
import { WeeklyForest, type TreeHealth } from "@/components/visuals/WeeklyForest";
import { useGuest } from "@/app/providers";
import { P, PAGE_SHELL } from "@/theme/palette";

function healthFromImpact(score: number): TreeHealth {
  if (score <= 3) return "healthy";
  if (score <= 6) return "moderate";
  return "smoky";
}

export function ForestPage() {
  const { state } = useGuest();

  const trees = useMemo(() => {
    const out: Array<{ day: string; kg: number; health: TreeHealth }> = [];
    const now = new Date();
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const day = state.days[key];
      out.push({
        day: d.toLocaleDateString("en-US", { weekday: "short" }),
        kg: day?.totals.createdCo2eKg ?? 0,
        health: day ? healthFromImpact(day.totals.impactScore) : "empty",
      });
    }
    return out;
  }, [state.days]);

  return (
    <div className={`${PAGE_SHELL} space-y-4 p-4 lg:p-6`}>
      <h1 className="text-2xl font-bold">Weekly Forest</h1>
      <p className="text-sm" style={{ color: P.mutedText }}>
        7 trees represent your last 7 days.
      </p>
      <div className="overflow-hidden rounded-3xl border" style={{ borderColor: P.border }}>
        <WeeklyForest trees={trees} />
      </div>
    </div>
  );
}
