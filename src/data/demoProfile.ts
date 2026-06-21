import type { UserProfile } from "../types";

export const DEMO_PROFILE_ID = "demo-guest-001";

const DEMO_TIMESTAMP = "2025-06-17T08:00:00.000Z";

/** Demo guest profile aligned with requirement docs (scooter commute, office Mon-Thu). */
export const demoGuestProfile: UserProfile = {
  id: DEMO_PROFILE_ID,
  mode: "guest",
  createdAt: DEMO_TIMESTAMP,
  updatedAt: DEMO_TIMESTAMP,
  locale: "en-IN",
  regionPack: "generic_demo",
  core: {
    homeRegion: "Bengaluru, India",
    householdSize: 2,
    usualWorkMode: "hybrid",
    usualCommuteMode: "scooter",
    usualCommuteDistanceKm: 14,
    dietPattern: "mixed",
    monthlyElectricityKwh: 250,
    foodDeliveryFrequency: "weekly_1_2",
    onlineShoppingFrequency: "monthly",
    wastePattern: "normal",
  },
  routines: {
    officeDays: ["monday", "tuesday", "wednesday", "thursday"],
    workFromHomeDays: ["friday"],
    usualLunch: {
      source: "home_cooked",
      foodType: "vegetarian_low_dairy",
    },
    usualDinner: {
      source: "home_cooked",
      foodType: "veg_dairy",
    },
    usualEnergyUse: {
      dailyAcHours: 4,
      pattern: "moderate",
    },
  },
  learnedPatterns: [
    {
      id: "pattern-wfh-friday",
      patternType: "schedule",
      key: "workFromHomeDays",
      value: { days: ["friday"] },
      confidence: 0.72,
      status: "suggested",
      learnedFromDayIds: [],
      createdAt: DEMO_TIMESTAMP,
    },
    {
      id: "pattern-home-dinner-weekday",
      patternType: "meal",
      key: "usualDinner",
      value: { source: "home_cooked" },
      confidence: 0.68,
      status: "suggested",
      learnedFromDayIds: [],
      createdAt: DEMO_TIMESTAMP,
    },
  ],
  stats: {
    profileConfidence: 0.64,
    totalLeafPoints: 120,
    level: 2,
    streakDays: 3,
  },
};
