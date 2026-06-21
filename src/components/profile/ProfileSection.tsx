import type { ReactNode } from "react";
import { P } from "@/theme/palette";

export function ProfileSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border p-4" style={{ background: P.card, borderColor: P.border }}>
      <h2 className="text-sm font-bold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
