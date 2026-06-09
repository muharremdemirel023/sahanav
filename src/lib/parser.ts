import { SUPPORTED_DISTRICTS } from './constants';
import type { ParsedAddress } from '@/types/address';

/**
 * Generates a unique ID with a fallback for non-secure contexts.
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Extracts neighborhood name from a given address line using flexible regex.
 * Rule: /([A-ZÇĞİÖŞÜ0-9\s]+)\s+MAH\.?/i
 */
export function extractNeighborhood(addressLine: string): string | null {
  const neighborhoodRegex = /([A-ZÇĞİÖŞÜ0-9\s]+)\s+MAH\.?/i;
  const match = addressLine.match(neighborhoodRegex);
  if (match && match[1]) {
    return match[1].trim().toUpperCase();
  }
  return null;
}

/**
 * Builds an optimized Google Maps search query based on specific navigation rules.
 * Priority: Street > Avenue. Includes Door Number. Excludes Neighborhood/Flat details.
 */
export function buildGoogleMapsQuery(line: string, detectedDistrict: string): string {
  const upperLine = line.toUpperCase().trim();
  
  // 1. Extract Door Number: NO:20, NO 20, NO:20/A, NO:113B etc.
  const doorNoRegex = /(?:NO|NO:|N)\s*(\d+(?:\/[A-Z0-9]+|[A-Z])?)/i;
  const doorNoMatch = upperLine.match(doorNoRegex);
  const doorNo = doorNoMatch ? doorNoMatch[1].trim() : "";

  // 2. Extract Street (Prioritize SOKAK/SK/SOK)
  const streetRegex = /((?:[A-ZÇĞİÖŞÜ0-9]+\s+){1,2})(?:SOKAK|SOK|SK)\.?/i;
  const streetMatch = upperLine.match(streetRegex);
  
  // 3. Extract Avenue (CADDE/CAD/CD)
  const avenueRegex = /((?:[A-ZÇĞİÖŞÜ0-9]+\s+){1,2})(?:CADDE|CAD|CD)\.?/i;
  const avenueMatch = upperLine.match(avenueRegex);

  let mainPath = "";
  if (streetMatch) {
    mainPath = `${streetMatch[1].trim()} SOKAK`;
  } else if (avenueMatch) {
    mainPath = `${avenueMatch[1].trim()} CADDESİ`;
  }

  // Fallback: if no clear street/avenue detected, use the part before district
  if (!mainPath) {
    const fallbackPath = upperLine.split(detectedDistrict)[0].trim();
    return `${fallbackPath} ${detectedDistrict} İSTANBUL`.replace(/\s+/g, ' ').trim();
  }

  const districtStr = detectedDistrict !== 'DİĞER' ? detectedDistrict : 'Sultanbeyli';
  
  // Format: [SOKAK VEYA CADDE] + [KAPI NO] + [DISTRICT] + İSTANBUL
  return `${mainPath} ${doorNo} ${districtStr} İSTANBUL`.replace(/\s+/g, ' ').trim();
}

/**
 * Groups ParsedAddress objects by neighborhood.
 */
export function groupAddressesByNeighborhood(addresses: ParsedAddress[]): Record<string, ParsedAddress[]> {
  const groups: Record<string, ParsedAddress[]> = {};
  const UNKNOWN_GROUP = "Mahalle Tespit Edilemeyenler";

  addresses.forEach((addr) => {
    const neighborhood = addr.neighborhood !== 'BİLİNMEYEN' ? `${addr.neighborhood} MAH.` : UNKNOWN_GROUP;
    if (!groups[neighborhood]) {
      groups[neighborhood] = [];
    }
    groups[neighborhood].push(addr);
  });

  return groups;
}

/**
 * Parses a single line of text into an address object.
 */
export function parseAddressLine(line: string): ParsedAddress | null {
  const upperLine = line.toUpperCase().trim();
  if (!upperLine) return null;

  // 1. Detect District
  let detectedDistrict = 'DİĞER';
  for (const district of SUPPORTED_DISTRICTS) {
    if (upperLine.includes(district)) {
      detectedDistrict = district;
      break;
    }
  }

  // 2. Detect Neighborhood
  const neighborhood = extractNeighborhood(line) || 'BİLİNMEYEN';
  
  // 3. Build optimized navigation query for Google Maps
  const streetQuery = buildGoogleMapsQuery(line, detectedDistrict);

  // Business name detection (basic)
  const businessName = line.split(/(?:CAD|SOK|MAH|NO)/i)[0].trim() || 'İşletme Adı Yok';

  return {
    id: generateId(),
    businessName,
    fullAddress: line,
    district: detectedDistrict,
    neighborhood,
    streetQuery,
  };
}

/**
 * Removes duplicate address entries.
 */
export function deduplicateAddresses(addresses: ParsedAddress[]): ParsedAddress[] {
  const seen = new Set<string>();
  return addresses.filter((addr) => {
    const key = `${addr.businessName}-${addr.fullAddress}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
