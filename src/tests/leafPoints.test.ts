import { describe, expect, it } from "vitest";
import { awardPoints, getLevelName, getLevelNumber, getLevelProgress } from "@/logic/leafPoints";
import type { LeafPointEvent } from "@/types";

describe("leafPoints", () => {
  it("awards regular points", () => {
    const result = awardPoints([], {
      dayId: "day-1",
      eventType: "detail_shared",
      label: "Shared commute detail",
    });
    expect(result.awardedPoints).toBe(10);
    expect(result.event).toBeDefined();
  });

  it("caps natural-language reward at two per day", () => {
    const existing: LeafPointEvent[] = [];
    const first = awardPoints(existing, {
      dayId: "day-1",
      eventType: "detail_shared",
      label: "Natural text",
      metadata: { source: "natural_language" },
      awardedAt: "2026-06-20T09:00:00.000Z",
    });
    if (first.event) existing.push(first.event);
    const second = awardPoints(existing, {
      dayId: "day-1",
      eventType: "detail_shared",
      label: "Natural text",
      metadata: { source: "natural_language" },
      awardedAt: "2026-06-20T10:00:00.000Z",
    });
    if (second.event) existing.push(second.event);
    const third = awardPoints(existing, {
      dayId: "day-1",
      eventType: "detail_shared",
      label: "Natural text",
      metadata: { source: "natural_language" },
      awardedAt: "2026-06-20T11:00:00.000Z",
    });
    expect(first.awardedPoints).toBe(10);
    expect(second.awardedPoints).toBe(10);
    expect(third.awardedPoints).toBe(0);
  });

  it("does not reward direct green action metadata", () => {
    const result = awardPoints([], {
      dayId: "day-1",
      eventType: "detail_shared",
      label: "Walked instead of scooter",
      metadata: { greenAction: true },
    });
    expect(result.awardedPoints).toBe(0);
  });

  it("returns expected level name", () => {
    expect(getLevelName(0)).toBe("Seed Starter");
    expect(getLevelName(3500)).toBe("Green Guardian");
  });

  it("returns level number and next milestone progress", () => {
    expect(getLevelNumber(700)).toBe(4);
    expect(getLevelProgress(750)).toMatchObject({
      level: 4,
      levelName: "Trail Keeper",
      nextMilestone: { level: 5, points: 1200, name: "Forest Friend" },
    });
  });
});
