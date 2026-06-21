import { memo } from "react";
import { P } from "@/theme/palette";

function Tree({ x, y, scale = 1, tone = P.green }: { x: number; y: number; scale?: number; tone?: string }) {
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`}>
      <rect x={26} y={50} width={8} height={18} rx={3} fill={P.soil} />
      <polygon points="30,4 4,52 56,52" fill={tone} />
      <polygon points="30,18 10,54 50,54" fill="#3D9A5E" opacity={0.32} />
    </g>
  );
}

function House({ x, y, scale = 1, lit = false }: { x: number; y: number; scale?: number; lit?: boolean }) {
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`}>
      <rect x={8} y={28} width={44} height={32} fill="#F0E8D4" rx={2} />
      <polygon points="4,30 52,30 30,8" fill="#C8A864" />
      <rect x={16} y={36} width={10} height={10} fill={lit ? "#FFD46A" : "#D4C4A8"} rx={1} opacity={lit ? 0.9 : 0.5} />
      <rect x={34} y={44} width={10} height={16} fill="#8A7058" rx={1} />
    </g>
  );
}

function Bird({ x, y, scale = 1, flip = false }: { x: number; y: number; scale?: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x},${y}) scale(${flip ? -scale : scale},${scale})`}>
      <path
        d="M 0 0 Q 10 -8 22 -3 Q 14 2 22 6 Q 10 2 0 0 Z"
        fill="#4A5A48"
        opacity={0.5}
      />
    </g>
  );
}

/** Scenic backdrop for Today — landing-page style, with a soft night-left/day-right cycle. */
export const TodayLandscape = memo(function TodayLandscape() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 top-0 overflow-hidden" aria-hidden="true">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="todaySkyCycle" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2C3A54" />
            <stop offset="22%" stopColor="#788AA5" />
            <stop offset="48%" stopColor="#DFF0E0" />
            <stop offset="76%" stopColor="#CBE8F5" />
            <stop offset="100%" stopColor="#FFD8A8" />
          </linearGradient>
          <linearGradient id="todayGroundFar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B8CC94" stopOpacity="0.58" />
            <stop offset="100%" stopColor="#EDE8DE" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="todayGroundNear" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#98AC72" stopOpacity="0.44" />
            <stop offset="100%" stopColor="#EDE8DE" stopOpacity="0.12" />
          </linearGradient>
          <radialGradient id="todayLeftMoonGlow" cx="18%" cy="20%" r="28%">
            <stop offset="0%" stopColor="#E8EEF5" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#E8EEF5" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="todayRightSunGlow" cx="84%" cy="24%" r="32%">
            <stop offset="0%" stopColor="#FFE08A" stopOpacity="0.48" />
            <stop offset="100%" stopColor="#FFE08A" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="todayCenterMist" cx="52%" cy="54%" r="46%">
            <stop offset="0%" stopColor="#FDFAF4" stopOpacity="0.56" />
            <stop offset="100%" stopColor="#FDFAF4" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width={1440} height={900} fill="url(#todaySkyCycle)" opacity={0.62} />
        <rect width={1440} height={900} fill="url(#todayLeftMoonGlow)" />
        <rect width={1440} height={900} fill="url(#todayRightSunGlow)" />
        <ellipse cx={720} cy={470} rx={610} ry={260} fill="url(#todayCenterMist)" />

        <circle cx={192} cy={130} r={34} fill="#E8EEF5" opacity={0.66} />
        <circle cx={214} cy={118} r={32} fill="#5B6780" opacity={0.42} />
        <circle cx={1200} cy={150} r={42} fill="#FFE08A" opacity={0.7} />
        <circle cx={1200} cy={150} r={74} fill="#FFE08A" opacity={0.13} />

        <g opacity={0.34}>
          {[80, 160, 260, 1040, 1120].map((x, index) => (
            <circle key={x} cx={x} cy={index % 2 ? 190 : 86} r={2} fill="#FFFFFF" />
          ))}
        </g>

        <g opacity={0.28}>
          <ellipse cx={280} cy={140} rx={70} ry={24} fill="#F5FAFC" />
          <ellipse cx={340} cy={126} rx={44} ry={18} fill="#E8F4F8" />
          <ellipse cx={980} cy={118} rx={84} ry={26} fill="#F5FAFC" />
          <ellipse cx={1052} cy={102} rx={46} ry={18} fill="#EEF6F0" />
        </g>

        <path
          d="M 0 560 L 180 430 L 320 500 L 520 385 L 700 485 L 900 360 L 1080 475 L 1240 390 L 1440 470 L 1440 680 L 0 680 Z"
          fill="#B8C8B0"
          opacity={0.22}
        />
        <path
          d="M 0 660 Q 260 600 520 642 Q 760 682 1010 616 Q 1240 560 1440 635 L 1440 900 L 0 900 Z"
          fill="url(#todayGroundFar)"
        />
        <path
          d="M 0 735 Q 300 690 570 728 Q 830 766 1110 705 Q 1290 675 1440 718 L 1440 900 L 0 900 Z"
          fill="url(#todayGroundNear)"
        />
        <path
          d="M 0 810 Q 360 765 720 792 Q 1080 820 1440 780 L 1440 900 L 0 900 Z"
          fill="#8FA866"
          opacity={0.22}
        />

        <path
          d="M 100 830 C 260 770 360 700 520 716 C 680 734 790 650 950 668 C 1100 684 1180 610 1320 632"
          stroke="#D4C4A8"
          strokeWidth={18}
          fill="none"
          strokeLinecap="round"
          opacity={0.22}
        />
        <path
          d="M 100 830 C 260 770 360 700 520 716 C 680 734 790 650 950 668 C 1100 684 1180 610 1320 632"
          stroke="#C4A882"
          strokeWidth={7}
          fill="none"
          strokeLinecap="round"
          opacity={0.32}
        />

        <Tree x={72} y={650} scale={0.48} tone="#4CAF7D" />
        <Tree x={132} y={682} scale={0.38} tone="#8DB87A" />
        <Tree x={392} y={690} scale={0.42} />
        <Tree x={820} y={705} scale={0.4} tone="#3D9A5E" />
        <Tree x={1140} y={680} scale={0.44} />
        <House x={252} y={640} scale={0.56} lit />
        <House x={1110} y={630} scale={0.58} />
        <Bird x={84} y={98} scale={1.8} />
        <Bird x={1030} y={170} scale={1.5} flip />
      </svg>

      <div
        className="absolute left-[16%] top-[12%] h-52 w-52 rounded-full opacity-30 blur-2xl"
        style={{ background: "radial-gradient(circle, rgba(232,238,245,0.58) 0%, transparent 68%)" }}
      />
      <div
        className="absolute right-[12%] top-[13%] h-56 w-56 rounded-full opacity-35 blur-2xl"
        style={{ background: "radial-gradient(circle, rgba(255,224,138,0.62) 0%, transparent 70%)" }}
      />
      <div
        className="absolute left-[38%] top-[38%] h-72 w-72 rounded-full opacity-25 blur-3xl"
        style={{ background: `radial-gradient(circle, ${P.lightGreen}55 0%, transparent 70%)` }}
      />
    </div>
  );
});
