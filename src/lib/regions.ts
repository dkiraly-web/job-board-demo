// Country -> region lookup used for location scoring. SmartRecruiters returns
// job location.country as a lowercase ISO 3166-1 alpha-2 code, so keys here
// are lowercase alpha-2 codes.

export type Region =
  | "Europe"
  | "North America"
  | "Latin America & Caribbean"
  | "Middle East & Africa"
  | "Asia Pacific";

const EUROPE = [
  "al", "ad", "at", "by", "be", "ba", "bg", "hr", "cy", "cz", "dk", "ee",
  "fo", "fi", "fr", "de", "gi", "gr", "hu", "is", "ie", "im", "it", "je",
  "xk", "lv", "li", "lt", "lu", "mt", "md", "mc", "me", "nl", "mk", "no",
  "pl", "pt", "ro", "ru", "sm", "rs", "sk", "si", "es", "se", "ch", "ua",
  "gb", "va",
];

const NORTH_AMERICA = ["us", "ca", "bm"];

const LATIN_AMERICA = [
  "mx", "gt", "bz", "sv", "hn", "ni", "cr", "pa", "cu", "jm", "ht", "do",
  "pr", "tt", "bb", "bs", "ag", "dm", "gd", "kn", "lc", "vc", "ar", "bo",
  "br", "cl", "co", "ec", "gy", "py", "pe", "sr", "uy", "ve", "fk",
];

const MIDDLE_EAST_AFRICA = [
  // Middle East
  "bh", "iq", "ir", "il", "jo", "kw", "lb", "om", "ps", "qa", "sa", "sy",
  "tr", "ae", "ye",
  // Africa
  "dz", "ao", "bj", "bw", "bf", "bi", "cm", "cv", "cf", "td", "km", "cg",
  "cd", "ci", "dj", "eg", "gq", "er", "sz", "et", "ga", "gm", "gh", "gn",
  "gw", "ke", "ls", "lr", "ly", "mg", "mw", "ml", "mr", "mu", "yt", "ma",
  "mz", "na", "ne", "ng", "re", "rw", "st", "sn", "sc", "sl", "so", "za",
  "ss", "sd", "tz", "tg", "tn", "ug", "zm", "zw", "eh",
];

const ASIA_PACIFIC = [
  "af", "am", "az", "bd", "bt", "bn", "kh", "cn", "ge", "hk", "in", "id",
  "jp", "kz", "kp", "kr", "kg", "la", "mo", "my", "mv", "mn", "mm", "np",
  "pk", "ph", "sg", "lk", "tw", "tj", "th", "tl", "tm", "uz", "vn",
  "au", "nz", "fj", "pg", "sb", "vu", "nc", "pf", "ws", "to", "ki", "fm",
  "mh", "pw", "nr", "tv", "ck", "nu", "as", "gu", "mp",
];

const COUNTRY_REGION: Record<string, Region> = {};
for (const code of EUROPE) COUNTRY_REGION[code] = "Europe";
for (const code of NORTH_AMERICA) COUNTRY_REGION[code] = "North America";
for (const code of LATIN_AMERICA) COUNTRY_REGION[code] = "Latin America & Caribbean";
for (const code of MIDDLE_EAST_AFRICA) COUNTRY_REGION[code] = "Middle East & Africa";
for (const code of ASIA_PACIFIC) COUNTRY_REGION[code] = "Asia Pacific";

export function getRegion(countryCode: string | null | undefined): Region | null {
  if (!countryCode) return null;
  return COUNTRY_REGION[countryCode.toLowerCase()] ?? null;
}

export interface LocationScore {
  score: 1 | 2 | 3;
  label: string;
}

export function getLocationScore(
  candidateCountry: string | null | undefined,
  jobCountry: string | null | undefined
): LocationScore {
  const candidate = candidateCountry?.toLowerCase();
  const job = jobCountry?.toLowerCase();

  if (!candidate || !job) {
    return { score: 1, label: "Location unknown" };
  }
  if (candidate === job) {
    return { score: 3, label: "Same country" };
  }

  const candidateRegion = getRegion(candidate);
  const jobRegion = getRegion(job);
  if (candidateRegion && candidateRegion === jobRegion) {
    return { score: 2, label: `Same region (${candidateRegion})` };
  }

  return { score: 1, label: "Other region" };
}
