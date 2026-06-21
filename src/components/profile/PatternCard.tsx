import type { LearnedPattern } from "@/types";
import { P } from "@/theme/palette";

export function PatternCard({
  pattern,
  onConfirm,
  onDismiss,
}: {
  pattern: LearnedPattern;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  return (
    <article className="rounded-xl border p-3" style={{ borderColor: P.border }}>
      <p className="text-sm font-medium">
        {pattern.key}: {JSON.stringify(pattern.value)}
      </p>
      <p className="text-xs" style={{ color: P.faintText }}>
        {(pattern.confidence * 100).toFixed(0)}% confidence · {pattern.status}
      </p>
      <div className="mt-2 flex gap-2">
        <button type="button" className="rounded-lg px-2 py-1 text-xs text-white" style={{ background: P.green }} onClick={onConfirm}>
          Confirm
        </button>
        <button type="button" className="rounded-lg px-2 py-1 text-xs" style={{ background: "#f3e3df", color: "#a44336" }} onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </article>
  );
}
