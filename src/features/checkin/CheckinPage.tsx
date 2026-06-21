import { ProfileContextCard } from "@/components/ai/ProfileContextCard";
import { PandaChatPanel } from "@/components/ai/PandaChatPanel";
import { usePandaDayLog } from "@/ai/usePandaDayLog";
import { CheckinDayTrack } from "@/features/checkin/CheckinDayTrack";
import { PAGE_SHELL } from "@/theme/palette";

export function CheckinPage() {
  const {
    profile,
    todayDate,
    todayDay,
    checkpointStatuses,
    messages,
    pendingParse,
    processingStep,
    busy,
    input,
    setInput,
    sendMessage,
    logPending,
    onQuickReply,
  } = usePandaDayLog({
    applyProbabilisticDefaults: true,
    welcomeMessage:
      "This is today's check-in. Tell me what happened — I'll log it to your trail, or fill gaps from your usual patterns.",
  });

  if (!profile) return null;

  return (
    <div className={`grid ${PAGE_SHELL} gap-4 p-4 lg:grid-cols-5 lg:p-6`}>
      <section className="space-y-3 lg:col-span-3">
        <ProfileContextCard profile={profile} />
        <PandaChatPanel
          variant="page"
          title="Panda Check-in"
          subtitle={`Daily trail · ${todayDate}`}
          messages={messages}
          pendingParse={pendingParse}
          processingStep={processingStep}
          busy={busy}
          input={input}
          onInputChange={setInput}
          onSend={sendMessage}
          onLogPending={logPending}
          onQuickReply={onQuickReply}
        />
      </section>

      <div className="lg:col-span-2">
        <CheckinDayTrack date={todayDate} day={todayDay} checkpointStatuses={checkpointStatuses} />
      </div>
    </div>
  );
}
