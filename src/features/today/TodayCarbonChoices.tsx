import type { CarbonChoiceItem } from "@/features/today/todayHelpers";
import { P } from "@/theme/palette";

const DISPLAY_FONT = "Plus Jakarta Sans, sans-serif";

function statusColor(status: CarbonChoiceItem["status"]): string {
  if (status === "Confirmed") return P.green;
  if (status === "Estimated" || status === "Assumed") return P.amber;
  if (status === "Missing") return "#C04A35";
  return P.faintText;
}

type TodayCarbonChoicesProps = {
  choices: CarbonChoiceItem[];
};

export function TodayCarbonChoices({
  choices,
}: TodayCarbonChoicesProps) {
  return (
    <article
      className="rounded-[1.25rem] border p-4"
      style={{ background: "rgba(253,250,244,0.92)", borderColor: P.border }}
    >
      <div className="flex items-center gap-2">
        <span className="text-base" aria-hidden="true">🌿</span>
        <h2 className="text-sm font-bold" style={{ color: P.charcoal, fontFamily: DISPLAY_FONT }}>
          Today&apos;s Carbon Choices
        </h2>
      </div>

      <ul className="mt-3 space-y-2">
        {choices.map((choice) => (
          <li key={choice.key} className="flex items-center justify-between gap-2 rounded-xl px-1 py-1 text-xs">
            <span className="inline-flex items-center gap-2" style={{ color: P.charcoal }}>
              <span aria-hidden="true">{choice.emoji}</span>
              {choice.label}
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="font-semibold" style={{ color: statusColor(choice.status) }}>
                {choice.status}
              </span>
              <span aria-hidden="true" style={{ color: P.faintText }}>›</span>
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
