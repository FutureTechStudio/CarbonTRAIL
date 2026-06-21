import { memo } from "react";
import { P } from "@/theme/palette";
import "./welcome-animations.css";

function Tree({ x, y, scale = 1, tone = P.green }: { x: number; y: number; scale?: number; tone?: string }) {
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`}>
      <rect x={26} y={50} width={8} height={18} rx={3} fill={P.soil} />
      <polygon points="30,4 4,52 56,52" fill={tone} />
      <polygon points="30,18 10,54 50,54" fill="#3D9A5E" opacity={0.35} />
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

function Smoke({ x, y, opacity = 0.35 }: { x: number; y: number; opacity?: number }) {
  return (
    <g opacity={opacity}>
      <ellipse cx={x} cy={y} rx={28} ry={14} fill={P.smoke} />
      <ellipse cx={x + 22} cy={y - 12} rx={20} ry={11} fill={P.smoke} />
      <ellipse cx={x - 16} cy={y - 14} rx={18} ry={10} fill={P.smoke} />
      <ellipse cx={x + 6} cy={y - 28} rx={14} ry={8} fill={P.smoke} opacity={0.75} />
    </g>
  );
}

/** Minimal bird silhouette — wings in gentle V. */
function Bird({ x, y, scale = 1, flip = false }: { x: number; y: number; scale?: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x},${y}) scale(${flip ? -scale : scale},${scale})`}>
      <path
        d="M 0 0 Q 10 -8 22 -3 Q 14 2 22 6 Q 10 2 0 0 Z"
        fill="#4A5A48"
        opacity={0.72}
      />
    </g>
  );
}

/** Full-page scenic landscape for the welcome screen. */
export const WelcomeLandscape = memo(function WelcomeLandscape() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="landSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#CBE8F5" />
          <stop offset="38%" stopColor="#DFF0E0" />
          <stop offset="72%" stopColor="#E8EDD8" />
          <stop offset="100%" stopColor="#EDE8DE" />
        </linearGradient>
        <linearGradient id="landLake" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#9ECFE0" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#7BB8D4" stopOpacity="0.35" />
        </linearGradient>
        <radialGradient id="landGlow" cx="50%" cy="85%" r="50%">
          <stop offset="0%" stopColor="#A8D5B5" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#EDE8DE" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="volcanoRock" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8A7A6A" />
          <stop offset="100%" stopColor="#6A5A4A" />
        </linearGradient>
      </defs>

      <rect width={1440} height={900} fill="url(#landSky)" />
      <ellipse cx={720} cy={820} rx={520} ry={160} fill="url(#landGlow)" />

      {/* Clouds — gentle drift */}
      <g className="welcome-cloud-drift-a" opacity={0.45}>
        <ellipse cx={180} cy={110} rx={62} ry={26} fill="#F5FAFC" />
        <ellipse cx={230} cy={98} rx={44} ry={20} fill="#E8F4F8" />
      </g>
      <g className="welcome-cloud-drift-b" opacity={0.45}>
        <ellipse cx={1180} cy={90} rx={70} ry={28} fill="#F5FAFC" />
        <ellipse cx={1240} cy={78} rx={48} ry={22} fill="#EEF6F0" />
      </g>
      <g className="welcome-cloud-drift-a" opacity={0.35} style={{ animationDelay: "-20s" }}>
        <ellipse cx={680} cy={130} rx={54} ry={22} fill="#F0F8FA" />
      </g>

      {/* Distant mountains */}
      <path
        d="M 0 420 L 180 280 L 320 360 L 480 240 L 620 330 L 780 210 L 920 300 L 1080 220 L 1220 340 L 1440 260 L 1440 520 L 0 520 Z"
        fill="#B8C8B0"
        opacity={0.45}
      />
      <path
        d="M 0 480 L 240 360 L 420 430 L 600 320 L 820 410 L 1000 340 L 1200 420 L 1440 380 L 1440 560 L 0 560 Z"
        fill="#A8B8A0"
        opacity={0.38}
      />

      {/* Volcano / smoky zone */}
      <path d="M 1080 560 L 1180 280 L 1280 560 Z" fill="url(#volcanoRock)" opacity={0.85} />
      <path d="M 1120 560 L 1180 340 L 1240 560 Z" fill="#7A6A58" opacity={0.5} />
      <g className="welcome-smoke-rise-a">
        <Smoke x={1180} y={250} opacity={0.42} />
      </g>
      <g className="welcome-smoke-rise-b">
        <Smoke x={1210} y={210} opacity={0.28} />
      </g>
      <ellipse cx={1180} cy={580} rx={100} ry={24} fill={P.smoke} opacity={0.18} />

      {/* Lake */}
      <ellipse cx={220} cy={620} rx={140} ry={48} fill="url(#landLake)" />
      <ellipse cx={220} cy={618} rx={100} ry={28} fill="#7BB8D4" opacity={0.15} />

      {/* Rolling hills */}
      <path
        d="M 0 680 Q 240 620 480 660 Q 720 700 960 640 Q 1200 590 1440 650 L 1440 900 L 0 900 Z"
        fill="#B8CC94"
        opacity={0.55}
      />
      <path
        d="M 0 740 Q 300 690 560 730 Q 820 770 1100 710 Q 1280 675 1440 720 L 1440 900 L 0 900 Z"
        fill="#A8BC82"
        opacity={0.45}
      />
      <path
        d="M 0 800 Q 360 760 720 790 Q 1080 820 1440 780 L 1440 900 L 0 900 Z"
        fill="#98AC72"
        opacity={0.35}
      />

      {/* Winding trail */}
      <path
        d="M 120 820 C 280 760 360 680 520 700 C 680 720 760 640 920 660 C 1060 675 1140 600 1280 620"
        stroke="#D4C4A8"
        strokeWidth={18}
        fill="none"
        strokeLinecap="round"
        opacity={0.35}
      />
      <path
        d="M 120 820 C 280 760 360 680 520 700 C 680 720 760 640 920 660 C 1060 675 1140 600 1280 620"
        stroke="#C4A882"
        strokeWidth={8}
        fill="none"
        strokeLinecap="round"
        opacity={0.55}
      />
      <path
        d="M 120 820 C 280 760 360 680 520 700 C 680 720 760 640 920 660 C 1060 675 1140 600 1280 620"
        stroke="white"
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeDasharray="8 14"
        opacity={0.4}
      />

      <Tree x={60} y={620} scale={0.55} />
      <Tree x={110} y={640} scale={0.48} tone="#3D9A5E" />
      <Tree x={340} y={660} scale={0.52} />
      <Tree x={390} y={680} scale={0.44} tone="#8DB87A" />
      <Tree x={720} y={690} scale={0.5} />
      <Tree x={860} y={710} scale={0.46} />
      <Tree x={40} y={720} scale={0.42} tone="#4CAF7D" />

      <House x={480} y={640} scale={0.85} lit />
      <House x={640} y={670} scale={0.75} />
      <House x={980} y={690} scale={0.7} />

      <g opacity={0.55}>
        <ellipse cx={200} cy={780} rx={9} ry={14} fill={P.leaf} transform="rotate(-20 200 780)" />
        <ellipse cx={1320} cy={760} rx={8} ry={13} fill={P.green} transform="rotate(25 1320 760)" />
        <ellipse cx={100} cy={560} rx={7} ry={12} fill={P.lightGreen} transform="rotate(-35 100 560)" />
      </g>

      {/* Birds — painted last so they sit in front of mountains/sky */}
      <g className="welcome-bird-a">
        <Bird x={80} y={72} scale={2.4} />
      </g>
      <g className="welcome-bird-b">
        <Bird x={280} y={108} scale={2.1} flip />
      </g>
      <g className="welcome-bird-c">
        <Bird x={1260} y={58} scale={2.3} flip />
      </g>
      <g className="welcome-bird-d">
        <Bird x={980} y={132} scale={2} />
      </g>
    </svg>
  );
});
