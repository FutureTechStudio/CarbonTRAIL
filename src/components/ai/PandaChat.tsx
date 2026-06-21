import { usePandaChatController } from "@/components/ai/PandaChatProvider";
import { PandaAvatar } from "@/components/ai/PandaAvatar";
import { usePandaDayLog } from "@/ai/usePandaDayLog";
import { PANDA_CHAT_SUBTITLE, PANDA_CHAT_TITLE } from "@/ai/pandaChatCopy";
import { PandaChatPanel } from "@/components/ai/PandaChatPanel";
import { P } from "@/theme/palette";

export function PandaChat() {
  const { isOpen, openChat, closeChat } = usePandaChatController();
  const {
    profile,
    messages,
    pendingParse,
    busy,
    input,
    setInput,
    sendMessage,
    logPending,
    onQuickReply,
  } = usePandaDayLog();

  if (!profile) return null;

  return (
    <>
      {!isOpen ? (
        <button
          type="button"
          onClick={openChat}
          aria-label="Open Panda AI chat"
          className="fixed bottom-20 right-4 z-40 inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 lg:bottom-6 lg:right-6"
          style={{
            background: "rgba(253,250,244,0.96)",
            borderColor: P.border,
            color: P.charcoal,
            fontFamily: "Plus Jakarta Sans, sans-serif",
            outlineColor: P.green,
          }}
        >
          <PandaAvatar size="sm" />
          Panda AI
        </button>
      ) : null}

      {isOpen ? (
        <PandaChatPanel
          variant="overlay"
          title={PANDA_CHAT_TITLE}
          subtitle={PANDA_CHAT_SUBTITLE}
          messages={messages}
          pendingParse={pendingParse}
          busy={busy}
          input={input}
          onInputChange={setInput}
          onSend={sendMessage}
          onLogPending={logPending}
          onQuickReply={onQuickReply}
          onClose={closeChat}
        />
      ) : null}
    </>
  );
}
