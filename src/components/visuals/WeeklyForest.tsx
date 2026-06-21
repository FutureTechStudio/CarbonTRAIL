import { P } from "@/theme/palette";

export type TreeHealth = "healthy" | "moderate" | "smoky" | "empty";

export function WeeklyForest({ trees }: { trees: Array<{ day: string; kg: number; health: TreeHealth }> }) {
  return (
    <svg viewBox="0 0 560 240" className="w-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Weekly forest">
      <defs>
        <linearGradient id="forestBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c2deef" />
          <stop offset="58%" stopColor="#d8edca" />
          <stop offset="100%" stopColor="#c8d8a8" />
        </linearGradient>
      </defs>
      <rect width="560" height="240" rx="16" fill="url(#forestBg)" />
      {trees.map((tree, i) => {
        const x = 44 + i * 74;
        const color = tree.health === "healthy" ? P.green : tree.health === "moderate" ? "#8db87a" : tree.health === "smoky" ? P.smoke : "#c8c8b8";
        return (
          <g key={tree.day}>
            <rect x={x + 22} y="140" width="8" height="18" rx="3" fill={P.soil} />
            <polygon points={`${x + 26},92 ${x},142 ${x + 52},142`} fill={color} opacity={tree.health === "empty" ? 0.4 : 1} />
            <text x={x + 26} y="185" textAnchor="middle" fontSize="10" fill={P.soil}>
              {tree.day}
            </text>
            <text x={x + 26} y="198" textAnchor="middle" fontSize="9" fill={P.faintText}>
              {tree.kg.toFixed(1)}kg
            </text>
          </g>
        );
      })}
    </svg>
  );
}
