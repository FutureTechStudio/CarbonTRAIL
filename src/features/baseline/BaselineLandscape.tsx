import { memo } from "react";
import { P } from "@/theme/palette";

/** Soft scenic strip for baseline setup — aligned with welcome palette. */
export const BaselineLandscape = memo(function BaselineLandscape() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-[min(42vh,320px)] overflow-hidden" aria-hidden="true">
      <svg className="h-full w-full" viewBox="0 0 1440 320" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="baseSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#CBE8F5" />
            <stop offset="55%" stopColor="#DFF0E0" />
            <stop offset="100%" stopColor={P.cream} />
          </linearGradient>
          <linearGradient id="baseHillNear" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8BC4A0" />
            <stop offset="100%" stopColor="#6BAF82" />
          </linearGradient>
          <linearGradient id="baseHillFar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A8D5B5" />
            <stop offset="100%" stopColor="#8BC4A0" />
          </linearGradient>
        </defs>

        <rect width={1440} height={320} fill="url(#baseSky)" />

        <ellipse cx={180} cy={72} rx={72} ry={22} fill="rgba(255,255,255,0.55)" />
        <ellipse cx={230} cy={68} rx={48} ry={18} fill="rgba(255,255,255,0.45)" />
        <ellipse cx={1180} cy={58} rx={84} ry={24} fill="rgba(255,255,255,0.5)" />
        <ellipse cx={1240} cy={52} rx={52} ry={16} fill="rgba(255,255,255,0.4)" />

        <path
          d="M0,220 C240,170 420,250 720,210 C980,175 1180,240 1440,200 L1440,320 L0,320 Z"
          fill="url(#baseHillFar)"
          opacity={0.55}
        />
        <path
          d="M0,250 C320,210 520,270 820,235 C1080,205 1260,265 1440,240 L1440,320 L0,320 Z"
          fill="url(#baseHillNear)"
          opacity={0.72}
        />

        <path
          d="M120,248 Q360,228 580,252 T980,244 T1320,256"
          fill="none"
          stroke={P.soil}
          strokeWidth={2}
          strokeDasharray="8 10"
          opacity={0.35}
        />

        <g opacity={0.85}>
          <ellipse cx={90} cy={228} rx={5} ry={8} fill={P.leaf} transform="rotate(-25 90 228)" />
          <ellipse cx={1100} cy={218} rx={6} ry={9} fill={P.green} transform="rotate(18 1100 218)" />
          <ellipse cx={1280} cy={232} rx={4} ry={7} fill={P.lightGreen} transform="rotate(-12 1280 232)" />
        </g>

        <g>
          <rect x={132} y={214} width={5} height={14} rx={2} fill={P.soil} />
          <polygon points="134,198 122,214 146,214" fill={P.green} />
          <rect x={1040} y={208} width={4} height={12} rx={2} fill={P.soil} />
          <polygon points="1042,196 1032,208 1052,208" fill="#3D9A5E" />
          <rect x={1188} y={216} width={5} height={16} rx={2} fill={P.soil} />
          <polygon points="1190,198 1176,216 1204,216" fill={P.leaf} />
        </g>
      </svg>

      <div
        className="absolute inset-x-0 bottom-0 h-24"
        style={{ background: `linear-gradient(to bottom, transparent, ${P.cream})` }}
      />
    </div>
  );
});
