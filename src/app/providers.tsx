import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  clearSessionUserId,
  getAccountById,
  loginAccount,
  registerAccount,
  type AuthResult,
} from "@/storage/authStore";
import {
  createAuthenticatedProfile,
  createGuestProfile,
  getDay,
  getTodayDateString,
  isBaselineComplete,
  loadState,
  resetState,
  saveState,
  upsertDay,
} from "@/storage/guestStore";
import type { GuestState } from "@/storage/types";
import type { ActivityDay, LeafPointEventType, UserProfile } from "@/types";
import type { BehaviorPattern } from "@/ai/behaviorProbability";
import { awardPoints, getLevelNumber } from "@/logic/leafPoints";
import { computeLoggedDayProfileConfidence } from "@/logic/profileConfidence";

type AwardLeafInput = {
  dayId: string;
  eventType: LeafPointEventType;
  label: string;
  metadata?: Record<string, unknown>;
};

type SignUpInput = {
  username: string;
  email: string;
  password: string;
};

type SignInInput = {
  email: string;
  password: string;
};

type GuestContextValue = {
  state: GuestState;
  todayDate: string;
  todayDay?: ActivityDay;
  refresh: () => void;
  startGuest: () => void;
  signUp: (input: SignUpInput) => AuthResult;
  signIn: (input: SignInInput) => AuthResult;
  signOut: () => void;
  updateProfile: (
    updater: Partial<UserProfile["core"]> | ((current: UserProfile) => UserProfile),
  ) => void;
  saveDay: (day: ActivityDay) => void;
  saveBehaviorPatterns: (patterns: BehaviorPattern[]) => void;
  resetAll: () => void;
  awardLeafPoints: (input: AwardLeafInput) => number;
};

const GuestContext = createContext<GuestContextValue | undefined>(undefined);

function createEmptyState(): GuestState {
  return {
    version: 1,
    days: {},
    leafPointEvents: [],
    baselineComplete: false,
    behaviorPatterns: [],
  };
}

function withLoggedDayProfileConfidence(state: GuestState): GuestState {
  if (!state.profile) return state;
  const profileConfidence = computeLoggedDayProfileConfidence(state.days);
  if (state.profile.stats.profileConfidence === profileConfidence) return state;

  return {
    ...state,
    profile: {
      ...state.profile,
      stats: {
        ...state.profile.stats,
        profileConfidence,
      },
    },
  };
}

export function GuestProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GuestState>(() => withLoggedDayProfileConfidence(loadState()));

  const persist = useCallback((nextState: GuestState, sessionUserId?: string | null) => {
    const saved = saveState(withLoggedDayProfileConfidence(nextState), sessionUserId);
    setState(saved);
    return saved;
  }, []);

  const refresh = useCallback(() => {
    setState(withLoggedDayProfileConfidence(loadState()));
  }, []);

  const startGuest = useCallback(() => {
    clearSessionUserId();
    setState((prev) => {
      const guestState = loadState(null);
      if (guestState.profile?.mode === "guest") return saveState(withLoggedDayProfileConfidence(guestState), null);
      if (prev.profile?.mode === "guest" && prev.profile) {
        return saveState(withLoggedDayProfileConfidence({ ...createEmptyState(), profile: prev.profile }), null);
      }
      return saveState(withLoggedDayProfileConfidence({ ...createEmptyState(), profile: createGuestProfile() }), null);
    });
  }, []);

  const signUp = useCallback((input: SignUpInput): AuthResult => {
    const result = registerAccount(input);
    if (!result.ok) return result;

    setState((prev) => {
      const baseProfile = prev.profile;
      const freshProfile = createAuthenticatedProfile({
        userId: result.userId,
        username: input.username.trim(),
        email: input.email.trim().toLowerCase(),
      });
      const totalLeafPoints = baseProfile?.stats.totalLeafPoints ?? freshProfile.stats.totalLeafPoints;
      const profile: UserProfile = {
        ...freshProfile,
        createdAt: baseProfile?.createdAt ?? freshProfile.createdAt,
        core: baseProfile?.core ?? freshProfile.core,
        routines: baseProfile?.routines ?? freshProfile.routines,
        learnedPatterns: baseProfile?.learnedPatterns ?? freshProfile.learnedPatterns,
        stats: {
          ...(baseProfile?.stats ?? freshProfile.stats),
          totalLeafPoints,
          level: getLevelNumber(totalLeafPoints),
        },
        updatedAt: new Date().toISOString(),
      };

      return saveState(withLoggedDayProfileConfidence({ ...prev, profile }), result.userId);
    });
    return result;
  }, []);

  const signIn = useCallback((input: SignInInput): AuthResult => {
    const result = loginAccount(input);
    if (!result.ok) return result;

    const account = getAccountById(result.userId);
    if (!account) return { ok: false, error: "Account not found." };

    let userState = withLoggedDayProfileConfidence(loadState(result.userId));
    if (!userState.profile) {
      userState = saveState(
        withLoggedDayProfileConfidence({
          ...userState,
          profile: createAuthenticatedProfile({
            userId: account.id,
            username: account.username,
            email: account.email,
          }),
        }),
        result.userId,
      );
    }

    userState = saveState(userState, result.userId);
    setState(userState);
    return result;
  }, []);

  const signOut = useCallback(() => {
    clearSessionUserId();
    setState(withLoggedDayProfileConfidence(loadState(null)));
  }, []);

  const updateProfile: GuestContextValue["updateProfile"] = useCallback(
    (updater) => {
      if (!state.profile) return;
      const base = state.profile;
      const nextProfile =
        typeof updater === "function"
          ? updater(base)
          : {
              ...base,
              core: {
                ...base.core,
                ...updater,
              },
            };

      persist({
        ...state,
        profile: {
          ...nextProfile,
          updatedAt: new Date().toISOString(),
        },
      });
    },
    [persist, state],
  );

  const saveDay = useCallback((day: ActivityDay) => {
    setState((prev) => saveState(withLoggedDayProfileConfidence(upsertDay(prev, day))));
  }, []);

  const saveBehaviorPatterns = useCallback((patterns: BehaviorPattern[]) => {
    setState((prev) => saveState(withLoggedDayProfileConfidence({ ...prev, behaviorPatterns: patterns })));
  }, []);

  const resetAll = useCallback(() => {
    clearSessionUserId();
    setState(resetState(null));
  }, []);

  const awardLeafPoints = useCallback((input: AwardLeafInput): number => {
    let awarded = 0;

    setState((prev) => {
      const { awardedPoints, event } = awardPoints(prev.leafPointEvents, input);
      if (!event || !prev.profile || awardedPoints <= 0) {
        return prev;
      }

      awarded = awardedPoints;
      const total = prev.profile.stats.totalLeafPoints + awardedPoints;
      const nextState: GuestState = {
        ...prev,
        leafPointEvents: [...prev.leafPointEvents, event],
        profile: {
          ...prev.profile,
          stats: {
            ...prev.profile.stats,
            totalLeafPoints: total,
            level: getLevelNumber(total),
          },
          updatedAt: new Date().toISOString(),
        },
      };

      return saveState(withLoggedDayProfileConfidence(nextState));
    });

    return awarded;
  }, []);

  const todayDate = getTodayDateString();
  const todayDay = getDay(state, todayDate);

  const value = useMemo<GuestContextValue>(
    () => ({
      state,
      todayDate,
      todayDay,
      refresh,
      startGuest,
      signUp,
      signIn,
      signOut,
      updateProfile,
      saveDay,
      saveBehaviorPatterns,
      resetAll,
      awardLeafPoints,
    }),
    [
      awardLeafPoints,
      refresh,
      resetAll,
      saveBehaviorPatterns,
      saveDay,
      signIn,
      signOut,
      signUp,
      startGuest,
      state,
      todayDate,
      todayDay,
      updateProfile,
    ],
  );

  return <GuestContext.Provider value={value}>{children}</GuestContext.Provider>;
}

export function useGuest() {
  const context = useContext(GuestContext);
  if (!context) {
    throw new Error("useGuest must be used within GuestProvider");
  }
  return context;
}

export { isBaselineComplete };
