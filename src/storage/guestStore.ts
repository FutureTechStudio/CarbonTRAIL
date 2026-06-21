import { STORAGE_KEY, BASELINE_FIELDS } from "@/theme/palette";
import type { ActivityDay, UserProfile } from "@/types";
import { getSessionUserId } from "./authStore";
import { migrateState } from "./migrations";
import type { GuestState } from "./types";

const DEFAULT_LOCALE = "en-IN";

function createEmptyState(): GuestState {
  return {
    version: 1,
    days: {},
    leafPointEvents: [],
    baselineComplete: false,
    behaviorPatterns: [],
  };
}

function hasLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function isBaselineComplete(profile?: UserProfile): boolean {
  if (!profile) {
    return false;
  }

  return BASELINE_FIELDS.every((field) => {
    const value = profile.core[field];
    return value !== undefined && value !== null && value !== "";
  });
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getStateStorageKey(sessionUserId: string | null = getSessionUserId()): string {
  return sessionUserId ? `carbontrail_user_${sessionUserId}` : STORAGE_KEY;
}

export function loadState(sessionUserId: string | null = getSessionUserId()): GuestState {
  if (!hasLocalStorage()) {
    return createEmptyState();
  }

  const raw = window.localStorage.getItem(getStateStorageKey(sessionUserId));
  if (!raw) {
    return createEmptyState();
  }

  try {
    return migrateState(JSON.parse(raw));
  } catch {
    return createEmptyState();
  }
}

export function saveState(state: GuestState, sessionUserId: string | null = getSessionUserId()): GuestState {
  const nextState: GuestState = {
    ...state,
    version: 1,
    baselineComplete: isBaselineComplete(state.profile),
  };

  if (hasLocalStorage()) {
    window.localStorage.setItem(getStateStorageKey(sessionUserId), JSON.stringify(nextState));
  }

  return nextState;
}

export function resetState(sessionUserId: string | null = getSessionUserId()): GuestState {
  if (hasLocalStorage()) {
    window.localStorage.removeItem(getStateStorageKey(sessionUserId));
  }
  return createEmptyState();
}

export function createGuestProfile(): UserProfile {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    mode: "guest",
    createdAt: now,
    updatedAt: now,
    locale: DEFAULT_LOCALE,
    regionPack: "generic_demo",
    core: {},
    routines: {},
    learnedPatterns: [],
    stats: {
      profileConfidence: 0.1,
      totalLeafPoints: 0,
      level: 1,
      streakDays: 0,
    },
  };
}

export function createAuthenticatedProfile(input: {
  userId: string;
  username: string;
  email: string;
}): UserProfile {
  const now = new Date().toISOString();
  return {
    id: input.userId,
    mode: "authenticated",
    username: input.username,
    email: input.email,
    createdAt: now,
    updatedAt: now,
    locale: DEFAULT_LOCALE,
    regionPack: "generic_demo",
    core: {},
    routines: {},
    learnedPatterns: [],
    stats: {
      profileConfidence: 0.1,
      totalLeafPoints: 0,
      level: 1,
      streakDays: 0,
    },
  };
}

export function upsertDay(state: GuestState, day: ActivityDay): GuestState {
  return {
    ...state,
    days: {
      ...state.days,
      [day.date]: day,
    },
  };
}

export function getDay(state: GuestState, date = getTodayDateString()): ActivityDay | undefined {
  return state.days[date];
}
