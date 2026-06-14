
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

const SAHANAV_NEIGHBORHOOD_PREFIXES = ["YENİ", "ESKİ", "YUKARI", "AŞAĞI", "BÜYÜK", "KÜÇÜK", "ORTA"];
const SAHANAV_NEIGHBORHOOD_STOP_WORDS = new Set([
  'ADRES',
  'NO',
  'BLK',
  'BLOK',
  'DAİRE',
  'DAIRE',
  'D',
  'CAD',
  'CADDE',
  'CADDESİ',
  'CD',
  'SOK',
  'SOKAK',
  'SK',
  'MAH',
  'MH',
  'MAHALLE',
  'MAHALLESİ',
]);

function normalizeSahaNavTurkishText(value: string): string {
  return value
    .toLocaleUpperCase('tr')
    .replace(/İ/g, 'I')
    .replace(/I/g, 'I')
    .replace(/ı/g, 'I')
    .replace(/Ş/g, 'S')
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ö/g, 'O')
    .replace(/Ç/g, 'C')
    .replace(/Ä°/g, 'I')
    .replace(/Ä±/g, 'I')
    .replace(/Å/g, 'S')
    .replace(/Ä/g, 'G')
    .replace(/Ãœ/g, 'U')
    .replace(/Ã–/g, 'O')
    .replace(/Ã‡/g, 'C');
}

function stripSahaNavDirtyAddressFragments(value: string): string {
  return value
    .replace(/\b(?:D|NO|N)\s*:\s*\d+(?=[A-ZÇĞİÖŞÜ])/giu, ' ')
    .replace(/\b(?:BLK|BLOK)\s*:?\s*/giu, ' ')
    .replace(/\b(?:İÇ\s*KAPI|IC\s*KAPI)\b/giu, ' ')
    .replace(/\b(?:DAİRE|DAIRE|D|KAPI|NO|NUMARA|N)\s*:?\s*\d+[A-ZÇĞİÖŞÜ]*/giu, ' ')
    .replace(/[.\-_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitSahaNavKnownCompounds(value: string): string {
  return value
    .replace(/\b[AB](?=ATAKENT|ATATÜRK|ATATURK|İSTİKLAL|ISTIKLAL|YUKARI)/g, '')
    .replace(/\bYUKARIDUDULLU\b/g, 'YUKARI DUDULLU')
    .replace(/\bASAGIDUDULLU\b/g, 'ASAGI DUDULLU')
    .replace(/\bAŞAĞIDUDULLU\b/g, 'AŞAĞI DUDULLU')
    .replace(/\bALTINSEHIR\b/g, 'ALTIN SEHIR')
    .replace(/\bALTINŞEHİR\b/g, 'ALTIN ŞEHİR');
}

function isSahaNavMeaningfulNeighborhoodToken(token: string): boolean {
  const normalized = normalizeSahaNavTurkishText(token.replace(/[:.]/g, ''));
  if (!normalized || normalized.length < 2) return false;
  if (/^\d+$/.test(normalized)) return false;
  return !SAHANAV_NEIGHBORHOOD_STOP_WORDS.has(normalized);
}

function cleanSahaNavNeighborhoodCandidate(value: string): string {
  let cleaned = stripSahaNavDirtyAddressFragments(value)
    .replace(/\b(?:MAHALLESI|MAHALLESİ|MAHALLE|MAH|MH|M)\b/giu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  cleaned = splitSahaNavKnownCompounds(cleaned.toLocaleUpperCase('tr'));

  const tokens = cleaned.split(/\s+/).filter(isSahaNavMeaningfulNeighborhoodToken);
  if (tokens.length === 0) return '';

  const normalizedTokens = tokens.map(normalizeSahaNavTurkishText);
  const normalizedPrefixes = SAHANAV_NEIGHBORHOOD_PREFIXES.map(normalizeSahaNavTurkishText);
  let prefixIndex = -1;
  for (let index = normalizedTokens.length - 1; index >= 0; index--) {
    if (normalizedPrefixes.includes(normalizedTokens[index])) {
      prefixIndex = index;
      break;
    }
  }

  if (prefixIndex >= 0 && tokens[prefixIndex + 1]) {
    return tokens.slice(prefixIndex, prefixIndex + 2).join(' ');
  }

  return tokens.slice(Math.max(0, tokens.length - 3)).join(' ').replace(/^\s*ADRES\s*:?\s*/i, '').trim();
}

/**
 * Mahalle ismini temizler ve normalize eder.
 */
export function extractNeighborhood(addressLine: string): string | null {
  if (!addressLine) return null;
  const normalizedLine = stripSahaNavDirtyAddressFragments(addressLine).replace(/\s+/g, ' ').trim();
  const upperLine = normalizedLine.toUpperCase();
  
  // Mahalle anahtar kelimesini bul
  const neighborhoodSuffixMatch = upperLine.match(/\s(?:M|MH|MAH|MAHALLE|MAHALLESİ|MAHALLESI)\.?\b/);
  const mahIndex = neighborhoodSuffixMatch?.index ?? -1;
  if (mahIndex === -1) return null;

  // Mahalle isminden önceki kısmı al (genelde adresin başı veya cadde sonudur)
  let neighborhoodPart = normalizedLine.substring(0, mahIndex).trim();
  
  // Mahalle isminden önce gelebilecek kapı no, bina no gibi sayısal gürültüleri temizle
  neighborhoodPart = cleanSahaNavNeighborhoodCandidate(neighborhoodPart);
  
  const result = neighborhoodPart.trim();

  // Temizlik: Sayıları ve çok kısa kelimeleri ele
  if (
    result.length > 2 &&
    result.length < 35 &&
    !/^\d+$/.test(result) &&
    result.split(/\s+/).some(isSahaNavMeaningfulNeighborhoodToken)
  ) {
    return result;
  }
  return null;
}

/**
 * Google Maps sorgusu için temiz bir string oluşturur.
 */
export function buildGoogleMapsQuery(line: string, detectedDistrict: string): string {
  const upperLine = line.toUpperCase().trim();
  
  // Kapı no tespiti
  const doorNoMatch = upperLine.match(/(?:NO|NO:|N)\s*(\d+(?:\/[A-Z0-9]+|[A-Z])?)/i);
  const doorNo = doorNoMatch ? `NO:${doorNoMatch[1].trim()}` : "";
  
  // Cadde/Sokak tespiti
  const streetMatch = upperLine.match(/((?:[A-ZÇĞİÖŞÜ0-9]+\s+){1,2})(?:SOKAK|SOK|SK)\.?/i);
  const avenueMatch = upperLine.match(/((?:[A-ZÇĞİÖŞÜ0-9]+\s+){1,2})(?:CADDE|CAD|CD)\.?/i);

  let mainPath = "";
  if (streetMatch) mainPath = `${streetMatch[1].trim()} SOKAK`;
  else if (avenueMatch) mainPath = `${avenueMatch[1].trim()} CADDESİ`;

  const districtStr = detectedDistrict !== 'DİĞER' ? detectedDistrict : 'İSTANBUL';
  
  if (!mainPath) {
    // Eğer cadde/sokak bulunamazsa mahalle ve ilçeyi kullan
    const nh = extractNeighborhood(line);
    return `${nh ? nh + ' MAH.' : ''} ${districtStr} İSTANBUL`.replace(/\s+/g, ' ').trim();
  }

  return `${mainPath} ${doorNo} ${districtStr} İSTANBUL`.replace(/\s+/g, ' ').trim();
}

/**
 * Blok bazlı (isim + adres) TXT ayrıştırma.
 */
export function parseTxtContent(content: string): ParsedAddress[] {
  // Bloklara böl (bir veya daha fazla boş satır)
  const rawBlocks = content.split(/\r?\n\s*\r?\n/);
  const results: ParsedAddress[] = [];
  
  let skippedCount = 0;

  rawBlocks.forEach((block) => {
    const lines = block.split(/\r?\n/).map(l => l.trim()).filter(l => l !== "");
    
    if (lines.length < 2) {
      skippedCount++;
      return;
    }

    // İlk satır her zaman isimdir
    const businessName = lines[0];
    
    // Geri kalan satırlar adrestir
    let fullAddress = lines.slice(1).join(' ').replace(/\s+/g, ' ').trim();
    
    // Adres temizleme (Glued text fixes)
    fullAddress = fullAddress
      .replace(/NO[:\s]*(\d+)([A-ZÇĞİÖŞÜ\s]+MAH\.?)/gi, 'NO:$1 $2') // NO:161ABDURRAHMANGAZİ -> NO:161 ABDURRAHMANGAZİ
      .replace(/MAH\.NO[:\s]*/gi, 'MAH. NO:')
      .replace(/CAD\.([A-ZÇĞİÖŞÜ])/gi, 'CAD. $1')
      .replace(/SOK\.([A-ZÇĞİÖŞÜ])/gi, 'SOK. $1')
      .replace(/BLK[:\s]*[A-Z]NO[:\s]*/gi, 'NO:')
      .replace(/İSTANBUL/gi, '')
      .trim();

    const upperAddress = fullAddress.toUpperCase();

    // İlçe tespiti
    let district = 'DİĞER';
    for (const d of SUPPORTED_DISTRICTS) {
      if (upperAddress.includes(d)) {
        district = d;
        break;
      }
    }

    // Mahalle tespiti
    const nh = extractNeighborhood(fullAddress) || 'BİLİNMEYEN';

    // Google Maps Query
    const query = buildGoogleMapsQuery(fullAddress, district);

    results.push({
      id: generateId(),
      businessName: businessName,
      fullAddress: fullAddress,
      district: district,
      neighborhood: nh.toUpperCase(),
      streetQuery: query,
      visited: false,
    });
  });

  console.log("--- TXT AYRIŞTIRMA RAPORU ---");
  console.log("Toplam Ham Blok Sayısı:", rawBlocks.length);
  console.log("Başarıyla Ayrıştırılan Kayıt:", results.length);
  console.log("Atlanan Blok Sayısı (Eksik Veri):", skippedCount);
  console.log("İlk 5 Örnek Kayıt:", results.slice(0, 5));

  return results;
}

/**
 * Mevcut bileşenlerin bozulmaması için eski fonksiyonu blok bazlı mantığa uyarlıyoruz
 * Ancak yeni akışta parseTxtContent kullanılması önerilir.
 */
export function parseAddressLine(line: string): ParsedAddress | null {
  // Bu fonksiyon artık tek bir satırı bir blok gibi düşünerek işler
  // Firma ve Adres ayrımı yapamadığı için 'İşletme Adı Yok' atar
  const results = parseTxtContent(line);
  return results.length > 0 ? results[0] : null;
}

export function deduplicateAddresses(addresses: ParsedAddress[]): ParsedAddress[] {
  const seen = new Set<string>();
  return addresses.filter((addr) => {
    // Tekilleştirme anahtarı: isim + adres (boşluksuz ve küçük harf)
    const key = (addr.businessName + addr.fullAddress).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const SAHANAV_UNKNOWN_NEIGHBORHOOD_KEY = 'BILINMEYEN';

function normalizeSahaNavGroupKey(value: string): string {
  return cleanSahaNavNeighborhoodCandidate(value)
    .toLocaleUpperCase('tr')
    .replace(/İ/g, 'I')
    .replace(/I/g, 'I')
    .replace(/ı/g, 'I')
    .replace(/Ş/g, 'S')
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ö/g, 'O')
    .replace(/Ç/g, 'C')
    .replace(/[.\-_/]+/g, ' ')
    .replace(/\b(?:MAHALLESI|MAHALLESİ|MAHALLE|MAH|MH|M)\b/g, ' ')
    .replace(/\b(?:CADDESI|CADDESİ|CADDE|CAD|CD|C)\b/g, ' CADDE ')
    .replace(/\b(?:SOKAK|SOK|SK|S)\b/g, ' SOKAK ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s+/g, '');
}

function cleanSahaNavNeighborhoodTitle(value: string): string {
  const cleaned = cleanSahaNavNeighborhoodCandidate(value)
    .replace(/[.\-_/]+/g, ' ')
    .replace(/\b(?:MAHALLESI|MAHALLESİ|MAHALLE|MAH|MH|M)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned ? `${cleaned.toLocaleUpperCase('tr')} MAH.` : "MAHALLE BELİRSİZ";
}

function scoreSahaNavDisplayTitle(title: string): number {
  const turkishCharScore = (title.match(/[ÇĞİÖŞÜçğıöşü]/g) ?? []).length * 10;
  const readableSpacingScore = /\S+\s+\S+/.test(title.replace(/\bMAH\.$/, '').trim()) ? 5 : 0;
  return turkishCharScore + readableSpacingScore + Math.min(title.length, 40) / 100;
}

export function groupAddressesByNeighborhood(addresses: ParsedAddress[]): Record<string, ParsedAddress[]> {
  const groups: Record<string, { title: string; addresses: ParsedAddress[] }> = {};

  addresses.forEach((addr) => {
    const rawName = addr.neighborhood?.trim();
    const normalizedName = rawName ? normalizeSahaNavGroupKey(rawName) : '';
    const hasKnownName = normalizedName && normalizedName !== SAHANAV_UNKNOWN_NEIGHBORHOOD_KEY;
    const key = hasKnownName ? normalizedName : "MAHALLE BELIRSIZ";
    const title = hasKnownName ? cleanSahaNavNeighborhoodTitle(rawName) : "MAHALLE BELİRSİZ";

    if (!groups[key]) {
      groups[key] = { title, addresses: [] };
    } else if (scoreSahaNavDisplayTitle(title) > scoreSahaNavDisplayTitle(groups[key].title)) {
      groups[key].title = title;
    }

    groups[key].addresses.push(addr);
  });

  const sorted: Record<string, ParsedAddress[]> = {};
  Object.values(groups)
    .sort((a, b) => a.title.localeCompare(b.title, 'tr'))
    .forEach((group) => {
      sorted[group.title] = group.addresses.sort((a, b) => a.businessName.localeCompare(b.businessName, 'tr'));
    });

  return sorted;
}
