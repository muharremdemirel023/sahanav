import { SUPPORTED_DISTRICTS } from './constants';
import type { ParsedAddress } from '@/types/address';

/**
 * Parses a single line of text into an address object using client-side logic.
 * Specifically refined to isolate Street and Door Number for Google Maps.
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

  // 2. Detect Neighborhood (for UI display)
  const neighborhoodRegex = /([A-ZÇĞİÖŞÜ0-9\s]+)\s+(MAH|MAH\.|MAHALLESİ|MAHALLESI)/;
  const neighborhoodMatch = upperLine.match(neighborhoodRegex);
  let neighborhood = neighborhoodMatch ? neighborhoodMatch[1].trim() : 'BİLİNMEYEN';
  
  // 3. Extract Street and Door Number for Google Maps
  // This regex targets 1-2 words before the street keyword (CAD/SOK/SK), 
  // and captures the door number after optional NO/NO: markers.
  const streetRegex = /((?:[A-ZÇĞİÖŞÜ0-9]+\s+){1,2}(?:CAD|CADDE|CD|SOK|SOKAK|SK)\.?)\s*(?:NO|NO:|N)?\s*(\d+)?/i;
  const streetMatch = upperLine.match(streetRegex);
  
  let streetQuery = '';
  if (streetMatch) {
    const streetPart = streetMatch[1].trim();
    const doorNo = streetMatch[2] ? `NO:${streetMatch[2]}` : '';
    streetQuery = `${streetPart} ${doorNo}`.trim();
  } else {
    // Fallback: Use the part before the district if specific keywords aren't isolated
    streetQuery = upperLine.split(detectedDistrict)[0].trim();
  }

  // 4. Extract business name (heuristic: assumes it's at the start)
  const businessName = line.split(/(?:CAD|SOK|MAH|NO)/i)[0].trim() || 'İşletme Adı Yok';

  return {
    id: crypto.randomUUID(),
    businessName,
    fullAddress: line,
    district: detectedDistrict,
    neighborhood,
    streetQuery,
  };
}

/**
 * Removes duplicate address entries based on business name and full address string.
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
