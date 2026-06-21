import { describe, expect, it } from "vitest";
import { demoGuestProfile } from "@/data/demoProfile";
import { estimateDayFromProfile } from "@/logic/routineEstimator";

describe("routineEstimator", () => {
  it("creates weekday office template", () => {
    const day = estimateDayFromProfile(demoGuestProfile, "2025-06-17");
    expect(day.dayType).toBe("weekday_office");
    expect(day.status).toBe("auto_filled");
    expect(day.activities.every((a) => a.status === "estimated_from_profile")).toBe(true);
    expect(day.activities.some((a) => a.category === "transport")).toBe(true);
  });

  it("creates weekend home template", () => {
    const day = estimateDayFromProfile(demoGuestProfile, "2025-06-22");
    expect(day.dayType).toBe("weekend_home");
    expect(day.activities.some((a) => a.category === "transport")).toBe(false);
  });
});
