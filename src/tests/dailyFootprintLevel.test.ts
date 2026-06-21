import { describe, expect, it } from "vitest";
import { dailyFootprintScoreFromTotal, getDailyFootprintLevel } from "@/logic/dailyFootprintLevel";

describe("dailyFootprintLevel", () => {
  it("maps daily totals to footprint labels", () => {
    expect(getDailyFootprintLevel(2.5).label).toBe("Very Low");
    expect(getDailyFootprintLevel(4).label).toBe("Low");
    expect(getDailyFootprintLevel(8).label).toBe("Moderate");
    expect(getDailyFootprintLevel(14).label).toBe("High");
    expect(getDailyFootprintLevel(25).label).toBe("Very High");
  });

  it("derives score bands from daily totals", () => {
    expect(dailyFootprintScoreFromTotal(1)).toBeLessThanOrEqual(1);
    expect(dailyFootprintScoreFromTotal(5)).toBeGreaterThanOrEqual(2);
    expect(dailyFootprintScoreFromTotal(5)).toBeLessThanOrEqual(3);
    expect(dailyFootprintScoreFromTotal(10)).toBeGreaterThanOrEqual(4);
    expect(dailyFootprintScoreFromTotal(18)).toBeGreaterThanOrEqual(6);
    expect(dailyFootprintScoreFromTotal(30)).toBeGreaterThanOrEqual(9);
  });
});
