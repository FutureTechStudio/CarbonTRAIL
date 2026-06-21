import type { GuestState } from "./types";

function createEmptyState(): GuestState {
  return {
    version: 1,
    days: {},
    leafPointEvents: [],
    baselineComplete: false,
    behaviorPatterns: [],
  };
}

export function migrateState(raw: unknown): GuestState {
  if (!raw || typeof raw !== "object") {
    return createEmptyState();
  }

  const candidate = raw as Partial<GuestState>;
  if (candidate.version !== 1) {
    return createEmptyState();
  }

  return {
    version: 1,
    profile: candidate.profile,
    days: candidate.days ?? {},
    leafPointEvents: candidate.leafPointEvents ?? [],
    baselineComplete: candidate.baselineComplete ?? false,
    behaviorPatterns: candidate.behaviorPatterns ?? [],
  };
}
