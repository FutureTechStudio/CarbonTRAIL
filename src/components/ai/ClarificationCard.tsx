import { P } from "@/theme/palette";
import { QuickReplyChips } from "@/components/ai/QuickReplyChips";

export function ClarificationCard({
  question,
  chips,
  onPick,
}: {
  question: string;
  chips?: string[];
  onPick: (value: string) => void;
}) {
  return (
    <article className="rounded-2xl border p-4" style={{ background: "#fff5e9", borderColor: "#f2d3a8" }}>
      <p className="text-sm font-semibold" style={{ color: P.charcoal }}>
        {question}
      </p>
      {chips?.length ? <QuickReplyChips chips={chips} onPick={onPick} /> : null}
    </article>
  );
}
