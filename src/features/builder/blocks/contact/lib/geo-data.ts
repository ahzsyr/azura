export type GeoOption = { value: string; label: string };

/** ISO country codes used by contact location selectors. */
export const CONTACT_COUNTRIES: GeoOption[] = [
  { value: "AE", label: "United Arab Emirates" },
  { value: "SA", label: "Saudi Arabia" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "IN", label: "India" },
  { value: "SG", label: "Singapore" },
  { value: "EG", label: "Egypt" },
  { value: "JO", label: "Jordan" },
  { value: "KW", label: "Kuwait" },
  { value: "QA", label: "Qatar" },
  { value: "BH", label: "Bahrain" },
  { value: "OM", label: "Oman" },
  { value: "TR", label: "Turkey" },
  { value: "NL", label: "Netherlands" },
  { value: "ES", label: "Spain" },
  { value: "IT", label: "Italy" },
];

/** Cities keyed by ISO country code. */
export const CONTACT_CITIES_BY_COUNTRY: Record<string, GeoOption[]> = {
  AE: [
    { value: "dubai", label: "Dubai" },
    { value: "abu-dhabi", label: "Abu Dhabi" },
    { value: "sharjah", label: "Sharjah" },
    { value: "ajman", label: "Ajman" },
    { value: "ras-al-khaimah", label: "Ras Al Khaimah" },
  ],
  SA: [
    { value: "riyadh", label: "Riyadh" },
    { value: "jeddah", label: "Jeddah" },
    { value: "dammam", label: "Dammam" },
    { value: "mecca", label: "Mecca" },
    { value: "medina", label: "Medina" },
  ],
  US: [
    { value: "new-york", label: "New York" },
    { value: "los-angeles", label: "Los Angeles" },
    { value: "chicago", label: "Chicago" },
    { value: "houston", label: "Houston" },
    { value: "miami", label: "Miami" },
    { value: "manchester-nh", label: "Manchester, NH" },
  ],
  GB: [
    { value: "london", label: "London" },
    { value: "manchester", label: "Manchester" },
    { value: "birmingham", label: "Birmingham" },
    { value: "edinburgh", label: "Edinburgh" },
  ],
  CA: [
    { value: "toronto", label: "Toronto" },
    { value: "vancouver", label: "Vancouver" },
    { value: "montreal", label: "Montreal" },
  ],
  AU: [
    { value: "sydney", label: "Sydney" },
    { value: "melbourne", label: "Melbourne" },
    { value: "brisbane", label: "Brisbane" },
  ],
  DE: [
    { value: "berlin", label: "Berlin" },
    { value: "munich", label: "Munich" },
    { value: "hamburg", label: "Hamburg" },
  ],
  FR: [
    { value: "paris", label: "Paris" },
    { value: "lyon", label: "Lyon" },
    { value: "marseille", label: "Marseille" },
  ],
  IN: [
    { value: "mumbai", label: "Mumbai" },
    { value: "delhi", label: "Delhi" },
    { value: "bangalore", label: "Bangalore" },
  ],
  SG: [{ value: "singapore", label: "Singapore" }],
  EG: [
    { value: "cairo", label: "Cairo" },
    { value: "alexandria", label: "Alexandria" },
  ],
  JO: [{ value: "amman", label: "Amman" }],
  KW: [{ value: "kuwait-city", label: "Kuwait City" }],
  QA: [{ value: "doha", label: "Doha" }],
  BH: [{ value: "manama", label: "Manama" }],
  OM: [{ value: "muscat", label: "Muscat" }],
  TR: [
    { value: "istanbul", label: "Istanbul" },
    { value: "ankara", label: "Ankara" },
  ],
  NL: [
    { value: "amsterdam", label: "Amsterdam" },
    { value: "rotterdam", label: "Rotterdam" },
  ],
  ES: [
    { value: "madrid", label: "Madrid" },
    { value: "barcelona", label: "Barcelona" },
  ],
  IT: [
    { value: "rome", label: "Rome" },
    { value: "milan", label: "Milan" },
  ],
};

const COUNTRY_LABELS: Record<string, Partial<Record<"en" | "ar" | "id", string>>> = {
  AE: { en: "United Arab Emirates", ar: "الإمارات العربية المتحدة", id: "Uni Emirat Arab" },
  SA: { en: "Saudi Arabia", ar: "المملكة العربية السعودية", id: "Arab Saudi" },
  US: { en: "United States", ar: "الولايات المتحدة", id: "Amerika Serikat" },
  GB: { en: "United Kingdom", ar: "المملكة المتحدة", id: "Britania Raya" },
  CA: { en: "Canada", ar: "كندا", id: "Kanada" },
  AU: { en: "Australia", ar: "أستراليا", id: "Australia" },
  DE: { en: "Germany", ar: "ألمانيا", id: "Jerman" },
  FR: { en: "France", ar: "فرنسا", id: "Prancis" },
  IN: { en: "India", ar: "الهند", id: "India" },
  SG: { en: "Singapore", ar: "سنغافورة", id: "Singapura" },
  EG: { en: "Egypt", ar: "مصر", id: "Mesir" },
  JO: { en: "Jordan", ar: "الأردن", id: "Yordania" },
  KW: { en: "Kuwait", ar: "الكويت", id: "Kuwait" },
  QA: { en: "Qatar", ar: "قطر", id: "Qatar" },
  BH: { en: "Bahrain", ar: "البحرين", id: "Bahrain" },
  OM: { en: "Oman", ar: "عمان", id: "Oman" },
  TR: { en: "Turkey", ar: "تركيا", id: "Turki" },
  NL: { en: "Netherlands", ar: "هولندا", id: "Belanda" },
  ES: { en: "Spain", ar: "إسبانيا", id: "Spanyol" },
  IT: { en: "Italy", ar: "إيطاليا", id: "Italia" },
};

const CITY_LABELS: Record<string, Partial<Record<"en" | "ar" | "id", string>>> = {
  dubai: { en: "Dubai", ar: "دبي", id: "Dubai" },
  "abu-dhabi": { en: "Abu Dhabi", ar: "أبو ظبي", id: "Abu Dhabi" },
  sharjah: { en: "Sharjah", ar: "الشارقة", id: "Sharjah" },
  ajman: { en: "Ajman", ar: "عجمان", id: "Ajman" },
  "ras-al-khaimah": { en: "Ras Al Khaimah", ar: "رأس الخيمة", id: "Ras Al Khaimah" },
  riyadh: { en: "Riyadh", ar: "الرياض", id: "Riyadh" },
  jeddah: { en: "Jeddah", ar: "جدة", id: "Jeddah" },
  dammam: { en: "Dammam", ar: "الدمام", id: "Dammam" },
  mecca: { en: "Mecca", ar: "مكة", id: "Mekkah" },
  medina: { en: "Medina", ar: "المدينة", id: "Madinah" },
  "new-york": { en: "New York", ar: "نيويورك", id: "New York" },
  "los-angeles": { en: "Los Angeles", ar: "لوس أنجلوس", id: "Los Angeles" },
  chicago: { en: "Chicago", ar: "شيكاغو", id: "Chicago" },
  houston: { en: "Houston", ar: "هيوستن", id: "Houston" },
  miami: { en: "Miami", ar: "ميامي", id: "Miami" },
  "manchester-nh": { en: "Manchester, NH", ar: "مانشستر، نيوهامبشاير", id: "Manchester, NH" },
  london: { en: "London", ar: "لندن", id: "London" },
  manchester: { en: "Manchester", ar: "مانشستر", id: "Manchester" },
  birmingham: { en: "Birmingham", ar: "برمنغهام", id: "Birmingham" },
  edinburgh: { en: "Edinburgh", ar: "إدنبرة", id: "Edinburgh" },
  toronto: { en: "Toronto", ar: "تورونتو", id: "Toronto" },
  vancouver: { en: "Vancouver", ar: "فانكوفر", id: "Vancouver" },
  montreal: { en: "Montreal", ar: "مونتريال", id: "Montreal" },
  sydney: { en: "Sydney", ar: "سيدني", id: "Sydney" },
  melbourne: { en: "Melbourne", ar: "ملبورن", id: "Melbourne" },
  brisbane: { en: "Brisbane", ar: "بريسبان", id: "Brisbane" },
  berlin: { en: "Berlin", ar: "برلين", id: "Berlin" },
  munich: { en: "Munich", ar: "ميونخ", id: "Munich" },
  hamburg: { en: "Hamburg", ar: "هامبورغ", id: "Hamburg" },
  paris: { en: "Paris", ar: "باريس", id: "Paris" },
  lyon: { en: "Lyon", ar: "ليون", id: "Lyon" },
  marseille: { en: "Marseille", ar: "مرسيليا", id: "Marseille" },
  mumbai: { en: "Mumbai", ar: "مومباي", id: "Mumbai" },
  delhi: { en: "Delhi", ar: "دلهي", id: "Delhi" },
  bangalore: { en: "Bangalore", ar: "بنغالور", id: "Bangalore" },
  singapore: { en: "Singapore", ar: "سنغافورة", id: "Singapura" },
  cairo: { en: "Cairo", ar: "القاهرة", id: "Kairo" },
  alexandria: { en: "Alexandria", ar: "الإسكندرية", id: "Alexandria" },
  amman: { en: "Amman", ar: "عمّان", id: "Amman" },
  "kuwait-city": { en: "Kuwait City", ar: "مدينة الكويت", id: "Kota Kuwait" },
  doha: { en: "Doha", ar: "الدوحة", id: "Doha" },
  manama: { en: "Manama", ar: "المنامة", id: "Manama" },
  muscat: { en: "Muscat", ar: "مسقط", id: "Muscat" },
  istanbul: { en: "Istanbul", ar: "إسطنبول", id: "Istanbul" },
  ankara: { en: "Ankara", ar: "أنقرة", id: "Ankara" },
  amsterdam: { en: "Amsterdam", ar: "أمستردام", id: "Amsterdam" },
  rotterdam: { en: "Rotterdam", ar: "روتردام", id: "Rotterdam" },
  madrid: { en: "Madrid", ar: "مدريد", id: "Madrid" },
  barcelona: { en: "Barcelona", ar: "برشلونة", id: "Barcelona" },
  rome: { en: "Rome", ar: "روما", id: "Roma" },
  milan: { en: "Milan", ar: "ميلانو", id: "Milan" },
};

function normalizeGeoLocale(localeCode?: string): "en" | "ar" | "id" {
  const code = localeCode?.toLowerCase() ?? "en";
  if (code.startsWith("ar")) return "ar";
  if (code.startsWith("id")) return "id";
  return "en";
}

export function getCountryLabel(code: string): string {
  return CONTACT_COUNTRIES.find((c) => c.value === code)?.label ?? code;
}

export function getLocalizedCountryLabel(code: string, localeCode?: string): string {
  const locale = normalizeGeoLocale(localeCode);
  return COUNTRY_LABELS[code]?.[locale] ?? getCountryLabel(code);
}

export function getCityLabel(countryCode: string, cityCode: string): string {
  const cities = CONTACT_CITIES_BY_COUNTRY[countryCode] ?? [];
  return cities.find((c) => c.value === cityCode)?.label ?? cityCode;
}

export function getLocalizedCityLabel(
  countryCode: string,
  cityCode: string,
  localeCode?: string,
): string {
  const locale = normalizeGeoLocale(localeCode);
  return CITY_LABELS[cityCode]?.[locale] ?? getCityLabel(countryCode, cityCode);
}

export function citiesForCountry(countryCode: string): GeoOption[] {
  return CONTACT_CITIES_BY_COUNTRY[countryCode] ?? [];
}

export function getLocalizedCountryOptions(localeCode?: string): GeoOption[] {
  return CONTACT_COUNTRIES.map((country) => ({
    ...country,
    label: getLocalizedCountryLabel(country.value, localeCode),
  }));
}

export function getLocalizedCityOptions(countryCode: string, localeCode?: string): GeoOption[] {
  return citiesForCountry(countryCode).map((city) => ({
    ...city,
    label: getLocalizedCityLabel(countryCode, city.value, localeCode),
  }));
}
