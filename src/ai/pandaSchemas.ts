import type { ActivityEntry, PrimaryActionCategory, ScoreMeaning } from "@/types";

export type PandaIntent =
  | "live_log"
  | "backfill"
  | "correction"
  | "question"
  | "finalize_day"
  | "unknown";

export type PandaProcessingStep =
  | "idle"
  | "understanding_message"
  | "classifying_categories"
  | "checking_app_mapping"
  | "reconciling_with_ai"
  | "asking_user_clarification"
  | "estimating_impact"
  | "saving_trail"
  | "done"
  | "error";

export type CheckpointSlotId =
  | "morning_start"
  | "breakfast"
  | "morning_commute"
  | "work_study"
  | "lunch"
  | "afternoon_activity"
  | "shopping_delivery"
  | "evening_commute"
  | "dinner"
  | "night_energy"
  | "waste_final"
  | "day_summary";

export type PandaChatTurn = {
  role: "user" | "assistant";
  text: string;
};

export type PandaExtractedActivity = {
  category: ActivityEntry["category"];
  primaryCategory?: PrimaryActionCategory;
  rawPrimaryCategory?: string;
  subcategory?: string;
  categoryScore?: number;
  greenScore?: number;
  scoreMeaning?: ScoreMeaning;
  dominantImpact?: boolean;
  parentBundleId?: string;
  includedInParentContext?: boolean;
  activityType: string;
  label: string;
  timeSlot: CheckpointSlotId;
  details: Record<string, unknown>;
  confidence: number;
  status?: ActivityEntry["status"];
};

export type PandaActivityFragment = {
  fragmentText: string;
  primaryCategory: PrimaryActionCategory;
  subcategories: string[];
  activityLabel: string;
  timeCheckpointId: string | null;
  eventTime: string | null;
  details: Record<string, unknown>;
  score: number;
  scoreMeaning: ScoreMeaning;
  co2EstimateKg?: number | null;
  missingFields: string[];
  confidence: number;
};

export type PandaPendingLogContext = {
  originalText: string;
  followUpQuestion: string | null;
  missingFields: string[];
  extractedActivities: PandaExtractedActivity[];
  followUpRound?: number;
  conversationReplies?: string[];
  assistantMessage?: string;
};

export type PandaBundle = {
  bundleType:
    | "none"
    | "commute"
    | "meal_delivery"
    | "shopping_delivery"
    | "long_distance_trip"
    | "social_event"
    | "workday"
    | "other";
  dominantEventIndex: number | null;
};

export type PandaParseResult = {
  detectedIntent: PandaIntent;
  detectedSlotId: CheckpointSlotId | null;
  detectedTime: string | null;
  assistantMessage: string;
  activityFragments?: PandaActivityFragment[];
  extractedActivities: PandaExtractedActivity[];
  bundle?: PandaBundle | null;
  missingFields: string[];
  followUpQuestion: string | null;
  quickReplies: string[];
  suggestedProfileUpdate: {
    shouldSuggest: boolean;
    label: string;
    key: string;
    value: unknown;
  } | null;
  confidence: number;
  originalText: string;
  /** User follow-up replies accumulated during a pending log session. */
  conversationReplies?: string[];
  usedGemini: boolean;
  usedMistral?: boolean;
  fallbackReason?: string;
  /** How many follow-up rounds have been answered for this pending log. */
  followUpRound?: number;
  /** Maximum follow-up rounds before saving with best available data. */
  maxFollowUps?: number;
  /** Index into extractedActivities for the active follow-up target. */
  pendingActivityIndex?: number;
};

export type PandaContext = {
  currentDate: string;
  currentTime: string;
  dayOfWeek: string;
  profileSummary: string;
  usualCommuteMode?: string;
  usualCommuteDistanceKm?: number;
  loggedActivities: string[];
  checkpointStatuses: Partial<Record<CheckpointSlotId, "confirmed" | "assumed" | "predicted" | "estimated" | "missing">>;
  /** Full Panda chat thread for multi-turn understanding. */
  chatThread?: PandaChatTurn[];
  /** Active pending log session, when answering a follow-up. */
  pendingLog?: PandaPendingLogContext | null;
};

export const CHECKPOINT_SLOTS: Array<{ id: CheckpointSlotId; label: string; order: number }> = [
  { id: "morning_start", label: "Morning start", order: 0 },
  { id: "breakfast", label: "Breakfast", order: 1 },
  { id: "morning_commute", label: "Morning commute", order: 2 },
  { id: "work_study", label: "Work / Study", order: 3 },
  { id: "lunch", label: "Lunch", order: 4 },
  { id: "afternoon_activity", label: "Afternoon activity", order: 5 },
  { id: "shopping_delivery", label: "Shopping / Delivery", order: 6 },
  { id: "evening_commute", label: "Evening commute", order: 7 },
  { id: "dinner", label: "Dinner", order: 8 },
  { id: "night_energy", label: "Night energy", order: 9 },
  { id: "waste_final", label: "Waste / Final check-in", order: 10 },
  { id: "day_summary", label: "Day summary", order: 11 },
];
