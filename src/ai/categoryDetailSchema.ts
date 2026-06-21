import type { PrimaryActionCategory } from "@/types";
import type { EditableEventType } from "@/features/today/timeCheckpointActions";

export type DetailFieldType = "enum" | "number" | "boolean" | "string" | "city";

export type DetailFieldSpec = {
  key: string;
  label: string;
  type: DetailFieldType;
  options?: string[];
  requiredForEstimate: boolean;
  priority: number;
  followUpQuestion: string;
  quickReplies?: string[];
  /** Only apply when this detail key matches one of the values (or always if omitted). */
  appliesWhen?: { field: string; equals: string | string[] };
};

export type PandaPrimaryCategoryMeta = {
  id: PrimaryActionCategory;
  label: string;
  subcategories: string[];
};

export type PandaScoringRubric = {
  primaryCategory: PrimaryActionCategory;
  label: string;
  bands: Record<"0-2" | "3-5" | "6-8" | "9-10", string[]>;
  note: string;
};

const RUBRIC_NOTE = "Examples are not exhaustive. Use the closest similar activity pattern and available details to score fairly.";

export const PANDA_PRIMARY_CATEGORIES: PandaPrimaryCategoryMeta[] = [
  {
    id: "transportation",
    label: "Transportation",
    subcategories: ["Commute", "Errand", "School travel", "Local ride", "Carpool", "Walking or cycling"],
  },
  {
    id: "food_meals",
    label: "Food & Meals",
    subcategories: [
      "Breakfast",
      "Lunch",
      "Dinner",
      "Snacks",
      "Tea / coffee",
      "Home-cooked meal",
      "Packed lunch / tiffin",
      "Canteen meal",
      "Restaurant meal",
      "Ordered food",
      "Vegetarian meal",
      "Vegan / plant-based meal",
      "Dairy-heavy meal",
      "Egg meal",
      "Chicken / fish meal",
      "Red meat meal",
      "Leftovers",
      "Food waste",
    ],
  },
  {
    id: "home_energy",
    label: "Home Energy",
    subcategories: ["AC", "Fan / lights", "Geyser", "Heater", "Appliance use", "Generator", "Normal home use"],
  },
  {
    id: "work_study",
    label: "Work / Study",
    subcategories: ["Office day", "Work from home", "Hybrid day", "School / college", "Field work", "High device use"],
  },
  {
    id: "shopping_purchases",
    label: "Shopping & Purchases",
    subcategories: ["Groceries", "Clothing", "Electronics", "Household item", "Furniture", "Cosmetics", "Medicine"],
  },
  {
    id: "delivery_online_orders",
    label: "Delivery & Online Orders",
    subcategories: ["Food delivery", "Grocery delivery", "Quick commerce", "Parcel", "Medicine delivery", "Return / exchange"],
  },
  {
    id: "waste_recycling",
    label: "Waste & Recycling",
    subcategories: ["Normal waste", "Food waste", "Plastic waste", "Recycling", "Composting", "Donation / reuse", "E-waste"],
  },
  {
    id: "water_hot_water",
    label: "Water & Hot Water",
    subcategories: ["Bath / shower", "Hot water", "Laundry", "Dishwashing", "RO purifier", "Gardening", "Car wash"],
  },
  {
    id: "digital_devices",
    label: "Digital & Devices",
    subcategories: [
      "Phone use",
      "Laptop use",
      "Desktop use",
      "TV",
      "Streaming",
      "Gaming",
      "Video calls",
      "Social media",
      "Cloud storage",
      "AI tool usage",
      "Router / Wi-Fi",
      "Device charging",
      "Long screen time",
      "High-power device use",
    ],
  },
  {
    id: "personal_care",
    label: "Personal Care",
    subcategories: ["Hot bath", "Hair dryer", "Shaving", "Cosmetics", "Salon visit", "Disposable products"],
  },
  {
    id: "household_chores",
    label: "Household Chores",
    subcategories: ["Laundry", "Ironing", "Dishwashing", "Cleaning products", "Vacuuming", "Repairs", "Painting"],
  },
  {
    id: "social_leisure",
    label: "Social & Leisure",
    subcategories: ["Restaurant outing", "Movie / mall", "Party", "Wedding / festival", "Sports / gym", "Concert / event"],
  },
  {
    id: "travel_trips",
    label: "Travel & Trips",
    subcategories: ["Intercity bus", "Train trip", "Domestic flight", "International flight", "Road trip", "Hotel stay"],
  },
  {
    id: "positive_avoided_actions",
    label: "Positive / Avoided Actions",
    subcategories: ["Walked instead", "Public transport instead", "Avoided delivery", "Repaired / reused", "Recycled", "Reduced AC"],
  },
  {
    id: "other_unknown",
    label: "Other / Unknown",
    subcategories: ["Other", "Unknown"],
  },
];

export const PANDA_SCORING_RUBRICS: Record<PrimaryActionCategory, PandaScoringRubric> = {
  transportation: {
    primaryCategory: "transportation",
    label: "Transportation",
    bands: {
      "0-2": ["walking", "cycling", "very short low-impact travel"],
      "3-5": ["bus", "metro", "train", "short scooter or auto trip"],
      "6-8": ["car", "cab", "auto or scooter for longer distance"],
      "9-10": ["very long private vehicle trip", "high-emission transport without sharing"],
    },
    note: RUBRIC_NOTE,
  },
  food_meals: {
    primaryCategory: "food_meals",
    label: "Food & Meals",
    bands: {
      "0-2": ["very light food or drink", "tea/coffee", "fruit", "simple snack", "low-waste home food"],
      "3-5": ["normal meal", "packaged snack", "dairy-heavy food", "egg meal", "canteen meal", "unclear meal details"],
      "6-8": ["chicken/fish meal", "restaurant meal", "ordered food", "heavy packaging", "visible food waste"],
      "9-10": ["red meat-heavy meal", "large high-waste delivery meal", "repeated high-impact meals in one day"],
    },
    note: RUBRIC_NOTE,
  },
  home_energy: {
    primaryCategory: "home_energy",
    label: "Home Energy",
    bands: {
      "0-2": ["normal lights/fan use", "short appliance use"],
      "3-5": ["moderate appliance use", "short AC/geyser use"],
      "6-8": ["AC for several hours", "heater/geyser intensive use", "high appliance load"],
      "9-10": ["generator use", "very long AC/heater use", "multiple high-power appliances"],
    },
    note: RUBRIC_NOTE,
  },
  cooking_energy: {
    primaryCategory: "cooking_energy",
    label: "Cooking Energy",
    bands: {
      "0-2": ["reheating", "short induction/microwave use"],
      "3-5": ["normal cooking session", "LPG cooking"],
      "6-8": ["oven or air fryer for long duration", "batch cooking with high energy"],
      "9-10": ["very long high-heat cooking", "multiple high-power cooking appliances"],
    },
    note: RUBRIC_NOTE,
  },
  work_study: {
    primaryCategory: "work_study",
    label: "Work / Study",
    bands: {
      "0-2": ["low-device study", "short work session"],
      "3-5": ["normal work from home", "office day without extra travel detail"],
      "6-8": ["field work", "high device use", "hybrid day with extra travel"],
      "9-10": ["very high device or travel-heavy workday"],
    },
    note: RUBRIC_NOTE,
  },
  shopping_purchases: {
    primaryCategory: "shopping_purchases",
    label: "Shopping & Purchases",
    bands: {
      "0-2": ["small groceries", "medicine", "repair/reuse purchase"],
      "3-5": ["normal household item", "cosmetics", "moderate groceries"],
      "6-8": ["clothing", "electronics accessory", "furniture or bulky item"],
      "9-10": ["major electronics", "large furniture", "multiple high-impact purchases"],
    },
    note: RUBRIC_NOTE,
  },
  delivery_online_orders: {
    primaryCategory: "delivery_online_orders",
    label: "Delivery & Online Orders",
    bands: {
      "0-2": ["grouped delivery", "low packaging parcel"],
      "3-5": ["normal parcel", "grocery delivery"],
      "6-8": ["food delivery", "quick commerce", "heavy packaging", "express delivery"],
      "9-10": ["multiple urgent deliveries", "large high-packaging delivery"],
    },
    note: RUBRIC_NOTE,
  },
  waste_recycling: {
    primaryCategory: "waste_recycling",
    label: "Waste & Recycling",
    bands: {
      "0-2": ["recycling", "composting", "minimal waste"],
      "3-5": ["normal daily waste", "small food waste", "some packaging"],
      "6-8": ["plastic-heavy waste", "visible food waste", "e-waste"],
      "9-10": ["large avoidable waste", "mixed heavy plastic/food waste"],
    },
    note: RUBRIC_NOTE,
  },
  water_hot_water: {
    primaryCategory: "water_hot_water",
    label: "Water & Hot Water",
    bands: {
      "0-2": ["short cold water use", "minimal dishwashing"],
      "3-5": ["normal shower", "laundry", "RO purifier use"],
      "6-8": ["hot shower", "geyser use", "car wash", "large laundry load"],
      "9-10": ["long hot bath", "high hot-water use", "water-intensive cleaning"],
    },
    note: RUBRIC_NOTE,
  },
  digital_devices: {
    primaryCategory: "digital_devices",
    label: "Digital & Devices",
    bands: {
      "0-2": ["short phone use", "small device charging", "light laptop use", "short low-power device use"],
      "3-5": ["TV or streaming for 1-3 hours", "laptop/desktop use for a few hours", "video calls", "normal digital usage"],
      "6-8": ["gaming", "desktop/high-power device use for several hours", "long streaming session", "multiple devices running for long duration"],
      "9-10": ["crypto/mining", "always-on high-power device", "very long high-power device use"],
    },
    note: RUBRIC_NOTE,
  },
  personal_care: {
    primaryCategory: "personal_care",
    label: "Personal Care",
    bands: {
      "0-2": ["low-energy grooming", "minimal disposable products"],
      "3-5": ["hair dryer", "cosmetics", "normal personal care"],
      "6-8": ["salon visit", "hot bath", "disposable-heavy routine"],
      "9-10": ["multiple high-energy or disposable-heavy personal care activities"],
    },
    note: RUBRIC_NOTE,
  },
  household_chores: {
    primaryCategory: "household_chores",
    label: "Household Chores",
    bands: {
      "0-2": ["light cleaning", "manual chores"],
      "3-5": ["laundry", "dishwashing", "ironing", "vacuuming"],
      "6-8": ["cleaning products", "repairs", "painting", "multiple chores"],
      "9-10": ["large repair/painting work", "heavy equipment use"],
    },
    note: RUBRIC_NOTE,
  },
  social_leisure: {
    primaryCategory: "social_leisure",
    label: "Social & Leisure",
    bands: {
      "0-2": ["small home gathering", "low-travel leisure"],
      "3-5": ["movie/mall outing", "restaurant outing", "sports/gym"],
      "6-8": ["party", "concert/event", "wedding/festival with travel or food"],
      "9-10": ["large event with travel, food, or high waste"],
    },
    note: RUBRIC_NOTE,
  },
  travel_trips: {
    primaryCategory: "travel_trips",
    label: "Travel & Trips",
    bands: {
      "0-2": ["short local stay or no motorized travel"],
      "3-5": ["train trip", "intercity bus", "short road trip"],
      "6-8": ["long road trip", "hotel stay", "domestic flight"],
      "9-10": ["international flight", "long-haul flight", "multi-leg high-impact travel"],
    },
    note: RUBRIC_NOTE,
  },
  positive_avoided_actions: {
    primaryCategory: "positive_avoided_actions",
    label: "Positive / Avoided Actions",
    bands: {
      "0-2": ["small avoided action", "minor reuse"],
      "3-5": ["walked instead for short trip", "avoided delivery", "recycled"],
      "6-8": ["public transport instead of car", "repaired/reused significant item", "reduced AC noticeably"],
      "9-10": ["major avoided travel or purchase", "large repeated avoided impact"],
    },
    note: RUBRIC_NOTE,
  },
  other_unknown: {
    primaryCategory: "other_unknown",
    label: "Other / Unknown",
    bands: {
      "0-2": ["minor unclear activity"],
      "3-5": ["normal unclear activity with limited details"],
      "6-8": ["possibly high-impact activity missing important details"],
      "9-10": ["clearly major high-impact activity but category/details are unclear"],
    },
    note: RUBRIC_NOTE,
  },
};

export const SUBTYPE_OPTIONS: Record<EditableEventType, string[]> = {
  transportation: ["commute", "errand", "school_travel", "local_ride", "carpool", "walking_or_cycling"],
  food_meals: ["breakfast", "lunch", "dinner", "snack", "tea_or_coffee", "restaurant_meal", "ordered_food"],
  home_energy: ["ac", "fan_lights", "geyser", "heater", "appliance_use", "generator", "normal_home_use"],
  cooking_energy: ["lpg_cooking", "induction", "microwave", "oven", "air_fryer", "reheating", "batch_cooking"],
  work_study: ["office_day", "work_from_home", "hybrid_day", "school_or_college", "field_work", "high_device_use"],
  shopping_purchases: ["groceries", "clothing", "electronics", "household_item", "furniture", "cosmetics", "medicine"],
  delivery_online_orders: ["food_delivery", "grocery_delivery", "quick_commerce", "parcel", "medicine_delivery", "return_exchange"],
  waste_recycling: ["normal_waste", "food_waste", "plastic_waste", "recycling", "composting", "donation_or_reuse", "e_waste"],
  water_hot_water: ["bath_or_shower", "hot_water", "laundry", "dishwashing", "ro_purifier", "gardening", "car_wash"],
  digital_devices: ["phone_use", "laptop_use", "streaming", "gaming", "video_calls", "cloud_or_ai_usage", "tv_router"],
  travel_trips: ["intercity_bus", "train_trip", "domestic_flight", "international_flight", "road_trip", "hotel_stay"],
  personal_care: ["hot_bath", "hair_dryer", "shaving", "cosmetics", "salon_visit", "disposable_products"],
  household_chores: ["laundry", "ironing", "dishwashing", "cleaning_products", "vacuuming", "repairs", "painting"],
  social_leisure: ["restaurant_outing", "movie_or_mall", "party", "wedding_or_festival", "sports_or_gym", "concert_event"],
  positive_avoided_actions: ["walked_instead", "public_transport_instead", "avoided_delivery", "repaired_reused", "recycled", "reduced_ac"],
  other_unknown: ["other", "unknown"],
};

const TRANSPORT_MODES = ["walk", "cycle", "scooter", "bus", "metro", "train", "auto", "car", "cab", "carpool"];
const MEAL_SOURCES = ["home_cooked", "packed", "canteen", "restaurant", "ordered_online", "skipped"];
const FOOD_TYPES = ["plant_based", "vegetarian_low_dairy", "veg_dairy", "egg", "chicken_fish", "red_meat", "unknown"];
const TRAVEL_MODES = ["bus", "train", "flight", "car", "road_trip"];
const WASTE_TYPES = ["normalDaily", "foodWaste", "plasticHeavy", "recycled", "composted"];
const DELIVERY_TYPES = ["groupedParcel", "foodDelivery", "singleParcel", "expressDelivery"];

const COMMON_FIELDS: Partial<Record<PrimaryActionCategory, DetailFieldSpec[]>> = {
  transportation: [
    {
      key: "mode",
      label: "Travel mode",
      type: "enum",
      options: TRANSPORT_MODES,
      requiredForEstimate: true,
      priority: 1,
      followUpQuestion: "How did you travel?",
      quickReplies: ["Walked", "Cycled", "Took a bus", "Drove", "Auto", "Cab"],
    },
    {
      key: "distanceKm",
      label: "Distance (km)",
      type: "number",
      requiredForEstimate: true,
      priority: 2,
      followUpQuestion: "How far was the trip in km?",
      quickReplies: ["Same as usual", "About 5 km", "About 10 km", "1 hour"],
    },
  ],
  travel_trips: [
    {
      key: "mode",
      label: "Trip mode",
      type: "enum",
      options: TRAVEL_MODES,
      requiredForEstimate: true,
      priority: 1,
      followUpQuestion: "What kind of trip was it?",
      quickReplies: ["Flight", "Train", "Bus", "Road trip"],
    },
    {
      key: "origin",
      label: "Origin city",
      type: "city",
      requiredForEstimate: true,
      priority: 2,
      appliesWhen: { field: "mode", equals: "flight" },
      followUpQuestion: "Which city did you fly from?",
      quickReplies: ["Bangalore", "Delhi", "Mumbai", "Chennai", "Hyderabad"],
    },
    {
      key: "destination",
      label: "Destination city",
      type: "city",
      requiredForEstimate: true,
      priority: 3,
      appliesWhen: { field: "mode", equals: "flight" },
      followUpQuestion: "Which city did you fly to?",
      quickReplies: ["Dubai", "London", "Singapore", "Delhi", "Mumbai"],
    },
    {
      key: "distanceKm",
      label: "Distance (km)",
      type: "number",
      requiredForEstimate: true,
      priority: 4,
      followUpQuestion: "Roughly how many km was the trip?",
      quickReplies: ["Use route distance", "About 500 km", "About 1500 km", "About 3000 km"],
    },
    {
      key: "flightScope",
      label: "Flight scope",
      type: "enum",
      options: ["domestic", "international"],
      requiredForEstimate: false,
      priority: 5,
      appliesWhen: { field: "mode", equals: "flight" },
      followUpQuestion: "Was it a domestic or international flight?",
      quickReplies: ["Domestic", "International"],
    },
  ],
  food_meals: [
    {
      key: "mealSource",
      label: "Meal source",
      type: "enum",
      options: MEAL_SOURCES,
      requiredForEstimate: true,
      priority: 1,
      followUpQuestion: "Where did the meal come from?",
      quickReplies: ["Home cooked", "Office canteen", "Restaurant", "Ordered online", "Skipped"],
    },
    {
      key: "foodType",
      label: "Food type",
      type: "enum",
      options: FOOD_TYPES,
      requiredForEstimate: true,
      priority: 2,
      followUpQuestion: "What kind of food was it?",
      quickReplies: ["Vegetarian", "Veg with dairy", "Egg", "Chicken / fish", "Red meat"],
    },
  ],
  home_energy: [
    {
      key: "durationHours",
      label: "Duration (hours)",
      type: "number",
      requiredForEstimate: true,
      priority: 1,
      followUpQuestion: "For how many hours?",
      quickReplies: ["1 hour", "2 hours", "3 hours", "4 hours"],
    },
  ],
  delivery_online_orders: [
    {
      key: "deliveryType",
      label: "Delivery type",
      type: "enum",
      options: DELIVERY_TYPES,
      requiredForEstimate: true,
      priority: 1,
      followUpQuestion: "What kind of delivery was it?",
      quickReplies: ["Food delivery", "Grocery", "Parcel", "Express"],
    },
  ],
  waste_recycling: [
    {
      key: "wasteType",
      label: "Waste type",
      type: "enum",
      options: WASTE_TYPES,
      requiredForEstimate: true,
      priority: 1,
      followUpQuestion: "What kind of waste was it?",
      quickReplies: ["Normal daily", "Food waste", "Plastic heavy", "Recycled", "Composted"],
    },
  ],
  work_study: [
    {
      key: "workMode",
      label: "Work mode",
      type: "enum",
      options: ["work_from_home", "office_day", "hybrid_day", "school_or_college", "field_work", "high_device_use"],
      requiredForEstimate: true,
      priority: 1,
      followUpQuestion: "Was this work from home, office, or hybrid?",
      quickReplies: ["Work from home", "Office day", "Hybrid", "School / college"],
    },
  ],
  digital_devices: [
    {
      key: "subcategory",
      label: "Device use",
      type: "enum",
      options: ["phone_use", "laptop_use", "streaming", "gaming", "video_calls", "cloud_or_ai_usage", "tv_router"],
      requiredForEstimate: true,
      priority: 1,
      followUpQuestion: "Which device did you use?",
      quickReplies: ["Laptop", "Phone", "Streaming", "Video calls", "TV / router"],
    },
    {
      key: "durationHours",
      label: "Duration (hours)",
      type: "number",
      requiredForEstimate: true,
      priority: 2,
      followUpQuestion: "How long did you use it?",
      quickReplies: ["2 hours", "4 hours", "6 hours", "8 hours"],
    },
  ],
  social_leisure: [
    {
      key: "venue",
      label: "Venue",
      type: "enum",
      options: ["home", "elsewhere"],
      requiredForEstimate: true,
      priority: 1,
      followUpQuestion: "Where did the event take place?",
      quickReplies: ["At home", "Elsewhere"],
    },
    {
      key: "guestTravel",
      label: "Guest travel",
      type: "enum",
      options: ["none", "some", "unknown"],
      requiredForEstimate: false,
      priority: 2,
      appliesWhen: { field: "venue", equals: "home" },
      followUpQuestion: "Did any guests travel to reach your home?",
      quickReplies: ["No travel", "Some guests traveled", "Not sure"],
    },
  ],
};

export const MAX_PANDA_FOLLOW_UPS = 5;

export function getDetailFieldsForCategory(primaryCategory: PrimaryActionCategory): DetailFieldSpec[] {
  return COMMON_FIELDS[primaryCategory] ?? [];
}

export function buildCategoryDetailSchemaForPrompt(): Record<
  string,
  {
    subcategories: string[];
    detailFields: Array<{
      key: string;
      label: string;
      type: DetailFieldType;
      options?: string[];
      requiredForEstimate: boolean;
    }>;
  }
> {
  const categories = Object.keys(SUBTYPE_OPTIONS) as EditableEventType[];
  const output: ReturnType<typeof buildCategoryDetailSchemaForPrompt> = {};

  for (const category of categories) {
    const fields = getDetailFieldsForCategory(category as PrimaryActionCategory);
    output[category] = {
      subcategories: SUBTYPE_OPTIONS[category],
      detailFields: fields.map(({ key, label, type, options, requiredForEstimate }) => ({
        key,
        label,
        type,
        options,
        requiredForEstimate,
      })),
    };
  }

  return output;
}

export function buildCategoryDetailSchemaForPromptForCategories(
  categories: PrimaryActionCategory[],
): ReturnType<typeof buildCategoryDetailSchemaForPrompt> {
  const allowed = new Set(categories);
  const full = buildCategoryDetailSchemaForPrompt();
  const output: ReturnType<typeof buildCategoryDetailSchemaForPrompt> = {};

  for (const [key, value] of Object.entries(full)) {
    if (allowed.has(key as PrimaryActionCategory)) output[key] = value;
  }

  return output;
}

export function buildScoringRubricsForPrompt(
  categories: PrimaryActionCategory[] = PANDA_PRIMARY_CATEGORIES.map((category) => category.id),
): Partial<Record<PrimaryActionCategory, PandaScoringRubric>> {
  const output: Partial<Record<PrimaryActionCategory, PandaScoringRubric>> = {};
  for (const category of categories) {
    output[category] = PANDA_SCORING_RUBRICS[category];
  }
  return output;
}
