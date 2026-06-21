import {
  AI_CONFIG,
  getAiParseUrl,
  getAiProvider,
  isRemoteAiEnabled,
  type AiProvider,
} from "@/config/aiConfig";
import { normalizePrimaryCategory } from "@/logic/categoryScoring";
import { applyCompletenessToParse } from "@/ai/pandaCompleteness";
import type { PrimaryActionCategory, UserProfile } from "@/types";
import { parsePandaMessageLocal } from "./pandaLocalParser";
import {
  buildPandaDetailExtractionPrompt,
  buildPandaFragmentDetectionPrompt,
  buildPandaSystemPrompt,
  buildPandaUserPrompt,
} from "./pandaPrompt";
import type {
  PandaActivityFragment,
  PandaContext,
  PandaParseResult,
  PandaProcessingStep,
  PandaChatTurn,
  PandaPendingLogContext,
} from "./pandaSchemas";
import { extractJsonFromAiText } from "./pandaResponseNormalizer";
import { validatePandaParseResult } from "./pandaValidator";
import { checkpointIdToSlot, detectActivityFragments } from "./pandaFragmentParser";

type RemoteCallResult = {
  result: PandaParseResult | null;
  error?: string;
};

type RemoteJsonResult = {
  result: unknown | null;
  error?: string;
};

type ParsePandaMessageOptions = {
  onStep?: (step: PandaProcessingStep) => void;
};

function providerLabel(provider: AiProvider): string {
  if (provider === "mistral") return "Mistral";
  if (provider === "gemini") return "Gemini";
  return "AI";
}

async function callMistralDirect(
  message: string,
  context: PandaContext,
  systemPrompt: string,
  userPrompt: string,
): Promise<RemoteCallResult> {
  if (!AI_CONFIG.mistralApiKey) {
    return { result: null, error: "No Mistral API key configured." };
  }

  try {
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AI_CONFIG.mistralApiKey}`,
      },
      body: JSON.stringify({
        model: AI_CONFIG.mistralModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      let errorText = `Mistral API error (${response.status})`;
      try {
        const payload = await response.json();
        errorText = payload?.error?.message ?? errorText;
      } catch {
        /* ignore */
      }
      return { result: null, error: errorText };
    }

    const payload = await response.json();
    const text = payload?.choices?.[0]?.message?.content;
    if (!text) {
      return { result: null, error: "Mistral returned an empty response." };
    }

    const parsed = extractJsonFromAiText(text);
    const validated = validatePandaParseResult(parsed, "mistral", message);
    if (!validated) {
      return { result: null, error: "Mistral returned JSON that failed validation." };
    }
    return { result: validated };
  } catch (error) {
    return {
      result: null,
      error: error instanceof Error ? error.message : "Mistral request failed.",
    };
  }
}

async function callGeminiDirect(
  message: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<RemoteCallResult> {
  if (!AI_CONFIG.geminiApiKey) {
    return { result: null, error: "No Gemini API key configured." };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${AI_CONFIG.geminiModel}:generateContent?key=${AI_CONFIG.geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        }),
      },
    );

    if (!response.ok) {
      let errorText = `Gemini API error (${response.status})`;
      try {
        const payload = await response.json();
        errorText = payload?.error?.message ?? errorText;
      } catch {
        /* ignore */
      }
      return { result: null, error: errorText };
    }

    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return { result: null, error: "Gemini returned an empty response." };
    }

    const parsed = extractJsonFromAiText(text);
    const validated = validatePandaParseResult(parsed, "gemini", message);
    if (!validated) {
      return { result: null, error: "Gemini returned JSON that failed validation." };
    }
    return { result: validated };
  } catch (error) {
    return {
      result: null,
      error: error instanceof Error ? error.message : "Gemini request failed.",
    };
  }
}

async function callRemoteJson(
  message: string,
  context: PandaContext,
  systemPrompt: string,
  userPrompt: string,
): Promise<RemoteJsonResult> {
  const provider = getAiProvider();
  if (provider === "local") {
    return { result: null, error: "No AI provider configured." };
  }

  const proxyUrl = getAiParseUrl();

  try {
    if (proxyUrl) {
      const response = await fetch(proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, context, systemPrompt, userPrompt }),
      });

      if (!response.ok) {
        return { result: null, error: `${providerLabel(provider)} proxy error (${response.status})` };
      }

      const text = await response.text();
      return { result: extractJsonFromAiText(text) };
    }

    if (provider === "mistral") {
      if (!AI_CONFIG.mistralApiKey) return { result: null, error: "No Mistral API key configured." };
      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${AI_CONFIG.mistralApiKey}`,
        },
        body: JSON.stringify({
          model: AI_CONFIG.mistralModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
        }),
      });
      if (!response.ok) return { result: null, error: `Mistral API error (${response.status})` };
      const payload = await response.json();
      const text = payload?.choices?.[0]?.message?.content;
      if (!text) return { result: null, error: "Mistral returned an empty response." };
      return { result: extractJsonFromAiText(text) };
    }

    if (!AI_CONFIG.geminiApiKey) return { result: null, error: "No Gemini API key configured." };
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${AI_CONFIG.geminiModel}:generateContent?key=${AI_CONFIG.geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        }),
      },
    );
    if (!response.ok) return { result: null, error: `Gemini API error (${response.status})` };
    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return { result: null, error: "Gemini returned an empty response." };
    return { result: extractJsonFromAiText(text) };
  } catch (error) {
    return {
      result: null,
      error: error instanceof Error ? error.message : `${providerLabel(provider)} request failed.`,
    };
  }
}

async function callRemoteAi(message: string, context: PandaContext): Promise<RemoteCallResult> {
  const provider = getAiProvider();
  if (provider === "local") {
    return { result: null, error: "No AI provider configured." };
  }

  const systemPrompt = buildPandaSystemPrompt();
  const userPrompt = buildPandaUserPrompt(message, context);
  const proxyUrl = getAiParseUrl();

  try {
    if (proxyUrl) {
      const response = await fetch(proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, context, systemPrompt, userPrompt }),
      });

      if (!response.ok) {
        let errorText = `${providerLabel(provider)} proxy error (${response.status})`;
        try {
          const errJson = await response.json();
          if (errJson?.error) errorText = String(errJson.error);
        } catch {
          /* ignore */
        }
        return { result: null, error: errorText };
      }

      const text = await response.text();
      const parsed = extractJsonFromAiText(text);
      const validated = validatePandaParseResult(parsed, provider, message);
      if (!validated) {
        return { result: null, error: `${providerLabel(provider)} returned JSON that failed validation.` };
      }
      return { result: validated };
    }

    if (provider === "mistral") {
      return callMistralDirect(message, context, systemPrompt, userPrompt);
    }

    return callGeminiDirect(message, systemPrompt, userPrompt);
  } catch (error) {
    return {
      result: null,
      error: error instanceof Error ? error.message : `${providerLabel(provider)} request failed.`,
    };
  }
}

function hasAmbiguousCategoryMapping(parse: PandaParseResult): boolean {
  return parse.extractedActivities.some((activity) => {
    const mapping = normalizePrimaryCategory(activity.rawPrimaryCategory ?? activity.primaryCategory, activity.category);
    return mapping.primaryCategory === "other_unknown" && mapping.confidence < 0.5;
  });
}

function normalizeFragmentOutput(raw: unknown, message: string, context: PandaContext): PandaActivityFragment[] {
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const fragmentsRaw = Array.isArray(data.activityFragments)
    ? data.activityFragments
    : Array.isArray(data.fragments)
      ? data.fragments
      : [];

  const fallbackByText = detectActivityFragments(message, context.currentTime);
  const fallbackTime = fallbackByText[0]?.eventTime ?? context.currentTime;

  const fragments = fragmentsRaw
    .map((item): PandaActivityFragment | null => {
      if (!item || typeof item !== "object") return null;
      const fragment = item as Record<string, unknown>;
      const fragmentText =
        typeof fragment.fragmentText === "string"
          ? fragment.fragmentText
          : typeof fragment.text === "string"
            ? fragment.text
            : "";
      if (!fragmentText.trim()) return null;
      const primaryRaw = fragment.primaryCategory ?? fragment.primary_category;
      const primaryCategory = normalizePrimaryCategory(primaryRaw).primaryCategory;
      const eventTime =
        typeof fragment.eventTime === "string"
          ? fragment.eventTime
          : fallbackTime;
      const timeCheckpointId =
        typeof fragment.timeCheckpointId === "string"
          ? fragment.timeCheckpointId
          : typeof fragment.time_checkpoint_id === "string"
            ? fragment.time_checkpoint_id
            : null;
      const score = typeof fragment.score === "number" ? fragment.score : 3;
      return {
        fragmentText,
        primaryCategory,
        subcategories: Array.isArray(fragment.subcategories) ? fragment.subcategories.map(String) : [],
        activityLabel:
          typeof fragment.activityLabel === "string"
            ? fragment.activityLabel
            : typeof fragment.label === "string"
              ? fragment.label
              : fragmentText,
        timeCheckpointId,
        eventTime,
        details: fragment.details && typeof fragment.details === "object" ? (fragment.details as Record<string, unknown>) : {},
        score,
        scoreMeaning:
          fragment.scoreMeaning === "low" ||
          fragment.scoreMeaning === "medium" ||
          fragment.scoreMeaning === "high" ||
          fragment.scoreMeaning === "very_high"
            ? fragment.scoreMeaning
            : "medium",
        co2EstimateKg: typeof fragment.co2EstimateKg === "number" ? fragment.co2EstimateKg : null,
        missingFields: Array.isArray(fragment.missingFields) ? fragment.missingFields.map(String) : [],
        confidence: typeof fragment.confidence === "number" ? fragment.confidence : 0.7,
      };
    })
    .filter((item): item is PandaActivityFragment => Boolean(item));

  if (fragments.length > 0) return fragments;

  return fallbackByText.map((fragment) => ({
    fragmentText: fragment.fragmentText,
    primaryCategory: fragment.primaryCategory,
    subcategories: [],
    activityLabel: fragment.fragmentText,
    timeCheckpointId: fragment.timeCheckpointId,
    eventTime: fragment.eventTime,
    details: {},
    score: 3,
    scoreMeaning: "medium",
    co2EstimateKg: null,
    missingFields: [],
    confidence: fragment.confidence,
  }));
}

async function callRemoteAiTwoPass(message: string, context: PandaContext): Promise<RemoteCallResult> {
  const provider = getAiProvider();
  const systemPrompt = buildPandaSystemPrompt();
  const fragmentPrompt = buildPandaFragmentDetectionPrompt(message, context);
  const fragmentResult = await callRemoteJson(message, context, systemPrompt, fragmentPrompt);
  if (!fragmentResult.result) {
    return { result: null, error: fragmentResult.error ?? `${providerLabel(provider)} fragment pass failed.` };
  }

  const fragments = normalizeFragmentOutput(fragmentResult.result, message, context);
  if (fragments.length === 0) {
    return { result: null, error: `${providerLabel(provider)} detected no activity fragments.` };
  }

  const detailPrompt = buildPandaDetailExtractionPrompt(
    message,
    context,
    fragments.map((fragment) => ({
      fragmentText: fragment.fragmentText,
      primaryCategory: fragment.primaryCategory as PrimaryActionCategory,
      eventTime: fragment.eventTime,
      timeCheckpointId: fragment.timeCheckpointId,
      confidence: fragment.confidence,
    })),
  );

  const detailResult = await callRemoteJson(message, context, systemPrompt, detailPrompt);
  if (!detailResult.result) {
    return { result: null, error: detailResult.error ?? `${providerLabel(provider)} detail pass failed.` };
  }

  const validated = validatePandaParseResult(detailResult.result, provider === "mistral" ? "mistral" : "gemini", message);
  if (!validated) {
    return { result: null, error: `${providerLabel(provider)} returned JSON that failed validation.` };
  }

  return {
    result: {
      ...validated,
      activityFragments: validated.activityFragments?.length ? validated.activityFragments : fragments,
      extractedActivities: validated.extractedActivities.map((activity) => {
        const fragment = fragments.find((item) => item.fragmentText === activity.details.fragmentText);
        return fragment && !activity.timeSlot
          ? { ...activity, timeSlot: checkpointIdToSlot(fragment.timeCheckpointId, fragment.fragmentText) }
          : activity;
      }),
    },
  };
}

function clarificationForUnmappedCategory(parse: PandaParseResult): PandaParseResult {
  return {
    ...parse,
    followUpQuestion: "I can log this, but which area fits best?",
    quickReplies: ["Travel", "Food", "Energy", "Shopping", "Waste", "Other"],
    assistantMessage: "I understood the activity, but I want to match it to the right CarbonTrail category first.",
  };
}

async function reconcileAmbiguousCategories(
  parse: PandaParseResult,
  originalMessage: string,
  context: PandaContext,
  onStep?: (step: PandaProcessingStep) => void,
): Promise<PandaParseResult> {
  if (!hasAmbiguousCategoryMapping(parse)) return parse;

  if (!isRemoteAiEnabled()) {
    onStep?.("asking_user_clarification");
    return clarificationForUnmappedCategory(parse);
  }

  onStep?.("reconciling_with_ai");
  const reconciliationMessage = JSON.stringify({
    task: "Reconcile these events to CarbonTrail's allowed primary categories and return the same Panda JSON shape.",
    allowedPrimaryCategories: [
      "transportation",
      "food_meals",
      "home_energy",
      "cooking_energy",
      "work_study",
      "shopping_purchases",
      "delivery_online_orders",
      "waste_recycling",
      "water_hot_water",
      "digital_devices",
      "personal_care",
      "household_chores",
      "social_leisure",
      "travel_trips",
      "positive_avoided_actions",
      "other_unknown",
    ],
    originalMessage,
    parse,
  });
  const reconciled = await callRemoteAi(reconciliationMessage, context);

  if (reconciled.result && !hasAmbiguousCategoryMapping(reconciled.result)) {
    return reconciled.result;
  }

  onStep?.("asking_user_clarification");
  return clarificationForUnmappedCategory(parse);
}

export function buildPandaContext(
  profile: UserProfile,
  currentDate: string,
  now = new Date(),
  loggedActivities: string[] = [],
  checkpointStatuses: PandaContext["checkpointStatuses"] = {},
  options?: {
    chatThread?: PandaChatTurn[];
    pendingLog?: PandaPendingLogContext | null;
  },
): PandaContext {
  return {
    currentDate,
    currentTime: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    dayOfWeek: now.toLocaleDateString("en-US", { weekday: "long" }),
    profileSummary: `Living area: ${profile.core.homeRegion ?? "unknown"}; commute: ${profile.core.usualCommuteMode ?? "unknown"}; work: ${profile.core.usualWorkMode ?? "unknown"}`,
    usualCommuteMode: profile.core.usualCommuteMode,
    usualCommuteDistanceKm:
      typeof profile.core.usualCommuteDistanceKm === "number"
        ? profile.core.usualCommuteDistanceKm
        : undefined,
    loggedActivities,
    checkpointStatuses,
    chatThread: options?.chatThread,
    pendingLog: options?.pendingLog ?? null,
  };
}

export function buildChatThreadFromMessages(
  messages: Array<{ id?: string; role: "user" | "assistant"; text: string }>,
  latestUserText?: string,
): PandaChatTurn[] {
  const thread = messages
    .filter((message) => message.id !== "welcome")
    .map((message) => ({ role: message.role, text: message.text }));
  if (latestUserText?.trim()) {
    thread.push({ role: "user", text: latestUserText.trim() });
  }
  return thread;
}

export function buildPendingLogContext(pendingParse: PandaParseResult): PandaPendingLogContext {
  return {
    originalText: pendingParse.originalText,
    followUpQuestion: pendingParse.followUpQuestion,
    missingFields: pendingParse.missingFields,
    extractedActivities: pendingParse.extractedActivities,
    followUpRound: pendingParse.followUpRound,
    conversationReplies: pendingParse.conversationReplies,
    assistantMessage: pendingParse.assistantMessage,
  };
}

async function finalizeParse(
  parse: PandaParseResult,
  profile: UserProfile | undefined,
  originalMessage: string,
  context: PandaContext,
  onStep?: (step: PandaProcessingStep) => void,
): Promise<PandaParseResult> {
  const reconciled = await reconcileAmbiguousCategories(parse, originalMessage, context, onStep);
  if (!profile) return reconciled;
  onStep?.("asking_user_clarification");
  return applyCompletenessToParse(reconciled, profile);
}

export async function parsePandaMessage(
  message: string,
  context: PandaContext,
  profile?: UserProfile,
  options: ParsePandaMessageOptions = {},
): Promise<PandaParseResult> {
  options.onStep?.("understanding_message");
  if (isRemoteAiEnabled()) {
    const provider = getAiProvider();
    options.onStep?.("classifying_categories");
    const { result, error } = await callRemoteAiTwoPass(message, context);
    if (result) {
      options.onStep?.("checking_app_mapping");
      return finalizeParse(result, profile, message, context, options.onStep);
    }

    const local = parsePandaMessageLocal(message, context, profile);
    options.onStep?.("checking_app_mapping");
    return finalizeParse(
      {
        ...local,
        fallbackReason: error ?? `${providerLabel(provider)} unavailable — using local parser.`,
      },
      profile,
      message,
      context,
      options.onStep,
    );
  }

  options.onStep?.("classifying_categories");
  const local = parsePandaMessageLocal(message, context, profile);
  options.onStep?.("checking_app_mapping");
  return finalizeParse(local, profile, message, context, options.onStep);
}
