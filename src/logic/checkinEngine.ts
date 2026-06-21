import type { ActivityEntry, UserProfile } from "@/types";

export function buildProfileContextLines(profile: UserProfile): string[] {
  const commuteMode = profile.core.usualCommuteMode ?? "unknown";
  const commuteDistance = profile.core.usualCommuteDistanceKm;
  const workMode = profile.core.usualWorkMode ?? "unknown";
  const officeDays = profile.routines.officeDays?.length
    ? profile.routines.officeDays
        .map((day) => day.slice(0, 1).toUpperCase() + day.slice(1, 3))
        .join("/")
    : "Not set";
  const lunchSource = profile.routines.usualLunch?.source ?? "unknown";

  return [
    "Using saved profile:",
    `- Usual commute: ${commuteMode}${commuteDistance ? `, ${commuteDistance} km` : ""}`,
    `- Usual work mode: ${workMode} (${officeDays})`,
    `- Usual lunch: ${lunchSource}`,
    "Tell me only what changed today.",
  ];
}

export function getCheckinPrompt(profile?: UserProfile): string {
  if (profile?.core.usualCommuteMode && profile.core.usualCommuteDistanceKm) {
    return `Did you commute on your ${profile.core.usualCommuteMode} like usual today? Panda can use your Carbon Memory if you skip details.`;
  }
  return "Tell Panda what happened today. I'll help turn your day into a carbon trail.";
}

export function getCommuteChips(): string[] {
  return ["Yes", "No", "I worked from home", "Different travel"];
}

export function processChipAnswer(
  chip: string,
  profile?: UserProfile,
): {
  activities: Partial<ActivityEntry>[];
  needsTextFollowUp: boolean;
  message: string;
} {
  const normalized = chip.trim().toLowerCase();

  if (normalized === "yes" && profile?.core.usualCommuteMode) {
    return {
      activities: [
        {
          category: "transport",
          activityType: "commute",
          label: "Usual commute",
          status: "confirmed",
          source: "chip",
          details: {
            mode: profile.core.usualCommuteMode,
            distanceKm: profile.core.usualCommuteDistanceKm,
          },
        },
      ],
      needsTextFollowUp: false,
      message: "Great, I marked your usual commute for today.",
    };
  }

  if (normalized === "i worked from home") {
    return {
      activities: [
        {
          category: "energy",
          activityType: "work_mode",
          label: "Worked from home",
          status: "confirmed",
          source: "chip",
          details: { workMode: "wfh" },
        },
      ],
      needsTextFollowUp: false,
      message: "Noted. Share any meal, energy, or delivery changes if needed.",
    };
  }

  return {
    activities: [],
    needsTextFollowUp: true,
    message: "Please share a quick text update so I can parse the exact change.",
  };
}
