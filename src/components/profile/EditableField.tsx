import { P } from "@/theme/palette";

export function EditableField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs" style={{ color: P.faintText }}>
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
        style={{ borderColor: P.border, background: "white" }}
      />
    </label>
  );
}
