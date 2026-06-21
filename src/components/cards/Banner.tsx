import type { ReactNode } from "react";
import { P } from "@/theme/palette";

export function Banner({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border p-4" style={{ background: "#eff6ec", borderColor: "#cbe0c3" }}>
      <p className="text-sm font-bold" style={{ color: P.charcoal }}>
        {title}
      </p>
      <p className="mt-1 text-sm" style={{ color: P.mutedText }}>
        {description}
      </p>
      {actions ? <div className="mt-3 flex gap-2">{actions}</div> : null}
    </section>
  );
}
