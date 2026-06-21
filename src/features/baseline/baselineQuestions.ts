import type { CommuteMode, UsualWorkMode } from "@/types";
import { BASELINE_FIELDS, type BaselineField } from "@/theme/palette";
import type { LucideIcon } from "lucide-react";
import { Briefcase, Car, Home, Leaf, MapPin, Route, UtensilsCrossed, Zap } from "lucide-react";

export type ChipOption<T = string | number> = {
  label: string;
  value: T;
};

export type SetupQuestionConfig = {
  field: BaselineField;
  title: string;
  label: string;
  helperText?: string;
  Icon: LucideIcon;
  options: ChipOption[];
  customInput?: {
    placeholder: string;
    showWhenValue?: string | number;
    optional?: boolean;
  };
};

export const STEP1_QUESTIONS: SetupQuestionConfig[] = [
  {
    field: "homeRegion",
    title: "Living area",
    label: "Where do you live?",
    helperText:
      "This helps Panda estimate travel, delivery, and energy patterns without needing your exact location.",
    Icon: MapPin,
    options: [
      { label: "Large urban city", value: "large_urban_city" },
      { label: "Medium city", value: "medium_city" },
      { label: "Small town", value: "small_town" },
      { label: "Village / rural area", value: "village_rural" },
      { label: "University / hostel area", value: "university_hostel" },
      { label: "Not sure", value: "unknown" },
    ],
    customInput: { placeholder: "Optional: Add your city or region", optional: true },
  },
  {
    field: "usualWorkMode",
    title: "Usual work or study pattern",
    label: "What does a usual weekday look like?",
    Icon: Briefcase,
    options: [
      { label: "Office", value: "office" },
      { label: "Work from home", value: "wfh" },
      { label: "Hybrid", value: "hybrid" },
      { label: "Student", value: "student" },
      { label: "Mostly home", value: "wfh" },
      { label: "Not sure", value: "unknown" },
    ],
  },
  {
    field: "usualCommuteMode",
    title: "Usual commute mode",
    label: "How do you usually move around?",
    Icon: Car,
    options: [
      { label: "Walk", value: "walk" },
      { label: "Cycle", value: "cycle" },
      { label: "Scooter", value: "scooter" },
      { label: "Car", value: "car" },
      { label: "Auto", value: "auto" },
      { label: "Bus", value: "bus" },
      { label: "Metro", value: "metro" },
      { label: "No daily commute", value: "none" },
    ],
  },
  {
    field: "usualCommuteDistanceKm",
    title: "Usual commute distance",
    label: "Roughly how far is your usual daily travel?",
    Icon: Route,
    options: [
      { label: "Under 5 km", value: 4 },
      { label: "5–15 km", value: 12 },
      { label: "15–30 km", value: 22 },
      { label: "30+ km", value: 35 },
      { label: "Not sure", value: "unknown" },
    ],
    customInput: { placeholder: "Type distance, e.g. 14 km round trip" },
  },
];

export const STEP2_QUESTIONS: SetupQuestionConfig[] = [
  {
    field: "householdSize",
    title: "Household size",
    label: "How many people share your home?",
    Icon: Home,
    options: [
      { label: "1", value: 1 },
      { label: "2", value: 2 },
      { label: "3–4", value: 4 },
      { label: "5+", value: 5 },
      { label: "Not sure", value: "unknown" },
    ],
  },
  {
    field: "dietPattern",
    title: "Diet pattern",
    label: "What best describes your usual meals?",
    Icon: UtensilsCrossed,
    options: [
      { label: "Plant based", value: "plant_based" },
      { label: "Veg dairy", value: "veg_dairy" },
      { label: "Mixed", value: "mixed" },
      { label: "Red meat often", value: "red_meat_often" },
      { label: "Not sure", value: "unknown" },
    ],
  },
  {
    field: "monthlyElectricityKwh",
    title: "Monthly electricity",
    label: "Rough monthly electricity use?",
    Icon: Zap,
    options: [
      { label: "<100 units", value: 90 },
      { label: "100–200 units", value: 160 },
      { label: "200–400 units", value: 280 },
      { label: ">400 units", value: 420 },
      { label: "Not sure", value: "unknown" },
    ],
  },
  {
    field: "foodDeliveryFrequency",
    title: "Food delivery",
    label: "How often do you order food delivery?",
    helperText: "Think about apps like Swiggy, Zomato, or similar — pick what is closest to a usual month.",
    Icon: Leaf,
    options: [
      { label: "Almost never", value: "rare" },
      { label: "About once a month", value: "monthly" },
      { label: "1–2 times a week", value: "weekly_1_2" },
      { label: "3 or more times a week", value: "weekly_3_plus" },
      { label: "Not sure", value: "unknown" },
    ],
  },
];

const LIVING_AREA_LABELS: Record<string, string> = {
  large_urban_city: "Large urban city",
  medium_city: "Medium city",
  small_town: "Small town",
  village_rural: "Village / rural area",
  university_hostel: "University / hostel area",
  unknown: "Not sure",
};

const WORK_MODE_LABELS: Record<UsualWorkMode, string> = {
  office: "Office",
  hybrid: "Hybrid",
  wfh: "Work from home",
  student: "Student",
  other: "Other",
  unknown: "Learning",
};

const COMMUTE_MODE_LABELS: Record<CommuteMode, string> = {
  none: "No daily commute",
  walk: "Walk",
  cycle: "Cycle",
  scooter: "Scooter",
  car: "Car",
  carpool: "Carpool",
  auto: "Auto",
  cab: "Cab",
  bus: "Bus",
  metro: "Metro",
  train: "Train",
  unknown: "Learning",
};

export function parseDistanceInput(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const match = trimmed.match(/(\d+(?:\.\d+)?)/);
  if (!match) return undefined;

  let km = Number(match[1]);
  if (Number.isNaN(km) || km <= 0) return undefined;

  if (/round\s*trip/i.test(trimmed)) {
    km = km / 2;
  }

  return Math.round(km * 10) / 10;
}

export function formatDistanceLabel(value: unknown, customText?: string): string {
  if (value === "unknown") return "Not sure";
  if (typeof value === "number") {
    if (customText?.trim()) return customText.trim();
    if (value < 5) return "Under 5 km";
    if (value <= 15) return "5–15 km";
    if (value <= 30) return "15–30 km";
    return "30+ km";
  }
  return "Not sure";
}

export function formatWorkMode(value?: UsualWorkMode): string {
  if (!value) return "Learning";
  return WORK_MODE_LABELS[value] ?? "Learning";
}

export function formatCommuteMode(value?: CommuteMode): string {
  if (!value) return "Learning";
  return COMMUTE_MODE_LABELS[value] ?? "Learning";
}

export function formatLivingArea(value?: string, optionalRegion?: string): { primary: string; secondary?: string } {
  if (!value) {
    return { primary: "Learning" };
  }

  const primary = LIVING_AREA_LABELS[value] ?? (value === "unknown" ? "Not sure" : "Learning");
  const secondary = optionalRegion?.trim() || undefined;

  return { primary, secondary };
}

export function countAnsweredStep1(
  answers: Record<string, unknown>,
  customCity: string,
  customDistance: string,
): number {
  let count = 0;

  if (answers.homeRegion) count += 1;
  if (answers.usualWorkMode) count += 1;
  if (answers.usualCommuteMode) count += 1;

  const distance = answers.usualCommuteDistanceKm;
  if (distance === "unknown") count += 1;
  else if (typeof distance === "number") count += 1;
  else if (parseDistanceInput(customDistance)) count += 1;

  return count;
}

export function countAnsweredStep2(answers: Record<string, unknown>): number {
  return STEP2_QUESTIONS.filter((q) => answers[q.field] !== undefined && answers[q.field] !== "").length;
}

export function computeSetupConfidence(answered: number, total: number): number {
  if (total <= 0) return 35;
  return Math.round(35 + (answered / total) * 50);
}

export function buildStep1Profile(
  answers: Record<string, unknown>,
  customCity: string,
  customDistance: string,
): Record<string, unknown> {
  const profile: Record<string, unknown> = {};

  if (answers.homeRegion) {
    const label = LIVING_AREA_LABELS[String(answers.homeRegion)] ?? String(answers.homeRegion);
    profile.homeRegion = customCity.trim() ? `${label} · ${customCity.trim()}` : label;
  }

  if (answers.usualWorkMode) profile.usualWorkMode = answers.usualWorkMode;
  if (answers.usualCommuteMode) profile.usualCommuteMode = answers.usualCommuteMode;

  const distance = answers.usualCommuteDistanceKm;
  if (distance === "unknown") {
    profile.usualCommuteDistanceKm = "unknown";
  } else if (typeof distance === "number") {
    profile.usualCommuteDistanceKm = distance;
  } else {
    const parsed = parseDistanceInput(customDistance);
    if (parsed !== undefined) profile.usualCommuteDistanceKm = parsed;
  }

  return profile;
}

export function fillMissingBaselineDefaults(answers: Record<string, unknown>): Record<string, unknown> {
  const filled = { ...answers };

  for (const field of BASELINE_FIELDS) {
    const value = filled[field];
    if (value === undefined || value === null || value === "") {
      filled[field] = "unknown";
    }
  }

  return filled;
}
