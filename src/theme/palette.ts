/** CarbonTrail AI nature palette. */
export const P = {
  green: "#2D7A4F",
  leaf: "#4CAF7D",
  lightGreen: "#A8D5B5",
  sky: "#7BB8D4",
  cream: "#F5F0E8",
  soil: "#7A5C3A",
  charcoal: "#2A3628",
  smoke: "#B0A898",
  amber: "#E8923A",
  sage: "#E4EFE7",
  mist: "#EDE8DE",
  card: "#FDFAF4",
  mutedText: "#6B7B6E",
  faintText: "#8A9A8A",
  border: "#E4EDE8",
} as const;

/** Full-width page shell — no max-width cap. */
export const PAGE_SHELL = "w-full";
/** @deprecated Use PAGE_SHELL */
export const PAGE_MAX = PAGE_SHELL;

export const STORAGE_KEY = "carbontrail_guest_v1";

export const BASELINE_FIELDS = [
  "homeRegion",
  "householdSize",
  "usualWorkMode",
  "usualCommuteMode",
  "usualCommuteDistanceKm",
  "dietPattern",
  "monthlyElectricityKwh",
  "foodDeliveryFrequency",
] as const;

export type BaselineField = (typeof BASELINE_FIELDS)[number];
