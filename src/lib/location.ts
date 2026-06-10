/**
 * Calculates the distance between two points in kilometers using the Haversine formula.
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

const GEOCODE_CACHE_KEY = 'sahanav_geocode_cache_v3';

/**
 * Gets coordinates from cache or Nominatim API with a strict delay to respect rate limits (1 req/sec).
 */
export async function getCoordinates(address: string): Promise<{ lat: number; lng: number } | null> {
  // Check local storage cache first
  if (typeof window === 'undefined') return null;
  
  const cacheStr = localStorage.getItem(GEOCODE_CACHE_KEY);
  const cache = cacheStr ? JSON.parse(cacheStr) : {};
  
  if (cache[address]) {
    return cache[address];
  }

  try {
    // Nominatim strictly requires 1 request per second. We use 1.1s to be safe.
    await new Promise(resolve => setTimeout(resolve, 1100));

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: {
          'Accept-Language': 'tr',
          'User-Agent': 'SahaNav-Field-Assistant/1.0', // Required by Nominatim policy
        },
      }
    );
    
    if (response.status === 429) {
      console.warn('Nominatim rate limit hit (429). Retrying in 5 seconds...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      return null;
    }

    if (!response.ok) return null;

    const data = await response.json();

    if (data && data.length > 0) {
      const coords = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
      
      // Save to cache
      cache[address] = coords;
      localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache));
      
      return coords;
    }
  } catch (error) {
    console.error('Geocoding error:', error);
  }

  return null;
}
