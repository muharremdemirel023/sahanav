
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
    // Fallback if randomUUID is not available
  }
  return 'id-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36);
}

/**
 * Extracts neighborhood name from a given address line using flexible regex.
 * Rule: /([A-ZÇĞİÖŞÜ0-9\s]+)\s+MAH\.?/i
 */
export function extractNeighborhood(addressLine: string): string | null {
  const neighborhoodRegex = /([A-ZÇĞİÖŞÜ0-9\s]+)\s+MAH\.?/i;
  const match = addressLine.match(neighborhoodRegex);
  if (match && match[1]) {
    const name = match[1].trim().toUpperCase();
    // Prevent common false positives and ensure it's not too long/short
    if (name.length > 2 && name.length < 30) return name;
  }
  return null;
}

/**
 * Builds an optimized Google Maps search query based on navigation rules.
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
    const parts = upperLine.split(/(?:MAH|İSTANBUL)/i);
    const fallbackPath = parts[0].trim();
    return `${fallbackPath} ${detectedDistrict} İSTANBUL`.replace(/\s+/g, ' ').trim();
  }

  const districtStr = detectedDistrict !== 'DİĞER' ? detectedDistrict : 'SULTANBEYLİ';
  
  // Format: [SOKAK VEYA CADDE] + [KAPI NO] + [DISTRICT] + İSTANBUL
  const doorNoStr = doorNo ? doorNo : "";
  return `${mainPath} ${doorNoStr} ${districtStr} İSTANBUL`.replace(/\s+/g, ' ').trim();
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
  const cleanLine = line.trim();
  // Basic filter for noise (often found in PDFs)
  if (!cleanLine || cleanLine.length < 15) return null;

  const upperLine = cleanLine.toUpperCase();

  // 1. Detect District
  let detectedDistrict = 'DİĞER';
  for (const district of SUPPORTED_DISTRICTS) {
    if (upperLine.includes(district)) {
      detectedDistrict = district;
      break;
    }
  }

  // 2. Detect Neighborhood
  const neighborhood = extractNeighborhood(cleanLine) || 'BİLİNMEYEN';
  
  // 3. Build optimized navigation query for Google Maps
  const streetQuery = buildGoogleMapsQuery(cleanLine, detectedDistrict);

  // Business name detection
  // PDF extract might contain headers, try to isolate the business name
  // It's usually the first part of the line before common address indicators
  const businessParts = cleanLine.split(/(?:MAHALLE|MAH\.|CAD|SOK|NO|SOK|SK)/i);
  let businessName = (businessParts[0] && businessParts[0].trim()) || 'İşletme Adı Yok';
  
  // Clean up common PDF noise from business name
  businessName = businessName.replace(/^\d+[\.\s-]/, '').trim(); 

  return {
    id: generateId(),
    businessName: businessName.length > 2 ? businessName : 'İşletme Adı Yok',
    fullAddress: cleanLine,
    district: detectedDistrict,
    neighborhood,
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
    // Normalize address for more accurate deduplication
    const key = addr.fullAddress.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
