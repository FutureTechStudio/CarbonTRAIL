import { P } from "@/theme/palette";

export function DayCompleteModal({
  open,
  earnedPoints,
  items,
  confidenceBefore,
  confidenceAfter,
  greenImpactText,
  onClose,
}: {
  open: boolean;
  earnedPoints: number;
  items: string[];
  confidenceBefore: number;
  confidenceAfter: number;
  greenImpactText: string;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4">
      <section className="w-full max-w-md rounded-3xl border bg-white p-5" style={{ borderColor: P.border }}>
        <h2 className="text-xl font-bold">Day Complete</h2>
        <p className="mt-2 text-sm">LeafPoints earned: {earnedPoints}</p>
        <ul className="mt-2 list-disc pl-5 text-sm">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm">
          Profile confidence: {confidenceBefore}% → {confidenceAfter}%
        </p>
        <p className="mt-2 text-sm" style={{ color: P.green }}>
          {greenImpactText}
        </p>
        <button type="button" onClick={onClose} className="mt-4 w-full rounded-2xl py-2 text-white" style={{ background: P.green }}>
          Close
        </button>
      </section>
    </div>
  );
}
