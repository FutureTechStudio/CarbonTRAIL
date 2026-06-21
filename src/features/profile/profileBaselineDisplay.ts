import {
  formatCommuteMode,
  formatDistanceLabel,
  formatWorkMode,
  STEP1_QUESTIONS,
  STEP2_QUESTIONS,
} from "@/features/baseline/baselineQuestions";
import { BASELINE_FIELDS, type BaselineField } from "@/theme/palette";
import type { ProfileCore } from "@/types";

const FIELD_LABELS: Record<BaselineField, string> = {
  homeRegion: "Living area",
  householdSize: "Household size",
  usualWorkMode: "Weekday pattern",
  usualCommuteMode: "Usual commute",
  usualCommuteDistanceKm: "Travel distance",
  dietPattern: "Diet pattern",
  monthlyElectricityKwh: "Monthly electricity",
  foodDeliveryFrequency: "Food delivery",
};

const DIET_LABELS: Record<string, string> = {
  plant_based: "Plant based",
  mostly_vegetarian: "Mostly vegetarian",
  veg_dairy: "Veg dairy",
  egg: "Egg",
  chicken_fish_sometimes: "Chicken / fish sometimes",
  mixed: "Mixed",
  red_meat_often: "Red meat often",
  unknown: "Not sure",
};

const DELIVERY_LABELS: Record<string, string> = {
  rare: "Almost never",
  monthly: "About once a month",
  weekly_1_2: "1–2 times a week",
  weekly_3_plus: "3 or more times a week",
  unknown: "Not sure",
};

const SHOPPING_LABELS: Record<string, string> = {
  rare: "Rare",
  monthly: "Monthly",
  weekly: "Weekly",
  unknown: "Not sure",
};

function formatUnknown(value: unknown): string {
  if (value === undefined || value === null || value === "") return "Not answered";
  if (value === "unknown") return "Not sure";
  return String(value);
}

export function formatHouseholdSize(value: unknown): string {
  if (value === "unknown") return "Not sure";
  if (typeof value === "number") {
    if (value === 1) return "1 person";
    if (value === 2) return "2 people";
    if (value === 4) return "3–4 people";
    if (value >= 5) return "5+ people";
    return `${value} people`;
  }
  return formatUnknown(value);
}

export function formatDietPattern(value: unknown): string {
  if (typeof value === "string") return DIET_LABELS[value] ?? formatUnknown(value);
  return formatUnknown(value);
}

export function formatMonthlyElectricity(value: unknown): string {
  if (value === "unknown") return "Not sure";
  if (typeof value === "number") {
    if (value < 100) return "<100 units";
    if (value <= 200) return "100–200 units";
    if (value <= 400) return "200–400 units";
    return ">400 units";
  }
  return formatUnknown(value);
}

export function formatFoodDeliveryFrequency(value: unknown): string {
  if (typeof value === "string") return DELIVERY_LABELS[value] ?? formatUnknown(value);
  return formatUnknown(value);
}

export function formatHomeRegion(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value;
  return "Not answered";
}

export function formatBaselineFieldValue(field: BaselineField, core: ProfileCore): string {
  const value = core[field];

  switch (field) {
    case "homeRegion":
      return formatHomeRegion(value);
    case "householdSize":
      return formatHouseholdSize(value);
    case "usualWorkMode":
      return formatWorkMode(value as ProfileCore["usualWorkMode"]);
    case "usualCommuteMode":
      return formatCommuteMode(value as ProfileCore["usualCommuteMode"]);
    case "usualCommuteDistanceKm":
      return formatDistanceLabel(value);
    case "dietPattern":
      return formatDietPattern(value);
    case "monthlyElectricityKwh":
      return formatMonthlyElectricity(value);
    case "foodDeliveryFrequency":
      return formatFoodDeliveryFrequency(value);
    default:
      return formatUnknown(value);
  }
}

export function formatOnlineShoppingFrequency(value: unknown): string {
  if (typeof value === "string") return SHOPPING_LABELS[value] ?? formatUnknown(value);
  return formatUnknown(value);
}

export type BaselineFieldGroup = {
  title: string;
  description: string;
  fields: BaselineField[];
};

export const BASELINE_FIELD_GROUPS: BaselineFieldGroup[] = [
  {
    title: "Location & household",
    description: "Where you live and who shares your home.",
    fields: ["homeRegion", "householdSize"],
  },
  {
    title: "Work & commute",
    description: "Your usual weekday travel pattern.",
    fields: ["usualWorkMode", "usualCommuteMode", "usualCommuteDistanceKm"],
  },
  {
    title: "Food & delivery",
    description: "Typical meals and ordering habits.",
    fields: ["dietPattern", "foodDeliveryFrequency"],
  },
  {
    title: "Home energy",
    description: "Baseline electricity use for estimates.",
    fields: ["monthlyElectricityKwh"],
  },
];

export function baselineFieldLabel(field: BaselineField): string {
  return FIELD_LABELS[field];
}

export function baselineQuestionOptions(field: BaselineField) {
  const question = [...STEP1_QUESTIONS, ...STEP2_QUESTIONS].find((item) => item.field === field);
  return question?.options ?? [];
}

export function countSavedBaselineFields(core: ProfileCore): number {
  return BASELINE_FIELDS.filter((field) => {
    const value = core[field];
    return value !== undefined && value !== null && value !== "";
  }).length;
}
