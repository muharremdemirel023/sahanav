
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

/**
 * Mahalle ismini temizler ve normalize eder.
 */
export function extractNeighborhood(addressLine: string): string | null {
  if (!addressLine) return null;
  const normalizedLine = addressLine.replace(/\s+/g, ' ').trim();
  const upperLine = normalizedLine.toUpperCase();
  
  // Mahalle anahtar kelimesini bul
  const mahIndex = upperLine.indexOf(" MAH");
  if (mahIndex === -1) return null;

  // Mahalle isminden önceki kısmı al (genelde adresin başı veya cadde sonudur)
  let neighborhoodPart = normalizedLine.substring(0, mahIndex).trim();
  
  // Mahalle isminden önce gelebilecek kapı no, bina no gibi sayısal gürültüleri temizle
  neighborhoodPart = neighborhoodPart.replace(/(?:NO[:\/\-\s]*\d+[A-Z]?)/gi, '');
  
  // En sondaki kelimeyi al (Mahalle ismi genelde budur)
  const words = neighborhoodPart.trim().split(/\s+/);
  if (words.length === 0) return null;

  const prefixes = ["YENİ", "ESKİ", "YUKARI", "AŞAĞI", "BÜYÜK", "KÜÇÜK", "ORTA"];
  const lastWord = words[words.length - 1].toUpperCase();
  const prevWord = words.length > 1 ? words[words.length - 2].toUpperCase() : "";

  let result = lastWord;
  // Örn: "YENİ MAHALLE"
  if (prefixes.includes(prevWord)) {
    result = `${prevWord} ${lastWord}`;
  }

  // Temizlik: Sayıları ve çok kısa kelimeleri ele
  if (result.length > 2 && result.length < 35 && !/^\d+$/.test(result)) {
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

export function groupAddressesByNeighborhood(addresses: ParsedAddress[]): Record<string, ParsedAddress[]> {
  const groups: Record<string, ParsedAddress[]> = {};
  addresses.forEach((addr) => {
    const name = addr.neighborhood && addr.neighborhood !== 'BİLİNMEYEN' ? addr.neighborhood.trim().toUpperCase() : null;
    const key = name ? `${name} MAH.` : "MAHALLE BELİRSİZ";
    if (!groups[key]) groups[key] = [];
    groups[key].push(addr);
  });
  
  const sorted: Record<string, ParsedAddress[]> = {};
  Object.keys(groups).sort().forEach(k => {
    sorted[k] = groups[k].sort((a, b) => a.businessName.localeCompare(b.businessName, 'tr'));
  });
  return sorted;
}
