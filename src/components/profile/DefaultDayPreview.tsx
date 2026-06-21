import { P } from "@/theme/palette";

export function DefaultDayPreview({
  weekdayKg,
  weekendKg,
  confidencePct,
}: {
  weekdayKg: number;
  weekendKg: number;
  confidencePct: number;
}) {
  return (
    <article className="rounded-2xl border p-4" style={{ background: "#eff6ec", borderColor: "#c8e0c4" }}>
      <h3 className="text-sm font-bold">Default Daily Emissions</h3>
      <div className="mt-2 space-y-1 text-sm">
        <p>Weekday: {weekdayKg.toFixed(2)} kg</p>
        <p>Weekend: {weekendKg.toFixed(2)} kg</p>
      </div>
      <p className="mt-2 text-xs" style={{ color: P.faintText }}>
        Data confidence: {confidencePct}%
      </p>
    </article>
  );
}
