const CITY_COORDS: Record<string, { lat: number; lon: number; label: string }> = {
  delhi: { lat: 28.6139, lon: 77.209, label: "Delhi" },
  london: { lat: 51.5072, lon: -0.1276, label: "London" },
  bangalore: { lat: 12.9716, lon: 77.5946, label: "Bangalore" },
  bengaluru: { lat: 12.9716, lon: 77.5946, label: "Bangalore" },
  kolkata: { lat: 22.5726, lon: 88.3639, label: "Kolkata" },
  mumbai: { lat: 19.076, lon: 72.8777, label: "Mumbai" },
  chennai: { lat: 13.0827, lon: 80.2707, label: "Chennai" },
  hyderabad: { lat: 17.385, lon: 78.4867, label: "Hyderabad" },
  pune: { lat: 18.5204, lon: 73.8567, label: "Pune" },
  goa: { lat: 15.2993, lon: 74.124, label: "Goa" },
  paris: { lat: 48.8566, lon: 2.3522, label: "Paris" },
  dubai: { lat: 25.2048, lon: 55.2708, label: "Dubai" },
  singapore: { lat: 1.3521, lon: 103.8198, label: "Singapore" },
  new_york: { lat: 40.7128, lon: -74.006, label: "New York" },
};

const COMMUTE_DISTANCE_CEILING_KM = 50;

function normalizeCity(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const radiusKm = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * radiusKm * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}

export function parseKnownCityFromText(value: string): { key: string; label: string; lat: number; lon: number } | null {
  const normalized = normalizeCity(value);
  const direct = CITY_COORDS[normalized];
  if (direct) return { key: normalized, ...direct };

  for (const [key, city] of Object.entries(CITY_COORDS)) {
    if (normalized.includes(key) || normalized.includes(city.label.toLowerCase().replace(/\s+/g, "_"))) {
      return { key, ...city };
    }
  }

  return null;
}

function cityMentionedInText(text: string, key: string, label: string): boolean {
  const normalized = text.toLowerCase();
  return normalized.includes(key) || normalized.includes(label.toLowerCase());
}

function looksLikeFlightText(...parts: string[]): boolean {
  return /\b(flight|plane|airplane|airport|aviation|flew|flying|fly)\b/i.test(parts.join(" "));
}

export function isFlightTransport(
  details: Record<string, unknown>,
  label = "",
  activityType = "",
): boolean {
  if (details.mode === "flight") return true;
  return looksLikeFlightText(label, activityType);
}

function mergeRouteContext(
  ...sources: Array<string | Record<string, unknown> | undefined | null>
): { text: string; origin?: string; destination?: string } {
  const textParts: string[] = [];
  let origin: string | undefined;
  let destination: string | undefined;

  for (const source of sources) {
    if (!source) continue;
    if (typeof source === "string") {
      textParts.push(source);
      continue;
    }
    if (typeof source.origin === "string") origin = source.origin;
    if (typeof source.destination === "string") destination = source.destination;
    textParts.push(
      Object.values(source)
        .filter((value) => typeof value === "string")
        .join(" "),
    );
  }

  return { text: textParts.join(" "), origin, destination };
}

export function inferFlightRouteFromContext(
  ...sources: Array<string | Record<string, unknown> | undefined | null>
): Record<string, unknown> {
  const { text, origin: existingOrigin, destination: existingDestination } = mergeRouteContext(...sources);
  const normalized = text.toLowerCase();
  if (!looksLikeFlightText(text) && !existingOrigin && !existingDestination) {
    return {};
  }

  let originText: string | undefined;
  let destinationText: string | undefined;

  const fromTo = normalized.match(
    /\bfrom\s+([a-z\s]+?)\s+(?:to|towards)\s+([a-z\s]+?)(?:\s+for|\s+at|\s+on|\s+around|\s+via|,|$)/i,
  );
  if (fromTo) {
    originText = fromTo[1];
    destinationText = fromTo[2];
  }

  const toFrom = normalized.match(
    /\bto\s+([a-z\s]+?)\s+from\s+([a-z\s]+?)(?:\s+for|\s+at|\s+on|\s+around|,|$)/i,
  );
  if (toFrom) {
    destinationText = destinationText ?? toFrom[1];
    originText = originText ?? toFrom[2];
  }

  const flightTo = normalized.match(
    /\b(?:flight|flew|flying|fly|took a flight|take a flight)\s+to\s+([a-z\s]+?)(?:\s+for|\s+from|\s+at|\s+around|\s+on|,|$)/i,
  );
  if (flightTo) {
    destinationText = destinationText ?? flightTo[1];
  }

  const labelTo = normalized.match(/\bflight\s+to\s+([a-z\s]+?)(?:\s+for|\s+from|\s+at|\s+around|,|$)/i);
  if (labelTo) {
    destinationText = destinationText ?? labelTo[1];
  }

  if (existingOrigin && !originText) originText = existingOrigin;
  if (existingDestination && !destinationText) destinationText = existingDestination;

  const destinationCity = destinationText ? parseKnownCityFromText(destinationText) : null;
  if (destinationCity && !originText) {
    for (const [key, city] of Object.entries(CITY_COORDS)) {
      if (!cityMentionedInText(normalized, key, city.label)) continue;
      if (key === destinationCity.key) continue;
      originText = city.label;
      break;
    }
  }

  const origin = originText ? parseKnownCityFromText(originText) : existingOrigin ? parseKnownCityFromText(existingOrigin) : null;
  const destination = destinationText
    ? parseKnownCityFromText(destinationText)
    : existingDestination
      ? parseKnownCityFromText(existingDestination)
      : null;

  if (origin && destination && origin.key !== destination.key) {
    return {
      mode: "flight",
      origin: origin.label,
      destination: destination.label,
      distanceKm: distanceKm(origin, destination),
      routeDistanceSource: "city_air_distance",
    };
  }

  if (destination) {
    return {
      mode: "flight",
      destination: destination.label,
    };
  }

  return {};
}

export function isCommuteDistanceForFlight(distanceKm: number | undefined): boolean {
  return typeof distanceKm === "number" && distanceKm > 0 && distanceKm <= COMMUTE_DISTANCE_CEILING_KM;
}

export function inferTravelDetailsFromText(text: string): Record<string, unknown> {
  const normalized = text.toLowerCase();
  const details: Record<string, unknown> = {};

  if (/\b(flight|plane|airplane|airport|aviation)\b/.test(normalized)) {
    details.mode = "flight";
  }

  const route = inferFlightRouteFromContext(text);
  if (typeof route.distanceKm === "number") {
    return { ...details, ...route };
  }

  return details;
}
