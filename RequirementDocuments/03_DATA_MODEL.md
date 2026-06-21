# Data Model

## Storage key
Use localStorage key: `carbontrail_guest_v1`.

## UserProfile
```ts
export interface UserProfile {
  id: string;
  mode: "guest" | "signed_in_demo";
  createdAt: string;
  updatedAt: string;
  locale: string;
  regionPack: "generic_demo";
  core: {
    homeRegion?: string;
    householdSize?: number;
    usualWorkMode?: "office" | "hybrid" | "wfh" | "student" | "other" | "unknown";
    usualCommuteMode?: "none" | "walk" | "cycle" | "scooter" | "car" | "carpool" | "auto" | "cab" | "bus" | "metro" | "train" | "unknown";
    usualCommuteDistanceKm?: number;
    dietPattern?: "plant_based" | "mostly_vegetarian" | "veg_dairy" | "egg" | "chicken_fish_sometimes" | "mixed" | "red_meat_often" | "unknown";
    monthlyElectricityKwh?: number;
    monthlyElectricityBill?: number;
    electricityTariffPerKwh?: number;
    foodDeliveryFrequency?: "rare" | "monthly" | "weekly_1_2" | "weekly_3_plus" | "unknown";
    onlineShoppingFrequency?: "rare" | "monthly" | "weekly" | "unknown";
    wastePattern?: "low" | "normal" | "plastic_heavy" | "recycles" | "composts" | "unknown";
  };
  routines: {
    workFromHomeDays?: string[];
    officeDays?: string[];
    usualLunch?: MealRoutine;
    usualDinner?: MealRoutine;
    usualEnergyUse?: EnergyRoutine;
  };
  learnedPatterns: LearnedPattern[];
  stats: {
    profileConfidence: number;
    totalLeafPoints: number;
    level: number;
    streakDays: number;
  };
}
```

## LearnedPattern
```ts
export interface LearnedPattern {
  id: string;
  patternType: "schedule" | "transport" | "meal" | "energy" | "shopping" | "waste";
  key: string;
  value: Record<string, unknown>;
  confidence: number;
  status: "suggested" | "confirmed" | "dismissed";
  learnedFromDayIds: string[];
  lastConfirmedAt?: string;
  createdAt: string;
}
```

## ActivityDay
```ts
export interface ActivityDay {
  id: string;
  profileId: string;
  date: string;
  dayType: "weekday_office" | "weekday_wfh" | "weekend_home" | "special" | "unknown";
  status: "empty" | "mixed" | "confirmed" | "auto_filled" | "skipped";
  activities: ActivityEntry[];
  totals: {
    createdCo2eKg: number;
    savedCo2eKg: number;
    netChangeCo2eKg: number;
    impactScore: number;
    confidence: number;
    dataCompleteness: number;
  };
  visualSummary: {
    trailCondition: "clean" | "light" | "moderate" | "smoky" | "heavy";
    smokePatches: number;
    greenPatches: number;
    treesGrown: number;
    estimatedNodes: number;
  };
  createdAt: string;
  updatedAt: string;
}
```

## ActivityEntry
```ts
export type ActivityCategory = "transport" | "food" | "energy" | "delivery" | "shopping" | "waste" | "digital" | "special";
export type DataStatus = "confirmed" | "assumed" | "estimated_from_profile" | "parsed_pending";
export type ActivitySource = "chip" | "free_text" | "profile" | "autofill" | "manual_edit" | "demo_seed";

export interface ActivityEntry {
  id: string;
  dayId: string;
  category: ActivityCategory;
  activityType: string;
  label: string;
  status: DataStatus;
  source: ActivitySource;
  details: Record<string, unknown>;
  estimates: {
    co2eKg: number;
    baselineCo2eKg: number;
    savedCo2eKg: number;
    impactScore: number;
    confidence: number;
    factorRefs: string[];
  };
  visualEffect: {
    nodeType: "road" | "food_patch" | "house_haze" | "parcel" | "soil" | "tree" | "generic";
    smoke: "none" | "low" | "medium" | "high";
    greenery: "none" | "small" | "medium" | "high";
    style: "solid" | "amber_outline" | "faded_dotted";
  };
  explanation?: string;
  createdAt: string;
  updatedAt: string;
}
```

## LeafPointEvent
```ts
export interface LeafPointEvent {
  id: string;
  dayId: string;
  eventType: "detail_shared" | "activity_corrected" | "profile_detail_added" | "learned_pattern_confirmed" | "day_confirmed" | "daily_reflection_completed" | "weekly_review_completed" | "streak_bonus";
  points: number;
  capGroup: string;
  label: string;
  metadata?: Record<string, unknown>;
  awardedAt: string;
}
```

## ParsedResult
```ts
export interface ParsedResult {
  originalText: string;
  activities: Partial<ActivityEntry>[];
  extractedFacts: { label: string; value: string; confidence: number }[];
  needsFollowUp: boolean;
  followUpQuestion?: string;
  followUpChips?: string[];
  suggestedProfileUpdate?: { label: string; key: string; value: unknown };
}
```
