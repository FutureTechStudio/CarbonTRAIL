import { P } from "@/theme/palette";

type DayState = "green" | "moderate" | "smoky" | "faded";

export function ValleyMapScene({ days }: { days: DayState[] }) {
  const color: Record<DayState, string> = {
    green: P.green,
    moderate: "#c8c060",
    smoky: P.smoke,
    faded: "#d0c8b8",
  };

  const positions = days.map((_, i) => {
    const row = Math.floor(i / 6);
    const col = i % 6;
    return { x: row % 2 === 0 ? 50 + col * 66 : 380 - col * 66, y: 40 + row * 56 };
  });

  return (
    <svg viewBox="0 0 430 340" className="w-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Monthly valley">
      <rect width="430" height="340" rx="16" fill="#d5ecc8" />
      {positions.slice(0, -1).map((pos, i) => (
        <line key={i} x1={pos.x} y1={pos.y} x2={positions[i + 1].x} y2={positions[i + 1].y} stroke="#c4b888" strokeWidth="1.8" opacity="0.5" />
      ))}
      {days.map((state, i) => (
        <g key={`${state}-${i}`}>
          <circle cx={positions[i].x} cy={positions[i].y} r="10" fill={color[state]} stroke="white" strokeWidth="1.5" opacity={state === "faded" ? 0.4 : 0.9} />
          <text x={positions[i].x} y={positions[i].y + 3} textAnchor="middle" fontSize="7" fill="white">
            {i + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}
