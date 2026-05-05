import { City, State } from "country-state-city";

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
