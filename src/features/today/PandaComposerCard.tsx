import { useEffect, useMemo, useRef, useState } from "react";
import { Send } from "lucide-react";
import { usePandaDayLog } from "@/ai/usePandaDayLog";
import { useGuest } from "@/app/providers";
import type { PandaParseResult, PandaProcessingStep } from "@/ai/pandaSchemas";
import { PandaAvatar } from "@/components/ai/PandaAvatar";
import { PandaBubble } from "@/components/ai/PandaBubble";
import { QuickReplyChips } from "@/components/ai/QuickReplyChips";
import { pandaHelperMessage } from "@/features/today/todayDateView";
import { PRIMARY_CATEGORY_LABELS } from "@/logic/categoryScoring";
import { P } from "@/theme/palette";

const DISPLAY_FONT = "Plus Jakarta Sans, sans-serif";

const PROCESSING_LABELS: Partial<Record<PandaProcessingStep, string>> = {
  understanding_message: "Understanding your message",
  classifying_categories: "Classifying CarbonTrail categories",
  checking_app_mapping: "Matching to app categories",
  reconciling_with_ai: "Double-checking the category mapping",
  asking_user_clarification: "Checking if I need one more detail",
  estimating_impact: "Estimating carbon impact",
  saving_trail: "Saving to today's trail",
  error: "Panda hit a snag",
};

function statusLabel(status: PandaParseResult["extractedActivities"][number]["status"]): string {
  if (status === "confirmed") return "Confirmed";
  if (status === "assumed") return "Assumed";
  if (status === "parsed_pending") return "Predicted";
  if (status === "estimated_from_profile") return "Estimated";
  return "Ready";
}

type PandaComposerCardProps = {
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  promptRequest?: { id: number; text: string } | null;
  viewDate?: string;
};

export function PandaComposerCard({ expanded, onExpandedChange, promptRequest, viewDate }: PandaComposerCardProps) {
  const { todayDate } = useGuest();
  const activeDate = viewDate ?? todayDate;
  const helperMessage = useMemo(() => pandaHelperMessage(activeDate, todayDate), [activeDate, todayDate]);
  const [internalExpanded, setInternalExpanded] = useState(false);
  const {
    messages,
    pendingParse,
    busy,
    processingStep,
    input,
    setInput,
    sendMessage,
    logPending,
    onQuickReply,
  } = usePandaDayLog({ welcomeMessage: helperMessage, viewDate: activeDate });

  const isExpanded = expanded ?? internalExpanded;
  const hasFollowUp = Boolean(pendingParse?.followUpQuestion);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const setExpanded = (next: boolean) => {
    setInternalExpanded(next);
    onExpandedChange?.(next);
  };

  useEffect(() => {
    if (!promptRequest?.text.trim()) return;
    setExpanded(true);
    void sendMessage(promptRequest.text);
  }, [promptRequest?.id]);

  useEffect(() => {
    if (!isExpanded || !chatScrollRef.current) return;
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [isExpanded, messages, pendingParse, processingStep]);

  const handleSend = () => {
    if (!input.trim()) return;
    setExpanded(true);
    void sendMessage(input);
  };

  return (
    <article
      className="rounded-[1.25rem] border p-4"
      style={{ background: P.sage, borderColor: "#c8e0c4" }}
    >
      <div className="mb-3 flex items-center gap-2">
        <PandaAvatar />
        <h2 className="text-sm font-bold" style={{ color: P.charcoal, fontFamily: DISPLAY_FONT }}>
          Panda AI
        </h2>
        <button
          type="button"
          onClick={() => setExpanded(!isExpanded)}
          className="ml-auto rounded-lg px-2 py-1 text-xs font-semibold"
          style={{ color: P.green }}
        >
          {isExpanded ? "Collapse" : "Open"}
        </button>
      </div>

      {!isExpanded ? (
        <p className="mb-3 text-sm leading-relaxed" style={{ color: P.charcoal }}>
          {helperMessage}
        </p>
      ) : (
        <div
          ref={chatScrollRef}
          className="mb-3 min-h-[20rem] max-h-[42rem] space-y-2 overflow-y-auto rounded-2xl border p-2"
          style={{ borderColor: "#c8e0c4", background: "rgba(253,250,244,0.62)" }}
        >
          {messages.map((message) => (
            <PandaBubble key={message.id} text={message.text} user={message.role === "user"} />
          ))}
          {processingStep !== "idle" && processingStep !== "done" ? (
            <div
              className="rounded-xl border px-3 py-2 text-[11px] font-semibold"
              style={{ borderColor: P.border, background: "rgba(255,255,255,0.7)", color: P.green }}
            >
              {PROCESSING_LABELS[processingStep] ?? "Panda is working"}
            </div>
          ) : null}
          {pendingParse && pendingParse.extractedActivities.length > 0 ? (
            <article
              className="rounded-xl border p-3 text-xs"
              style={{ borderColor: P.border, background: "rgba(255,255,255,0.72)" }}
            >
              <p className="font-semibold" style={{ color: P.charcoal }}>
                {pendingParse.extractedActivities.length > 1
                  ? `Panda logged ${pendingParse.extractedActivities.length} activities`
                  : "I understood:"}
              </p>
              <ul className="mt-2 space-y-1" style={{ color: P.mutedText }}>
                {pendingParse.extractedActivities.map((item, index) => (
                  <li key={index}>
                    {item.label} → {PRIMARY_CATEGORY_LABELS[item.primaryCategory ?? "other_unknown"]} ·{" "}
                    {String(item.details.mode ?? item.details.mealSource ?? item.details.deviceType ?? "logged")} ·{" "}
                    {String(item.details.eventTime ?? pendingParse.detectedTime ?? "now")} · Status: {statusLabel(item.status)}
                  </li>
                ))}
              </ul>
              {!hasFollowUp ? (
                <button
                  type="button"
                  onClick={logPending}
                  className="mt-3 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                  style={{ background: P.green }}
                >
                  Log this
                </button>
              ) : null}
            </article>
          ) : null}
          {pendingParse?.followUpQuestion ? (
            <div>
              <p className="mb-2 text-xs font-medium" style={{ color: P.charcoal }}>
                {pendingParse.followUpQuestion}
              </p>
              <QuickReplyChips chips={pendingParse.quickReplies} onPick={onQuickReply} />
            </div>
          ) : null}
          {pendingParse?.quickReplies.length && !pendingParse.followUpQuestion ? (
            <QuickReplyChips chips={pendingParse.quickReplies} onPick={onQuickReply} />
          ) : null}
        </div>
      )}

      <div className="rounded-2xl border bg-white/70 p-2" style={{ borderColor: P.border }}>
        <textarea
          value={input}
          onFocus={() => setExpanded(true)}
          onChange={(event) => {
            setExpanded(true);
            setInput(event.target.value);
          }}
          placeholder="Example: I took a bus to office at 8 AM"
          className="min-h-16 w-full resize-none bg-transparent px-2 py-1 text-sm focus:outline-none"
          style={{ color: P.charcoal }}
          aria-label="Message Panda AI"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px]" style={{ color: P.faintText }}>
            Panda can turn this into trail events.
          </span>
          <button
            type="button"
            onClick={handleSend}
            disabled={busy || !input.trim()}
            className="rounded-xl p-2 text-white disabled:opacity-45"
            style={{ background: P.green }}
            aria-label="Send message to Panda"
          >
            <Send size={14} />
          </button>
        </div>
      </div>

    </article>
  );
}
