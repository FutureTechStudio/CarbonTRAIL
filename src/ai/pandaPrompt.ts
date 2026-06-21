import type { PandaContext } from "./pandaSchemas";
import type { PrimaryActionCategory } from "@/types";
import {
  buildCategoryDetailSchemaForPrompt,
  buildCategoryDetailSchemaForPromptForCategories,
  buildScoringRubricsForPrompt,
  PANDA_PRIMARY_CATEGORIES,
} from "./categoryDetailSchema";

export function buildPandaSystemPrompt(): string {
  return `You are Panda AI, an environmentally aware assistant for CarbonTrail AI.
Convert casual user messages into structured daily activity events for carbon footprint awareness.

Rules:
- Be concise and friendly. Never shame the user.
- Ask one follow-up question at a time when required details are missing.
- Keep follow-ups minimal, but continue asking until required detail fields are filled or the user cannot provide them.
- When chatThread or pendingLog is provided, read the full conversation before asking again. Never re-ask for facts the user already gave earlier in the thread.
- Prefer extracting useful facts over long advice.
- A user message may contain multiple activities. Extract multiple events when needed.
- First classify each event into one app primary category, then choose a subcategory and score 0-10.
- Use only the allowed primaryCategory IDs from the output format. If you are unsure, include rawPrimaryCategory and use other_unknown with a follow-up.
- Mark the event with the biggest footprint as dominantImpact when clear.
- Do not invent confirmed data.
- Use predicted/assumed status only when based on Carbon Memory or behavior patterns.
- Populate each activity details object using the categoryDetailSchemas keys, types, and allowed options.
- For flights, include origin, destination, distanceKm (number), mode=flight, and flightScope when known.
- Put missing required detail field keys in missingFields and ask the highest-priority missing field first.
- If uncertain, ask a clarification.
- Return ONLY a single JSON object matching the schema below. No markdown, no prose outside JSON.
- Always include every field. Use [] for empty arrays and null where noted.
- LeafPoints reward data quality. Green Impact is estimated CO₂ change.
- Do not reward users for claiming green actions.
- No medical, legal, or unrelated advice.
- Focus on carbon trail tracking only.

Example for a greeting like "hi":
{
  "detectedIntent": "question",
  "detectedSlotId": null,
  "detectedTime": null,
  "assistantMessage": "Hey! I'm Panda. Tell me what happened today — commute, meals, energy, anything.",
  "extractedActivities": [],
  "missingFields": [],
  "followUpQuestion": "What should we log first?",
  "quickReplies": ["Commute", "Meals", "Energy", "Delivery"],
  "suggestedProfileUpdate": null,
  "confidence": 0.9
}`;
}

export function buildPandaUserPrompt(message: string, context: PandaContext): string {
  return JSON.stringify(
    {
      message,
      chatThread: context.chatThread ?? [],
      pendingLog: context.pendingLog ?? null,
      followUpMode: context.pendingLog ? "continue_pending_log" : "new_message",
      followUpGuidance: context.pendingLog
        ? "The user is answering a follow-up for an in-progress log. Use chatThread + pendingLog together. Merge new details into extractedActivities. Do not repeat questions already answered in chatThread."
        : null,
      context: {
        currentDate: context.currentDate,
        currentTime: context.currentTime,
        dayOfWeek: context.dayOfWeek,
        profileSummary: context.profileSummary,
        usualCommuteMode: context.usualCommuteMode,
        usualCommuteDistanceKm: context.usualCommuteDistanceKm,
        loggedActivities: context.loggedActivities,
        checkpointStatuses: context.checkpointStatuses,
      },
      categoryDetailSchemas: buildCategoryDetailSchemaForPrompt(),
      detailGuidance: {
        note:
          "Fill activity.details using these schemas. Use exact option strings where provided. Numbers must be numeric (distanceKm in km, durationHours in hours).",
        examples: {
          flight:
            '{ "mode": "flight", "origin": "Bangalore", "destination": "Dubai", "distanceKm": 2695, "flightScope": "international", "subcategory": "international_flight" }',
          commute:
            '{ "mode": "scooter", "distanceKm": 14, "purpose": "commute", "subcategory": "commute" }',
          meal:
            '{ "mealSource": "home_cooked", "foodType": "vegetarian_low_dairy", "subcategory": "lunch" }',
        },
      },
      outputFormat: {
        detectedIntent: "live_log | backfill | correction | question | finalize_day | unknown",
        detectedSlotId: "morning_start | breakfast | morning_commute | work_study | lunch | afternoon_activity | shopping_delivery | evening_commute | dinner | night_energy | waste_final | day_summary | null",
        detectedTime: "HH:mm or null",
        assistantMessage: "string",
        extractedActivities: [
          {
            category: "transport | food | energy | delivery | shopping | waste | digital | special",
            primaryCategory:
              "transportation | food_meals | home_energy | cooking_energy | work_study | shopping_purchases | delivery_online_orders | waste_recycling | water_hot_water | digital_devices | personal_care | household_chores | social_leisure | travel_trips | positive_avoided_actions | other_unknown",
            rawPrimaryCategory: "string",
            subcategory: "string",
            categoryScore: 0,
            scoreMeaning: "low | medium | high | very_high",
            greenScore: 0,
            dominantImpact: false,
            parentBundleId: "string or null",
            includedInParentContext: false,
            activityType: "string",
            label: "string",
            timeSlot: "string",
            details: {},
            confidence: 0,
            status: "confirmed | assumed | parsed_pending",
          },
        ],
        missingFields: ["detail field keys still needed, e.g. mode, distanceKm, origin"],
        followUpQuestion: "string or null",
        quickReplies: ["string"],
        suggestedProfileUpdate: { shouldSuggest: false, label: "", key: "", value: {} },
        bundle: {
          bundleType:
            "none | commute | meal_delivery | shopping_delivery | long_distance_trip | social_event | workday | other",
          dominantEventIndex: 0,
        },
        confidence: 0,
      },
      scoringGuidance: {
        scoreMeaning: "0-2 low, 3-5 medium, 6-8 high, 9-10 very_high",
        note:
          "categoryScore is severity within that primary category. CO2 estimate is separate. Examples are anchors, not exhaustive fixed rules. Use closest similar activity patterns and available details.",
      },
    },
    null,
    2,
  );
}

export function buildPandaFragmentDetectionPrompt(message: string, context: PandaContext): string {
  return JSON.stringify(
    {
      task: "Pass 1: split the user message into distinct carbon-impacting activity fragments and identify primary categories.",
      rules: [
        "A single message can contain multiple activities.",
        "Do not merge unrelated activities into one fragment.",
        "If one time phrase applies to the whole message, copy it to each fragment.",
        "Return valid JSON only.",
      ],
      message,
      context: {
        currentDate: context.currentDate,
        currentTime: context.currentTime,
        dayOfWeek: context.dayOfWeek,
        profileSummary: context.profileSummary,
        usualCommuteMode: context.usualCommuteMode,
        usualCommuteDistanceKm: context.usualCommuteDistanceKm,
        chatThread: context.chatThread ?? [],
        pendingLog: context.pendingLog ?? null,
      },
      primaryCategories: PANDA_PRIMARY_CATEGORIES.map(({ id, label }) => ({ id, label })),
      outputFormat: {
        detectedIntent: "live_log | backfill | correction | question | finalize_day | unknown",
        activityFragments: [
          {
            fragmentText: "string",
            primaryCategory: "one primary category id",
            eventTime: "HH:mm or null",
            timeCheckpointId: "01 | 03 | 05 | 07 | 09 | 11 | 13 | 15 | 17 | 19 | 21 | 23 | null",
            confidence: 0,
          },
        ],
        assistantMessage: "short summary",
        confidence: 0,
      },
    },
    null,
    2,
  );
}

export function buildPandaDetailExtractionPrompt(
  message: string,
  context: PandaContext,
  fragments: Array<{
    fragmentText: string;
    primaryCategory: PrimaryActionCategory;
    eventTime?: string | null;
    timeCheckpointId?: string | null;
    confidence?: number;
  }>,
): string {
  const categories = [...new Set(fragments.map((fragment) => fragment.primaryCategory))];
  return JSON.stringify(
    {
      task: "Pass 2: extract one activity entry per fragment/category using only relevant category schemas and rubrics.",
      rules: [
        "Use only the provided relevant subcategories, detail fields, and scoring rubrics.",
        "Scores are relative within the detected primary category.",
        "Rubric examples are anchors, not exhaustive fixed rules.",
        "If exact activity is not listed, use closest similar activity pattern.",
        "Ask at most one follow-up question only if a missing detail would materially change the score.",
        "Return valid JSON only.",
      ],
      message,
      chatThread: context.chatThread ?? [],
      pendingLog: context.pendingLog ?? null,
      detectedFragments: fragments,
      categoryDetailSchemas: buildCategoryDetailSchemaForPromptForCategories(categories),
      scoringRubrics: buildScoringRubricsForPrompt(categories),
      outputFormat: {
        detectedIntent: "live_log | backfill | correction | question | finalize_day | unknown",
        activityFragments: [
          {
            fragmentText: "string",
            primaryCategory: "category id",
            subcategories: ["subcategory id or label"],
            activityLabel: "string",
            timeCheckpointId: "string or null",
            eventTime: "HH:mm or null",
            details: {},
            score: 0,
            scoreMeaning: "low | medium | high | very_high",
            co2EstimateKg: null,
            missingFields: [],
            confidence: 0,
          },
        ],
        events: [
          {
            primaryCategory: "category id",
            subcategory: "string",
            activityLabel: "string",
            score: 0,
            scoreMeaning: "low | medium | high | very_high",
            timeCheckpointId: "string or null",
            eventTime: "HH:mm or null",
            details: {},
            dominantImpact: false,
            missingFields: [],
            confidence: 0,
            status: "confirmed | parsed_pending | assumed",
          },
        ],
        followUpQuestion: "string or null",
        quickReplies: [],
        assistantMessage: "string",
        confidence: 0,
      },
    },
    null,
    2,
  );
}
