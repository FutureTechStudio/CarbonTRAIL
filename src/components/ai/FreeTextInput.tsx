import { useState } from "react";
import { P } from "@/theme/palette";

export function FreeTextInput({
  onSubmit,
  placeholder,
}: {
  onSubmit: (value: string) => void;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");
  return (
    <div className="flex gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) {
            onSubmit(value.trim());
            setValue("");
          }
        }}
        placeholder={placeholder ?? "Describe today's changes..."}
        className="flex-1 rounded-2xl border px-3 py-2 text-sm"
        style={{ borderColor: P.border }}
      />
      <button
        type="button"
        onClick={() => {
          if (!value.trim()) return;
          onSubmit(value.trim());
          setValue("");
        }}
        className="rounded-2xl px-3 py-2 text-sm font-semibold text-white"
        style={{ background: P.green }}
      >
        Send
      </button>
    </div>
  );
}
