import { P } from "@/theme/palette";
import {
  computeSetupConfidence,
  formatCommuteMode,
  formatDistanceLabel,
  formatLivingArea,
  formatWorkMode,
} from "./baselineQuestions";
import type { CommuteMode, UsualWorkMode } from "@/types";

const DISPLAY_FONT = "Plus Jakarta Sans, sans-serif";

type CarbonMemoryPreviewProps = {
  livingArea?: string;
  optionalRegion: string;
  workMode?: UsualWorkMode;
  commuteMode?: CommuteMode;
  distance?: unknown;
  customDistance: string;
  answeredCount: number;
  totalQuestions: number;
};

function PreviewRow({
  label,
  value,
  secondary,
}: {
  label: string;
  value: string;
  secondary?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b py-2.5 last:border-b-0" style={{ borderColor: P.border }}>
      <span className="text-xs" style={{ color: P.faintText }}>
        {label}
      </span>
      <div className="text-right">
        <span className="text-sm font-semibold" style={{ color: P.charcoal }}>
          {value}
        </span>
        {secondary ? (
          <p className="mt-0.5 text-[11px] leading-snug" style={{ color: P.faintText }}>
            {secondary}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function SproutProgress({ stage }: { stage: number }) {
  const heights = [0, 6, 12, 18, 26];
  const foliage = [P.lightGreen, P.leaf, P.green, P.green, "#2D7A4F"];
  const h = heights[stage] ?? 0;
  const color = foliage[stage] ?? P.lightGreen;

  return (
    <div className="flex flex-col items-center justify-end" aria-hidden="true">
      <svg width={56} height={48} viewBox="0 0 56 48">
        <ellipse cx={28} cy={44} rx={22} ry={4} fill={P.soil} opacity={0.25} />
        <rect x={25} y={44 - h * 0.35} width={6} height={Math.max(4, h * 0.35)} rx={2} fill={P.soil} />
        {stage >= 1 ? (
          <ellipse cx={28} cy={44 - h * 0.35 - 4} rx={stage >= 3 ? 10 : 6} ry={stage >= 3 ? 8 : 5} fill={color} />
        ) : (
          <circle cx={28} cy={42} r={3} fill={P.leaf} />
        )}
        {stage >= 4 ? (
          <>
            <ellipse cx={20} cy={18} rx={7} ry={6} fill={P.leaf} opacity={0.85} />
            <ellipse cx={36} cy={20} rx={7} ry={6} fill={P.green} opacity={0.85} />
          </>
        ) : null}
      </svg>
      <p className="mt-1 text-[10px] font-medium" style={{ color: P.faintText }}>
        {stage === 0 ? "Seed planted" : stage >= 4 ? "Memory sprouting" : "Growing…"}
      </p>
    </div>
  );
}

export function CarbonMemoryPreview({
  livingArea,
  optionalRegion,
  workMode,
  commuteMode,
  distance,
  customDistance,
  answeredCount,
  totalQuestions,
}: CarbonMemoryPreviewProps) {
  const confidence = computeSetupConfidence(answeredCount, totalQuestions);
  const stage = Math.min(4, answeredCount);
  const livingAreaPreview = formatLivingArea(livingArea, optionalRegion);

  return (
    <aside
      className="rounded-[1.5rem] border p-5 shadow-lg sm:p-6"
      style={{
        background: "rgba(253, 250, 244, 0.92)",
        borderColor: "rgba(255,255,255,0.75)",
        boxShadow: "0 16px 48px rgba(42, 54, 40, 0.08)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold" style={{ color: P.charcoal, fontFamily: DISPLAY_FONT }}>
            Carbon Memory Preview
          </h2>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: P.mutedText }}>
            Panda AI will use this to ask fewer repeated questions.
          </p>
        </div>
        <SproutProgress stage={stage} />
      </div>

      <div className="rounded-2xl border px-3 py-1" style={{ background: "rgba(255,255,255,0.5)", borderColor: P.border }}>
        <PreviewRow
          label="Living area"
          value={livingAreaPreview.primary}
          secondary={livingAreaPreview.secondary}
        />
        <PreviewRow label="Weekday pattern" value={formatWorkMode(workMode)} />
        <PreviewRow label="Usual commute" value={formatCommuteMode(commuteMode)} />
        <PreviewRow label="Travel distance" value={formatDistanceLabel(distance, customDistance)} />
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span style={{ color: P.faintText }}>Profile confidence</span>
          <span className="font-bold" style={{ color: P.green }}>
            {confidence}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full" style={{ background: P.sage }}>
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${confidence}%`, background: `linear-gradient(90deg, ${P.leaf}, ${P.green})` }}
          />
        </div>
      </div>
    </aside>
  );
}
