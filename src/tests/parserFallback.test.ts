import { describe, expect, it } from "vitest";
import { demoGuestProfile } from "@/data/demoProfile";
import { parseActivityText } from "@/logic/parserFallback";

describe("parserFallback", () => {
  it("parses pooled ride as carpool and asks one follow-up", () => {
    const parsed = parseActivityText("I pooled a ride with my colleague.", demoGuestProfile);
    expect(parsed.activities.some((a) => a.details?.mode === "carpool")).toBe(true);
    expect(parsed.needsFollowUp).toBe(true);
    expect(parsed.followUpQuestion).toContain("same office route");
  });

  it("parses WFH and biryani", () => {
    const parsed = parseActivityText("WFH today and had chicken biryani for lunch.", demoGuestProfile);
    expect(parsed.activities.some((a) => a.details?.workMode === "work_from_home")).toBe(true);
    expect(parsed.activities.some((a) => a.details?.foodType === "chicken_fish")).toBe(true);
  });

  it("parses auto because rain as one-time travel", () => {
    const parsed = parseActivityText("I took an auto because it was raining.", demoGuestProfile);
    expect(parsed.activities.some((a) => a.details?.mode === "auto")).toBe(true);
    expect(parsed.suggestedProfileUpdate).toBeUndefined();
  });

  it("parses home lunch dal sabji", () => {
    const parsed = parseActivityText("Had home cooked dal sabji for lunch.", demoGuestProfile);
    expect(parsed.activities.some((a) => a.details?.mealSource === "home_cooked")).toBe(true);
    expect(parsed.activities.some((a) => a.details?.foodType === "vegetarian_low_dairy")).toBe(true);
  });

  it("parses AC usage hours", () => {
    const parsed = parseActivityText("Used AC for 4 hours at home.", demoGuestProfile);
    expect(parsed.activities.some((a) => a.details?.extraAcHours === 4)).toBe(true);
  });

  it("parses tea and biscuits with TV watching in one message", () => {
    const parsed = parseActivityText(
      "I had tea and biscuits around 5 PM and watched TV for 2 hours.",
      demoGuestProfile,
    );
    expect(parsed.activities.some((a) => a.label === "Tea and biscuits")).toBe(true);
    expect(parsed.activities.some((a) => a.details?.subcategory === "tv")).toBe(true);
    expect(parsed.activities.some((a) => a.details?.durationHours === 2)).toBe(true);
    expect(parsed.activities.length).toBe(2);
  });

  it("parses bus commute, office work, and canteen breakfast", () => {
    const parsed = parseActivityText("I took a bus to office at 8:30 AM and had breakfast at the office canteen.", demoGuestProfile);
    expect(parsed.activities.some((a) => a.details?.mode === "bus")).toBe(true);
    expect(parsed.activities.some((a) => a.details?.workMode === "office_day")).toBe(true);
    expect(parsed.activities.some((a) => a.details?.mealSource === "canteen")).toBe(true);
  });

  it("parses work from home and AC usage separately", () => {
    const parsed = parseActivityText("I worked from home today and used AC for 3 hours in the afternoon.", demoGuestProfile);
    expect(parsed.activities.some((a) => a.primaryCategory === "work_study")).toBe(true);
    expect(parsed.activities.some((a) => a.primaryCategory === "home_energy" && a.details?.durationHours === 3)).toBe(true);
  });

  it("parses ordered food, delivery, and plastic waste", () => {
    const parsed = parseActivityText("I ordered chicken biryani for dinner and threw away the plastic packaging.", demoGuestProfile);
    expect(parsed.activities.some((a) => a.primaryCategory === "food_meals" && a.details?.foodType === "chicken_fish")).toBe(true);
    expect(parsed.activities.some((a) => a.primaryCategory === "delivery_online_orders")).toBe(true);
    expect(parsed.activities.some((a) => a.primaryCategory === "waste_recycling" && a.details?.wasteType === "plasticHeavy")).toBe(true);
  });

  it("parses walking to market, groceries, and avoided action", () => {
    const parsed = parseActivityText("I walked to the market and bought vegetables.", demoGuestProfile);
    expect(parsed.activities.some((a) => a.details?.mode === "walk")).toBe(true);
    expect(parsed.activities.some((a) => a.primaryCategory === "shopping_purchases")).toBe(true);
    expect(parsed.activities.some((a) => a.primaryCategory === "positive_avoided_actions")).toBe(true);
  });
});
