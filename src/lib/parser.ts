import { SUPPORTED_DISTRICTS } from './constants';
import type { ParsedAddress } from '@/types/address';

/**
 * Generates a unique ID with a robust fallback for non-secure contexts.
 */
function generateId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch (e) {
    // Fallback
  }
  return 'id-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36);
}

/**
 * Extracts neighborhood name from a given address line using flexible regex and cleaning rules.
 * Rule: /([A-ZÇĞİÖŞÜ0-9\s]+)\s+MAH\.?/i
 */
export function extractNeighborhood(addressLine: string): string | null {
  if (!addressLine) return null;

  // 1. Normalize spaces and find the part before " MAH"
  const normalizedLine = addressLine.replace(/\s+/g, ' ').trim();
  const upperLine = normalizedLine.toUpperCase();
  const mahIndex = upperLine.indexOf(" MAH");
  
  if (mahIndex === -1) return null;

  // 2. Extract the potential neighborhood string before "MAH"
  let neighborhoodPart = normalizedLine.substring(0, mahIndex).trim();

  // 3. Apply cleaning rules:
  // - Remove "NO:", "NO", "NO/", "NO-" and following digits
  neighborhoodPart = neighborhoodPart.replace(/(?:NO[:\/\-\s]*\d+)/gi, '');
  
  // - Remove leading numbers at the start of the segment
  neighborhoodPart = neighborhoodPart.replace(/^\d+[\s\.\-]*/, '');
  
  // - Remove standalone numbers and special characters that might be left
  neighborhoodPart = neighborhoodPart.replace(/[\.\,\-\/]/g, ' ');
  
  // - Normalize spaces again after cleaning
  const words = neighborhoodPart.trim().split(/\s+/);
  
  if (words.length === 0) return null;

  // 4. Extract the neighborhood name (usually the last 1-2 words before "MAH")
  // Common multi-word neighborhood prefixes in Turkish
  const neighborhoodPrefixes = ["YENİ", "ESKİ", "YUKARI", "AŞAĞI", "BÜYÜK", "KÜÇÜK", "ORTA"];
  
  const lastWord = words[words.length - 1].toUpperCase();
  const prevWord = words.length > 1 ? words[words.length - 2].toUpperCase() : "";

  let result = lastWord;
  if (neighborhoodPrefixes.includes(prevWord)) {
    result = `${prevWord} ${lastWord}`;
  }

  // Final check for length and valid content
  if (result.length > 2 && result.length < 35 && !/^\d+$/.test(result)) {
    return result;
  }

  return null;
}

/**
 * Builds an optimized Google Maps search query based on navigation rules.
 */
export function buildGoogleMapsQuery(line: string, detectedDistrict: string): string {
  const upperLine = line.toUpperCase().trim();
  
  const doorNoRegex = /(?:NO|NO:|N)\s*(\d+(?:\/[A-Z0-9]+|[A-Z])?)/i;
  const doorNoMatch = upperLine.match(doorNoRegex);
  const doorNo = doorNoMatch ? doorNoMatch[1].trim() : "";

  const streetRegex = /((?:[A-ZÇĞİÖŞÜ0-9]+\s+){1,2})(?:SOKAK|SOK|SK)\.?/i;
  const streetMatch = upperLine.match(streetRegex);
  
  const avenueRegex = /((?:[A-ZÇĞİÖŞÜ0-9]+\s+){1,2})(?:CADDE|CAD|CD)\.?/i;
  const avenueMatch = upperLine.match(avenueRegex);

  let mainPath = "";
  if (streetMatch) {
    mainPath = `${streetMatch[1].trim()} SOKAK`;
  } else if (avenueMatch) {
    mainPath = `${avenueMatch[1].trim()} CADDESİ`;
  }

  if (!mainPath) {
    const parts = upperLine.split(/(?:MAH|İSTANBUL)/i);
    const fallbackPath = parts[0].trim();
    return `${fallbackPath} ${detectedDistrict} İSTANBUL`.replace(/\s+/g, ' ').trim();
  }

  const districtStr = detectedDistrict !== 'DİĞER' ? detectedDistrict : 'SULTANBEYLİ';
  const doorNoStr = doorNo ? doorNo : "";
  return `${mainPath} ${doorNoStr} ${districtStr} İSTANBUL`.replace(/\s+/g, ' ').trim();
}

/**
 * Groups ParsedAddress objects by neighborhood.
 * Ensures consistent key normalization to prevent duplicate group items.
 */
export function groupAddressesByNeighborhood(addresses: ParsedAddress[]): Record<string, ParsedAddress[]> {
  const groups: Record<string, ParsedAddress[]> = {};
  const UNKNOWN_GROUP = "Mahalle Tespit Edilemeyenler";

  addresses.forEach((addr) => {
    // Strict normalization: trim and uppercase
    const neighborhoodName = addr.neighborhood && addr.neighborhood !== 'BİLİNMEYEN' 
      ? addr.neighborhood.trim().toUpperCase() 
      : null;
    
    const groupKey = neighborhoodName ? `${neighborhoodName} MAH.` : UNKNOWN_GROUP;
    
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(addr);
  });

  // Sort groups by name
  const sortedKeys = Object.keys(groups).sort();
  const sortedGroups: Record<string, ParsedAddress[]> = {};
  sortedKeys.forEach(key => {
    sortedGroups[key] = groups[key];
  });

  return sortedGroups;
}

/**
 * Parses a single line of text into an address object.
 */
export function parseAddressLine(line: string): ParsedAddress | null {
  const cleanLine = line.replace(/\s+/g, ' ').trim();
  if (!cleanLine || cleanLine.length < 15) return null;

  const upperLine = cleanLine.toUpperCase();

  let detectedDistrict = 'DİĞER';
  for (const district of SUPPORTED_DISTRICTS) {
    if (upperLine.includes(district)) {
      detectedDistrict = district;
      break;
    }
  }

  const neighborhood = extractNeighborhood(cleanLine) || 'BİLİNMEYEN';
  const streetQuery = buildGoogleMapsQuery(cleanLine, detectedDistrict);

  // Business name extraction: take part before first major address marker
  const businessParts = cleanLine.split(/(?:MAHALLE|MAH\.|CAD|SOK|NO|SOK|SK)/i);
  let businessName = (businessParts[0] && businessParts[0].trim()) || 'İşletme Adı Yok';
  
  // Remove leading numbers and "NO" from business name if it started with them
  businessName = businessName.replace(/^(?:NO[:\s\-\/]*\d+)/gi, '').replace(/^\d+[\s\.\-]*/, '').trim();

  return {
    id: generateId(),
    businessName: businessName.length > 2 ? businessName : 'İşletme Adı Yok',
    fullAddress: cleanLine,
    district: detectedDistrict,
    neighborhood: neighborhood.toUpperCase(),
    streetQuery,
    visited: false,
  };
}

/**
 * Removes duplicate address entries based on normalized address string.
 */
export function deduplicateAddresses(addresses: ParsedAddress[]): ParsedAddress[] {
  const seen = new Set<string>();
  return addresses.filter((addr) => {
    const key = addr.fullAddress.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
