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

  // 2. Detect Neighborhood using the new helper
  const neighborhood = extractNeighborhood(line) || 'BİLİNMEYEN';
  
  // 3. Extract Street and Door Number for Google Maps
  const streetRegex = /((?:[A-ZÇĞİÖŞÜ0-9]+\s+){1,2}(?:CAD|CADDE|CD|SOK|SOKAK|SK)\.?)\s*(?:NO|NO:|N)?\s*(\d+)?/i;
  const streetMatch = upperLine.match(streetRegex);
  
  let streetQuery = '';
  if (streetMatch) {
    const streetPart = streetMatch[1].trim();
    const doorNo = streetMatch[2] ? `NO:${streetMatch[2]}` : '';
    streetQuery = `${streetPart} ${doorNo}`.trim();
  } else {
    streetQuery = upperLine.split(detectedDistrict)[0].trim();
  }

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
