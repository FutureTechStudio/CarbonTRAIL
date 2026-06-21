import { PandaAvatar } from "@/components/ai/PandaAvatar";
import { P } from "@/theme/palette";

export function PandaBubble({ text, user }: { text: string; user?: boolean }) {
  return (
    <div className={`flex items-end gap-2 ${user ? "justify-end" : "justify-start"}`}>
      {!user ? <PandaAvatar size="sm" /> : null}
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${user ? "rounded-br-sm" : "rounded-bl-sm"}`}
        style={{
          background: user ? P.green : P.sage,
          color: user ? "white" : P.charcoal,
        }}
      >
        {text}
      </div>
    </div>
  );
}

/** @deprecated Use PandaBubble */
export const SproutBubble = PandaBubble;
