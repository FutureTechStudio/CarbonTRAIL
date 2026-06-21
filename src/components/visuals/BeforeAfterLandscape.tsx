export function BeforeAfterLandscape({ improved }: { improved: boolean }) {
  return (
    <svg viewBox="0 0 280 180" className="w-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label={improved ? "Improved landscape" : "Current landscape"}>
      <rect width="280" height="180" rx="12" fill={improved ? "#c8ecd7" : "#d3cbc4"} />
      <circle cx="240" cy="28" r="16" fill={improved ? "#ffd46a" : "#c7b590"} opacity="0.75" />
      {!improved ? <circle cx="240" cy="28" r="25" fill="#a8a0a0" opacity="0.25" /> : null}
      <path d="M 0 146 Q 140 128 280 146 L 280 180 L 0 180 Z" fill={improved ? "#b4c890" : "#9f968f"} opacity="0.6" />
      <polygon points="96,180 114,144 164,144 182,180" fill={improved ? "#c6b89e" : "#847b76"} />
      <text x="136" y="167" textAnchor="middle" fontSize="13">
        {improved ? "🚶" : "🛵"}
      </text>
      <text x="12" y="16" fontSize="10" fill={improved ? "#2d7a4f" : "#6f6764"} fontWeight="700">
        {improved ? "Improved" : "Current"}
      </text>
    </svg>
  );
}
