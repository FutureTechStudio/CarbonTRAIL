import { QuickChip } from "@/components/cards/QuickChip";

export function QuickReplyChips({ chips, onPick }: { chips: string[]; onPick: (value: string) => void }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {chips.map((chip) => (
        <QuickChip key={chip} onClick={() => onPick(chip)}>
          {chip}
        </QuickChip>
      ))}
    </div>
  );
}
