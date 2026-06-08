import { SUPPORTED_DISTRICTS } from './constants';
import type { ParsedAddress } from '@/types/address';

/**
 * Parses a single line of text into an address object using client-side logic.
 * No external API or AI calls are made.
 */
export function parseAddressLine(line: string): ParsedAddress | null {
  const upperLine = line.toUpperCase().trim();
  if (!upperLine) return null;

  // 1. Detect District (from predefined list)
  let detectedDistrict = 'DİĞER';
  for (const district of SUPPORTED_DISTRICTS) {
    if (upperLine.includes(district)) {
      detectedDistrict = district;
      break;
    }
  }

  // 2. Detect Neighborhood (Regex-based search for "MAH." variants)
  const neighborhoodRegex = /([A-ZÇĞİÖŞÜ\s0-9]+)\s+(MAH|MAH\.|MAHALLESİ|MAHALLESI)/;
  const neighborhoodMatch = upperLine.match(neighborhoodRegex);
  let neighborhood = neighborhoodMatch ? neighborhoodMatch[1].trim() : 'BİLİNMEYEN';

  // 3. Extract Street/No for Google Maps query
  // Looks for common abbreviations: CAD, CADDE, CD, SOK, SOKAK, SK
  const streetRegex = /(?:([A-ZÇĞİÖŞÜ\s0-9]+)\s+(?:CAD|CADDE|CD|SOK|SOKAK|SK)\.?)\s*(?:NO|NO:|N)?\s*(\d+)?/i;
  const streetMatch = line.match(streetRegex);
  
  let streetQuery = '';
  if (streetMatch) {
    streetQuery = `${streetMatch[0].trim()}`;
  } else {
    // Fallback: take part before district name if specific street indicators aren't found
    streetQuery = line.split(detectedDistrict)[0].trim();
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
