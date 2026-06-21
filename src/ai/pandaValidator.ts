import type { AiProvider } from "@/config/aiConfig";
import { normalizePrimaryCategory, scoreMeaningFromScore, clampCategoryScore } from "@/logic/categoryScoring";
import { normalizePandaAiPayload } from "./pandaResponseNormalizer";
import type { CheckpointSlotId, PandaActivityFragment, PandaExtractedActivity, PandaParseResult } from "./pandaSchemas";
import { checkpointIdToSlot } from "./pandaFragmentParser";

const VALID_SLOTS: CheckpointSlotId[] = [
  "morning_start",
  "breakfast",
  "morning_commute",
  "work_study",
  "lunch",
  "afternoon_activity",
  "shopping_delivery",
  "evening_commute",
  "dinner",
  "night_energy",
  "waste_final",
  "day_summary",
];

function normalizeStatus(value: unknown): PandaExtractedActivity["status"] {
  if (value === "confirmed" || value === "assumed" || value === "estimated_from_profile" || value === "parsed_pending") {
    return value;
  }
  if (value === "needs_review" || value === "predicted") return "parsed_pending";
  if (value === "estimated") return "estimated_from_profile";
  return "confirmed";
}

function normalizeActivity(raw: unknown, fallbackSlot: PandaParseResult["detectedSlotId"]): PandaExtractedActivity | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const category = typeof data.category === "string" ? data.category : undefined;
  const primaryRaw = data.primaryCategory ?? data.primary_category ?? data.rawPrimaryCategory ?? data.raw_primary_category;
  const mapping = normalizePrimaryCategory(primaryRaw, category as PandaExtractedActivity["category"] | undefined);
  const technicalCategory = mapping.technicalCategory;
  const rawScore = data.categoryScore ?? data.score ?? data.category_score;
  const categoryScore = typeof rawScore === "number" ? clampCategoryScore(rawScore) : undefined;
  const checkpointId = data.timeCheckpointId ?? data.time_checkpoint_id;
  const slot = data.timeSlot ?? data.time_slot ?? fallbackSlot;
  const details = data.details && typeof data.details === "object" && !Array.isArray(data.details) ? data.details as Record<string, unknown> : {};
  const normalizedSlot =
    typeof slot === "string" && VALID_SLOTS.includes(slot as CheckpointSlotId)
      ? (slot as CheckpointSlotId)
      : typeof checkpointId === "string"
        ? checkpointIdToSlot(checkpointId, String(data.activityLabel ?? data.label ?? data.subcategory ?? ""))
        : "day_summary";

  return {
    category: technicalCategory,
    primaryCategory: mapping.primaryCategory,
    rawPrimaryCategory: typeof primaryRaw === "string" ? primaryRaw : mapping.raw,
    subcategory:
      typeof data.subcategory === "string"
        ? data.subcategory
        : typeof data.activityType === "string"
          ? data.activityType
          : typeof data.activity_type === "string"
            ? data.activity_type
            : "activity",
    categoryScore,
    greenScore: typeof data.greenScore === "number" ? clampCategoryScore(data.greenScore) : undefined,
    scoreMeaning:
      data.scoreMeaning === "low" ||
      data.scoreMeaning === "medium" ||
      data.scoreMeaning === "high" ||
      data.scoreMeaning === "very_high"
        ? data.scoreMeaning
        : categoryScore !== undefined
          ? scoreMeaningFromScore(categoryScore)
          : undefined,
    dominantImpact: Boolean(data.dominantImpact ?? data.dominant_impact),
    parentBundleId:
      typeof data.parentBundleId === "string"
        ? data.parentBundleId
        : typeof data.parent_bundle_id === "string"
          ? data.parent_bundle_id
          : undefined,
    includedInParentContext: Boolean(data.includedInParentContext ?? data.included_in_parent_context),
    activityType:
      typeof data.activityType === "string"
        ? data.activityType
        : typeof data.activity_type === "string"
          ? data.activity_type
          : typeof data.subcategory === "string"
            ? data.subcategory
            : "manual_update",
    label:
      typeof data.label === "string"
        ? data.label
        : typeof data.activityLabel === "string"
          ? data.activityLabel
          : typeof data.activity_label === "string"
            ? data.activity_label
            : "Activity update",
    timeSlot: normalizedSlot,
    details: {
      ...details,
      ...(typeof checkpointId === "string" ? { timeCheckpointId: checkpointId } : {}),
      ...(typeof data.eventTime === "string" ? { eventTime: data.eventTime } : {}),
      ...(typeof data.fragmentText === "string" ? { fragmentText: data.fragmentText } : {}),
      ...(typeof data.subcategory === "string" ? { subcategoryLabel: data.subcategory } : {}),
    },
    confidence: typeof data.confidence === "number" ? data.confidence : 0.5,
    status: normalizeStatus(data.status),
  };
}

function normalizeActivityFragment(raw: unknown): PandaActivityFragment | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const fragmentText = typeof data.fragmentText === "string" ? data.fragmentText : "";
  const primaryCategory = normalizePrimaryCategory(data.primaryCategory ?? data.primary_category).primaryCategory;
  const rawScore = data.score ?? data.categoryScore;
  const score = typeof rawScore === "number" ? clampCategoryScore(rawScore) : 3;
  if (!fragmentText.trim()) return null;

  return {
    fragmentText,
    primaryCategory,
    subcategories: Array.isArray(data.subcategories) ? data.subcategories.map(String) : [],
    activityLabel:
      typeof data.activityLabel === "string"
        ? data.activityLabel
        : typeof data.label === "string"
          ? data.label
          : fragmentText,
    timeCheckpointId:
      typeof data.timeCheckpointId === "string"
        ? data.timeCheckpointId
        : typeof data.time_checkpoint_id === "string"
          ? data.time_checkpoint_id
          : null,
    eventTime: typeof data.eventTime === "string" ? data.eventTime : null,
    details: data.details && typeof data.details === "object" && !Array.isArray(data.details) ? data.details as Record<string, unknown> : {},
    score,
    scoreMeaning:
      data.scoreMeaning === "low" ||
      data.scoreMeaning === "medium" ||
      data.scoreMeaning === "high" ||
      data.scoreMeaning === "very_high"
        ? data.scoreMeaning
        : scoreMeaningFromScore(score),
    co2EstimateKg: typeof data.co2EstimateKg === "number" ? data.co2EstimateKg : null,
    missingFields: Array.isArray(data.missingFields) ? data.missingFields.map(String) : [],
    confidence: typeof data.confidence === "number" ? data.confidence : 0.5,
  };
}

export function validatePandaParseResult(
  raw: unknown,
  provider: Exclude<AiProvider, "local"> = "gemini",
  originalText = "",
): PandaParseResult | null {
  const data = normalizePandaAiPayload(raw, originalText);
  if (!data) return null;

  if (typeof data.assistantMessage !== "string") return null;

  const intent = data.detectedIntent;
  const validIntents = ["live_log", "backfill", "correction", "question", "finalize_day", "unknown"];
  if (typeof intent !== "string" || !validIntents.includes(intent)) return null;

  const extractedActivities = Array.isArray(data.extractedActivities)
    ? data.extractedActivities
        .map((item) => normalizeActivity(item, (data.detectedSlotId as PandaParseResult["detectedSlotId"]) ?? null))
        .filter((item): item is PandaExtractedActivity => Boolean(item))
    : [];
  const activityFragments = Array.isArray(data.activityFragments)
    ? data.activityFragments.map(normalizeActivityFragment).filter((item): item is PandaActivityFragment => Boolean(item))
    : [];

  return {
    detectedIntent: intent as PandaParseResult["detectedIntent"],
    detectedSlotId: (data.detectedSlotId as PandaParseResult["detectedSlotId"]) ?? null,
    detectedTime: typeof data.detectedTime === "string" ? data.detectedTime : null,
    assistantMessage: data.assistantMessage,
    activityFragments,
    extractedActivities,
    bundle: (data.bundle as PandaParseResult["bundle"]) ?? null,
    missingFields: Array.isArray(data.missingFields) ? (data.missingFields as string[]) : [],
    followUpQuestion: typeof data.followUpQuestion === "string" ? data.followUpQuestion : null,
    quickReplies: Array.isArray(data.quickReplies) ? (data.quickReplies as string[]) : [],
    suggestedProfileUpdate: (data.suggestedProfileUpdate as PandaParseResult["suggestedProfileUpdate"]) ?? null,
    confidence: typeof data.confidence === "number" ? data.confidence : 0.5,
    originalText: typeof data.originalText === "string" ? data.originalText : originalText,
    usedGemini: provider === "gemini",
    usedMistral: provider === "mistral",
  };
}
