import type { FactorPack } from "../types";
import genericDemoFactorPack from "./factor-packs/generic_demo.json";
import { demoSampleDay } from "./demoDay";
import { demoGuestProfile } from "./demoProfile";

export { DEMO_DAY_ID, demoSampleDay } from "./demoDay";
export { DEMO_PROFILE_ID, demoGuestProfile } from "./demoProfile";

/** Typed demo emission factors for the generic_demo region pack. */
export const genericDemoFactors: FactorPack = genericDemoFactorPack;

/** Convenience bundle for tests and future seed logic. */
export const demoData = {
  profile: demoGuestProfile,
  day: demoSampleDay,
  factors: genericDemoFactors,
} as const;
