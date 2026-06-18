/**
 * Geofencing utility for attendance verification
 * Uses Haversine formula to calculate distance between GPS coordinates
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeofenceResult {
  isInside: boolean;
  distanceMeters: number;
  organizationName: string | null;
  radius: number;
  userCoords: Coordinates;
  orgCoords: Coordinates | null;
}

export interface OrganizationLocation {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  geofence_radius: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in meters
 */
export function calculateHaversineDistance(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const R = 6371000; // Earth's radius in meters

  const lat1Rad = (coord1.lat * Math.PI) / 180;
  const lat2Rad = (coord2.lat * Math.PI) / 180;
  const deltaLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const deltaLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Check if a point is inside a geofence
 */
export function isInsideGeofence(
  userCoords: Coordinates,
  orgCoords: Coordinates,
  radiusMeters: number
): { isInside: boolean; distance: number } {
  const distance = calculateHaversineDistance(userCoords, orgCoords);
  return {
    isInside: distance <= radiusMeters,
    distance,
  };
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(coords: Coordinates): string {
  return `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
}

/**
 * Create a Google Maps link for viewing the location
 */
export function getMapsLink(lat: number, lng: number): string {
  return `https://maps.google.com/?q=${lat},${lng}`;
}

/**
 * Get user's current GPS position
 */
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error("Location permission denied. Please enable location access in your browser settings."));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error("Location information is unavailable. Please ensure GPS is enabled."));
            break;
          case error.TIMEOUT:
            reject(new Error("Location request timed out. Please try again."));
            break;
          default:
            reject(new Error("An unknown error occurred while getting your location."));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Validate GPS accuracy
 * @returns null if acceptable, or an error message if accuracy is too poor
 */
export function validateGpsAccuracy(accuracy: number | null, threshold: number = 50): string | null {
  if (accuracy === null) {
    return "GPS accuracy could not be determined";
  }
  if (accuracy > threshold) {
    return `GPS accuracy is poor (±${Math.round(accuracy)}m). Please try again in an open area for better accuracy.`;
  }
  return null;
}

/**
 * Check if organization has valid geofence location configured
 */
export function hasValidGeofence(org: OrganizationLocation): boolean {
  return (
    org.latitude !== null &&
    org.longitude !== null &&
    org.geofence_radius > 0
  );
}

/**
 * Process geofence validation result
 */
export function processGeofenceValidation(
  userCoords: Coordinates,
  accuracy: number | null,
  organization: OrganizationLocation | null
): {
  isValid: boolean;
  distance: number | null;
  isInside: boolean;
  error: string | null;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Check GPS accuracy
  if (accuracy !== null && accuracy > 30) {
    warnings.push(`GPS accuracy: ±${Math.round(accuracy)}m`);
  }

  // No organization assigned
  if (!organization) {
    return {
      isValid: false,
      distance: null,
      isInside: false,
      error: "No organization assigned. Please contact your supervisor.",
      warnings,
    };
  }

  // Organization doesn't have geofence configured
  if (!hasValidGeofence(organization)) {
    return {
      isValid: false,
      distance: null,
      isInside: false,
      error: `${organization.name} has not configured attendance location. Attendance cannot be verified.`,
      warnings,
    };
  }

  // Calculate distance
  const orgCoords: Coordinates = {
    lat: organization.latitude!,
    lng: organization.longitude!,
  };

  const distance = calculateHaversineDistance(userCoords, orgCoords);
  const isInside = distance <= organization.geofence_radius;

  return {
    isValid: isInside,
    distance,
    isInside,
    error: isInside
      ? null
      : `You are outside the attendance zone. Distance: ${formatDistance(distance)}. Allowed radius: ${organization.geofence_radius}m.`,
    warnings,
  };
}
