export type ProfileMode = "guest" | "signed_in_demo" | "authenticated";

export type RegionPack = "generic_demo";

export type UsualWorkMode =
  | "office"
  | "hybrid"
  | "wfh"
  | "student"
  | "other"
  | "unknown";

export type CommuteMode =
  | "none"
  | "walk"
  | "cycle"
  | "scooter"
  | "car"
  | "carpool"
  | "auto"
  | "cab"
  | "bus"
  | "metro"
  | "train"
  | "unknown";

export type DietPattern =
  | "plant_based"
  | "mostly_vegetarian"
  | "veg_dairy"
  | "egg"
  | "chicken_fish_sometimes"
  | "mixed"
  | "red_meat_often"
  | "unknown";

export type FoodDeliveryFrequency =
  | "rare"
  | "monthly"
  | "weekly_1_2"
  | "weekly_3_plus"
  | "unknown";

export type OnlineShoppingFrequency = "rare" | "monthly" | "weekly" | "unknown";

export type WastePattern =
  | "low"
  | "normal"
  | "plastic_heavy"
  | "recycles"
  | "composts"
  | "unknown";

export type MealSource =
  | "home_cooked"
  | "packed"
  | "canteen"
  | "restaurant"
  | "ordered_online"
  | "skipped"
  | "unknown";

export type MealFoodType =
  | "plant_based"
  | "vegetarian_low_dairy"
  | "veg_dairy"
  | "egg"
  | "chicken_fish"
  | "red_meat"
  | "unknown";

/** Usual meal routine stored on the user profile. */
export interface MealRoutine {
  source?: MealSource;
  foodType?: MealFoodType;
}

/** Usual home energy routine stored on the user profile. */
export interface EnergyRoutine {
  dailyAcHours?: number;
  pattern?: "light" | "moderate" | "heavy" | "unknown";
}

export interface ProfileCore {
  homeRegion?: string;
  householdSize?: number;
  usualWorkMode?: UsualWorkMode;
  usualCommuteMode?: CommuteMode;
  usualCommuteDistanceKm?: number;
  dietPattern?: DietPattern;
  monthlyElectricityKwh?: number;
  monthlyElectricityBill?: number;
  electricityTariffPerKwh?: number;
  foodDeliveryFrequency?: FoodDeliveryFrequency;
  onlineShoppingFrequency?: OnlineShoppingFrequency;
  wastePattern?: WastePattern;
}

export interface ProfileRoutines {
  workFromHomeDays?: string[];
  officeDays?: string[];
  usualLunch?: MealRoutine;
  usualDinner?: MealRoutine;
  usualEnergyUse?: EnergyRoutine;
}

export interface ProfileStats {
  profileConfidence: number;
  totalLeafPoints: number;
  level: number;
  streakDays: number;
}

export type LearnedPatternType =
  | "schedule"
  | "transport"
  | "meal"
  | "energy"
  | "shopping"
  | "waste";

export type LearnedPatternStatus = "suggested" | "confirmed" | "dismissed";

export interface LearnedPattern {
  id: string;
  patternType: LearnedPatternType;
  key: string;
  value: Record<string, unknown>;
  confidence: number;
  status: LearnedPatternStatus;
  learnedFromDayIds: string[];
  lastConfirmedAt?: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  mode: ProfileMode;
  username?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
  locale: string;
  regionPack: RegionPack;
  core: ProfileCore;
  routines: ProfileRoutines;
  learnedPatterns: LearnedPattern[];
  stats: ProfileStats;
}
