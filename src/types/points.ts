export type LeafPointEventType =
  | "detail_shared"
  | "activity_corrected"
  | "profile_detail_added"
  | "learned_pattern_confirmed"
  | "day_confirmed"
  | "daily_reflection_completed"
  | "weekly_review_completed"
  | "streak_bonus";

export interface LeafPointEvent {
  id: string;
  dayId: string;
  eventType: LeafPointEventType;
  points: number;
  capGroup: string;
  label: string;
  metadata?: Record<string, unknown>;
  awardedAt: string;
}
