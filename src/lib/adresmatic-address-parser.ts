export interface ParsedAdresMaticAddress {
  id: string;
  rawLine: string;
  name: string;
  fullAddress: string;
  streetOrAvenue: string;
  doorNumber: string;
  doorNumberNumeric: number | null;
  oddOrEven: "Tek" | "Cift" | "Bilinmiyor";
  confidence: "high" | "medium" | "low";
  warning?: string;
  isCompleted?: boolean;
}

const ADRESMATIC_STREET_KEYWORDS = ["s", "s.", "sk", "sk.", "sok", "sok.", "sokak"];
const ADRESMATIC_AVENUE_KEYWORDS = ["c", "c.", "cad", "cad.", "cadde", "cd", "cd.", "caddesi"];
const ADRESMATIC_BOULEVARD_KEYWORDS = ["blv", "blv.", "bulvar", "bulvari", "bulvari"];
const ADRESMATIC_PATH_KEYWORDS = [
  ...ADRESMATIC_STREET_KEYWORDS,
  ...ADRESMATIC_AVENUE_KEYWORDS,
  ...ADRESMATIC_BOULEVARD_KEYWORDS,
];
const ADRESMATIC_PATH_WORDS = new Set(
  ADRESMATIC_PATH_KEYWORDS.map((keyword) => keyword.replace(".", "").toLocaleLowerCase("tr-TR"))
);
const ADRESMATIC_BOUNDARY_WORDS = new Set([
  "mah",
  "mah.",
  "m",
  "m.",
  "mh",
  "mh.",
  "mahalle",
  "mahallesi",
  "no",
  "no:",
  "n:",
  "numara",
  "kapi",
  "kap\u0131",
  "daire",
  "kat",
]);

function createAdresMaticId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch (error) {}

  return `adresmatic-${Math.random().toString(36).slice(2, 11)}-${Date.now().toString(36)}`;
}

function cleanAdresMaticAddressToken(token: string): string {
  return token.replace(/^[,.;:]+|[,.;:]+$/g, "");
}

function normalizeAdresMaticAddressToken(token: string): string {
  return cleanAdresMaticAddressToken(token).toLocaleLowerCase("tr-TR").replace(/\.$/, "");
}

function canonicalizeAdresMaticPathName(pathName: string): string {
  const tokens = pathName.split(/\s+/).filter(Boolean);
  const typeToken = tokens.pop();
  if (!typeToken) return pathName.toLocaleUpperCase("tr-TR");

  const normalizedType = normalizeAdresMaticAddressToken(typeToken);
  const base = tokens.join(" ").toLocaleUpperCase("tr-TR").trim();
  const prefix = base ? `${base} ` : "";

  if (ADRESMATIC_AVENUE_KEYWORDS.map((keyword) => keyword.replace(".", "")).includes(normalizedType)) {
    return `${prefix}CADDES\u0130`;
  }

  if (ADRESMATIC_STREET_KEYWORDS.map((keyword) => keyword.replace(".", "")).includes(normalizedType)) {
    return `${prefix}SOKAK`;
  }

  if (ADRESMATIC_BOULEVARD_KEYWORDS.map((keyword) => keyword.replace(".", "")).includes(normalizedType)) {
    return `${prefix}BULVARI`;
  }

  return pathName.toLocaleUpperCase("tr-TR");
}

function extractAdresMaticStreetOrAvenue(fullAddress: string): string {
  const tokens = fullAddress.split(/\s+/).map(cleanAdresMaticAddressToken).filter(Boolean);
  let bestMatch = "";

  for (let index = 0; index < tokens.length; index++) {
    const normalized = normalizeAdresMaticAddressToken(tokens[index]);
    if (!ADRESMATIC_PATH_WORDS.has(normalized)) continue;

    let start = index;
    for (let previousIndex = index - 1; previousIndex >= 0; previousIndex--) {
      const previous = normalizeAdresMaticAddressToken(tokens[previousIndex]);
      if (ADRESMATIC_BOUNDARY_WORDS.has(previous) || ADRESMATIC_PATH_WORDS.has(previous)) break;
      start = previousIndex;
    }

    bestMatch = canonicalizeAdresMaticPathName(tokens.slice(start, index + 1).join(" "));
  }

  return bestMatch;
}

export function hasAdresMaticStreetMarker(address: ParsedAdresMaticAddress): boolean {
  return /\b(?:SOKAK|SOK|SK|S)(?:\.|\b)/i.test(address.fullAddress);
}

export function getAdresMaticStreetInfo(address: ParsedAdresMaticAddress): string {
  const match = address.fullAddress
    .toLocaleUpperCase("tr-TR")
    .match(/((?:[\p{L}0-9]+\s+){0,3})(SOKAK|SOK|SK|S)(?:\.|\b)/iu);

  if (!match) return "";

  return `${match[1] ?? ""}${match[2]}`.replace(/\s+/g, " ").trim();
}

export function parseAdresMaticAddress(rawLine: string): ParsedAdresMaticAddress {
  const parts = rawLine.split(/\t|;| - | {2,}| \| /).map((part) => part.trim());

  let name = parts[0] || "Isimsiz";
  let fullAddress = parts[1] || parts[0] || "";

  if (parts.length === 1 && rawLine.includes(",")) {
    const commaParts = rawLine.split(",");
    name = commaParts[0].trim();
    fullAddress = commaParts.slice(1).join(",").trim();
  }

  let streetOrAvenue = "";
  let doorNumber = "";
  let doorNumberNumeric: number | null = null;
  let confidence: ParsedAdresMaticAddress["confidence"] = "low";
  let warning = "";

  const streetRegex = new RegExp(
    `([^,.]+?\\s+(${ADRESMATIC_PATH_KEYWORDS.map((keyword) => keyword.replace(".", "\\.")).join("|")}))`,
    "i"
  );
  const streetMatch = fullAddress.match(streetRegex);
  const extractedStreetOrAvenue = extractAdresMaticStreetOrAvenue(fullAddress);

  if (extractedStreetOrAvenue) {
    streetOrAvenue = extractedStreetOrAvenue;
    confidence = "medium";
  } else if (streetMatch) {
    streetOrAvenue = streetMatch[1].trim().toLocaleUpperCase("tr-TR");
    confidence = "medium";
  }

  const noMatch = fullAddress.match(/(?:no|n|numara)[:.\s]*(\d+[\/\-a-z]*)(\s|$|,)/i);
  if (noMatch) {
    doorNumber = noMatch[1].trim();
  } else {
    const standaloneMatch = fullAddress.match(/\s(\d+[\/\-a-z]*)(\s|$|,)/i);
    if (standaloneMatch) {
      doorNumber = standaloneMatch[1].trim();
    }
  }

  if (doorNumber) {
    doorNumber = doorNumber.split(/[ ,/]/)[0].toLocaleUpperCase("tr-TR");
    const numericPart = doorNumber.match(/\d+/);
    if (numericPart) {
      doorNumberNumeric = Number.parseInt(numericPart[0], 10);
      confidence = streetOrAvenue ? "high" : "medium";
    }
  }

  let oddOrEven: ParsedAdresMaticAddress["oddOrEven"] = "Bilinmiyor";
  if (doorNumberNumeric !== null) {
    oddOrEven = doorNumberNumeric % 2 === 0 ? "Cift" : "Tek";
  } else {
    warning = "Kapi numarasi bulunamadi.";
    confidence = "low";
  }

  if (!streetOrAvenue) {
    warning = warning ? `${warning} Cadde/Sokak bulunamadi.` : "Cadde/Sokak bulunamadi.";
    streetOrAvenue = "TESPIT EDILEMEYEN SOKAK";
  }

  return {
    id: createAdresMaticId(),
    rawLine,
    name,
    fullAddress,
    streetOrAvenue,
    doorNumber,
    doorNumberNumeric,
    oddOrEven,
    confidence,
    warning,
    isCompleted: false,
  };
}
