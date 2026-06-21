import { useMemo } from "react";
import { useGuest } from "@/app/providers";
import { ValleyMapScene } from "@/components/visuals/ValleyMapScene";
import { P, PAGE_SHELL } from "@/theme/palette";

type DayState = "green" | "moderate" | "smoky" | "faded";

function stateFromImpact(score: number): DayState {
  if (score <= 3) return "green";
  if (score <= 6) return "moderate";
  return "smoky";
}

export function ValleyPage() {
  const { state } = useGuest();
  const days = useMemo<DayState[]>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const out: DayState[] = [];
    for (let day = 1; day <= lastDate; day += 1) {
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const stored = state.days[key];
      out.push(stored ? stateFromImpact(stored.totals.impactScore) : "faded");
    }
    return out;
  }, [state.days]);

  return (
    <div className={`${PAGE_SHELL} space-y-4 p-4 lg:p-6`}>
      <h1 className="text-2xl font-bold">Monthly Valley</h1>
      <p className="text-sm" style={{ color: P.mutedText }}>
        Daily nodes show your footprint trend across the month.
      </p>
      <div className="overflow-hidden rounded-3xl border" style={{ borderColor: P.border }}>
        <ValleyMapScene days={days} />
      </div>
    </div>
  );
}
