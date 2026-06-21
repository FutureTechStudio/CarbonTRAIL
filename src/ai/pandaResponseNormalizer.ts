import type { PandaIntent } from "./pandaSchemas";

const VALID_INTENTS: PandaIntent[] = [
  "live_log",
  "backfill",
  "correction",
  "question",
  "finalize_day",
  "unknown",
];

export function extractJsonFromAiText(text: string): unknown {
  const trimmed = text.trim();
  const fenced =
    trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i) ?? trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error("Invalid JSON in AI response.");
  }
}

function normalizeIntent(value: unknown): PandaIntent {
  if (typeof value !== "string") return "unknown";
  const key = value.toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (VALID_INTENTS.includes(key as PandaIntent)) return key as PandaIntent;
  if (key.includes("question") || key === "greeting" || key === "chat") return "question";
  if (key.includes("live")) return "live_log";
  if (key.includes("backfill") || key.includes("past")) return "backfill";
  return "unknown";
}

function pickString(data: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function pickAssistantMessage(data: Record<string, unknown>): string | undefined {
  const looksLikeInputWrapper = typeof data.context === "object" && data.context !== null && "schema" in data;

  const direct = pickString(
    data,
    looksLikeInputWrapper
      ? ["assistantMessage", "assistant_message", "reply", "response", "text", "content"]
      : ["assistantMessage", "assistant_message", "message", "reply", "response", "text", "content"],
  );
  if (direct) return direct;

  const schema = data.schema;
  if (schema && typeof schema === "object" && !Array.isArray(schema)) {
    return pickString(schema as Record<string, unknown>, ["assistantMessage", "assistant_message"]);
  }

  const outputFormat = data.outputFormat;
  if (outputFormat && typeof outputFormat === "object" && !Array.isArray(outputFormat)) {
    return pickString(outputFormat as Record<string, unknown>, ["assistantMessage", "assistant_message"]);
  }

  return undefined;
}

function pickArray(data: Record<string, unknown>, keys: string[]): unknown[] {
  for (const key of keys) {
    const value = data[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

/** Coerce common LLM JSON shapes (Mistral/Gemini) into the Panda parse schema. */
export function normalizePandaAiPayload(raw: unknown, originalText = ""): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;

  for (const key of ["result", "data", "output", "parsed", "response"]) {
    const nested = data[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      const inner = normalizePandaAiPayload(nested, originalText);
      if (inner) return inner;
    }
  }

  const assistantMessage = pickAssistantMessage(data);
  if (!assistantMessage) return null;

  const followUpQuestion =
    typeof data.followUpQuestion === "string"
      ? data.followUpQuestion
      : typeof data.follow_up_question === "string"
        ? data.follow_up_question
        : null;

  const events = pickArray(data, ["events", "classifiedEvents", "classified_events"]);
  const activityFragments = pickArray(data, ["activityFragments", "activity_fragments", "fragments"]);
  const extractedActivities = pickArray(data, ["extractedActivities", "extracted_activities", "activities"]);

  return {
    detectedIntent: normalizeIntent(data.detectedIntent ?? data.intent ?? data.detected_intent),
    detectedSlotId: data.detectedSlotId ?? data.detected_slot_id ?? data.slotId ?? data.slot_id ?? null,
    detectedTime:
      typeof data.detectedTime === "string"
        ? data.detectedTime
        : typeof data.detected_time === "string"
          ? data.detected_time
          : null,
    assistantMessage,
    extractedActivities: extractedActivities.length > 0 ? extractedActivities : events,
    activityFragments,
    events,
    missingFields: pickArray(data, ["missingFields", "missing_fields"]),
    quickReplies: pickArray(data, ["quickReplies", "quick_replies", "chips", "suggestions"]),
    followUpQuestion,
    suggestedProfileUpdate: data.suggestedProfileUpdate ?? data.suggested_profile_update ?? null,
    bundle: data.bundle ?? null,
    confidence: typeof data.confidence === "number" ? data.confidence : 0.5,
    originalText: typeof data.originalText === "string" ? data.originalText : originalText,
  };
}
