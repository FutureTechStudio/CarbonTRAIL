import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGuest } from "@/app/providers";
import {
  applyFollowUpReplyToPendingParse,
  applyPandaParseToDay,
  applyProbabilisticDefaults,
} from "@/ai/pandaDayActions";
import {
  buildChatThreadFromMessages,
  buildPandaContext,
  buildPendingLogContext,
  parsePandaMessage,
} from "@/ai/pandaAiService";
import { PANDA_CHAT_WELCOME } from "@/ai/pandaChatCopy";
import { getCheckpointStatuses } from "@/ai/checkpointEngine";
import {
  applyCompletenessToParse,
  ensurePendingActivities,
  looksLikeSocialEventText,
  mergeAiFollowUpParse,
} from "@/ai/pandaCompleteness";
import type { PandaParseResult, PandaProcessingStep } from "@/ai/pandaSchemas";
import { estimateDayFromProfile } from "@/logic/routineEstimator";
import { PRIMARY_CATEGORY_LABELS } from "@/logic/categoryScoring";
import { createEmptyActivityDay } from "@/features/today/todayDateView";

export type PandaChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

type UsePandaDayLogOptions = {
  /** Seed assumed activities from patterns / Carbon Memory when slots are empty. */
  applyProbabilisticDefaults?: boolean;
  welcomeMessage?: string;
  /** When set, Panda logs to this date instead of today (e.g. history day view). */
  viewDate?: string;
};

function followUpRecoveryMessage(originalText: string): string {
  if (looksLikeSocialEventText(originalText)) {
    return "I couldn't attach that answer to your event yet. Try replying with where it happened, like \"At home\".";
  }
  if (/\b(flight|flew|flying|plane)\b/i.test(originalText)) {
    return "I couldn't attach that answer to your trip. Please describe the full flight again.";
  }
  return "I couldn't attach that answer yet. Can you repeat what happened in one message?";
}

function logPandaFollowUpIssue(message: string, context: Record<string, unknown>) {
  if (import.meta.env.DEV) {
    console.error(`[Panda AI] ${message}`, context);
    console.trace("[Panda AI] stack trace");
  }
}

function pandaLoggedSummary(parse: PandaParseResult): string {
  if (parse.extractedActivities.length <= 1) {
    const label = parse.extractedActivities[0]?.label;
    return label ? `Logged ${label}. Anything else to log?` : "Logged to today's trail. Anything else to log?";
  }

  const lines = parse.extractedActivities.map((activity) => {
    const primaryCategory = activity.primaryCategory ?? "other_unknown";
    return `- ${activity.label} -> ${PRIMARY_CATEGORY_LABELS[primaryCategory]}`;
  });

  return [`Panda logged ${parse.extractedActivities.length} activities:`, ...lines, "Anything else to log?"].join("\n");
}

function handleFollowUpResult(
  result: ReturnType<typeof applyFollowUpReplyToPendingParse>,
  pendingParse: PandaParseResult,
  userText: string,
  callbacks: {
    saveDay: (day: NonNullable<ReturnType<typeof applyFollowUpReplyToPendingParse>["day"]>) => void;
    saveBehaviorPatterns: (patterns: ReturnType<typeof applyFollowUpReplyToPendingParse>["patterns"]) => void;
    awardLeafPoints: (payload: {
      dayId: string;
      eventType: "detail_shared";
      label: string;
      metadata: Record<string, unknown>;
    }) => void;
    setPendingParse: (parse: PandaParseResult | null) => void;
    setMessages: React.Dispatch<React.SetStateAction<PandaChatMessage[]>>;
    setProcessingStep: (step: PandaProcessingStep) => void;
  },
) {
  if (result.saved && result.day) {
    const addedCount = result.day.activities.length;
    if (addedCount === 0) {
      logPandaFollowUpIssue("Follow-up reported saved but day has no activities", {
        pendingParse,
        result,
      });
    }
    callbacks.saveDay(result.day);
    callbacks.saveBehaviorPatterns(result.patterns);
    callbacks.awardLeafPoints({
      dayId: result.day.id,
      eventType: "detail_shared",
      label: "Panda AI detail shared",
      metadata: {
        slot: pendingParse.detectedSlotId,
        source: pendingParse.usedMistral ? "mistral" : pendingParse.usedGemini ? "gemini" : "local",
      },
    });
    callbacks.setPendingParse(null);
    callbacks.setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", text: userText },
      { id: crypto.randomUUID(), role: "assistant", text: result.assistantMessage },
    ]);
    callbacks.setProcessingStep("done");
    return;
  }

  callbacks.setPendingParse(result.pendingParse ?? null);
  if (result.saved && !result.day) {
    logPandaFollowUpIssue("Follow-up marked saved but no day payload returned", {
      pendingParse,
      result,
    });
  }
  callbacks.setMessages((prev) => [
    ...prev,
    { id: crypto.randomUUID(), role: "user", text: userText },
    { id: crypto.randomUUID(), role: "assistant", text: result.assistantMessage },
  ]);
  callbacks.setProcessingStep(result.pendingParse?.followUpQuestion ? "asking_user_clarification" : "done");
}

export function usePandaDayLog(options: UsePandaDayLogOptions = {}) {
  const navigate = useNavigate();
  const { state, todayDate, todayDay, saveDay, saveBehaviorPatterns, awardLeafPoints } = useGuest();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [processingStep, setProcessingStep] = useState<PandaProcessingStep>("idle");
  const [messages, setMessages] = useState<PandaChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: options.welcomeMessage ?? PANDA_CHAT_WELCOME,
    },
  ]);
  const [pendingParse, setPendingParse] = useState<PandaParseResult | null>(null);

  const profile = state.profile;
  const patterns = state.behaviorPatterns ?? [];
  const activeDate = options.viewDate ?? todayDate;
  const isViewingToday = activeDate === todayDate;
  const activeDay = useMemo(() => {
    if (!profile) return undefined;
    const stored = state.days[activeDate];
    if (stored) return stored;
    if (isViewingToday) return todayDay;
    return createEmptyActivityDay(profile, activeDate);
  }, [activeDate, isViewingToday, profile, state.days, todayDay]);
  const checkpointStatuses = useMemo(() => getCheckpointStatuses(activeDay), [activeDay]);

  const buildContext = useCallback(
    (chatThread?: ReturnType<typeof buildChatThreadFromMessages>, pendingLog?: PandaParseResult | null) =>
      buildPandaContext(
        profile!,
        activeDate,
        new Date(`${activeDate}T12:00:00`),
        activeDay?.activities.map((a) => a.label) ?? [],
        checkpointStatuses,
        {
          chatThread,
          pendingLog: pendingLog ? buildPendingLogContext(pendingLog) : null,
        },
      ),
    [activeDate, activeDay, checkpointStatuses, profile],
  );

  const saveParsedDay = useCallback(
    (parse: PandaParseResult) => {
      if (!profile || !activeDay) return null;

      const { day, patterns: nextPatterns } = applyPandaParseToDay(activeDay, profile, activeDate, parse, patterns);
      saveDay(day);
      saveBehaviorPatterns(nextPatterns);
      awardLeafPoints({
        dayId: day.id,
        eventType: "detail_shared",
        label: "Panda AI detail shared",
        metadata: {
          slot: parse.detectedSlotId,
          source: parse.usedMistral ? "mistral" : parse.usedGemini ? "gemini" : "local",
        },
      });

      return day;
    },
    [awardLeafPoints, patterns, profile, saveBehaviorPatterns, saveDay, activeDate, activeDay],
  );

  useEffect(() => {
    if (!profile || !isViewingToday || activeDay) return;
    saveDay(estimateDayFromProfile(profile, todayDate));
  }, [activeDay, isViewingToday, profile, saveDay, todayDate]);

  useEffect(() => {
    if (!options.applyProbabilisticDefaults || !profile || !isViewingToday) return;
    const nextDay = applyProbabilisticDefaults(activeDay, profile, todayDate, patterns);
    if (nextDay) saveDay(nextDay);
  }, [activeDay, isViewingToday, options.applyProbabilisticDefaults, patterns, profile, saveDay, todayDate]);

  const processFollowUpReply = useCallback(
    async (text: string) => {
      if (!profile || !pendingParse?.followUpQuestion) return;

      const parseForFollowUp = ensurePendingActivities(pendingParse, profile);
      if (parseForFollowUp.extractedActivities.length === 0) {
        logPandaFollowUpIssue("Follow-up reply with no pending activities to merge", {
          pendingParse,
          reply: text,
        });
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "user", text },
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: followUpRecoveryMessage(pendingParse.originalText),
          },
        ]);
        setInput("");
        setProcessingStep("asking_user_clarification");
        return;
      }

      setBusy(true);
      setProcessingStep("understanding_message");

      const chatThread = buildChatThreadFromMessages(messages, text);
      const aiParse = await parsePandaMessage(text, buildContext(chatThread, parseForFollowUp), profile, {
        onStep: setProcessingStep,
      });

      const merged = mergeAiFollowUpParse(parseForFollowUp, aiParse, text);
      const nextParse =
        merged.extractedActivities.length > 0
          ? applyCompletenessToParse(ensurePendingActivities(merged, profile), profile)
          : null;

      if (!nextParse || nextParse.extractedActivities.length === 0) {
        setProcessingStep("saving_trail");
        const result = applyFollowUpReplyToPendingParse(
          activeDay,
          profile,
          activeDate,
          parseForFollowUp,
          text,
          patterns,
        );
        handleFollowUpResult(result, pendingParse, text, {
          saveDay,
          saveBehaviorPatterns,
          awardLeafPoints,
          setPendingParse,
          setMessages,
          setProcessingStep,
        });
        setInput("");
        setBusy(false);
        return;
      }

      if (!nextParse.followUpQuestion) {
        setProcessingStep("estimating_impact");
        setProcessingStep("saving_trail");
        saveParsedDay(nextParse);
        setPendingParse(null);
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "user", text },
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: pandaLoggedSummary(nextParse),
          },
        ]);
        setInput("");
        setBusy(false);
        setProcessingStep("done");
        return;
      }

      setPendingParse(nextParse);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "user", text },
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: nextParse.assistantMessage || nextParse.followUpQuestion || "I need one more detail.",
        },
      ]);
      setInput("");
      setBusy(false);
      setProcessingStep("asking_user_clarification");
    },
    [
      activeDate,
      activeDay,
      awardLeafPoints,
      buildContext,
      messages,
      patterns,
      pendingParse,
      profile,
      saveBehaviorPatterns,
      saveDay,
      saveParsedDay,
    ],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!profile || !text.trim()) return;

      if (pendingParse?.followUpQuestion) {
        await processFollowUpReply(text);
        return;
      }

      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text }]);
      setInput("");
      setBusy(true);
      setProcessingStep("understanding_message");

      const chatThread = buildChatThreadFromMessages(messages, text);
      const parsed = await parsePandaMessage(text, buildContext(chatThread), profile, {
        onStep: setProcessingStep,
      });
      const shouldAutoLog = parsed.extractedActivities.length > 0 && !parsed.followUpQuestion;
      if (shouldAutoLog) {
        setProcessingStep("estimating_impact");
        setProcessingStep("saving_trail");
        saveParsedDay(parsed);
        setPendingParse(null);
      } else {
        setPendingParse(ensurePendingActivities(parsed, profile));
      }
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", text: pandaLoggedSummary(parsed) },
        ...(parsed.fallbackReason && import.meta.env.DEV
          ? [
              {
                id: crypto.randomUUID(),
                role: "assistant" as const,
                text: `Using local parser: ${parsed.fallbackReason}`,
              },
            ]
          : []),
      ]);
      setBusy(false);
      setProcessingStep(parsed.followUpQuestion ? "asking_user_clarification" : "done");
    },
    [
      awardLeafPoints,
      buildContext,
      messages,
      patterns,
      pendingParse,
      processFollowUpReply,
      profile,
      saveParsedDay,
      saveBehaviorPatterns,
      saveDay,
      activeDate,
      activeDay,
    ],
  );

  const logPending = useCallback(() => {
    if (!profile || !pendingParse) return;
    setProcessingStep("saving_trail");
    saveParsedDay(pendingParse);
    setPendingParse(null);
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "assistant", text: "Logged to your Daily Living Trail." },
    ]);
    setProcessingStep("done");
  }, [
    pendingParse,
    profile,
    saveParsedDay,
  ]);

  const onQuickReply = useCallback(
    async (chip: string) => {
      if (!profile) return;

      if (pendingParse?.followUpQuestion) {
        await processFollowUpReply(chip);
        return;
      }

      if (chip === "Fill commute" || chip === "Fill meals" || chip === "Fill energy") {
        navigate("/today");
        return;
      }

      await sendMessage(chip);
    },
    [
      navigate,
      pendingParse,
      processFollowUpReply,
      profile,
      sendMessage,
    ],
  );

  return {
    profile,
    todayDate: activeDate,
    todayDay: activeDay,
    checkpointStatuses,
    messages,
    pendingParse,
    busy,
    processingStep,
    input,
    setInput,
    sendMessage,
    logPending,
    onQuickReply,
    setPendingParse,
  };
}
