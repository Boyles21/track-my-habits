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

/** Earth radius in metres */
const EARTH_RADIUS_M = 6371000;

/** Maximum GPS accuracy (metres) for an acceptable check-in */
const DEFAULT_GPS_ACCURACY_THRESHOLD = 30;

/** Maximum geofence radius (metres) */
export const MAX_GEOFENCE_RADIUS = 5000;

/** Minimum geofence radius (metres) */
export const MIN_GEOFENCE_RADIUS = 10;

/** Maximum distance that can be measured (Earth circumference) */
const MAX_DISTANCE_M = 40_000_000;

/**
 * Calculate distance between two coordinates using Haversine formula.
 * All angles are internally converted to radians.
 * @returns Distance in metres, or Infinity if inputs are invalid.
 */
export function calculateHaversineDistance(
  coord1: Coordinates,
  coord2: Coordinates,
): number {
  // Validate inputs
  if (!Number.isFinite(coord1.lat) || !Number.isFinite(coord1.lng) ||
      !Number.isFinite(coord2.lat) || !Number.isFinite(coord2.lng)) {
    return Infinity;
  }
  if (coord1.lat < -90 || coord1.lat > 90 || coord2.lat < -90 || coord2.lat > 90 ||
      coord1.lng < -180 || coord1.lng > 180 || coord2.lng < -180 || coord2.lng > 180) {
    return Infinity;
  }

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

  return EARTH_RADIUS_M * c;
}

/**
 * Check if a point is inside a geofence
 */
export function isInsideGeofence(
  userCoords: Coordinates,
  orgCoords: Coordinates,
  radiusMeters: number,
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
  if (!Number.isFinite(meters) || meters < 0) return "—";
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
 * Get user's current GPS position.
 * Uses high-accuracy mode with zero cache age.
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
            reject(
              new Error(
                "Location permission denied. Please enable location access in your browser settings.",
              ),
            );
            break;
          case error.POSITION_UNAVAILABLE:
            reject(
              new Error(
                "Location information is unavailable. Please ensure GPS is enabled.",
              ),
            );
            break;
          case error.TIMEOUT:
            reject(
              new Error(
                "Location request timed out. Please try again in an open area.",
              ),
            );
            break;
          default:
            reject(
              new Error(
                "An unknown error occurred while getting your location.",
              ),
            );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      },
    );
  });
}

/**
 * Validate GPS accuracy.
 * @returns null if acceptable, otherwise a human-readable error message.
 */
export function validateGpsAccuracy(
  accuracy: number | null,
  threshold: number = DEFAULT_GPS_ACCURACY_THRESHOLD,
): string | null {
  if (accuracy === null || !Number.isFinite(accuracy)) {
    return "GPS accuracy could not be determined. Please try again.";
  }
  if (accuracy <= 0) {
    return "GPS accuracy is suspiciously perfect (±0m). This may indicate a mock location. Please disable mock location and try again.";
  }
  if (accuracy > threshold) {
    return `GPS accuracy is poor (±${Math.round(accuracy)}m). Please move to an open area with a clear view of the sky and try again. (Required: ±${threshold}m)`;
  }
  return null;
}

/**
 * Detect potential fake / mocked GPS readings.
 * Returns an array of warning strings (may be empty).
 */
export function detectFakeGps(
  position: GeolocationPosition,
): string[] {
  const warnings: string[] = [];
  const { coords } = position;

  // Mock locations often report exactly 0 accuracy
  if (coords.accuracy === 0) {
    warnings.push(
      "GPS accuracy is exactly 0m — this may indicate a mock location.",
    );
  }

  // Unrealistic speed
  if (coords.speed !== null && coords.speed > 50) {
    // 50 m/s = 180 km/h
    warnings.push(
      `GPS speed is ${Math.round(coords.speed)} m/s — unrealistically fast.`,
    );
  }

  // Altitude accuracy of 0
  if (coords.altitudeAccuracy === 0) {
    warnings.push(
      "Altitude accuracy is exactly 0m — suspicious.",
    );
  }

  // Heading is exactly 0 (some mock tools report 0°)
  if (coords.heading === 0 && coords.speed !== null && coords.speed > 0) {
    warnings.push(
      "GPS heading is exactly 0° with movement — may indicate a mock location.",
    );
  }

  return warnings;
}

/**
 * Check if organization has valid geofence location configured
 */
export function hasValidGeofence(org: OrganizationLocation): boolean {
  return (
    org.latitude !== null &&
    org.longitude !== null &&
    org.geofence_radius >= MIN_GEOFENCE_RADIUS &&
    org.geofence_radius <= MAX_GEOFENCE_RADIUS
  );
}

/**
 * Process geofence validation.
 * This is the authoritative client-side check. It BLOCKS the check-in
 * (returns isValid=false) when GPS accuracy is too poor or the user is outside
 * the geofence.
 *
 * ⚠️ IMPORTANT: The client result is **overwritten by the server-side trigger**
 * `validate_entry_geofence()`, so this is for UX only.
 */
export function processGeofenceValidation(
  userCoords: Coordinates,
  accuracy: number | null,
  organization: OrganizationLocation | null,
): {
  isValid: boolean;
  distance: number | null;
  isInside: boolean;
  error: string | null;
  warnings: string[];
} {
  const warnings: string[] = [];

  // 1. Validate GPS accuracy — BLOCK if too poor
  const accuracyError = validateGpsAccuracy(accuracy);
  if (accuracyError) {
    return {
      isValid: false,
      distance: null,
      isInside: false,
      error: accuracyError,
      warnings,
    };
  }

  // 2. No organization assigned
  if (!organization) {
    return {
      isValid: false,
      distance: null,
      isInside: false,
      error:
        "No organization assigned. Please contact your supervisor to be assigned to an organization.",
      warnings,
    };
  }

  // 3. Organization has no geofence configured
  if (!hasValidGeofence(organization)) {
    return {
      isValid: true,
      distance: null,
      isInside: false,
      error: null,
      warnings: [
        `${organization.name} has not configured attendance location. The administrator must set coordinates and a radius before geofence attendance can be enforced.`,
      ],
    };
  }

  // 4. Compute distance
  const orgCoords: Coordinates = {
    lat: organization.latitude!,
    lng: organization.longitude!,
  };

  const distance = calculateHaversineDistance(userCoords, orgCoords);

  if (!Number.isFinite(distance) || distance > MAX_DISTANCE_M) {
    return {
      isValid: false,
      distance: null,
      isInside: false,
      error:
        "Unable to calculate distance from organization. Invalid coordinates detected.",
      warnings,
    };
  }

  const isInside = distance <= organization.geofence_radius;

  return {
    isValid: isInside,
    distance,
    isInside,
    error: isInside
      ? null
      : `You are outside the attendance zone. Distance: ${formatDistance(distance)}. Allowed radius: ${organization.geofence_radius} m.`,
    warnings,
  };
}

/**
 * Validate geofence configuration for an organization.
 * Returns null if valid, otherwise an error message.
 */
export function validateGeofenceConfig(
  lat: number | null,
  lng: number | null,
  radius: number | null,
): string | null {
  if (lat !== null && lng !== null) {
    if (lat < -90 || lat > 90) {
      return "Latitude must be between -90 and 90";
    }
    if (lng < -180 || lng > 180) {
      return "Longitude must be between -180 and 180";
    }
    if (radius === null || radius < MIN_GEOFENCE_RADIUS) {
      return `Radius must be at least ${MIN_GEOFENCE_RADIUS} metres`;
    }
    if (radius > MAX_GEOFENCE_RADIUS) {
      return `Radius must be at most ${MAX_GEOFENCE_RADIUS} metres`;
    }
  } else if (lat === null && lng === null) {
    // No geofence configured — that's fine
    return null;
  } else {
    return "Both latitude and longitude must be provided (or both left blank)";
  }
  return null;
}
