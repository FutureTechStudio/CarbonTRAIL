import { describe, expect, it } from "vitest";
import { buildTimeCheckpoints } from "@/features/today/dailyRingModel";
import { markTimeCheckpointEmpty } from "@/features/today/timeCheckpointActions";
import { getActivityTimeCheckpointId, TIME_CHECKPOINT_BY_ID, timeCheckpointIdForHour } from "@/features/today/timeCheckpoints";
import { demoGuestProfile } from "@/data/demoProfile";
import type { ActivityDay, ActivityEntry } from "@/types";

function mockActivity(partial: Partial<ActivityEntry>): ActivityEntry {
  return {
    id: partial.id ?? "a-1",
    dayId: "d-1",
    category: partial.category ?? "transport",
    activityType: partial.activityType ?? "commute_outbound",
    label: partial.label ?? "Morning Commute",
    status: partial.status ?? "confirmed",
    source: "free_text",
    details: partial.details ?? {},
    estimates: {
      co2eKg: 1,
      baselineCo2eKg: 1,
      savedCo2eKg: 0,
      impactScore: 1,
      confidence: 0.8,
      factorRefs: [],
    },
    visualEffect: { nodeType: "road", smoke: "none", greenery: "none", style: "solid" },
    createdAt: "",
    updatedAt: "",
    ...partial,
  };
}

describe("timeCheckpoints", () => {
  it("maps hours into two-hour center checkpoints", () => {
    expect(timeCheckpointIdForHour(7)).toBe("07");
    expect(timeCheckpointIdForHour(8)).toBe("09");
    expect(timeCheckpointIdForHour(13)).toBe("13");
    expect(timeCheckpointIdForHour(22)).toBe("23");
  });

  it("uses explicit checkpoint metadata before inferred slots", () => {
    const activity = mockActivity({ checkpointId: "21", details: { loggedTime: "08:30" } });
    expect(getActivityTimeCheckpointId(activity)).toBe("21");
  });

  it("groups multiple events into the same checkpoint", () => {
    const checkpoints = buildTimeCheckpoints([
      mockActivity({ id: "a", label: "Breakfast", category: "food", details: { loggedTime: "07:00" } }),
      mockActivity({ id: "b", label: "Commute", category: "transport", details: { loggedTime: "07:30" } }),
    ]);
    const seven = checkpoints.find((checkpoint) => checkpoint.id === "07");
    expect(seven?.events).toHaveLength(2);
    expect(seven?.status).toBe("confirmed");
  });

  it("marks mixed slots when statuses differ", () => {
    const checkpoints = buildTimeCheckpoints([
      mockActivity({ id: "a", status: "confirmed", details: { loggedTime: "21:00" } }),
      mockActivity({ id: "b", status: "assumed", details: { loggedTime: "21:30" } }),
    ]);
    expect(checkpoints.find((checkpoint) => checkpoint.id === "21")?.status).toBe("mixed");
  });

  it("logs nothing-to-log entries with zero footprint and empty slot status", () => {
    const day: ActivityDay = {
      id: "demo-2025-06-17",
      profileId: demoGuestProfile.id,
      date: "2025-06-17",
      dayType: "weekday_office",
      status: "mixed",
      activities: [
        mockActivity({
          id: "est-1",
          status: "estimated_from_profile",
          category: "food",
          label: "Breakfast",
          details: { loggedTime: "07:00" },
          estimates: {
            co2eKg: 0.4,
            baselineCo2eKg: 0.4,
            savedCo2eKg: 0,
            impactScore: 2,
            confidence: 0.55,
            factorRefs: [],
          },
        }),
      ],
      totals: {
        createdCo2eKg: 0.4,
        savedCo2eKg: 0,
        netChangeCo2eKg: 0,
        impactScore: 2,
        confidence: 0.55,
        dataCompleteness: 0,
      },
      visualSummary: {
        trailCondition: "light",
        smokePatches: 0,
        greenPatches: 0,
        treesGrown: 0,
        estimatedNodes: 0,
      },
      createdAt: "",
      updatedAt: "",
    };

    const checkpoint = TIME_CHECKPOINT_BY_ID.get("07");
    expect(checkpoint).toBeDefined();
    if (!checkpoint) return;

    const nextDay = markTimeCheckpointEmpty({ day, profile: demoGuestProfile, checkpoint });
    const seven = buildTimeCheckpoints(nextDay.activities).find((item) => item.id === "07");

    expect(seven?.status).toBe("empty");
    expect(seven?.events).toHaveLength(1);
    expect(seven?.events[0]?.activityType).toBe("nothing_to_log");
    expect(seven?.events[0]?.estimates.co2eKg).toBe(0);
    expect(seven?.totalKg).toBe(0);
    expect(nextDay.totals.createdCo2eKg).toBe(0);
  });
});
