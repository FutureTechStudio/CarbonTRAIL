import { BASELINE_FIELDS } from "@/theme/palette";
import type { LearnedPattern, ParsedResult, UserProfile } from "@/types";
import { clamp } from "./confidence";

function nowIso(): string {
  return new Date().toISOString();
}

function withUpdatedProfile(profile: UserProfile): UserProfile {
  return {
    ...profile,
    updatedAt: nowIso(),
    stats: {
      ...profile.stats,
      profileConfidence: computeProfileConfidence(profile),
    },
  };
}

export function computeProfileConfidence(profile: UserProfile): number {
  const coreFilled = BASELINE_FIELDS.filter((field) => {
    const value = profile.core[field];
    return value !== undefined && value !== null && value !== "";
  }).length;

  const baselineRatio = coreFilled / BASELINE_FIELDS.length;
  const routineSignals = [
    profile.routines.officeDays?.length ? 1 : 0,
    profile.routines.workFromHomeDays?.length ? 1 : 0,
    profile.routines.usualLunch?.source ? 1 : 0,
    profile.routines.usualDinner?.source ? 1 : 0,
    profile.routines.usualEnergyUse?.dailyAcHours !== undefined ? 1 : 0,
  ];
  const routineRatio = routineSignals.reduce((a, b) => a + b, 0) / routineSignals.length;

  const confirmedPatterns =
    profile.learnedPatterns.length === 0
      ? 0
      : profile.learnedPatterns.filter((p) => p.status === "confirmed").length /
        profile.learnedPatterns.length;

  return clamp(0.1 + baselineRatio * 0.6 + routineRatio * 0.2 + confirmedPatterns * 0.1);
}

export function suggestProfileUpdate(parsed: ParsedResult): ParsedResult["suggestedProfileUpdate"] {
  return parsed.suggestedProfileUpdate;
}

function updatePatternStatus(
  profile: UserProfile,
  patternId: string,
  status: LearnedPattern["status"],
): UserProfile {
  const updatedPatterns = profile.learnedPatterns.map((pattern) => {
    if (pattern.id !== patternId) {
      return pattern;
    }
    return {
      ...pattern,
      status,
      lastConfirmedAt: status === "confirmed" ? nowIso() : pattern.lastConfirmedAt,
      confidence:
        status === "confirmed" ? Math.min(0.98, pattern.confidence + 0.1) : pattern.confidence,
    };
  });

  return withUpdatedProfile({
    ...profile,
    learnedPatterns: updatedPatterns,
  });
}

export function confirmPattern(profile: UserProfile, patternId: string): UserProfile {
  return updatePatternStatus(profile, patternId, "confirmed");
}

export function dismissPattern(profile: UserProfile, patternId: string): UserProfile {
  return updatePatternStatus(profile, patternId, "dismissed");
}

export function applyProfileFieldUpdate(
  profile: UserProfile,
  key: string,
  value: unknown,
): UserProfile {
  const [scope, field] = key.includes(".") ? key.split(".", 2) : ["core", key];
  const nextProfile: UserProfile = {
    ...profile,
    core: { ...profile.core },
    routines: { ...profile.routines },
  };

  if (scope === "routines" && field) {
    (nextProfile.routines as Record<string, unknown>)[field] = value;
  } else if (field) {
    (nextProfile.core as Record<string, unknown>)[field] = value;
  }

  return withUpdatedProfile(nextProfile);
}
