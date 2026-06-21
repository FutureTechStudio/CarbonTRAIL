import { ProfileSection } from "@/components/profile/ProfileSection";
import {
  BASELINE_FIELD_GROUPS,
  baselineFieldLabel,
  baselineQuestionOptions,
  formatBaselineFieldValue,
} from "@/features/profile/profileBaselineDisplay";
import type { BaselineField } from "@/theme/palette";
import { BASELINE_FIELDS, P } from "@/theme/palette";
import type { ProfileCore } from "@/types";

function ProfileValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-start justify-between gap-3 border-b py-2.5 last:border-b-0"
      style={{ borderColor: P.border }}
    >
      <span className="text-xs" style={{ color: P.faintText }}>
        {label}
      </span>
      <span className="max-w-[58%] text-right text-sm font-semibold" style={{ color: P.charcoal }}>
        {value}
      </span>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string | number }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs" style={{ color: P.faintText }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-11 w-full rounded-xl border px-3 text-sm"
        style={{ borderColor: P.border, background: "white" }}
      >
        <option value="">Not answered</option>
        {options.map((option) => (
          <option key={`${option.label}-${option.value}`} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function parseDraftValue(field: BaselineField, raw: string): ProfileCore[BaselineField] | undefined {
  if (!raw) return undefined;
  if (field === "householdSize" || field === "usualCommuteDistanceKm" || field === "monthlyElectricityKwh") {
    if (raw === "unknown") return raw as ProfileCore[BaselineField];
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? (parsed as ProfileCore[BaselineField]) : (raw as ProfileCore[BaselineField]);
  }
  return raw as ProfileCore[BaselineField];
}

type BaselineMemoryFieldsProps = {
  core: ProfileCore;
  editing: boolean;
  draft: Partial<ProfileCore>;
  onDraftChange: (field: BaselineField, value: string) => void;
};

export function BaselineMemoryFields({ core, editing, draft, onDraftChange }: BaselineMemoryFieldsProps) {
  return (
    <>
      {BASELINE_FIELD_GROUPS.map((group) => (
        <ProfileSection key={group.title} title={group.title}>
          <p className="mb-3 text-xs leading-relaxed" style={{ color: P.mutedText }}>
            {group.description}
          </p>
          {editing ? (
            <div className="space-y-3">
              {group.fields.map((field) => {
                if (field === "homeRegion") {
                  return (
                    <label key={field} className="block">
                      <span className="text-xs" style={{ color: P.faintText }}>
                        {baselineFieldLabel(field)}
                      </span>
                      <input
                        value={String(draft.homeRegion ?? "")}
                        onChange={(event) => onDraftChange("homeRegion", event.target.value)}
                        className="mt-1 h-11 w-full rounded-xl border px-3 text-sm"
                        style={{ borderColor: P.border, background: "white" }}
                      />
                    </label>
                  );
                }

                const options = baselineQuestionOptions(field);
                const current = draft[field];
                return (
                  <SelectField
                    key={field}
                    label={baselineFieldLabel(field)}
                    value={current === undefined || current === null ? "" : String(current)}
                    options={options}
                    onChange={(value) => onDraftChange(field, value)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border px-3 py-1" style={{ background: "rgba(255,255,255,0.55)", borderColor: P.border }}>
              {group.fields.map((field) => (
                <ProfileValueRow
                  key={field}
                  label={baselineFieldLabel(field)}
                  value={formatBaselineFieldValue(field, core)}
                />
              ))}
            </div>
          )}
        </ProfileSection>
      ))}
    </>
  );
}

export function buildProfileCoreDraft(core: ProfileCore): Partial<ProfileCore> {
  return { ...core };
}

export function applyProfileCoreDraft(draft: Partial<ProfileCore>): Partial<ProfileCore> {
  const next: Record<string, unknown> = {};

  if (draft.homeRegion !== undefined && draft.homeRegion !== "") {
    next.homeRegion = String(draft.homeRegion);
  }

  for (const field of BASELINE_FIELDS) {
    if (field === "homeRegion") continue;
    const value = draft[field];
    if (value === undefined || value === null) continue;
    next[field] = parseDraftValue(field, String(value));
  }

  return next as Partial<ProfileCore>;
}
