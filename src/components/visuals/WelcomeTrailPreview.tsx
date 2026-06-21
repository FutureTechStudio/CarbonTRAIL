import { memo } from "react";
import { P } from "@/theme/palette";

function SmokePuff({ cx, cy, r, opacity }: { cx: number; cy: number; r: number; opacity: number }) {
  return (
    <g opacity={opacity}>
      <circle cx={cx} cy={cy} r={r} fill={P.smoke} />
      <circle cx={cx + r * 0.8} cy={cy - r * 0.7} r={r * 0.72} fill={P.smoke} />
      <circle cx={cx - r * 0.55} cy={cy - r * 0.9} r={r * 0.62} fill={P.smoke} />
    </g>
  );
}

function LeafSprig({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <line x1={0} y1={10} x2={0} y2={-10} stroke={P.soil} strokeWidth={1.2} opacity={0.5} />
      <ellipse cx={0} cy={-10} rx={7} ry={11} fill={P.leaf} opacity={0.8} transform="rotate(-22)" />
      <ellipse cx={0} cy={-12} rx={6} ry={10} fill={P.green} opacity={0.65} transform="rotate(22)" />
    </g>
  );
}

/** Static hero illustration for the welcome screen — no activity data required. */
export const WelcomeTrailPreview = memo(function WelcomeTrailPreview() {
  return (
    <svg
      viewBox="0 0 340 480"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Preview of a daily carbon trail with commute, work, and meal activities"
    >
      <defs>
        <linearGradient id="welcomeTrailBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#CBE8F5" />
          <stop offset="52%" stopColor="#DFF0E0" />
          <stop offset="100%" stopColor="#EDE8D8" />
        </linearGradient>
        <filter id="welcomeNodeShadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="2" stdDeviation="5" floodOpacity="0.13" />
        </filter>
        <linearGradient id="welcomeTrailPath" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C4A882" />
          <stop offset="100%" stopColor="#A8C8A0" />
        </linearGradient>
      </defs>

      <rect width={340} height={480} fill="url(#welcomeTrailBg)" />

      <path
        d="M 0 380 Q 100 340 210 368 Q 285 388 340 355 L 340 480 L 0 480 Z"
        fill="#C0D8A8"
        opacity={0.45}
      />
      <path
        d="M 0 418 Q 90 394 180 412 Q 265 430 340 410 L 340 480 L 0 480 Z"
        fill="#B0C898"
        opacity={0.32}
      />

      <g transform="translate(25,350) scale(0.42)" opacity={0.48}>
        <rect x={26} y={50} width={8} height={18} rx={3} fill={P.soil} />
        <polygon points="30,4 4,52 56,52" fill={P.green} />
      </g>
      <g transform="translate(55,368) scale(0.42)" opacity={0.48}>
        <rect x={26} y={50} width={8} height={18} rx={3} fill={P.soil} />
        <polygon points="30,4 4,52 56,52" fill={P.green} />
      </g>
      <g transform="translate(288,350) scale(0.42)" opacity={0.48}>
        <rect x={26} y={50} width={8} height={18} rx={3} fill={P.soil} />
        <polygon points="30,4 4,52 56,52" fill={P.green} />
      </g>
      <g transform="translate(308,368) scale(0.42)" opacity={0.48}>
        <rect x={26} y={50} width={8} height={18} rx={3} fill={P.soil} />
        <polygon points="30,4 4,52 56,52" fill={P.green} />
      </g>

      <path
        d="M 168 36 C 252 96 88 178 174 262 C 255 340 86 415 172 476"
        stroke="#D4C4A8"
        strokeWidth={22}
        fill="none"
        strokeLinecap="round"
        opacity={0.38}
      />
      <path
        d="M 168 36 C 252 96 88 178 174 262 C 255 340 86 415 172 476"
        stroke="url(#welcomeTrailPath)"
        strokeWidth={10}
        fill="none"
        strokeLinecap="round"
        opacity={0.72}
      />
      <path
        d="M 168 36 C 252 96 88 178 174 262 C 255 340 86 415 172 476"
        stroke="white"
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeDasharray="7 14"
        opacity={0.48}
      />

      <SmokePuff cx={248} cy={64} r={16} opacity={0.38} />
      <g filter="url(#welcomeNodeShadow)">
        <circle cx={250} cy={98} r={30} fill="white" stroke={P.amber} strokeWidth={2.5} />
      </g>
      <text x={250} y={106} textAnchor="middle" fontSize={16} style={{ userSelect: "none" }}>
        🛵
      </text>
      <text
        x={250}
        y={138}
        textAnchor="middle"
        fontSize={9}
        fill={P.mutedText}
        fontWeight={600}
        fontFamily="DM Sans,sans-serif"
      >
        Morning Commute
      </text>

      <LeafSprig x={72} y={162} />
      <g filter="url(#welcomeNodeShadow)">
        <circle cx={90} cy={185} r={27} fill="white" stroke={P.sky} strokeWidth={2.5} />
      </g>
      <text x={90} y={193} textAnchor="middle" fontSize={15} style={{ userSelect: "none" }}>
        💻
      </text>
      <text
        x={90}
        y={221}
        textAnchor="middle"
        fontSize={9}
        fill={P.mutedText}
        fontWeight={600}
        fontFamily="DM Sans,sans-serif"
      >
        Work
      </text>

      <path
        d="M 176 262 Q 208 255 242 258"
        stroke={P.lightGreen}
        strokeWidth={3}
        fill="none"
        strokeDasharray="4 6"
        opacity={0.6}
      />
      <g filter="url(#welcomeNodeShadow)">
        <circle cx={246} cy={260} r={28} fill="white" stroke={P.green} strokeWidth={2.5} />
      </g>
      <text x={246} y={268} textAnchor="middle" fontSize={15} style={{ userSelect: "none" }}>
        🍽️
      </text>
      <text
        x={246}
        y={296}
        textAnchor="middle"
        fontSize={9}
        fill={P.mutedText}
        fontWeight={600}
        fontFamily="DM Sans,sans-serif"
      >
        Lunch (Rest.)
      </text>

      <circle
        cx={90}
        cy={342}
        r={25}
        fill="white"
        stroke="#C4BDB0"
        strokeWidth={1.4}
        strokeDasharray="5 3.5"
        opacity={0.52}
      />
      <text x={90} y={350} textAnchor="middle" fontSize={14} style={{ userSelect: "none" }} opacity={0.45}>
        ☁️
      </text>
      <text
        x={90}
        y={376}
        textAnchor="middle"
        fontSize={9}
        fill={P.smoke}
        fontWeight={500}
        fontFamily="DM Sans,sans-serif"
        opacity={0.55}
      >
        Afternoon (est.)
      </text>

      <SmokePuff cx={230} cy={398} r={14} opacity={0.38} />
      <g filter="url(#welcomeNodeShadow)">
        <circle cx={232} cy={424} r={27} fill="white" stroke={P.amber} strokeWidth={2.5} />
      </g>
      <text x={232} y={432} textAnchor="middle" fontSize={15} style={{ userSelect: "none" }}>
        🛵
      </text>
      <text
        x={232}
        y={458}
        textAnchor="middle"
        fontSize={9}
        fill={P.mutedText}
        fontWeight={600}
        fontFamily="DM Sans,sans-serif"
      >
        Eve Commute
      </text>

      <circle cx={148} cy={440} r={2.8} fill={P.lightGreen} opacity={0.6} />
      <circle cx={188} cy={454} r={2.8} fill="#EDD89A" opacity={0.6} />
      <circle cx={122} cy={454} r={2.8} fill={P.lightGreen} opacity={0.6} />
      <circle cx={200} cy={440} r={2.8} fill="#EDD89A" opacity={0.6} />
    </svg>
  );
});
