import genericDemoFactorPack from "@/data/factor-packs/generic_demo.json";
import { inferFlightRouteFromContext, isCommuteDistanceForFlight } from "@/logic/travelInference";
import type { ActivityEntry, EstimateResult, FactorPack, TrailCondition } from "@/types";

type TransportInput = {
  mode?: string;
  distanceKm?: number;
  occupancy?: number;
  baselineMode?: string;
  baselineDistanceKm?: number;
};

type FoodInput = {
  foodType?: string;
  mealSource?: string;
  packaging?: string;
  deliveryType?: string;
  baselineFoodType?: string;
  baselineMealSource?: string;
};

type ElectricityInput = {
  monthlyKwh?: number;
  monthlyBill?: number;
  tariffPerKwh?: number;
  extraAcHours?: number;
  baselineExtraAcHours?: number;
};

type WasteInput = {
  wasteType?: string;
  count?: number;
  baselineWasteType?: string;
};

type DeliveryInput = {
  deliveryType?: string;
  count?: number;
  baselineDeliveryType?: string;
};

type DigitalInput = {
  subcategory?: string;
  durationHours?: number;
};

type SpecialInput = {
  specialType?: string;
  subcategory?: string;
  waterUse?: string;
  cleaningProducts?: boolean | string;
  guestCount?: number;
  attendeeCount?: number;
  venue?: string;
  mealSource?: string;
  foodType?: string;
  guestTravel?: string;
};

const DEFAULT_CONFIDENCE_BY_STATUS: Record<ActivityEntry["status"], number> = {
  confirmed: 0.9,
  parsed_pending: 0.75,
  assumed: 0.7,
  estimated_from_profile: 0.55,
};

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function buildEstimate(
  actual: number,
  baseline: number,
  factorRefs: string[],
  confidence: number,
): EstimateResult {
  const safeActual = Math.max(0, round(actual));
  const safeBaseline = Math.max(0, round(baseline));
  return {
    co2eKg: safeActual,
    baselineCo2eKg: safeBaseline,
    savedCo2eKg: 0,
    impactScore: impactScoreFromCo2e(safeActual),
    confidence: Math.min(0.98, Math.max(0.05, confidence)),
    factorRefs,
  };
}

export function loadFactorPack(): FactorPack {
  return genericDemoFactorPack as FactorPack;
}

export function impactScoreFromCo2e(co2eKg: number): number {
  if (co2eKg <= 0.5) return 1;
  if (co2eKg <= 1.5) return 3;
  if (co2eKg <= 3) return 5;
  if (co2eKg <= 6) return 7;
  return 9;
}

export function trailCondition(score: number): TrailCondition {
  if (score <= 2) return "clean";
  if (score <= 4) return "light";
  if (score <= 6) return "moderate";
  if (score <= 8) return "smoky";
  return "heavy";
}

export function estimateTransport(
  input: TransportInput,
  factors = loadFactorPack(),
  confidence = 0.8,
): EstimateResult {
  const mode = input.mode ?? "car";
  const baselineMode = input.baselineMode ?? mode;
  const distanceKm = Math.max(0, input.distanceKm ?? 0);
  const baselineDistanceKm = Math.max(0, input.baselineDistanceKm ?? distanceKm);
  const modeFactor = factors.transport[mode as keyof FactorPack["transport"]] ?? factors.transport.car;
  const baselineFactor =
    factors.transport[baselineMode as keyof FactorPack["transport"]] ?? factors.transport.car;
  const occupancy = Math.max(1, input.occupancy ?? (mode === "carpool" ? 2 : 1));
  const baselineOccupancy = baselineMode === "carpool" ? 2 : 1;

  return buildEstimate(
    (distanceKm * modeFactor) / occupancy,
    (baselineDistanceKm * baselineFactor) / baselineOccupancy,
    [`transport.${mode}`],
    confidence,
  );
}

export function estimateFood(
  input: FoodInput,
  factors = loadFactorPack(),
  confidence = 0.8,
): EstimateResult {
  const foodType = input.foodType ?? "unknown";
  const mealSource = input.mealSource ?? "home_cooked";
  const packaging = input.packaging ?? "normal";
  const deliveryType =
    input.deliveryType ??
    (mealSource === "ordered_online" ? "foodDelivery" : "groupedParcel");

  const baselineFoodType = input.baselineFoodType ?? foodType;
  const baselineMealSource = input.baselineMealSource ?? mealSource;

  const mealBase = factors.foodMeal[foodType] ?? factors.foodMeal.unknown;
  const sourceAdjustment = factors.mealSourceAdjustments[mealSource] ?? 0;
  const packagingAdjustment = factors.packaging[packaging] ?? factors.packaging.unknown ?? 0;
  const deliveryAdjustment =
    mealSource === "ordered_online" ? factors.delivery[deliveryType] ?? factors.delivery.foodDelivery : 0;

  const baselineMealBase = factors.foodMeal[baselineFoodType] ?? factors.foodMeal.unknown;
  const baselineSourceAdjustment = factors.mealSourceAdjustments[baselineMealSource] ?? 0;
  const baselineDeliveryAdjustment =
    baselineMealSource === "ordered_online" ? factors.delivery.foodDelivery : 0;

  return buildEstimate(
    mealBase + sourceAdjustment + packagingAdjustment + deliveryAdjustment,
    baselineMealBase + baselineSourceAdjustment + packagingAdjustment + baselineDeliveryAdjustment,
    [`foodMeal.${foodType}`, `mealSourceAdjustments.${mealSource}`],
    confidence,
  );
}

export function estimateElectricity(
  input: ElectricityInput,
  factors = loadFactorPack(),
  confidence = 0.75,
): EstimateResult {
  const monthlyKwh =
    input.monthlyKwh ??
    (input.monthlyBill && input.tariffPerKwh ? input.monthlyBill / input.tariffPerKwh : 0);
  const dailyKwh = monthlyKwh / 30;
  const extraAcHours = Math.max(0, input.extraAcHours ?? 0);
  const baselineExtraAcHours = Math.max(0, input.baselineExtraAcHours ?? 0);
  const kwhFactor = factors.electricity.kgPerKwh;

  return buildEstimate(
    dailyKwh * kwhFactor + extraAcHours * 1.0 * kwhFactor,
    dailyKwh * kwhFactor + baselineExtraAcHours * 1.0 * kwhFactor,
    ["electricity.kgPerKwh"],
    confidence,
  );
}

export function estimateWaste(
  input: WasteInput,
  factors = loadFactorPack(),
  confidence = 0.8,
): EstimateResult {
  const wasteType = input.wasteType ?? "normalDaily";
  const baselineWasteType = input.baselineWasteType ?? wasteType;
  const count = Math.max(1, input.count ?? 1);

  const wasteFactor = factors.waste[wasteType] ?? factors.waste.normalDaily;
  const baselineFactor = factors.waste[baselineWasteType] ?? factors.waste.normalDaily;

  return buildEstimate(
    wasteFactor * count,
    baselineFactor * count,
    [`waste.${wasteType}`],
    confidence,
  );
}

export function estimateDelivery(
  input: DeliveryInput,
  factors = loadFactorPack(),
  confidence = 0.75,
): EstimateResult {
  const deliveryType = input.deliveryType ?? "groupedParcel";
  const baselineDeliveryType = input.baselineDeliveryType ?? deliveryType;
  const count = Math.max(1, input.count ?? 1);
  const factor = factors.delivery[deliveryType] ?? factors.delivery.groupedParcel;
  const baselineFactor = factors.delivery[baselineDeliveryType] ?? factors.delivery.groupedParcel;

  return buildEstimate(factor * count, baselineFactor * count, [`delivery.${deliveryType}`], confidence);
}

export function estimateDigital(input: DigitalInput, confidence = 0.7): EstimateResult {
  const hours = Math.max(0.5, input.durationHours ?? 1);
  const subcategory = input.subcategory ?? "laptop_use";
  const kgPerHour =
    subcategory === "laptop_use"
      ? 0.025
      : subcategory === "phone_use"
        ? 0.008
        : subcategory === "tv_router" || subcategory === "tv"
          ? 0.018
          : subcategory === "streaming" || subcategory === "video_calls"
            ? 0.012
            : 0.015;
  const actual = hours * kgPerHour;
  return buildEstimate(actual, actual * 1.1, [`digital.${subcategory}`], confidence);
}

function isPartyActivity(
  input: SpecialInput,
  activityType?: string,
  label?: string,
): boolean {
  return (
    input.specialType === "party" ||
    input.subcategory === "party" ||
    activityType === "party" ||
    /\bparty\b/i.test(label ?? "")
  );
}

export function estimateParty(
  input: SpecialInput,
  factors = loadFactorPack(),
  confidence = 0.7,
): EstimateResult {
  const headcount = Math.max(1, Math.round(input.guestCount ?? input.attendeeCount ?? 8));
  const venue = input.venue ?? "home";
  const mealSource =
    input.mealSource ?? (venue === "elsewhere" ? "restaurant" : "home_cooked");
  const foodType = input.foodType ?? "unknown";
  const packaging = venue === "home" ? "normal" : "minimal";

  const perPersonFood = estimateFood({ foodType, mealSource, packaging }, factors, confidence);
  const hostingEnergyPerPerson = venue === "home" ? 0.06 : 0.02;
  const partyWastePerPerson = 0.04;

  let guestTravelKg = 0;
  if (input.guestTravel === "some") {
    guestTravelKg = headcount * 0.15;
  } else if (input.guestTravel === "unknown") {
    guestTravelKg = headcount * 0.08;
  }

  const actualPerPerson = perPersonFood.co2eKg + hostingEnergyPerPerson + partyWastePerPerson;
  const totalActual = actualPerPerson * headcount + guestTravelKg;

  const baselineMealSource = mealSource === "home_cooked" ? "restaurant" : mealSource;
  const baselinePerPersonFood = estimateFood(
    { foodType, mealSource: baselineMealSource, packaging: "normal" },
    factors,
    confidence,
  );
  const totalBaseline =
    (baselinePerPersonFood.co2eKg + hostingEnergyPerPerson + partyWastePerPerson) * headcount +
    guestTravelKg;

  return buildEstimate(
    totalActual,
    totalBaseline,
    ["special.party", `foodMeal.${foodType}`, `mealSourceAdjustments.${mealSource}`],
    Math.min(0.9, confidence * 0.85),
  );
}

export function estimateSpecial(
  input: SpecialInput,
  confidence = 0.7,
  activityType?: string,
  label?: string,
): EstimateResult {
  if (isPartyActivity(input, activityType, label)) {
    return estimateParty(input, loadFactorPack(), confidence);
  }

  if (input.specialType === "car_wash") {
    const usesCleaningProducts = input.cleaningProducts === true || input.waterUse === "water_and_cleaning_products";
    const waterOnly = input.cleaningProducts === false || input.waterUse === "water_only";
    const actual = waterOnly ? 0.08 : usesCleaningProducts ? 0.22 : 0.15;
    return buildEstimate(actual, 0.22, ["special.car_wash"], confidence);
  }

  return buildEstimate(0, 0, [], confidence);
}

export function computeActivityEstimates(
  activity: Pick<ActivityEntry, "category" | "status" | "details"> &
    Partial<Pick<ActivityEntry, "activityType" | "label">>,
  factors = loadFactorPack(),
): EstimateResult {
  const confidence = DEFAULT_CONFIDENCE_BY_STATUS[activity.status] ?? 0.25;
  const details = activity.details ?? {};

  switch (activity.category) {
    case "transport": {
      const mode = String(details.mode ?? "car");
      let loggedDistance = Number(details.distanceKm ?? 0);
      let baselineDistanceKm = details.baselineDistanceKm
        ? Number(details.baselineDistanceKm)
        : undefined;

      if (mode === "flight" && isCommuteDistanceForFlight(loggedDistance)) {
        loggedDistance = 0;
      }
      if (mode === "flight" && isCommuteDistanceForFlight(baselineDistanceKm)) {
        baselineDistanceKm = undefined;
      }

      if (mode === "flight" && (!loggedDistance || isCommuteDistanceForFlight(loggedDistance))) {
        const route = inferFlightRouteFromContext(details);
        if (typeof route.distanceKm === "number") {
          loggedDistance = Number(route.distanceKm);
          baselineDistanceKm = baselineDistanceKm ?? loggedDistance;
        }
      }

      const distanceKm =
        loggedDistance > 0
          ? loggedDistance
          : baselineDistanceKm && baselineDistanceKm > 0 && mode !== "flight"
            ? baselineDistanceKm
            : 0;

      return estimateTransport(
        {
          mode,
          distanceKm,
          occupancy: details.occupancy ? Number(details.occupancy) : undefined,
          baselineMode: details.baselineMode ? String(details.baselineMode) : undefined,
          baselineDistanceKm,
        },
        factors,
        confidence,
      );
    }
    case "food":
      return estimateFood(
        {
          foodType: String(details.foodType ?? "unknown"),
          mealSource: String(details.mealSource ?? "home_cooked"),
          packaging: String(details.packaging ?? "normal"),
          deliveryType: details.deliveryType ? String(details.deliveryType) : undefined,
          baselineFoodType: details.baselineFoodType ? String(details.baselineFoodType) : undefined,
          baselineMealSource: details.baselineMealSource ? String(details.baselineMealSource) : undefined,
        },
        factors,
        confidence,
      );
    case "energy":
      return estimateElectricity(
        {
          monthlyKwh: details.monthlyKwh ? Number(details.monthlyKwh) : undefined,
          monthlyBill: details.monthlyBill ? Number(details.monthlyBill) : undefined,
          tariffPerKwh: details.tariffPerKwh ? Number(details.tariffPerKwh) : undefined,
          extraAcHours: details.extraAcHours ? Number(details.extraAcHours) : undefined,
          baselineExtraAcHours: details.baselineExtraAcHours
            ? Number(details.baselineExtraAcHours)
            : undefined,
        },
        factors,
        confidence,
      );
    case "waste":
      return estimateWaste(
        {
          wasteType: String(details.wasteType ?? "normalDaily"),
          count: details.count ? Number(details.count) : undefined,
          baselineWasteType: details.baselineWasteType ? String(details.baselineWasteType) : undefined,
        },
        factors,
        confidence,
      );
    case "delivery":
    case "shopping":
      return estimateDelivery(
        {
          deliveryType: String(details.deliveryType ?? "groupedParcel"),
          count: details.count ? Number(details.count) : undefined,
          baselineDeliveryType: details.baselineDeliveryType
            ? String(details.baselineDeliveryType)
            : undefined,
        },
        factors,
        confidence,
      );
    case "digital":
      return estimateDigital(
        {
          subcategory: details.subcategory ? String(details.subcategory) : undefined,
          durationHours: details.durationHours
            ? Number(details.durationHours)
            : details.extraAcHours
              ? Number(details.extraAcHours)
              : undefined,
        },
        confidence,
      );
    case "special":
      return estimateSpecial(
        {
          specialType: details.specialType
            ? String(details.specialType)
            : activity.activityType === "party"
              ? "party"
              : undefined,
          subcategory: details.subcategory ? String(details.subcategory) : undefined,
          waterUse: details.waterUse ? String(details.waterUse) : undefined,
          cleaningProducts:
            typeof details.cleaningProducts === "boolean" || typeof details.cleaningProducts === "string"
              ? details.cleaningProducts
              : undefined,
          guestCount: details.guestCount ? Number(details.guestCount) : undefined,
          attendeeCount: details.attendeeCount ? Number(details.attendeeCount) : undefined,
          venue: details.venue ? String(details.venue) : undefined,
          mealSource: details.mealSource ? String(details.mealSource) : undefined,
          foodType: details.foodType ? String(details.foodType) : undefined,
          guestTravel: details.guestTravel ? String(details.guestTravel) : undefined,
        },
        confidence,
        activity.activityType,
        activity.label,
      );
    default:
      return buildEstimate(0, 0, [], confidence);
  }
}

export function computeDayTotals(
  activities: Array<Pick<ActivityEntry, "estimates" | "status"> & { includedInParentContext?: boolean }>,
): {
  createdCo2eKg: number;
  savedCo2eKg: number;
  netChangeCo2eKg: number;
  impactScore: number;
  confidence: number;
  dataCompleteness: number;
} {
  if (activities.length === 0) {
    return {
      createdCo2eKg: 0,
      savedCo2eKg: 0,
      netChangeCo2eKg: 0,
      impactScore: 1,
      confidence: 0.05,
      dataCompleteness: 0,
    };
  }

  const countedActivities = activities.filter((item) => !item.includedInParentContext);
  const totalSource = countedActivities.length > 0 ? countedActivities : activities;
  const created = totalSource.reduce((sum, item) => sum + (item.estimates.co2eKg ?? 0), 0);
  const baseline = totalSource.reduce((sum, item) => sum + (item.estimates.baselineCo2eKg ?? 0), 0);
  const avgConfidence =
    activities.reduce((sum, item) => sum + (item.estimates.confidence ?? 0.25), 0) / activities.length;
  const knownCount = activities.filter((item) => item.status !== "estimated_from_profile").length;

  return {
    createdCo2eKg: round(created),
    savedCo2eKg: 0,
    netChangeCo2eKg: round(created - baseline),
    impactScore: impactScoreFromCo2e(round(created)),
    confidence: Math.max(0.05, Math.min(0.98, round(avgConfidence))),
    dataCompleteness: round(knownCount / activities.length),
  };
}
