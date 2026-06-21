import type { ParsedResult } from "@/types";
import { P } from "@/theme/palette";

export function ParsedPreviewCard({ parsed }: { parsed: ParsedResult | null }) {
  return (
    <article className="rounded-2xl border p-4" style={{ background: P.card, borderColor: P.border }}>
      <h3 className="text-sm font-bold">AI understood</h3>
      {!parsed ? (
        <p className="mt-2 text-sm" style={{ color: P.faintText }}>
          Parsed details appear here.
        </p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm">
          {parsed.extractedFacts.map((fact) => (
            <li key={`${fact.label}-${fact.value}`}>
              <span className="font-semibold">{fact.label}:</span> {fact.value}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
