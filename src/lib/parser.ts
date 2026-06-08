import { SUPPORTED_DISTRICTS } from './constants';
import type { ParsedAddress } from '@/types/address';

export function parseAddressLine(line: string): ParsedAddress | null {
  const upperLine = line.toUpperCase().trim();
  if (!upperLine) return null;

  // 1. Detect District
  let detectedDistrict = '';
  for (const district of SUPPORTED_DISTRICTS) {
    if (upperLine.includes(district)) {
      detectedDistrict = district;
      break;
    }
  }

  // 2. Detect Neighborhood (Regex-based)
  // Look for something like "ABDURRAHMANGAZİ MAH." or "ABDURRAHMANGAZİ MAHALLESİ"
  const neighborhoodRegex = /([A-ZÇĞİÖŞÜ\s]+)\s+(MAH|MAH\.|MAHALLESİ|MAHALLESI)/;
  const neighborhoodMatch = upperLine.match(neighborhoodRegex);
  let neighborhood = neighborhoodMatch ? neighborhoodMatch[1].trim() : 'BİLİNMEYEN';

  // 3. Extract Street/No for Google Maps
  // Look for CAD, CADDE, CD, SOK, SOKAK, SK and NO/NO:
  const streetRegex = /(?:([A-ZÇĞİÖŞÜ\s0-9]+)\s+(?:CAD|CADDE|CD|SOK|SOKAK|SK)\.?)\s*(?:NO|NO:|N)?\s*(\d+)?/i;
  const streetMatch = line.match(streetRegex);
  
  let streetQuery = '';
  if (streetMatch) {
    streetQuery = `${streetMatch[0].trim()}`;
  } else {
    // Fallback logic from proposal
    streetQuery = line.split(detectedDistrict)[0].trim();
  }

  // 4. Try to isolate business name (usually at start)
  // Rough heuristic: part before address indicators
  const businessName = line.split(/(?:CAD|SOK|MAH|NO)/i)[0].trim() || 'İşletme Adı Yok';

  return {
    id: crypto.randomUUID(),
    businessName,
    fullAddress: line,
    district: detectedDistrict || 'DİĞER',
    neighborhood,
    streetQuery,
  };
}

export function deduplicateAddresses(addresses: ParsedAddress[]): ParsedAddress[] {
  const seen = new Set<string>();
  return addresses.filter((addr) => {
    const key = `${addr.businessName}-${addr.fullAddress}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
