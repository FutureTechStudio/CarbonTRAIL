import type { ActivityDay, LeafPointEvent, UserProfile } from "@/types";
import type { BehaviorPattern } from "@/ai/behaviorProbability";

export interface GuestState {
  version: 1;
  profile?: UserProfile;
  days: Record<string, ActivityDay>;
  leafPointEvents: LeafPointEvent[];
  baselineComplete: boolean;
  behaviorPatterns: BehaviorPattern[];
}
