import { buildProfileContextLines } from "@/logic/checkinEngine";
import type { UserProfile } from "@/types";
import { P } from "@/theme/palette";

export function ProfileContextCard({ profile }: { profile: UserProfile }) {
  const lines = buildProfileContextLines(profile);
  return (
    <article className="rounded-2xl border p-4 text-sm" style={{ background: "#f0f6ed", borderColor: "#c8e0c4" }}>
      {lines.map((line) => (
        <p key={line} style={{ color: line.startsWith("- ") ? P.mutedText : P.charcoal }}>
          {line}
        </p>
      ))}
    </article>
  );
}
