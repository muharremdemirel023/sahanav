/**
 * Calculates the distance between two points in kilometers using the Haversine formula.
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

const GEOCODE_CACHE_KEY = 'sahanav_geocode_cache_v2';

/**
 * Gets coordinates from cache or Nominatim API with a small delay to respect rate limits.
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
    // Add a small jittered delay to avoid hitting rate limits when many requests are fired
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: {
          'Accept-Language': 'tr',
        },
      }
    );
    
    if (response.status === 429) {
      console.warn('Geocoding rate limit hit, skipping for now.');
      return null;
    }

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
    console.error('Geocoding error for address:', address, error);
  }

  return null;
}
