import { describe, expect, it } from "vitest";
import {
  formatActivitiesTitle,
  formatDateKeyShort,
  formatJourneyTitle,
  pandaHelperMessage,
  parseOptionalDateSearchParam,
  parseViewDateFromSearchParam,
  shiftDateKey,
} from "@/features/today/todayDateView";

describe("todayDateView", () => {
  it("parses valid date query params", () => {
    expect(parseViewDateFromSearchParam("2026-06-17", "2026-06-21")).toBe("2026-06-17");
    expect(parseOptionalDateSearchParam("2026-06-17")).toBe("2026-06-17");
  });

  it("formats journey titles for today vs history", () => {
    expect(formatJourneyTitle("2026-06-21", "2026-06-21")).toBe("Today's Journey");
    expect(formatJourneyTitle("2026-06-15", "2026-06-21")).toContain("June");
    expect(formatJourneyTitle("2026-06-15", "2026-06-21")).not.toContain("Today's Journey");
  });

  it("formats activities title and panda helper for history dates", () => {
    expect(formatActivitiesTitle("2026-06-21", "2026-06-21")).toBe("Today's Activities");
    expect(formatActivitiesTitle("2026-06-15", "2026-06-21")).toBe("June 15 Activities");
    expect(pandaHelperMessage("2026-06-21", "2026-06-21")).toContain("what you are doing");
    expect(pandaHelperMessage("2026-06-15", "2026-06-21")).toContain("what you did");
  });

  it("falls back for invalid params", () => {
    expect(parseViewDateFromSearchParam("not-a-date", "2026-06-21")).toBe("2026-06-21");
    expect(parseViewDateFromSearchParam(null, "2026-06-21")).toBe("2026-06-21");
    expect(parseOptionalDateSearchParam("not-a-date")).toBeNull();
    expect(parseOptionalDateSearchParam(null)).toBeNull();
  });

  it("shifts date keys by day offset", () => {
    expect(shiftDateKey("2026-06-08", -1)).toBe("2026-06-07");
    expect(shiftDateKey("2026-06-08", 1)).toBe("2026-06-09");
  });
});
