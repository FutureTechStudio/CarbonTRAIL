import { describe, expect, it } from "vitest";
import { demoGuestProfile } from "@/data/demoProfile";
import {
  buildProfileContextLines,
  getCheckinPrompt,
  getCommuteChips,
  processChipAnswer,
} from "@/logic/checkinEngine";

describe("checkinEngine", () => {
  it("builds prompt from profile commute", () => {
    const prompt = getCheckinPrompt(demoGuestProfile);
    expect(prompt).toContain("scooter");
  });

  it("returns commute chips", () => {
    expect(getCommuteChips()).toEqual(["Yes", "No", "I worked from home", "Different travel"]);
  });

  it("processes yes chip as usual commute", () => {
    const result = processChipAnswer("Yes", demoGuestProfile);
    expect(result.activities[0].details?.mode).toBe("scooter");
    expect(result.needsTextFollowUp).toBe(false);
  });

  it("builds profile context lines", () => {
    const lines = buildProfileContextLines(demoGuestProfile);
    expect(lines[0]).toContain("Using saved profile");
    expect(lines.join(" ")).toContain("Usual commute");
  });
});
