export interface GreenImpactResult {
  baselineCo2eKg: number;
  actualCo2eKg: number;
  greenImpactKg: number;
  percentChange: number;
  isSavings: boolean;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeGreenImpact(baselineCo2eKg: number, actualCo2eKg: number): GreenImpactResult {
  const safeBaseline = Math.max(0, baselineCo2eKg);
  const safeActual = Math.max(0, actualCo2eKg);
  return {
    baselineCo2eKg: round(safeBaseline),
    actualCo2eKg: round(safeActual),
    greenImpactKg: 0,
    percentChange: 0,
    isSavings: false,
  };
}

export function formatGreenImpactMessage(impact: GreenImpactResult): string {
  if (impact.greenImpactKg > 0) {
    return `Your choices may have saved ${impact.greenImpactKg.toFixed(
      2,
    )} kg CO2e compared to your usual routine.`;
  }

  if (impact.greenImpactKg < 0) {
    return `Today was ${Math.abs(impact.greenImpactKg).toFixed(
      2,
    )} kg CO2e higher than your usual routine.`;
  }

  return "Today matched your usual routine footprint.";
}
