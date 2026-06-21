import type { ActivityEntry, ParsedFact, ParsedResult, UserProfile } from "@/types";
import { inferTravelDetailsFromText } from "@/logic/travelInference";

function addFact(facts: ParsedFact[], label: string, value: string, confidence: number): void {
  facts.push({ label, value, confidence });
}

function pushActivity(
  activities: Partial<ActivityEntry>[],
  category: ActivityEntry["category"],
  activityType: string,
  label: string,
  details: Record<string, unknown>,
  extra: Partial<ActivityEntry> = {},
): void {
  activities.push({
    category,
    activityType,
    label,
    status: "parsed_pending",
    source: "free_text",
    details,
    ...extra,
  });
}

function parseDistanceKm(input: string): number | undefined {
  const kmMatch = input.match(/(\d+(?:\.\d+)?)\s*km\b/i);
  if (kmMatch) return Number(kmMatch[1]);
  if (/\bsame route\b|\busual route\b/i.test(input)) return undefined;
  return undefined;
}

function parseHours(input: string): number | undefined {
  const hourMatch = input.match(/(\d+(?:\.\d+)?)\s*(?:hours|hour|hrs|hr)\b/i);
  if (hourMatch) return Number(hourMatch[1]);
  if (/an extra hour/i.test(input)) return 1;
  return undefined;
}

function hasAny(input: string, list: string[]): boolean {
  return list.some((word) => input.includes(word));
}

export function parseActivityText(input: string, profile?: UserProfile): ParsedResult {
  const normalized = input.toLowerCase();
  const activities: Partial<ActivityEntry>[] = [];
  const extractedFacts: ParsedFact[] = [];
  let followUpQuestion: string | undefined;
  let followUpChips: string[] | undefined;
  let suggestedProfileUpdate: ParsedResult["suggestedProfileUpdate"];

  // Work mode
  if (hasAny(normalized, ["work from home", "worked from home", "working from home", "wfh", "stayed home"])) {
    pushActivity(
      activities,
      "energy",
      "work_from_home",
      "Worked from home",
      { workMode: "work_from_home", subcategory: "work_from_home" },
      { primaryCategory: "work_study", subcategory: "Work from home", categoryScore: 3, scoreMeaning: "medium" },
    );
    addFact(extractedFacts, "Work mode", "WFH", 0.9);
  } else if (hasAny(normalized, ["office", "went to work"])) {
    pushActivity(
      activities,
      "energy",
      "office_day",
      "Worked from office",
      { workMode: "office_day", subcategory: "office_day" },
      { primaryCategory: "work_study", subcategory: "Office day", categoryScore: 4, scoreMeaning: "medium" },
    );
    addFact(extractedFacts, "Work mode", "Office", 0.85);
  }

  // Travel
  const travelRules: Array<[string, string[]]> = [
    ["walk", ["walked"]],
    ["cycle", ["cycle", "cycled"]],
    ["scooter", ["scooter", "scooty", "bike"]],
    ["carpool", ["pooled", "carpool", "colleague ride", "shared ride"]],
    ["auto", ["auto", "rickshaw"]],
    ["cab", ["cab", "taxi", "uber", "ola"]],
    ["bus", ["bus"]],
    ["metro", ["metro"]],
    ["train", ["train"]],
    ["flight", ["flight", "plane", "airplane", "airport"]],
    ["car", ["car"]],
  ];
  let travelMode: string | undefined;
  for (const [mode, tokens] of travelRules) {
    if (hasAny(normalized, tokens)) {
      travelMode = mode;
      break;
    }
  }

  if (travelMode) {
    const inferredTravel = inferTravelDetailsFromText(input);
    const commuteLike = /\boffice|work|commute\b/i.test(normalized);
    const distanceKm =
      parseDistanceKm(normalized) ??
      (typeof inferredTravel.distanceKm === "number" ? inferredTravel.distanceKm : undefined) ??
      (travelMode === "flight" || !commuteLike ? undefined : profile?.core.usualCommuteDistanceKm);
    const label =
      travelMode === "flight" && inferredTravel.origin && inferredTravel.destination
        ? `Flight from ${inferredTravel.origin} to ${inferredTravel.destination}`
        : `Travel by ${travelMode}`;
    pushActivity(
      activities,
      "transport",
      travelMode === "flight" ? "flight" : travelMode === "bus" || normalized.includes("office") ? "commute_outbound" : "travel",
      label,
      {
        ...inferredTravel,
        mode: travelMode,
        distanceKm,
        baselineMode: commuteLike ? profile?.core.usualCommuteMode : undefined,
        baselineDistanceKm: travelMode === "flight" || commuteLike ? distanceKm ?? profile?.core.usualCommuteDistanceKm : undefined,
      },
      { primaryCategory: travelMode === "flight" ? "travel_trips" : "transportation" },
    );
    addFact(extractedFacts, "Travel", travelMode, 0.85);

    if (
      travelMode === "walk" &&
      hasAny(normalized, ["market", "bought", "shopping", "groceries", "vegetables"]) &&
      profile?.core.usualCommuteMode &&
      !["walk", "cycle"].includes(profile.core.usualCommuteMode)
    ) {
      pushActivity(
        activities,
        "special",
        "walked_instead",
        "Walked instead of motor travel",
        {
          avoidedActionType: "walked_instead",
          replacedAction: profile.core.usualCommuteMode,
          baselineMode: profile.core.usualCommuteMode,
          baselineDistanceKm: profile.core.usualCommuteDistanceKm,
          greenScore: 4,
        },
      { primaryCategory: "positive_avoided_actions", greenScore: 4, categoryScore: 4, scoreMeaning: "medium" },
      );
      addFact(extractedFacts, "Avoided action", "Walked instead", 0.75);
    }

    if (
      !followUpQuestion &&
      travelMode === "carpool" &&
      parseDistanceKm(normalized) === undefined &&
      profile?.core.usualCommuteDistanceKm
    ) {
      followUpQuestion = "Was the carpool for the same office route?";
      followUpChips = ["Yes, same route", "No, different distance", "Not sure"];
    }
  }

  // Tea, coffee, and light snacks
  if (
    hasAny(normalized, [
      "tea",
      "coffee",
      "chai",
      "biscuit",
      "biscuits",
      "cookie",
      "cookies",
      "rusk",
      "toast",
      "maggi",
      "noodles",
      "samosa",
      "pakora",
      "snack",
    ])
  ) {
    const isTeaOrCoffee = hasAny(normalized, ["tea", "coffee", "chai"]);
    const withBiscuits = hasAny(normalized, ["biscuit", "biscuits", "cookie", "cookies", "rusk"]);
    pushActivity(
      activities,
      "food",
      isTeaOrCoffee ? "tea_or_coffee" : "snack",
      withBiscuits && isTeaOrCoffee ? "Tea and biscuits" : isTeaOrCoffee ? "Tea or coffee" : "Snack",
      {
        mealSource: "home_cooked",
        foodType: withBiscuits ? "veg_dairy" : "vegetarian_low_dairy",
        subcategory: isTeaOrCoffee ? "tea_or_coffee" : "snack",
        subcategories: withBiscuits && isTeaOrCoffee ? ["tea_coffee", "snacks"] : [isTeaOrCoffee ? "tea_coffee" : "snacks"],
        items: [
          ...(isTeaOrCoffee ? ["tea"] : []),
          ...(withBiscuits ? ["biscuits"] : []),
        ],
        mealType: "snack",
      },
      {
        primaryCategory: "food_meals",
        subcategory: withBiscuits && isTeaOrCoffee ? "Tea / coffee + Snacks" : isTeaOrCoffee ? "Tea / coffee" : "Snacks",
        categoryScore: withBiscuits ? 3 : 2,
        scoreMeaning: withBiscuits ? "medium" : "low",
      },
    );
    addFact(extractedFacts, "Snack", withBiscuits && isTeaOrCoffee ? "Tea and biscuits" : "Snack", 0.85);
  }

  // TV / streaming device use
  if (
    hasAny(normalized, ["watched tv", "watch tv", "watching tv", "watched television", "netflix", "hotstar"]) ||
    (normalized.includes("tv") && hasAny(normalized, ["watch", "watched", "watching"]))
  ) {
    const hours = parseHours(normalized);
    pushActivity(activities, "digital", "tv_use", "TV watching", {
      subcategory: "tv",
      deviceType: "tv",
      durationHours: hours ?? 1,
    }, { primaryCategory: "digital_devices", subcategory: "TV", categoryScore: (hours ?? 1) >= 1 ? 3 : 2, scoreMeaning: (hours ?? 1) >= 1 ? "medium" : "low" });
    addFact(extractedFacts, "Digital", hours ? `TV ${hours} hours` : "TV use", 0.85);
  }

  // Meal source and food type
  const mealSourceMap: Array<[string, string[]]> = [
    ["home_cooked", ["home food", "home cooked", "cooked at home", "from home"]],
    ["packed", ["packed", "tiffin"]],
    ["ordered_online", ["ordered", "swiggy", "zomato", "delivery"]],
    ["restaurant", ["restaurant", "dhaba", "cafe", "ate out", "outside"]],
    ["canteen", ["canteen"]],
    ["skipped", ["skipped"]],
  ];
  const foodTypeMap: Array<[string, string[]]> = [
    ["chicken_fish", ["chicken", "fish", "chicken biryani", "biryani"]],
    ["red_meat", ["mutton", "beef", "red meat"]],
    ["egg", ["egg"]],
    ["veg_dairy", ["paneer", "cheese", "milk", "curd"]],
    ["vegetarian_low_dairy", ["dal", "sabji", "rice", "roti", "veg", "poha", "idli", "dosa", "upma"]],
  ];

  let mealSource: string | undefined;
  for (const [source, tokens] of mealSourceMap) {
    if (hasAny(normalized, tokens)) {
      mealSource = source;
      break;
    }
  }
  let foodType: string | undefined;
  for (const [type, tokens] of foodTypeMap) {
    if (hasAny(normalized, tokens)) {
      foodType = type;
      break;
    }
  }

  if (mealSource || foodType) {
    pushActivity(activities, "food", "meal", "Meal update", {
      mealSource: mealSource ?? "home_cooked",
      foodType: foodType ?? "unknown",
      packaging: mealSource === "ordered_online" ? "plastic_heavy" : "normal",
      deliveryType: mealSource === "ordered_online" ? "foodDelivery" : undefined,
      subcategory: normalized.includes("breakfast")
        ? "breakfast"
        : normalized.includes("dinner")
          ? "dinner"
          : normalized.includes("lunch")
            ? "lunch"
            : undefined,
    }, { primaryCategory: "food_meals" });
    if (mealSource) addFact(extractedFacts, "Meal source", mealSource, 0.85);
    if (foodType) addFact(extractedFacts, "Food type", foodType, 0.8);
  }

  // Energy
  if (hasAny(normalized, ["ac", "air conditioner", "geyser", "heater"])) {
    const hours = parseHours(normalized);
    pushActivity(
      activities,
      "energy",
      hasAny(normalized, ["ac", "air conditioner"]) ? "ac" : "home_energy",
      hasAny(normalized, ["ac", "air conditioner"]) ? "AC use" : "Energy usage",
      {
        extraAcHours: hours,
        durationHours: hours,
        monthlyKwh: profile?.core.monthlyElectricityKwh,
        subcategory: hasAny(normalized, ["ac", "air conditioner"]) ? "ac" : "normal_home_use",
      },
      { primaryCategory: "home_energy", categoryScore: hours && hours >= 3 ? 6 : 4, scoreMeaning: hours && hours >= 3 ? "high" : "medium" },
    );
    addFact(
      extractedFacts,
      "Energy",
      hours ? `AC usage ${hours} hours` : "High energy signal",
      hours ? 0.85 : 0.7,
    );
  }

  // Shopping / delivery
  if (hasAny(normalized, ["parcel", "amazon", "flipkart", "shopping", "bought", "ordered"])) {
    if (hasAny(normalized, ["bought", "market", "groceries", "vegetables"])) {
      pushActivity(
        activities,
        "shopping",
        "groceries",
        "Bought vegetables",
        {
          purchaseType: "groceries",
          subcategory: "groceries",
          items: hasAny(normalized, ["vegetables"]) ? ["vegetables"] : ["groceries"],
        },
        { primaryCategory: "shopping_purchases", subcategory: "Groceries", categoryScore: 2, scoreMeaning: "low" },
      );
    }
    if (hasAny(normalized, ["ordered", "parcel", "amazon", "flipkart", "delivery"])) {
      pushActivity(
        activities,
        "delivery",
        hasAny(normalized, ["food", "biryani", "dinner"]) ? "food_delivery" : "parcel",
        hasAny(normalized, ["food", "biryani", "dinner"]) ? "Food delivery" : "Shopping or delivery",
        {
          deliveryType: hasAny(normalized, ["food", "biryani", "dinner"]) ? "foodDelivery" : "groupedParcel",
          packaging: normalized.includes("plastic") ? "plastic_heavy" : "normal",
          count: 1,
          subcategory: hasAny(normalized, ["food", "biryani", "dinner"]) ? "food_delivery" : "parcel",
        },
        { primaryCategory: "delivery_online_orders", categoryScore: 6, scoreMeaning: "high" },
      );
    }
    addFact(extractedFacts, "Delivery", "Shopping/parcel", 0.75);
  }

  // Waste
  if (hasAny(normalized, ["food waste", "threw food"])) {
    pushActivity(activities, "waste", "waste", "Food waste", { wasteType: "foodWasteSmall" });
    addFact(extractedFacts, "Waste", "Food waste", 0.8);
  } else if (normalized.includes("plastic")) {
    pushActivity(
      activities,
      "waste",
      "plastic_waste",
      "Plastic-heavy waste",
      { wasteType: "plasticHeavy", subcategory: "plastic_waste" },
      { primaryCategory: "waste_recycling", categoryScore: 5, scoreMeaning: "medium" },
    );
    addFact(extractedFacts, "Waste", "Plastic-heavy", 0.8);
  } else if (normalized.includes("recycled")) {
    pushActivity(activities, "waste", "waste", "Recycled waste", { wasteType: "recycled" });
    addFact(extractedFacts, "Waste", "Recycled", 0.8);
  } else if (normalized.includes("compost")) {
    pushActivity(activities, "waste", "waste", "Composted waste", { wasteType: "composted" });
    addFact(extractedFacts, "Waste", "Composted", 0.8);
  }

  // Special activities
  if (hasAny(normalized, ["car wash", "wash my car", "washing my car", "washed my car"])) {
    pushActivity(activities, "special", "car_wash", "Car wash", {
      specialType: "car_wash",
      waterUse: "unknown",
    });
    addFact(extractedFacts, "Special activity", "Car wash", 0.8);

    if (!followUpQuestion) {
      followUpQuestion = "Did you use any cleaning products or just water?";
      followUpChips = ["Water only", "Cleaning products", "Not sure"];
    }
  }

  // Pattern suggestion rules
  const routineHint = hasAny(normalized, ["usually", "normally", "daily"]);
  const oneTimeHint = hasAny(normalized, ["today", "because it was raining", "wedding"]);
  if (routineHint && !oneTimeHint) {
    if (hasAny(normalized, ["work from home", "wfh"])) {
      suggestedProfileUpdate = {
        label: "Usual work mode",
        key: "core.usualWorkMode",
        value: "wfh",
      };
    } else if (travelMode) {
      suggestedProfileUpdate = {
        label: "Usual commute mode",
        key: "core.usualCommuteMode",
        value: travelMode,
      };
    } else if (mealSource) {
      suggestedProfileUpdate = {
        label: "Usual lunch source",
        key: "routines.usualLunch",
        value: { source: mealSource },
      };
    }
  }

  return {
    originalText: input,
    activities,
    extractedFacts,
    needsFollowUp: Boolean(followUpQuestion),
    followUpQuestion,
    followUpChips,
    suggestedProfileUpdate,
  };
}
