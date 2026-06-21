import { useEffect, useMemo, useState } from "react";
import { useGuest } from "@/app/providers";
import {
  applyProfileCoreDraft,
  BaselineMemoryFields,
  buildProfileCoreDraft,
} from "@/components/profile/BaselineMemoryFields";
import { DefaultDayPreview } from "@/components/profile/DefaultDayPreview";
import { PatternCard } from "@/components/profile/PatternCard";
import { ProfileSection } from "@/components/profile/ProfileSection";
import { countSavedBaselineFields } from "@/features/profile/profileBaselineDisplay";
import { confirmPattern, dismissPattern } from "@/logic/profileMemory";
import { BASELINE_FIELDS, P, PAGE_SHELL, type BaselineField } from "@/theme/palette";

export function ProfilePage() {
  const { state, updateProfile, resetAll } = useGuest();
  const profile = state.profile;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(buildProfileCoreDraft(profile?.core ?? {}));

  useEffect(() => {
    if (!profile) return;
    setDraft(buildProfileCoreDraft(profile.core));
    setEditing(false);
  }, [profile]);

  const defaults = useMemo(() => {
    const all = Object.values(state.days);
    const weekday = all.filter((day) => {
      const d = new Date(`${day.date}T00:00:00`).getDay();
      return d >= 1 && d <= 5;
    });
    const weekend = all.filter((day) => {
      const d = new Date(`${day.date}T00:00:00`).getDay();
      return d === 0 || d === 6;
    });
    const avg = (items: typeof all) =>
      items.length ? items.reduce((sum, day) => sum + day.totals.createdCo2eKg, 0) / items.length : 0;
    return { weekday: avg(weekday), weekend: avg(weekend) };
  }, [state.days]);

  if (!profile) return null;

  const savedCount = countSavedBaselineFields(profile.core);

  const handleDraftChange = (field: BaselineField, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value === "" ? undefined : value }));
  };

  const handleSave = () => {
    updateProfile(applyProfileCoreDraft(draft));
    setEditing(false);
  };

  return (
    <div className={`grid ${PAGE_SHELL} gap-4 p-4 lg:grid-cols-5 lg:p-6`}>
      <section className="space-y-4 lg:col-span-3">
        <div>
          <h1 className="text-2xl font-bold">My Carbon Memory</h1>
          <p className="mt-1 text-sm" style={{ color: P.mutedText }}>
            Saved from your guest setup — Panda uses this to estimate your trail and ask fewer repeat questions.
          </p>
          <p className="mt-2 text-xs font-semibold" style={{ color: P.green }}>
            {savedCount} of {BASELINE_FIELDS.length} setup answers saved
          </p>
        </div>

        <BaselineMemoryFields
          core={profile.core}
          editing={editing}
          draft={draft}
          onDraftChange={handleDraftChange}
        />

        <ProfileSection title="Learned Patterns">
          <div className="space-y-2">
            {profile.learnedPatterns.length === 0 ? (
              <p className="text-sm" style={{ color: P.faintText }}>
                No learned patterns yet.
              </p>
            ) : (
              profile.learnedPatterns.map((pattern) => (
                <PatternCard
                  key={pattern.id}
                  pattern={pattern}
                  onConfirm={() => updateProfile(() => confirmPattern(profile, pattern.id))}
                  onDismiss={() => updateProfile(() => dismissPattern(profile, pattern.id))}
                />
              ))
            )}
          </div>
        </ProfileSection>
      </section>

      <aside className="space-y-4 lg:col-span-2">
        <DefaultDayPreview
          weekdayKg={defaults.weekday}
          weekendKg={defaults.weekend}
          confidencePct={Math.round(profile.stats.profileConfidence * 100)}
        />

        <article className="rounded-2xl border p-4" style={{ background: P.card, borderColor: P.border }}>
          <p className="text-sm font-semibold">Data Confidence</p>
          <p className="mt-1 text-2xl font-bold">{Math.round(profile.stats.profileConfidence * 100)}%</p>
          <div className="mt-4 flex flex-col gap-2">
            {editing ? (
              <>
                <button
                  type="button"
                  className="rounded-xl px-3 py-2.5 text-sm font-semibold text-white"
                  style={{ background: P.green }}
                  onClick={handleSave}
                >
                  Save setup answers
                </button>
                <button
                  type="button"
                  className="rounded-xl border px-3 py-2.5 text-sm font-semibold"
                  style={{ borderColor: P.border, color: P.charcoal, background: "white" }}
                  onClick={() => {
                    setDraft(buildProfileCoreDraft(profile.core));
                    setEditing(false);
                  }}
                >
                  Cancel edits
                </button>
              </>
            ) : (
              <button
                type="button"
                className="rounded-xl px-3 py-2.5 text-sm font-semibold text-white"
                style={{ background: P.green }}
                onClick={() => setEditing(true)}
              >
                Edit setup answers
              </button>
            )}
          </div>
        </article>

        <button
          type="button"
          onClick={resetAll}
          className="w-full rounded-xl border px-4 py-2 text-sm"
          style={{ borderColor: "#d8b8ad", color: "#b64537", background: "#fff4f1" }}
        >
          Clear all guest data
        </button>
      </aside>
    </div>
  );
}
