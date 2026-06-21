import { describe, expect, it } from "vitest";
import { computeLoggedDayProfileConfidence, dayHasLoggedEvents } from "@/logic/profileConfidence";
import type { ActivityDay, ActivityEntry } from "@/types";

function activity(source: ActivityEntry["source"], status: ActivityEntry["status"]): ActivityEntry {
  return { source, status } as ActivityEntry;
}

function day(id: string, activities: ActivityEntry[]): ActivityDay {
  return { id, date: id, activities } as ActivityDay;
}

describe("profileConfidence", () => {
  it("keeps confidence at 10% when no logged event days exist", () => {
    expect(computeLoggedDayProfileConfidence({})).toBe(0.1);
    expect(
      computeLoggedDayProfileConfidence({
        "2026-06-20": day("2026-06-20", [activity("profile", "estimated_from_profile")]),
      }),
    ).toBe(0.1);
  });

  it("counts only days with user-logged events", () => {
    expect(dayHasLoggedEvents(day("2026-06-20", [activity("profile", "estimated_from_profile")]))).toBe(false);
    expect(dayHasLoggedEvents(day("2026-06-21", [activity("free_text", "confirmed")]))).toBe(true);

    const confidence = computeLoggedDayProfileConfidence({
      "2026-06-20": day("2026-06-20", [activity("profile", "estimated_from_profile")]),
      "2026-06-21": day("2026-06-21", [activity("free_text", "confirmed")]),
      "2026-06-22": day("2026-06-22", [activity("manual_edit", "confirmed")]),
    });

    expect(confidence).toBeGreaterThan(0.1);
  });
});
