import type { DayTotalsResult, EstimateResult } from "./estimates";

export type ActivityCategory =
  | "transport"
  | "food"
  | "energy"
  | "delivery"
  | "shopping"
  | "waste"
  | "digital"
  | "special";

export type PrimaryActionCategory =
  | "transportation"
  | "food_meals"
  | "home_energy"
  | "cooking_energy"
  | "work_study"
  | "shopping_purchases"
  | "delivery_online_orders"
  | "waste_recycling"
  | "water_hot_water"
  | "digital_devices"
  | "personal_care"
  | "household_chores"
  | "social_leisure"
  | "travel_trips"
  | "positive_avoided_actions"
  | "other_unknown";

export type ScoreMeaning = "low" | "medium" | "high" | "very_high";

export type DataStatus =
  | "confirmed"
  | "assumed"
  | "estimated_from_profile"
  | "parsed_pending";

export type ActivitySource =
  | "chip"
  | "free_text"
  | "profile"
  | "autofill"
  | "manual_edit"
  | "demo_seed";

export type DayType =
  | "weekday_office"
  | "weekday_wfh"
  | "weekend_home"
  | "special"
  | "unknown";

export type DayStatus = "empty" | "mixed" | "confirmed" | "auto_filled" | "skipped";

export type TrailCondition = "clean" | "light" | "moderate" | "smoky" | "heavy";

export type VisualNodeType =
  | "road"
  | "food_patch"
  | "house_haze"
  | "parcel"
  | "soil"
  | "tree"
  | "generic";

export type VisualSmokeLevel = "none" | "low" | "medium" | "high";

export type VisualGreeneryLevel = "none" | "small" | "medium" | "high";

export type VisualNodeStyle = "solid" | "amber_outline" | "faded_dotted";

export interface VisualEffect {
  nodeType: VisualNodeType;
  smoke: VisualSmokeLevel;
  greenery: VisualGreeneryLevel;
  style: VisualNodeStyle;
}

export interface VisualSummary {
  trailCondition: TrailCondition;
  smokePatches: number;
  greenPatches: number;
  treesGrown: number;
  estimatedNodes: number;
}

export interface ActivityEntry {
  id: string;
  dayId: string;
  checkpointId?: string;
  eventTime?: string;
  timeWindowStart?: number;
  timeWindowEnd?: number;
  category: ActivityCategory;
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
  status: DataStatus;
  source: ActivitySource;
  details: Record<string, unknown>;
  estimates: EstimateResult;
  visualEffect: VisualEffect;
  explanation?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityDay {
  id: string;
  profileId: string;
  date: string;
  dayType: DayType;
  status: DayStatus;
  activities: ActivityEntry[];
  totals: DayTotalsResult;
  visualSummary: VisualSummary;
  createdAt: string;
  updatedAt: string;
}

export interface ParsedFact {
  label: string;
  value: string;
  confidence: number;
}

export interface SuggestedProfileUpdate {
  label: string;
  key: string;
  value: unknown;
}

export interface ParsedResult {
  originalText: string;
  activities: Partial<ActivityEntry>[];
  extractedFacts: ParsedFact[];
  needsFollowUp: boolean;
  followUpQuestion?: string;
  followUpChips?: string[];
  suggestedProfileUpdate?: SuggestedProfileUpdate;
}
