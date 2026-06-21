export type DailyFootprintLevelId = "very_low" | "low" | "moderate" | "high" | "very_high";

export type DailyFootprintLevel = {
  id: DailyFootprintLevelId;
  label: string;
  scoreRange: string;
  meaning: string;
  toneClass: string;
};

const LEVELS: DailyFootprintLevel[] = [
  {
    id: "very_low",
    label: "Very Low",
    scoreRange: "0–1",
    meaning: "Excellent day; minimal travel, simple food, low energy",
    toneClass: "daily-ring-center__sub--very-low",
  },
  {
    id: "low",
    label: "Low",
    scoreRange: "2–3",
    meaning: "Strong realistic low-carbon day",
    toneClass: "daily-ring-center__sub--low",
  },
  {
    id: "moderate",
    label: "Moderate",
    scoreRange: "4–5",
    meaning: "Normal transition range; manageable footprint",
    toneClass: "daily-ring-center__sub--moderate",
  },
  {
    id: "high",
    label: "High",
    scoreRange: "6–8",
    meaning: "Heavy day; likely commute, AC, delivery, shopping, meat, or long travel",
    toneClass: "daily-ring-center__sub--high",
  },
  {
    id: "very_high",
    label: "Very High",
    scoreRange: "9–10",
    meaning: "Major impact day; usually flight, long car trip, big purchase, or high energy use",
    toneClass: "daily-ring-center__sub--very-high",
  },
];

export function getDailyFootprintLevel(totalKg: number): DailyFootprintLevel {
  const kg = Math.max(0, totalKg);
  if (kg < 4) return LEVELS[0]!;
  if (kg < 8) return LEVELS[1]!;
  if (kg < 14) return LEVELS[2]!;
  if (kg < 25) return LEVELS[3]!;
  return LEVELS[4]!;
}

export function dailyFootprintScoreFromTotal(totalKg: number): number {
  const kg = Math.max(0, totalKg);
  if (kg < 4) return kg <= 2 ? 0 : 1;
  if (kg < 8) return kg <= 6 ? 2 : 3;
  if (kg < 14) return kg <= 11 ? 4 : 5;
  if (kg < 25) return kg <= 19 ? 6 : kg <= 22 ? 7 : 8;
  return kg <= 30 ? 9 : 10;
}
