import { MessageCircle, Send, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { PandaParseResult, PandaProcessingStep } from "@/ai/pandaSchemas";
import type { PandaChatMessage } from "@/ai/usePandaDayLog";
import { PandaAvatar } from "@/components/ai/PandaAvatar";
import { PandaBubble } from "@/components/ai/PandaBubble";
import { QuickReplyChips } from "@/components/ai/QuickReplyChips";
import { getAiStatusLabel, isRemoteAiEnabled } from "@/config/aiConfig";
import { PANDA_CHAT_SUBTITLE, PANDA_CHAT_TITLE } from "@/ai/pandaChatCopy";
import { P } from "@/theme/palette";

const DISPLAY_FONT = "Plus Jakarta Sans, sans-serif";

type PandaChatPanelProps = {
  variant?: "overlay" | "page";
  title?: string;
  subtitle?: string;
  messages: PandaChatMessage[];
  pendingParse: PandaParseResult | null;
  processingStep?: PandaProcessingStep;
  busy: boolean;
  input: string;
  onInputChange: (value: string) => void;
  onSend: (text: string) => void;
  onLogPending: () => void;
  onQuickReply: (chip: string) => void;
  onClose?: () => void;
};

function statusLabel(status: string | undefined): string {
  if (status === "confirmed") return "Confirmed";
  if (status === "assumed") return "Assumed";
  if (status === "parsed_pending") return "Predicted";
  if (status === "estimated_from_profile") return "Estimated";
  return "Ready";
}

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

export function PandaChatPanel({
  variant = "overlay",
  title = PANDA_CHAT_TITLE,
  subtitle = PANDA_CHAT_SUBTITLE,
  messages,
  pendingParse,
  processingStep = "idle",
  busy,
  input,
  onInputChange,
  onSend,
  onLogPending,
  onQuickReply,
  onClose,
}: PandaChatPanelProps) {
  const navigate = useNavigate();
  const isPage = variant === "page";
  const hasFollowUp = Boolean(pendingParse?.followUpQuestion);

  const shellClass = isPage
    ? "flex h-[min(720px,calc(100vh-10rem))] flex-col overflow-hidden rounded-[1.35rem] border shadow-sm"
    : "fixed bottom-20 right-4 z-50 flex w-[min(calc(100vw-2rem),420px)] flex-col overflow-hidden rounded-[1.35rem] border shadow-2xl lg:bottom-6 lg:right-6 lg:h-[min(620px,calc(100vh-5rem))]";

  return (
    <section
      className={shellClass}
      style={{ background: P.card, borderColor: P.border }}
      aria-label="Panda AI chat"
    >
      <header
        className="flex items-start justify-between gap-3 border-b px-4 py-3"
        style={{ borderColor: P.border, background: P.sage }}
      >
        <div className="flex items-center gap-2">
          <PandaAvatar />
          <div>
            <p className="text-sm font-bold" style={{ color: P.charcoal, fontFamily: DISPLAY_FONT }}>
              {title}
            </p>
            <p className="text-xs" style={{ color: P.mutedText }}>
              {subtitle}
            </p>
          </div>
        </div>
        {!isPage && onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Panda AI chat"
            className="rounded-lg p-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ outlineColor: P.green }}
          >
            <X size={16} />
          </button>
        ) : null}
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.map((message) => (
          <PandaBubble key={message.id} text={message.text} user={message.role === "user"} />
        ))}

        {processingStep !== "idle" && processingStep !== "done" ? (
          <div
            className="rounded-xl border px-3 py-2 text-[11px] font-semibold"
            style={{ borderColor: P.border, background: "rgba(255,255,255,0.72)", color: P.green }}
          >
            {PROCESSING_LABELS[processingStep] ?? "Panda is working"}
          </div>
        ) : null}

        {pendingParse && pendingParse.extractedActivities.length > 0 ? (
          <article
            className="rounded-xl border p-3 text-xs"
            style={{ borderColor: P.border, background: "rgba(255,255,255,0.7)" }}
          >
            <p className="font-semibold" style={{ color: P.charcoal }}>
              I understood:
            </p>
            <ul className="mt-2 space-y-1" style={{ color: P.mutedText }}>
              {pendingParse.extractedActivities.map((item, index) => (
                <li key={index}>
                  {item.label} · {String(item.details.mode ?? item.details.mealSource ?? "logged")} ·{" "}
                  {pendingParse.detectedTime ?? "now"} · Status: {statusLabel(item.status)}
                </li>
              ))}
            </ul>
            {!hasFollowUp ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onLogPending}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                  style={{ background: P.green }}
                >
                  Log this
                </button>
                {!isPage ? (
                  <button
                    type="button"
                    onClick={() => navigate("/today")}
                    className="rounded-lg border px-3 py-1.5 text-xs font-semibold"
                    style={{ borderColor: P.border }}
                  >
                    Edit
                  </button>
                ) : null}
              </div>
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

      <form
        className="border-t p-3"
        style={{ borderColor: P.border }}
        onSubmit={(event) => {
          event.preventDefault();
          void onSend(input);
        }}
      >
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            placeholder="Example: I took a bus to office at 8AM"
            className="min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ borderColor: P.border, outlineColor: P.green }}
            aria-label="Message Panda AI"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Send message"
            className="rounded-xl p-2.5 text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ background: P.green, outlineColor: P.green }}
          >
            <Send size={16} />
          </button>
        </div>
        <p className="mt-2 flex items-center gap-1 text-[10px]" style={{ color: P.faintText }}>
          <MessageCircle size={11} aria-hidden="true" />
          {getAiStatusLabel()}
          {isRemoteAiEnabled() ? " · restart dev server after .env changes" : ""}
        </p>
      </form>
    </section>
  );
}
