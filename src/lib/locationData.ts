import { City, State, Country } from "country-state-city";

const INDIA_COUNTRY_CODE = "IN";

const EXTRA_INDIAN_LOCATION_ALIASES = [
  "india",
  "bharat",
  "ncr",
  "new delhi",
  "bangalore",
  "gurugram",
  "trivandrum",
  "jammu",
  "kashmir",
  "andaman",
  "nicobar",
];

function normalizeLocationName(value: string): string {
  return value.trim().toLowerCase();
}

const indianStates = State.getStatesOfCountry(INDIA_COUNTRY_CODE);

export const INDIA_CITY_OPTIONS = Array.from(
  new Set(
    indianStates.flatMap((state) =>
      City.getCitiesOfState(INDIA_COUNTRY_CODE, state.isoCode).map((city) => city.name)
    )
  )
).sort((left, right) => left.localeCompare(right));

export const INDIA_LOCATION_NAMES = Array.from(
  new Set(
    [
      ...EXTRA_INDIAN_LOCATION_ALIASES,
      ...indianStates.map((state) => state.name),
      ...INDIA_CITY_OPTIONS,
    ].map(normalizeLocationName)
  )
).sort((left, right) => left.localeCompare(right));

export function isIndianLocation(location: string | null): boolean {
  if (!location) return false;

  const normalizedLocation = normalizeLocationName(location);
  return INDIA_LOCATION_NAMES.some((locationName) => normalizedLocation.includes(locationName));
}

// ── Multi-Level Location & Radius Search Utilities ───────────────────────────

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

const MAJOR_HUB_COORDINATES: Record<string, LocationCoordinates> = {
  "bengaluru": { latitude: 12.9716, longitude: 77.5946 },
  "bangalore": { latitude: 12.9716, longitude: 77.5946 },
  "mumbai": { latitude: 19.0760, longitude: 72.8777 },
  "bombay": { latitude: 19.0760, longitude: 72.8777 },
  "pune": { latitude: 18.5204, longitude: 73.8567 },
  "hyderabad": { latitude: 17.3850, longitude: 78.4867 },
  "delhi": { latitude: 28.6139, longitude: 77.2090 },
  "new delhi": { latitude: 28.6139, longitude: 77.2090 },
  "ncr": { latitude: 28.6139, longitude: 77.2090 },
  "gurgaon": { latitude: 28.4595, longitude: 77.0266 },
  "gurugram": { latitude: 28.4595, longitude: 77.0266 },
  "noida": { latitude: 28.5355, longitude: 77.3910 },
  "chennai": { latitude: 13.0827, longitude: 80.2707 },
  "kolkata": { latitude: 22.5726, longitude: 88.3639 },
  "ahmedabad": { latitude: 23.0225, longitude: 72.5714 },
  "san francisco": { latitude: 37.7749, longitude: -122.4194 },
  "new york": { latitude: 40.7128, longitude: -74.0060 },
  "london": { latitude: 51.5074, longitude: -0.1278 }
};

export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getCoordinatesForLocation(locationStr: string): LocationCoordinates | null {
  if (!locationStr || !locationStr.trim()) return null;
  const normalized = normalizeLocationName(locationStr);

  for (const [hub, coords] of Object.entries(MAJOR_HUB_COORDINATES)) {
    if (normalized.includes(hub)) return coords;
  }

  const cities = City.getAllCities();
  const match = cities.find(c => normalized.includes(c.name.toLowerCase()));
  if (match && match.latitude && match.longitude) {
    return {
      latitude: parseFloat(match.latitude),
      longitude: parseFloat(match.longitude)
    };
  }

  return null;
}

export function isLocationWithinRadius(
  candidateLoc: string | string[] | null | undefined,
  targetLoc: string,
  radiusKm: number
): boolean {
  if (!candidateLoc || !targetLoc || !radiusKm || radiusKm <= 0) return true;

  const targetCoords = getCoordinatesForLocation(targetLoc);
  if (!targetCoords) {
    const normTarget = normalizeLocationName(targetLoc);
    const locs = Array.isArray(candidateLoc) ? candidateLoc : [candidateLoc];
    return locs.some(l => l && normalizeLocationName(l).includes(normTarget));
  }

  const candLocList = Array.isArray(candidateLoc) ? candidateLoc : [candidateLoc];
  return candLocList.some(candLocStr => {
    if (!candLocStr) return false;
    const candCoords = getCoordinatesForLocation(candLocStr);
    if (!candCoords) {
      return normalizeLocationName(candLocStr).includes(normalizeLocationName(targetLoc));
    }
    const dist = calculateDistanceKm(
      targetCoords.latitude,
      targetCoords.longitude,
      candCoords.latitude,
      candCoords.longitude
    );
    return dist <= radiusKm;
  });
}

export function matchesMultiLevelLocation(
  candidateLoc: string | string[] | null | undefined,
  levels: { country?: string; state?: string; city?: string }
): boolean {
  if (!levels.country && !levels.state && !levels.city) return true;
  if (!candidateLoc) return false;

  const candLocList = (Array.isArray(candidateLoc) ? candidateLoc : [candidateLoc])
    .filter(Boolean)
    .map(normalizeLocationName);

  if (candLocList.length === 0) return false;

  const getAliases = (term: string): string[] => {
    const t = normalizeLocationName(term);
    const aliases = [t];
    if (t === "bangalore") aliases.push("bengaluru");
    if (t === "bengaluru") aliases.push("bangalore");
    if (t === "gurgaon") aliases.push("gurugram");
    if (t === "gurugram") aliases.push("gurgaon");
    if (t === "mumbai") aliases.push("bombay");
    if (t === "delhi") aliases.push("ncr", "new delhi");
    return aliases;
  };

  const matchTerm = (term?: string) => {
    if (!term || !term.trim()) return true;
    const aliases = getAliases(term);
    return candLocList.some(cLoc => aliases.some(alias => cLoc.includes(alias)));
  };

  return matchTerm(levels.city) && matchTerm(levels.state) && matchTerm(levels.country);
}

export function getAllCountriesList() {
  return Country.getAllCountries().map(c => ({ isoCode: c.isoCode, name: c.name }));
}

export function getStatesList(countryCode: string) {
  if (!countryCode) return [];
  return State.getStatesOfCountry(countryCode).map(s => ({ isoCode: s.isoCode, name: s.name }));
}

export function getCitiesList(countryCode: string, stateCode: string) {
  if (!countryCode) return [];
  if (!stateCode) {
    return City.getCitiesOfCountry(countryCode)?.map(c => c.name) || [];
  }
  return City.getCitiesOfState(countryCode, stateCode).map(c => c.name);
}
