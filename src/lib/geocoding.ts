/**
 * Reverse geocoding utility using OpenStreetMap Nominatim
 * Converts GPS coordinates to human-readable addresses
 */

interface NominatimResponse {
  address?: {
    road?: string;
    building?: string;
    village?: string;
    town?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  error?: string;
}

interface LocationData {
  lat: number;
  lng: number;
  accuracy?: number;
  at?: string;
}

/**
 * Reverse geocode GPS coordinates to a human-readable address
 * Uses OpenStreetMap Nominatim API (1 request per second limit)
 */
export async function reverseGeocode(location: LocationData): Promise<string | null> {
  if (!location || location.lat === null || location.lng === null) {
    return null;
  }

  try {
    // Add a small delay to respect Nominatim's 1 req/sec rate limit
    await new Promise(resolve => setTimeout(resolve, 100));

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&zoom=18&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        // Nominatim requires a User-Agent header
        'User-Agent': 'TrackMyHabits (https://github.com/Boyles21/track-my-habits)',
      },
    });

    if (!response.ok) {
      console.error('[v0] Nominatim error:', response.status);
      return null;
    }

    const data: NominatimResponse = await response.json();

    if (data.error || !data.address) {
      console.warn('[v0] No address found for coordinates:', location);
      return null;
    }

    // Build a human-readable address from the components
    const address = buildAddressString(data.address);
    return address;
  } catch (error) {
    console.error('[v0] Reverse geocoding error:', error);
    return null;
  }
}

/**
 * Build a readable address string from Nominatim address components
 */
function buildAddressString(addressData: NominatimResponse['address']): string {
  if (!addressData) return '';

  // Prioritize specific components for a clean address
  const parts: string[] = [];

  // Building/house number and road
  if (addressData.building) {
    parts.push(addressData.building);
  }
  if (addressData.road) {
    parts.push(addressData.road);
  }

  // City or town
  if (addressData.city) {
    parts.push(addressData.city);
  } else if (addressData.town) {
    parts.push(addressData.town);
  } else if (addressData.village) {
    parts.push(addressData.village);
  }

  // State/County
  if (addressData.state) {
    parts.push(addressData.state);
  } else if (addressData.county) {
    parts.push(addressData.county);
  }

  // Country
  if (addressData.country) {
    parts.push(addressData.country);
  }

  return parts.join(', ');
}

/**
 * Format coordinates and address for display
 */
export function formatLocationDisplay(
  address: string | null | undefined,
  coordinates?: { lat: number; lng: number; accuracy?: number }
): string {
  if (address) {
    if (coordinates?.accuracy) {
      return `${address} (±${Math.round(coordinates.accuracy)}m)`;
    }
    return address;
  }

  if (coordinates) {
    return `${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)}`;
  }

  return 'Location not captured';
}

/**
 * Create a Google Maps link for viewing the location
 */
export function getMapsLink(lat: number, lng: number): string {
  return `https://maps.google.com/?q=${lat},${lng}`;
}
