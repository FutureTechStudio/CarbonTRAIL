export function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
      {pct}% confident
    </span>
  );
}
