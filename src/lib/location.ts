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

const GEOCODE_CACHE_KEY = 'sahanav_geocode_cache';

/**
 * Gets coordinates from cache or Nominatim API.
 */
export async function getCoordinates(address: string): Promise<{ lat: number; lng: number } | null> {
  // Try local storage cache first
  const cache = JSON.parse(localStorage.getItem(GEOCODE_CACHE_KEY) || '{}');
  if (cache[address]) {
    return cache[address];
  }

  try {
    // Nominatim API requires a user-agent
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: {
          'Accept-Language': 'tr',
        },
      }
    );
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
