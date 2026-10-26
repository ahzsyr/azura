/**
 * Phone countries — complete ISO 3166-1 dialling catalogue shared by every
 * phone entry point (admin company settings, inquiry forms, product CTAs).
 *
 * The catalogue is dependency-free on purpose: it must work in server
 * components, client components and node tests without network access.
 *
 * `#` in a format string is a digit slot. Formats are used both for the input
 * placeholder and for grouping the number while the user types, so a written
 * number always looks like the example it sits next to.
 */

export type PhoneCountry = {
  /** ISO 3166-1 alpha-2 code. */
  code: string;
  name: string;
  /** International dialling code, including the leading plus. */
  dial: string;
  /** Primary national format (# = digit). Used for the placeholder. */
  format: string;
  /** Accepted national digit lengths (most common mobile length first). */
  lengths?: readonly number[];
  /** Optional stricter digits-only national pattern. */
  pattern?: string;
  /** Alternate formats for countries with more than one national length. */
  lengthFormats?: Readonly<Record<number, string>>;
  /** Realistic national example used for the input placeholder. */
  example?: string;
};

/** Site fallback when neither saved data nor the session points at a country. */
export const DEFAULT_PHONE_COUNTRY = "AE";

const DEFAULT_FORMAT = "### ### ###";
const FALLBACK_LENGTHS = [6, 15] as const;

type NationalMeta = {
  format: string;
  lengths: readonly number[];
  pattern?: string;
  lengthFormats?: Readonly<Record<number, string>>;
  example?: string;
};

/**
 * Formats + accepted lengths for the countries where national numbering plans
 * meaningfully differ. Everything else falls back to the generic format and a
 * permissive E.164 length check so valid numbers are never rejected.
 */
const NATIONAL_META: Record<string, NationalMeta> = {
  AE: {
    format: "## ### ####",
    lengths: [9, 8],
    lengthFormats: { 8: "# ### ####" },
    pattern: "(?:[2-7]\\d{7}|5\\d{8})",
    example: "501234567",
  },
  SA: { format: "## ### ####", lengths: [9], pattern: "(?:1[1-4]\\d{7}|5\\d{8})", example: "501234567" },
  QA: { format: "#### ####", lengths: [8], example: "50123456" },
  KW: { format: "#### ####", lengths: [8], example: "50123456" },
  BH: { format: "#### ####", lengths: [8], example: "50123456" },
  OM: { format: "#### ####", lengths: [8], example: "50123456" },
  JO: { format: "# #### ####", lengths: [9], example: "791234567" },
  LB: { format: "## ### ###", lengths: [8], example: "31234567" },
  IQ: { format: "### ### ####", lengths: [10], example: "7712345678" },
  EG: { format: "### ### ####", lengths: [10, 9, 8], pattern: "(?:1[0-2,5]\\d{8}|[2-3]\\d{7,8})", example: "1012345678" },
  TR: { format: "### ### ## ##", lengths: [10], example: "5012345678" },
  IN: { format: "##### #####", lengths: [10], pattern: "[6-9]\\d{9}", example: "9876543210" },
  PK: { format: "### #######", lengths: [10], pattern: "[3][0-9]\\d{8}", example: "3001234567" },
  BD: { format: "#### ######", lengths: [10] },
  LK: { format: "## ### ####", lengths: [9] },
  NP: { format: "### #######", lengths: [10] },
  CN: { format: "### #### ####", lengths: [11], pattern: "1[3-9]\\d{9}", example: "13800138000" },
  JP: { format: "## #### ####", lengths: [10, 9], pattern: "[1-9]\\d{8,9}", example: "9012345678" },
  KR: { format: "## #### ####", lengths: [10, 9], pattern: "1[0-9]\\d{7,8}", example: "1012345678" },
  SG: { format: "#### ####", lengths: [8], pattern: "[3689]\\d{7}", example: "81234567" },
  MY: { format: "## ### ####", lengths: [9] },
  TH: { format: "# #### ####", lengths: [9] },
  VN: { format: "### ### ###", lengths: [9] },
  ID: { format: "### ### ####", lengths: [10] },
  PH: { format: "### ### ####", lengths: [10] },
  HK: { format: "#### ####", lengths: [8] },
  TW: { format: "### ### ###", lengths: [9] },
  AU: { format: "### ### ###", lengths: [9], pattern: "[2-478]\\d{8}", example: "412345678" },
  NZ: { format: "## ### ####", lengths: [9, 8, 10], pattern: "[2-9]\\d{7,9}", example: "211234567" },
  US: { format: "### ### ####", lengths: [10], pattern: "[2-9]\\d{9}", example: "2015550123" },
  CA: { format: "### ### ####", lengths: [10] },
  GB: { format: "#### ######", lengths: [10], pattern: "[1-9]\\d{9}", example: "7911123456" },
  IE: { format: "## ### ####", lengths: [9] },
  DE: { format: "### #### ####", lengths: [11, 10, 9, 12, 13, 8, 7], pattern: "[1-9]\\d{6,12}", example: "15123456789" },
  FR: { format: "# ## ## ## ##", lengths: [9], pattern: "[1-9]\\d{8}", example: "612345678" },
  IT: { format: "### ### ####", lengths: [10, 9, 11, 8, 7], pattern: "[0-9]\\d{6,10}", example: "0612345678" },
  ES: { format: "### ### ###", lengths: [9] },
  PT: { format: "### ### ###", lengths: [9] },
  NL: { format: "# ########", lengths: [9] },
  BE: { format: "### ## ## ##", lengths: [9] },
  CH: { format: "## ### ## ##", lengths: [9] },
  AT: { format: "### ######", lengths: [10] },
  SE: { format: "## ### ## ##", lengths: [9] },
  NO: { format: "### ## ###", lengths: [8] },
  DK: { format: "## ## ## ##", lengths: [8] },
  FI: { format: "## ### ####", lengths: [9] },
  PL: { format: "### ### ###", lengths: [9] },
  CZ: { format: "### ### ###", lengths: [9] },
  SK: { format: "### ### ###", lengths: [9] },
  HU: { format: "## ### ####", lengths: [9] },
  RO: { format: "### ### ###", lengths: [9] },
  BG: { format: "### ### ###", lengths: [9] },
  GR: { format: "### ### ####", lengths: [10] },
  RU: { format: "### ### ## ##", lengths: [10], pattern: "[3489]\\d{9}", example: "9161234567" },
  UA: { format: "## ### ####", lengths: [9] },
  BY: { format: "## ### ####", lengths: [9] },
  KZ: { format: "### ### ## ##", lengths: [10] },
  ZA: { format: "## ### ####", lengths: [9], pattern: "[1-8]\\d{8}", example: "821234567" },
  NG: { format: "### ### ####", lengths: [10], pattern: "[789][01]\\d{8}", example: "8012345678" },
  KE: { format: "### ### ###", lengths: [9] },
  GH: { format: "## ### ####", lengths: [9] },
  ET: { format: "## ### ####", lengths: [9] },
  MA: { format: "## ### ####", lengths: [9] },
  DZ: { format: "## ### ####", lengths: [9] },
  TN: { format: "## ### ###", lengths: [8] },
  LY: { format: "## ### ####", lengths: [9] },
  BR: { format: "## ##### ####", lengths: [11, 10], pattern: "[1-9]{2}9?\\d{8}", example: "11987654321" },
  AR: { format: "## #### ####", lengths: [10] },
  CL: { format: "# #### ####", lengths: [9] },
  CO: { format: "### ### ####", lengths: [10] },
  PE: { format: "### ### ###", lengths: [9] },
  VE: { format: "### ### ####", lengths: [10] },
  MX: { format: "## #### ####", lengths: [10], pattern: "[1-9]\\d{9}", example: "5512345678" },
  IL: { format: "## ### ####", lengths: [9] },
  IR: { format: "### ### ####", lengths: [10] },
  AZ: { format: "## ### ## ##", lengths: [9] },
  GE: { format: "### ### ###", lengths: [9] },
  AM: { format: "## ######", lengths: [8] },
  CY: { format: "## ######", lengths: [8] },
};

/** Countries whose national number keeps its leading zero (no trunk prefix). */
const KEEPS_LEADING_ZERO = new Set(["IT", "VA", "SM", "US", "CA"]);

/** Canonical country for dialling codes shared by several territories. */
const DIAL_PRIMARY: Record<string, string> = {
  "1": "US",
  "7": "RU",
  "39": "IT",
  "44": "GB",
  "47": "NO",
  "61": "AU",
  "212": "MA",
  "262": "RE",
  "290": "SH",
  "358": "FI",
  "590": "GP",
  "599": "CW",
};

type CountrySeed = readonly [code: string, name: string, dial: string];

const COUNTRY_SEED: readonly CountrySeed[] = [
  ["AF", "Afghanistan", "93"],
  ["AX", "Åland Islands", "358"],
  ["AL", "Albania", "355"],
  ["DZ", "Algeria", "213"],
  ["AS", "American Samoa", "1684"],
  ["AD", "Andorra", "376"],
  ["AO", "Angola", "244"],
  ["AI", "Anguilla", "1264"],
  ["AG", "Antigua and Barbuda", "1268"],
  ["AR", "Argentina", "54"],
  ["AM", "Armenia", "374"],
  ["AW", "Aruba", "297"],
  ["AU", "Australia", "61"],
  ["AT", "Austria", "43"],
  ["AZ", "Azerbaijan", "994"],
  ["BS", "Bahamas", "1242"],
  ["BH", "Bahrain", "973"],
  ["BD", "Bangladesh", "880"],
  ["BB", "Barbados", "1246"],
  ["BY", "Belarus", "375"],
  ["BE", "Belgium", "32"],
  ["BZ", "Belize", "501"],
  ["BJ", "Benin", "229"],
  ["BM", "Bermuda", "1441"],
  ["BT", "Bhutan", "975"],
  ["BO", "Bolivia", "591"],
  ["BQ", "Caribbean Netherlands", "599"],
  ["BA", "Bosnia and Herzegovina", "387"],
  ["BW", "Botswana", "267"],
  ["BR", "Brazil", "55"],
  ["IO", "British Indian Ocean Territory", "246"],
  ["VG", "British Virgin Islands", "1284"],
  ["BN", "Brunei", "673"],
  ["BG", "Bulgaria", "359"],
  ["BF", "Burkina Faso", "226"],
  ["BI", "Burundi", "257"],
  ["KH", "Cambodia", "855"],
  ["CM", "Cameroon", "237"],
  ["CA", "Canada", "1"],
  ["CV", "Cape Verde", "238"],
  ["KY", "Cayman Islands", "1345"],
  ["CF", "Central African Republic", "236"],
  ["TD", "Chad", "235"],
  ["CL", "Chile", "56"],
  ["CN", "China", "86"],
  ["CX", "Christmas Island", "61"],
  ["CC", "Cocos (Keeling) Islands", "61"],
  ["CO", "Colombia", "57"],
  ["KM", "Comoros", "269"],
  ["CG", "Congo - Brazzaville", "242"],
  ["CD", "Congo - Kinshasa", "243"],
  ["CK", "Cook Islands", "682"],
  ["CR", "Costa Rica", "506"],
  ["CI", "Côte d'Ivoire", "225"],
  ["HR", "Croatia", "385"],
  ["CU", "Cuba", "53"],
  ["CW", "Curaçao", "599"],
  ["CY", "Cyprus", "357"],
  ["CZ", "Czechia", "420"],
  ["DK", "Denmark", "45"],
  ["DJ", "Djibouti", "253"],
  ["DM", "Dominica", "1767"],
  ["DO", "Dominican Republic", "1809"],
  ["EC", "Ecuador", "593"],
  ["EG", "Egypt", "20"],
  ["SV", "El Salvador", "503"],
  ["GQ", "Equatorial Guinea", "240"],
  ["ER", "Eritrea", "291"],
  ["EE", "Estonia", "372"],
  ["SZ", "Eswatini", "268"],
  ["ET", "Ethiopia", "251"],
  ["FK", "Falkland Islands", "500"],
  ["FO", "Faroe Islands", "298"],
  ["FJ", "Fiji", "679"],
  ["FI", "Finland", "358"],
  ["FR", "France", "33"],
  ["GF", "French Guiana", "594"],
  ["PF", "French Polynesia", "689"],
  ["GA", "Gabon", "241"],
  ["GM", "Gambia", "220"],
  ["GE", "Georgia", "995"],
  ["DE", "Germany", "49"],
  ["GH", "Ghana", "233"],
  ["GI", "Gibraltar", "350"],
  ["GR", "Greece", "30"],
  ["GL", "Greenland", "299"],
  ["GD", "Grenada", "1473"],
  ["GP", "Guadeloupe", "590"],
  ["GU", "Guam", "1671"],
  ["GT", "Guatemala", "502"],
  ["GG", "Guernsey", "44"],
  ["GN", "Guinea", "224"],
  ["GW", "Guinea-Bissau", "245"],
  ["GY", "Guyana", "592"],
  ["HT", "Haiti", "509"],
  ["HN", "Honduras", "504"],
  ["HK", "Hong Kong", "852"],
  ["HU", "Hungary", "36"],
  ["IS", "Iceland", "354"],
  ["IN", "India", "91"],
  ["ID", "Indonesia", "62"],
  ["IR", "Iran", "98"],
  ["IQ", "Iraq", "964"],
  ["IE", "Ireland", "353"],
  ["IM", "Isle of Man", "44"],
  ["IL", "Israel", "972"],
  ["IT", "Italy", "39"],
  ["JM", "Jamaica", "1876"],
  ["JP", "Japan", "81"],
  ["JE", "Jersey", "44"],
  ["JO", "Jordan", "962"],
  ["KZ", "Kazakhstan", "7"],
  ["KE", "Kenya", "254"],
  ["KI", "Kiribati", "686"],
  ["KP", "North Korea", "850"],
  ["KR", "South Korea", "82"],
  ["KW", "Kuwait", "965"],
  ["KG", "Kyrgyzstan", "996"],
  ["LA", "Laos", "856"],
  ["LV", "Latvia", "371"],
  ["LB", "Lebanon", "961"],
  ["LS", "Lesotho", "266"],
  ["LR", "Liberia", "231"],
  ["LY", "Libya", "218"],
  ["LI", "Liechtenstein", "423"],
  ["LT", "Lithuania", "370"],
  ["LU", "Luxembourg", "352"],
  ["MO", "Macao", "853"],
  ["MG", "Madagascar", "261"],
  ["MW", "Malawi", "265"],
  ["MY", "Malaysia", "60"],
  ["MV", "Maldives", "960"],
  ["ML", "Mali", "223"],
  ["MT", "Malta", "356"],
  ["MH", "Marshall Islands", "692"],
  ["MQ", "Martinique", "596"],
  ["MR", "Mauritania", "222"],
  ["MU", "Mauritius", "230"],
  ["YT", "Mayotte", "262"],
  ["MX", "Mexico", "52"],
  ["FM", "Micronesia", "691"],
  ["MD", "Moldova", "373"],
  ["MC", "Monaco", "377"],
  ["MN", "Mongolia", "976"],
  ["ME", "Montenegro", "382"],
  ["MS", "Montserrat", "1664"],
  ["MA", "Morocco", "212"],
  ["MZ", "Mozambique", "258"],
  ["MM", "Myanmar", "95"],
  ["NA", "Namibia", "264"],
  ["NR", "Nauru", "674"],
  ["NP", "Nepal", "977"],
  ["NL", "Netherlands", "31"],
  ["NC", "New Caledonia", "687"],
  ["NZ", "New Zealand", "64"],
  ["NI", "Nicaragua", "505"],
  ["NE", "Niger", "227"],
  ["NG", "Nigeria", "234"],
  ["NU", "Niue", "683"],
  ["NF", "Norfolk Island", "672"],
  ["MK", "North Macedonia", "389"],
  ["MP", "Northern Mariana Islands", "1670"],
  ["NO", "Norway", "47"],
  ["OM", "Oman", "968"],
  ["PK", "Pakistan", "92"],
  ["PW", "Palau", "680"],
  ["PS", "Palestine", "970"],
  ["PA", "Panama", "507"],
  ["PG", "Papua New Guinea", "675"],
  ["PY", "Paraguay", "595"],
  ["PE", "Peru", "51"],
  ["PH", "Philippines", "63"],
  ["PL", "Poland", "48"],
  ["PT", "Portugal", "351"],
  ["PR", "Puerto Rico", "1787"],
  ["QA", "Qatar", "974"],
  ["RE", "Réunion", "262"],
  ["RO", "Romania", "40"],
  ["RU", "Russia", "7"],
  ["RW", "Rwanda", "250"],
  ["BL", "Saint Barthélemy", "590"],
  ["SH", "Saint Helena", "290"],
  ["KN", "Saint Kitts and Nevis", "1869"],
  ["LC", "Saint Lucia", "1758"],
  ["MF", "Saint Martin", "590"],
  ["PM", "Saint Pierre and Miquelon", "508"],
  ["VC", "Saint Vincent and the Grenadines", "1784"],
  ["WS", "Samoa", "685"],
  ["SM", "San Marino", "378"],
  ["ST", "São Tomé and Príncipe", "239"],
  ["SA", "Saudi Arabia", "966"],
  ["SN", "Senegal", "221"],
  ["RS", "Serbia", "381"],
  ["SC", "Seychelles", "248"],
  ["SL", "Sierra Leone", "232"],
  ["SG", "Singapore", "65"],
  ["SX", "Sint Maarten", "1721"],
  ["SK", "Slovakia", "421"],
  ["SI", "Slovenia", "386"],
  ["SB", "Solomon Islands", "677"],
  ["SO", "Somalia", "252"],
  ["ZA", "South Africa", "27"],
  ["GS", "South Georgia and the South Sandwich Islands", "500"],
  ["SS", "South Sudan", "211"],
  ["ES", "Spain", "34"],
  ["LK", "Sri Lanka", "94"],
  ["SD", "Sudan", "249"],
  ["SR", "Suriname", "597"],
  ["SJ", "Svalbard and Jan Mayen", "47"],
  ["SE", "Sweden", "46"],
  ["CH", "Switzerland", "41"],
  ["SY", "Syria", "963"],
  ["TW", "Taiwan", "886"],
  ["TJ", "Tajikistan", "992"],
  ["TZ", "Tanzania", "255"],
  ["TH", "Thailand", "66"],
  ["TL", "Timor-Leste", "670"],
  ["TG", "Togo", "228"],
  ["TK", "Tokelau", "690"],
  ["TO", "Tonga", "676"],
  ["TT", "Trinidad and Tobago", "1868"],
  ["TN", "Tunisia", "216"],
  ["TR", "Turkey", "90"],
  ["TM", "Turkmenistan", "993"],
  ["TC", "Turks and Caicos Islands", "1649"],
  ["TV", "Tuvalu", "688"],
  ["UG", "Uganda", "256"],
  ["UA", "Ukraine", "380"],
  ["AE", "United Arab Emirates", "971"],
  ["GB", "United Kingdom", "44"],
  ["US", "United States", "1"],
  ["UY", "Uruguay", "598"],
  ["UZ", "Uzbekistan", "998"],
  ["VU", "Vanuatu", "678"],
  ["VA", "Vatican City", "39"],
  ["VE", "Venezuela", "58"],
  ["VN", "Vietnam", "84"],
  ["VI", "U.S. Virgin Islands", "1340"],
  ["WF", "Wallis and Futuna", "681"],
  ["EH", "Western Sahara", "212"],
  ["YE", "Yemen", "967"],
  ["ZM", "Zambia", "260"],
  ["ZW", "Zimbabwe", "263"],
];

function buildCountry(seed: CountrySeed): PhoneCountry {
  const [code, name, dialDigits] = seed;
  const meta = NATIONAL_META[code];
  const isNanp = dialDigits.startsWith("1") && dialDigits.length > 1;
  const lengths = meta?.lengths ?? (isNanp ? [7] : undefined);
  const format = meta?.format ?? (isNanp ? "### ####" : DEFAULT_FORMAT);
  return {
    code,
    name,
    dial: `+${dialDigits}`,
    format,
    ...(lengths ? { lengths } : {}),
    ...(meta?.pattern ? { pattern: meta.pattern } : {}),
    ...(meta?.lengthFormats ? { lengthFormats: meta.lengthFormats } : {}),
    ...(meta?.example ? { example: meta.example } : {}),
  };
}

function countrySortKey(name: string): string {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** All dialable countries/territories, alphabetised for the selector. */
export const PHONE_COUNTRIES: readonly PhoneCountry[] = COUNTRY_SEED.map(buildCountry).sort(
  (a, b) => {
    const aKey = countrySortKey(a.name);
    const bKey = countrySortKey(b.name);
    return aKey < bKey ? -1 : aKey > bKey ? 1 : a.code < b.code ? -1 : a.code > b.code ? 1 : 0;
  },
);

const COUNTRY_BY_CODE = new Map(PHONE_COUNTRIES.map((country) => [country.code, country]));

/** Dial-prefix lookup: longest code first so +1242 wins over +1. */
const COUNTRY_BY_DIAL = [...PHONE_COUNTRIES].sort((a, b) => {
  const byLength = b.dial.length - a.dial.length;
  if (byLength !== 0) return byLength;
  if (a.dial !== b.dial) return a.dial < b.dial ? -1 : 1;
  const aPrimary = DIAL_PRIMARY[a.dial.slice(1)] === a.code ? 0 : 1;
  const bPrimary = DIAL_PRIMARY[b.dial.slice(1)] === b.code ? 0 : 1;
  return aPrimary - bPrimary || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
});

/**
 * Regional-indicator flag for a country code. Platforms without flag-emoji
 * glyphs (Windows) fall back to the two ISO letters, e.g. "AE".
 */
export function countryFlag(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...[...code].map((char) => 0x1f1e6 + char.charCodeAt(0) - 65));
}

export function findPhoneCountry(code?: string | null): PhoneCountry | undefined {
  const normalized = code?.trim().toUpperCase();
  return normalized ? COUNTRY_BY_CODE.get(normalized) : undefined;
}

/** Site fallback country (UAE unless the catalogue changes). */
export function fallbackPhoneCountry(): PhoneCountry {
  return findPhoneCountry(DEFAULT_PHONE_COUNTRY) ?? PHONE_COUNTRIES[0]!;
}

/** Resolve the country from a leading international dialling code. */
export function findCountryByDial(digits: string): PhoneCountry | undefined {
  const normalized = digits.replace(/\D/g, "");
  if (!normalized) return undefined;
  return COUNTRY_BY_DIAL.find((country) => normalized.startsWith(country.dial.slice(1)));
}

/**
 * Country encoded in a saved value, e.g. `+971 55 107 4977`.
 * Values without an international prefix return `undefined` so the caller can
 * keep using the session/last selection.
 */
export function detectCountryFromValue(value: string): PhoneCountry | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("+")) return findCountryByDial(trimmed);
  if (/^00\d/.test(trimmed)) return findCountryByDial(trimmed.slice(2));
  return undefined;
}

function maxNationalLength(country: PhoneCountry): number {
  return country.lengths?.length ? Math.max(...country.lengths) : FALLBACK_LENGTHS[1];
}

/** Drop a national trunk prefix (`0…`) unless the country keeps it. */
export function stripTrunkPrefix(country: PhoneCountry, digits: string): string {
  if (!digits) return "";
  if (KEEPS_LEADING_ZERO.has(country.code)) return digits;
  return digits.replace(/^0+/, "");
}

/**
 * National part of a saved/current value.
 * Handles `+971 …`, `00971 …`, `971…` (international without plus), national
 * `0…` trunk prefixes and already-national digits.
 */
export function normalizeNationalDigits(value: string, country: PhoneCountry): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";

  const dialDigits = country.dial.slice(1);
  if (trimmed.startsWith("+")) {
    digits = digits.slice(dialDigits.length);
  } else if (/^00\d/.test(trimmed)) {
    digits = digits.slice(2 + dialDigits.length);
  } else if (digits.startsWith(dialDigits) && digits.length > maxNationalLength(country)) {
    digits = digits.slice(dialDigits.length);
  }

  if (!KEEPS_LEADING_ZERO.has(country.code) && digits.startsWith("0")) {
    digits = stripTrunkPrefix(country, digits);
  }
  return digits;
}

/** Preferred format for the current digit count (mobile first). */
export function nationalFormatFor(country: PhoneCountry, digitCount: number): string {
  return country.lengthFormats?.[digitCount] ?? country.format;
}

/** Format a digits-only national number using the country's pattern. */
export function formatNationalDigits(country: PhoneCountry, digits: string): string {
  const clean = digits.replace(/\D/g, "");
  if (!clean) return "";
  const format = nationalFormatFor(country, clean.length);
  let result = "";
  let index = 0;

  for (const char of format) {
    if (index >= clean.length) break;
    if (char === "#") {
      result += clean[index];
      index += 1;
    } else {
      result += char;
    }
  }

  if (index < clean.length) {
    const overflow = clean.slice(index);
    for (let i = 0; i < overflow.length; i += 3) {
      result += `${result.endsWith(" ") || !result ? "" : " "}${overflow.slice(i, i + 3)}`;
    }
  }
  return result.trimEnd();
}

function sampleDigits(length: number): string {
  let sample = "5";
  for (let i = 1; i < length; i += 1) {
    sample += i === 1 ? "0" : String((i - 1) % 10);
  }
  return sample;
}

/** Example written in the country's format — used as the input placeholder. */
export function nationalPlaceholder(country: PhoneCountry): string {
  const length = country.lengths?.[0] ?? 9;
  return formatNationalDigits(country, country.example ?? sampleDigits(length));
}

/** True when the digits are a plausible national number for the country. */
export function isValidNationalNumber(country: PhoneCountry, digits: string): boolean {
  const clean = digits.replace(/\D/g, "");
  if (!clean) return false;
  if (country.pattern) return new RegExp(`^(?:${country.pattern})$`).test(clean);
  if (country.lengths?.length) return country.lengths.includes(clean.length);
  return clean.length >= FALLBACK_LENGTHS[0] && clean.length <= FALLBACK_LENGTHS[1];
}

/** Caret position that keeps the cursor after the Nth typed digit. */
export function caretAfterDigits(formatted: string, digitIndex: number): number {
  if (digitIndex <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i += 1) {
    if (/\d/.test(formatted[i]!)) {
      seen += 1;
      if (seen === digitIndex) return i + 1;
    }
  }
  return formatted.length;
}

let sessionCountryCache: string | null | undefined;

/**
 * Best-effort session location: the browser time zone is the strongest signal
 * (a traveller in Dubai keeps a US keyboard layout), the language region is a
 * secondary hint. Returns `null` during SSR.
 */
export function detectSessionCountryCode(): string | null {
  if (typeof window === "undefined") return null;
  if (sessionCountryCache !== undefined) return sessionCountryCache;

  let detected: string | null = null;

  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const fromZone = timeZone ? TIME_ZONE_COUNTRY[timeZone] : undefined;
    if (fromZone && COUNTRY_BY_CODE.has(fromZone)) detected = fromZone;
  } catch {
    /* Intl unavailable — fall through to the language hint */
  }

  if (!detected) {
    try {
      const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
      for (const language of languages) {
        const region = regionFromLanguage(language);
        if (region && COUNTRY_BY_CODE.has(region)) {
          detected = region;
          break;
        }
      }
    } catch {
      /* ignore */
    }
  }

  sessionCountryCache = detected;
  return detected;
}

function regionFromLanguage(language?: string): string | null {
  if (!language) return null;
  try {
    return new Intl.Locale(language).region ?? null;
  } catch {
    const parts = language.split(/[-_]/);
    return parts[1]?.toUpperCase() ?? null;
  }
}

/** IANA zone → ISO country for the zones this platform realistically sees. */
const TIME_ZONE_COUNTRY: Record<string, string> = {
  "Asia/Dubai": "AE",
  "Asia/Muscat": "OM",
  "Asia/Riyadh": "SA",
  "Asia/Qatar": "QA",
  "Asia/Kuwait": "KW",
  "Asia/Bahrain": "BH",
  "Asia/Amman": "JO",
  "Asia/Beirut": "LB",
  "Asia/Baghdad": "IQ",
  "Asia/Damascus": "SY",
  "Asia/Aden": "YE",
  "Asia/Tehran": "IR",
  "Asia/Jerusalem": "IL",
  "Asia/Gaza": "PS",
  "Asia/Hebron": "PS",
  "Asia/Istanbul": "TR",
  "Europe/Istanbul": "TR",
  "Asia/Baku": "AZ",
  "Asia/Tbilisi": "GE",
  "Asia/Yerevan": "AM",
  "Asia/Kabul": "AF",
  "Asia/Karachi": "PK",
  "Asia/Kolkata": "IN",
  "Asia/Calcutta": "IN",
  "Asia/Dhaka": "BD",
  "Asia/Colombo": "LK",
  "Asia/Kathmandu": "NP",
  "Asia/Yangon": "MM",
  "Asia/Bangkok": "TH",
  "Asia/Ho_Chi_Minh": "VN",
  "Asia/Phnom_Penh": "KH",
  "Asia/Vientiane": "LA",
  "Asia/Kuala_Lumpur": "MY",
  "Asia/Singapore": "SG",
  "Asia/Brunei": "BN",
  "Asia/Manila": "PH",
  "Asia/Jakarta": "ID",
  "Asia/Makassar": "ID",
  "Asia/Jayapura": "ID",
  "Asia/Shanghai": "CN",
  "Asia/Chongqing": "CN",
  "Asia/Hong_Kong": "HK",
  "Asia/Macau": "MO",
  "Asia/Taipei": "TW",
  "Asia/Tokyo": "JP",
  "Asia/Seoul": "KR",
  "Asia/Pyongyang": "KP",
  "Asia/Ulaanbaatar": "MN",
  "Asia/Almaty": "KZ",
  "Asia/Aqtobe": "KZ",
  "Asia/Ashgabat": "TM",
  "Asia/Tashkent": "UZ",
  "Asia/Bishkek": "KG",
  "Asia/Dushanbe": "TJ",
  "Australia/Sydney": "AU",
  "Australia/Melbourne": "AU",
  "Australia/Brisbane": "AU",
  "Australia/Perth": "AU",
  "Australia/Adelaide": "AU",
  "Australia/Darwin": "AU",
  "Australia/Hobart": "AU",
  "Pacific/Auckland": "NZ",
  "Pacific/Fiji": "FJ",
  "Pacific/Port_Moresby": "PG",
  "Europe/London": "GB",
  "Europe/Dublin": "IE",
  "Europe/Paris": "FR",
  "Europe/Berlin": "DE",
  "Europe/Madrid": "ES",
  "Europe/Rome": "IT",
  "Europe/Amsterdam": "NL",
  "Europe/Brussels": "BE",
  "Europe/Vienna": "AT",
  "Europe/Zurich": "CH",
  "Europe/Stockholm": "SE",
  "Europe/Oslo": "NO",
  "Europe/Copenhagen": "DK",
  "Europe/Helsinki": "FI",
  "Europe/Warsaw": "PL",
  "Europe/Prague": "CZ",
  "Europe/Bratislava": "SK",
  "Europe/Budapest": "HU",
  "Europe/Bucharest": "RO",
  "Europe/Sofia": "BG",
  "Europe/Athens": "GR",
  "Europe/Lisbon": "PT",
  "Europe/Moscow": "RU",
  "Europe/Kiev": "UA",
  "Europe/Kyiv": "UA",
  "Europe/Minsk": "BY",
  "Europe/Belgrade": "RS",
  "Europe/Zagreb": "HR",
  "Europe/Ljubljana": "SI",
  "Europe/Sarajevo": "BA",
  "Europe/Skopje": "MK",
  "Europe/Tirane": "AL",
  "Europe/Podgorica": "ME",
  "Africa/Cairo": "EG",
  "Africa/Casablanca": "MA",
  "Africa/Algiers": "DZ",
  "Africa/Tunis": "TN",
  "Africa/Tripoli": "LY",
  "Africa/Khartoum": "SD",
  "Africa/Addis_Ababa": "ET",
  "Africa/Nairobi": "KE",
  "Africa/Lagos": "NG",
  "Africa/Accra": "GH",
  "Africa/Dakar": "SN",
  "Africa/Abidjan": "CI",
  "Africa/Johannesburg": "ZA",
  "Africa/Kampala": "UG",
  "Africa/Dar_es_Salaam": "TZ",
  "Africa/Kinshasa": "CD",
  "Africa/Luanda": "AO",
  "Africa/Harare": "ZW",
  "Africa/Lusaka": "ZM",
  "America/New_York": "US",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Los_Angeles": "US",
  "America/Phoenix": "US",
  "America/Anchorage": "US",
  "Pacific/Honolulu": "US",
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "America/Montreal": "CA",
  "America/Edmonton": "CA",
  "America/Winnipeg": "CA",
  "America/Mexico_City": "MX",
  "America/Sao_Paulo": "BR",
  "America/Argentina/Buenos_Aires": "AR",
  "America/Santiago": "CL",
  "America/Bogota": "CO",
  "America/Lima": "PE",
  "America/Caracas": "VE",
  "America/Panama": "PA",
  "America/Guatemala": "GT",
  "America/Costa_Rica": "CR",
  "America/Havana": "CU",
  "America/Santo_Domingo": "DO",
  "America/Puerto_Rico": "PR",
  "America/Jamaica": "JM",
  "America/Port_of_Spain": "TT",
  "America/Nassau": "BS",
  "America/Barbados": "BB",
  "America/Belize": "BZ",
  "America/El_Salvador": "SV",
  "America/Tegucigalpa": "HN",
  "America/Managua": "NI",
  "America/Asuncion": "PY",
  "America/Montevideo": "UY",
  "America/La_Paz": "BO",
  "America/Quito": "EC",
  "America/Guyana": "GY",
  "America/Paramaribo": "SR",
  "America/Cayenne": "GF",
  "America/Martinique": "MQ",
  "America/Guadeloupe": "GP",
  "America/Aruba": "AW",
  "America/Curacao": "CW",
};
