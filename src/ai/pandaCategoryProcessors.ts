import { PANDA_PRIMARY_CATEGORIES } from "@/ai/categoryDetailSchema";
import { technicalCategoryForPrimaryCategory } from "@/logic/categoryScoring";
import type { PrimaryActionCategory, UserProfile } from "@/types";
import type { CheckpointSlotId, PandaExtractedActivity, PandaParseResult } from "@/ai/pandaSchemas";

type ProcessorContext = {
  text: string;
  parse?: PandaParseResult;
  profile?: UserProfile;
};

type FollowUpContext = {
  reply: string;
  activity: PandaExtractedActivity;
  missingFields: string[];
  followUpQuestion: string | null;
  originalText: string;
  profile: UserProfile;
};

export type PandaCategoryProcessor = {
  primaryCategory: PrimaryActionCategory;
  defaultActivityType: string;
  defaultLabel: string;
  defaultSlot: CheckpointSlotId;
  keywords: RegExp[];
  detect?: (context: ProcessorContext) => boolean;
  buildLabel?: (context: ProcessorContext) => string;
  inferDetails?: (context: ProcessorContext) => Record<string, unknown>;
  parseFollowUp?: (context: FollowUpContext) => Record<string, unknown>;
};

function has(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

function numberFromText(text: string): number | undefined {
  const match = text.match(/\b(\d+(?:\.\d+)?)\b/);
  return match ? Number(match[1]) : undefined;
}

function hoursFromText(text: string): number | undefined {
  const match = text.match(/\b(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/i);
  return match ? Number(match[1]) : undefined;
}

function modeFromText(text: string): string | undefined {
  const normalized = text.toLowerCase();
  if (/\bwalk(?:ed|ing)?\b/.test(normalized)) return "walk";
  if (/\bcycl(?:e|ed|ing)|bicycle|bike\b/.test(normalized)) return "cycle";
  if (/\bbus\b/.test(normalized)) return "bus";
  if (/\bmetro\b/.test(normalized)) return "metro";
  if (/\btrain\b/.test(normalized)) return "train";
  if (/\bscoot(?:er|y)?\b/.test(normalized)) return "scooter";
  if (/\bauto|rickshaw\b/.test(normalized)) return "auto";
  if (/\bcab|taxi|uber|ola\b/.test(normalized)) return "cab";
  if (/\bcarpool|pooled\b/.test(normalized)) return "carpool";
  if (/\bdrove|drive|car\b/.test(normalized)) return "car";
  if (/\bflight|flew|flying|plane|airport\b/.test(normalized)) return "flight";
  return undefined;
}

function localDestination(text: string): string | undefined {
  if (/\bfriends?\s+(?:home|house|place)\b/i.test(text)) return "friend_home";
  if (/\bmarket\b/i.test(text)) return "market";
  if (/\bmall\b/i.test(text)) return "mall";
  if (/\boffice\b/i.test(text)) return "office";
  return undefined;
}

function tripLabel(text: string): string {
  if (/\bfriends?\s+(?:home|house|place)\b/i.test(text)) return "Trip to friend's home";
  if (/\bmarket\b/i.test(text)) return "Trip to market";
  if (/\bmall\b/i.test(text)) return "Trip to mall";
  if (/\boffice\b/i.test(text)) return "Trip to office";
  return "Local trip";
}

function enumReply(value: string, aliases: Record<string, string>): string | undefined {
  const normalized = value.toLowerCase().replace(/[\s-]+/g, "_");
  for (const [token, output] of Object.entries(aliases)) {
    if (normalized.includes(token)) return output;
  }
  return undefined;
}

const PROCESSORS: PandaCategoryProcessor[] = [
  {
    primaryCategory: "transportation",
    defaultActivityType: "local_ride",
    defaultLabel: "Local trip",
    defaultSlot: "afternoon_activity",
    keywords: [/\b(went|go|going|visited|headed|travel(?:ed|led)?)\b/i, /\b(bus|walked|cycled|drove|scooter|cab|auto|metro)\b/i],
    detect: ({ text, parse }) =>
      /\b(how did you travel|travel mode|mode of transport|how are you getting)\b/i.test(parse?.followUpQuestion ?? "") ||
      (/\b(went|go|going|visited|headed|travel(?:ed|led)?)\b/i.test(text) && /\b(to|towards)\b/i.test(text)),
    buildLabel: ({ text }) => tripLabel(text),
    inferDetails: ({ text }) => ({
      purpose: /\boffice|work\b/i.test(text) ? "work" : "personal",
      tripPurpose: /\boffice|work\b/i.test(text) ? "work" : "personal",
      ...(modeFromText(text) ? { mode: modeFromText(text) } : {}),
      ...(localDestination(text) ? { destination: localDestination(text) } : {}),
    }),
    parseFollowUp: ({ reply }) => {
      const mode = modeFromText(reply);
      return mode ? { mode } : {};
    },
  },
  {
    primaryCategory: "food_meals",
    defaultActivityType: "meal",
    defaultLabel: "Meal update",
    defaultSlot: "lunch",
    keywords: [/\b(breakfast|lunch|dinner|meal|tea|coffee|chai|snack|biryani|canteen|restaurant)\b/i],
    inferDetails: ({ text }) => ({
      mealSource: /\bcanteen\b/i.test(text) ? "canteen" : /\border|delivery|swiggy|zomato\b/i.test(text) ? "ordered_online" : "home_cooked",
      foodType: /\bchicken|fish|biryani\b/i.test(text)
        ? "chicken_fish"
        : /\begg\b/i.test(text)
          ? "egg"
          : /\bmutton|beef|red meat\b/i.test(text)
            ? "red_meat"
            : /\btea|coffee|chai|biscuit|snack\b/i.test(text)
              ? "veg_dairy"
              : "unknown",
      subcategory: /\btea|coffee|chai\b/i.test(text) ? "tea_or_coffee" : /\bsnack|biscuit\b/i.test(text) ? "snack" : undefined,
    }),
    parseFollowUp: ({ reply }) => ({
      ...(enumReply(reply, {
        home: "home_cooked",
        homemade: "home_cooked",
        canteen: "canteen",
        restaurant: "restaurant",
        ordered: "ordered_online",
        delivery: "ordered_online",
      })
        ? { mealSource: enumReply(reply, { home: "home_cooked", homemade: "home_cooked", canteen: "canteen", restaurant: "restaurant", ordered: "ordered_online", delivery: "ordered_online" }) }
        : {}),
    }),
  },
  {
    primaryCategory: "home_energy",
    defaultActivityType: "home_energy",
    defaultLabel: "Home energy use",
    defaultSlot: "night_energy",
    keywords: [/\b(ac|air conditioner|geyser|heater|fan|lights|appliance)\b/i],
    inferDetails: ({ text, profile }) => ({
      subcategory: /\bac|air conditioner\b/i.test(text) ? "ac" : "normal_home_use",
      durationHours: hoursFromText(text),
      extraAcHours: /\bac|air conditioner\b/i.test(text) ? hoursFromText(text) : undefined,
      monthlyKwh: profile?.core.monthlyElectricityKwh,
    }),
    parseFollowUp: ({ reply }) => ({ durationHours: hoursFromText(reply), extraAcHours: hoursFromText(reply) }),
  },
  {
    primaryCategory: "cooking_energy",
    defaultActivityType: "cooking_energy",
    defaultLabel: "Cooking energy",
    defaultSlot: "lunch",
    keywords: [/\b(cook(?:ed|ing)?|lpg|stove|induction|microwave|oven|air fryer|reheat)\b/i],
    inferDetails: ({ text }) => ({ subcategory: /\boven\b/i.test(text) ? "oven" : /\bmicrowave\b/i.test(text) ? "microwave" : "lpg_cooking", durationHours: hoursFromText(text) }),
    parseFollowUp: ({ reply }) => ({ durationHours: hoursFromText(reply) }),
  },
  {
    primaryCategory: "work_study",
    defaultActivityType: "work_study",
    defaultLabel: "Work / study",
    defaultSlot: "work_study",
    keywords: [/\b(work|worked|working|office|study|school|college|class)\b/i],
    inferDetails: ({ text }) => ({
      workMode: /\bwork(?:ed|ing)? from home|wfh\b/i.test(text) ? "work_from_home" : /\boffice\b/i.test(text) ? "office_day" : "work_from_home",
      subcategory: /\bwork(?:ed|ing)? from home|wfh\b/i.test(text) ? "work_from_home" : /\boffice\b/i.test(text) ? "office_day" : "school_or_college",
    }),
    parseFollowUp: ({ reply }) => ({
      workMode: enumReply(reply, { home: "work_from_home", wfh: "work_from_home", office: "office_day", hybrid: "hybrid_day", school: "school_or_college", college: "school_or_college" }),
    }),
  },
  {
    primaryCategory: "shopping_purchases",
    defaultActivityType: "shopping",
    defaultLabel: "Shopping purchase",
    defaultSlot: "shopping_delivery",
    keywords: [/\b(bought|purchase|shopping|market|groceries|vegetables|clothing|electronics|furniture)\b/i],
    inferDetails: ({ text }) => ({ subcategory: /\bgrocer|vegetables|market\b/i.test(text) ? "groceries" : /\belectronics?\b/i.test(text) ? "electronics" : "household_item", items: /\bvegetables\b/i.test(text) ? ["vegetables"] : undefined }),
    parseFollowUp: ({ reply }) => ({ count: numberFromText(reply), items: reply.trim() ? [reply.trim()] : undefined }),
  },
  {
    primaryCategory: "delivery_online_orders",
    defaultActivityType: "delivery",
    defaultLabel: "Delivery order",
    defaultSlot: "shopping_delivery",
    keywords: [/\b(order(?:ed)?|delivery|parcel|swiggy|zomato|amazon|flipkart|quick commerce)\b/i],
    inferDetails: ({ text }) => ({ deliveryType: /\bfood|biryani|dinner|lunch\b/i.test(text) ? "foodDelivery" : "groupedParcel", packaging: /\bplastic\b/i.test(text) ? "plastic_heavy" : "normal" }),
    parseFollowUp: ({ reply }) => ({ packaging: /\bplastic\b/i.test(reply) ? "plastic_heavy" : undefined, count: numberFromText(reply) }),
  },
  {
    primaryCategory: "waste_recycling",
    defaultActivityType: "waste",
    defaultLabel: "Waste update",
    defaultSlot: "waste_final",
    keywords: [/\b(waste|threw|trash|garbage|plastic|recycled|compost|e-waste)\b/i],
    inferDetails: ({ text }) => ({ wasteType: /\brecycl/i.test(text) ? "recycled" : /\bcompost/i.test(text) ? "composted" : /\bplastic|packaging/i.test(text) ? "plasticHeavy" : /\bfood/i.test(text) ? "foodWaste" : "normalDaily" }),
    parseFollowUp: ({ reply }) => ({ wasteType: /\brecycl/i.test(reply) ? "recycled" : /\bcompost/i.test(reply) ? "composted" : /\bplastic/i.test(reply) ? "plasticHeavy" : undefined }),
  },
  {
    primaryCategory: "water_hot_water",
    defaultActivityType: "water_hot_water",
    defaultLabel: "Water / hot water use",
    defaultSlot: "night_energy",
    keywords: [/\b(shower|bath|hot water|laundry|dishwashing|car wash|gardening)\b/i],
    inferDetails: ({ text }) => ({ subcategory: /\bcar wash\b/i.test(text) ? "car_wash" : /\blaundry\b/i.test(text) ? "laundry" : /\bshower|bath\b/i.test(text) ? "bath_or_shower" : "hot_water", durationHours: hoursFromText(text) }),
    parseFollowUp: ({ reply }) => ({ durationHours: hoursFromText(reply), cleaningProducts: /\bsoap|cleaning product|shampoo\b/i.test(reply) ? true : undefined }),
  },
  {
    primaryCategory: "digital_devices",
    defaultActivityType: "digital_device",
    defaultLabel: "Device use",
    defaultSlot: "night_energy",
    keywords: [/\b(laptop|phone|desktop|tv|television|streaming|netflix|gaming|video call|wifi|router|ai tool)\b/i],
    inferDetails: ({ text }) => ({ subcategory: /\btv|television\b/i.test(text) ? "tv" : /\blaptop\b/i.test(text) ? "laptop_use" : /\bphone\b/i.test(text) ? "phone_use" : /\bgaming\b/i.test(text) ? "gaming" : "streaming", deviceType: /\btv|television\b/i.test(text) ? "tv" : undefined, durationHours: hoursFromText(text) }),
    parseFollowUp: ({ reply }) => ({ durationHours: hoursFromText(reply), subcategory: /\blaptop\b/i.test(reply) ? "laptop_use" : /\btv\b/i.test(reply) ? "tv" : undefined }),
  },
  {
    primaryCategory: "personal_care",
    defaultActivityType: "personal_care",
    defaultLabel: "Personal care",
    defaultSlot: "morning_start",
    keywords: [/\b(hair dryer|salon|shaving|cosmetics|hot bath|disposable)\b/i],
    inferDetails: ({ text }) => ({ subcategory: /\bsalon\b/i.test(text) ? "salon_visit" : /\bhair dryer\b/i.test(text) ? "hair_dryer" : "disposable_products" }),
    parseFollowUp: ({ reply }) => ({ durationHours: hoursFromText(reply) }),
  },
  {
    primaryCategory: "household_chores",
    defaultActivityType: "household_chore",
    defaultLabel: "Household chore",
    defaultSlot: "afternoon_activity",
    keywords: [/\b(laundry|ironing|dishwashing|cleaning|vacuum(?:ed|ing)?|repairs|painting)\b/i],
    inferDetails: ({ text }) => ({ subcategory: /\blaundry\b/i.test(text) ? "laundry" : /\bironing\b/i.test(text) ? "ironing" : /\bdishwashing\b/i.test(text) ? "dishwashing" : "cleaning_products", cleaningProducts: /\bcleaning product|detergent|soap\b/i.test(text) ? true : undefined }),
    parseFollowUp: ({ reply }) => ({ cleaningProducts: /\bcleaning product|detergent|soap\b/i.test(reply) ? true : undefined }),
  },
  {
    primaryCategory: "social_leisure",
    defaultActivityType: "social_event",
    defaultLabel: "Social activity",
    defaultSlot: "afternoon_activity",
    keywords: [/\b(party|birthday|wedding|festival|movie|mall|concert|friends?|gathering)\b/i],
    inferDetails: ({ text }) => ({ subcategory: /\bparty|birthday\b/i.test(text) ? "party" : /\bmovie|mall\b/i.test(text) ? "movie_or_mall" : "restaurant_outing", venue: /\bhome|house|place\b/i.test(text) ? "home" : undefined, guestCount: numberFromText(text) }),
    parseFollowUp: ({ reply }) => ({ venue: /\bhome\b/i.test(reply) ? "home" : /\belsewhere|outside|restaurant|mall\b/i.test(reply) ? "elsewhere" : undefined }),
  },
  {
    primaryCategory: "travel_trips",
    defaultActivityType: "trip",
    defaultLabel: "Travel trip",
    defaultSlot: "morning_commute",
    keywords: [/\b(flight|airport|flew|flying|intercity|hotel|road trip|train trip)\b/i],
    inferDetails: ({ text }) => ({ mode: modeFromText(text), subcategory: /\bflight|airport|flew/i.test(text) ? "domestic_flight" : /\btrain\b/i.test(text) ? "train_trip" : "road_trip" }),
    parseFollowUp: ({ reply }) => ({ mode: modeFromText(reply) }),
  },
  {
    primaryCategory: "positive_avoided_actions",
    defaultActivityType: "avoided_action",
    defaultLabel: "Avoided action",
    defaultSlot: "day_summary",
    keywords: [/\b(walked instead|avoided|reused|repaired|saved|reduced|instead)\b/i],
    inferDetails: ({ text }) => ({ avoidedActionType: /\bwalk/i.test(text) ? "walked_instead" : /\brepair/i.test(text) ? "repaired_reused" : "avoided_delivery" }),
    parseFollowUp: ({ reply }) => ({ avoidedImpactEstimate: numberFromText(reply) }),
  },
  {
    primaryCategory: "other_unknown",
    defaultActivityType: "other",
    defaultLabel: "Activity update",
    defaultSlot: "day_summary",
    keywords: [],
    detect: () => true,
    inferDetails: ({ text }) => ({ note: text }),
    parseFollowUp: ({ reply }) => ({ note: reply }),
  },
];

export const PANDA_CATEGORY_PROCESSORS: Record<PrimaryActionCategory, PandaCategoryProcessor> =
  Object.fromEntries(PROCESSORS.map((processor) => [processor.primaryCategory, processor])) as Record<
    PrimaryActionCategory,
    PandaCategoryProcessor
  >;

export function getPandaCategoryProcessor(primaryCategory: PrimaryActionCategory): PandaCategoryProcessor {
  return PANDA_CATEGORY_PROCESSORS[primaryCategory];
}

export function detectPandaCategoryProcessor(context: ProcessorContext): PandaCategoryProcessor {
  const text = context.text.toLowerCase();
  const requestedCategory = context.parse?.missingFields?.some((field) => /mode|distance|transport|travel/i.test(field))
    ? "transportation"
    : undefined;
  if (requestedCategory) return PANDA_CATEGORY_PROCESSORS[requestedCategory];
  if (/\b(walked instead|avoided|reused|repaired|saved|reduced|instead)\b/i.test(text)) {
    return PANDA_CATEGORY_PROCESSORS.positive_avoided_actions;
  }

  return (
    PROCESSORS.find((processor) => processor.primaryCategory !== "other_unknown" && processor.detect?.(context)) ??
    PROCESSORS.find((processor) =>
      processor.primaryCategory !== "other_unknown" && processor.keywords.some((pattern) => has(text, pattern)),
    ) ??
    PANDA_CATEGORY_PROCESSORS.other_unknown
  );
}

export function inferActivityWithPandaProcessor(
  context: ProcessorContext & { parse: PandaParseResult },
): PandaExtractedActivity {
  const processor = detectPandaCategoryProcessor(context);
  const technicalCategory = technicalCategoryForPrimaryCategory(processor.primaryCategory);
  return {
    category: technicalCategory,
    primaryCategory: processor.primaryCategory,
    activityType: processor.defaultActivityType,
    label: processor.buildLabel?.(context) ?? processor.defaultLabel,
    timeSlot: context.parse.detectedSlotId ?? processor.defaultSlot,
    details: processor.inferDetails?.(context) ?? {},
    confidence: processor.primaryCategory === "other_unknown" ? 0.45 : 0.8,
    status: "confirmed",
    dominantImpact: processor.primaryCategory !== "other_unknown",
  };
}

export function parseFollowUpWithPandaProcessor(context: FollowUpContext): Record<string, unknown> {
  const primaryCategory = context.activity.primaryCategory ?? "other_unknown";
  return getPandaCategoryProcessor(primaryCategory).parseFollowUp?.(context) ?? {};
}

export function allPandaCategoryProcessorsPresent(): boolean {
  return PANDA_PRIMARY_CATEGORIES.every((category) => Boolean(PANDA_CATEGORY_PROCESSORS[category.id]));
}
