
import { SUPPORTED_DISTRICTS } from './constants';
import type { ParsedAddress } from '@/types/address';

function generateId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch (e) {}
  return 'id-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36);
}

export function extractNeighborhood(addressLine: string): string | null {
  if (!addressLine) return null;
  const normalizedLine = addressLine.replace(/\s+/g, ' ').trim();
  const upperLine = normalizedLine.toUpperCase();
  const mahIndex = upperLine.indexOf(" MAH");
  if (mahIndex === -1) return null;

  let neighborhoodPart = normalizedLine.substring(0, mahIndex).trim();
  neighborhoodPart = neighborhoodPart.replace(/(?:NO[:\/\-\s]*\d+)/gi, '');
  neighborhoodPart = neighborhoodPart.replace(/^\d+[\s\.\-]*/, '');
  neighborhoodPart = neighborhoodPart.replace(/[\.\,\-\/]/g, ' ');
  
  const words = neighborhoodPart.trim().split(/\s+/);
  if (words.length === 0) return null;

  const prefixes = ["YENİ", "ESKİ", "YUKARI", "AŞAĞI", "BÜYÜK", "KÜÇÜK", "ORTA"];
  const lastWord = words[words.length - 1].toUpperCase();
  const prevWord = words.length > 1 ? words[words.length - 2].toUpperCase() : "";

  let result = lastWord;
  if (prefixes.includes(prevWord)) {
    result = `${prevWord} ${lastWord}`;
  }

  if (result.length > 2 && result.length < 35 && !/^\d+$/.test(result)) {
    return result;
  }
  return null;
}

export function buildGoogleMapsQuery(line: string, detectedDistrict: string): string {
  const upperLine = line.toUpperCase().trim();
  const doorNoMatch = upperLine.match(/(?:NO|NO:|N)\s*(\d+(?:\/[A-Z0-9]+|[A-Z])?)/i);
  const doorNo = doorNoMatch ? doorNoMatch[1].trim() : "";
  const streetMatch = upperLine.match(/((?:[A-ZÇĞİÖŞÜ0-9]+\s+){1,2})(?:SOKAK|SOK|SK)\.?/i);
  const avenueMatch = upperLine.match(/((?:[A-ZÇĞİÖŞÜ0-9]+\s+){1,2})(?:CADDE|CAD|CD)\.?/i);

  let mainPath = streetMatch ? `${streetMatch[1].trim()} SOKAK` : avenueMatch ? `${avenueMatch[1].trim()} CADDESİ` : "";
  if (!mainPath) return `${upperLine.split(/(?:MAH|İSTANBUL)/i)[0].trim()} ${detectedDistrict} İSTANBUL`.replace(/\s+/g, ' ').trim();

  const districtStr = detectedDistrict !== 'DİĞER' ? detectedDistrict : 'SULTANBEYLİ';
  return `${mainPath} ${doorNo} ${districtStr} İSTANBUL`.replace(/\s+/g, ' ').trim();
}

export function groupAddressesByNeighborhood(addresses: ParsedAddress[]): Record<string, ParsedAddress[]> {
  const groups: Record<string, ParsedAddress[]> = {};
  addresses.forEach((addr) => {
    const name = addr.neighborhood && addr.neighborhood !== 'BİLİNMEYEN' ? addr.neighborhood.trim().toUpperCase() : null;
    const key = name ? `${name} MAH.` : "Mahalle Belirsiz";
    if (!groups[key]) groups[key] = [];
    groups[key].push(addr);
  });
  const sorted: Record<string, ParsedAddress[]> = {};
  Object.keys(groups).sort().forEach(k => sorted[k] = groups[k]);
  return sorted;
}

export function parseAddressLine(line: string): ParsedAddress | null {
  const cleanLine = line.replace(/\s+/g, ' ').trim();
  if (!cleanLine || cleanLine.length < 15) return null;
  const upperLine = cleanLine.toUpperCase();

  let district = 'DİĞER';
  for (const d of SUPPORTED_DISTRICTS) { if (upperLine.includes(d)) { district = d; break; } }

  const nh = extractNeighborhood(cleanLine) || 'BİLİNMEYEN';
  const query = buildGoogleMapsQuery(cleanLine, district);
  const parts = cleanLine.split(/(?:MAHALLE|MAH\.|CAD|SOK|NO|SK)/i);
  let bizName = (parts[0] && parts[0].trim()) || 'İşletme Adı Yok';
  bizName = bizName.replace(/^(?:NO[:\s\-\/]*\d+)/gi, '').replace(/^\d+[\s\.\-]*/, '').trim();

  return {
    id: generateId(),
    businessName: bizName.length > 2 ? bizName : 'İşletme Adı Yok',
    fullAddress: cleanLine,
    district: district,
    neighborhood: nh.toUpperCase(),
    streetQuery: query,
    visited: false,
  };
}

export function deduplicateAddresses(addresses: ParsedAddress[]): ParsedAddress[] {
  const seen = new Set<string>();
  return addresses.filter((addr) => {
    const key = addr.fullAddress.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
