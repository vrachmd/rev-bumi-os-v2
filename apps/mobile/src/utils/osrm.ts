export interface OsrmRoute {
  distance: number; // meters
  duration: number; // seconds
  geometry?: string;
}

// Kecepatan rata-rata truk agregat (tronton/dump muatan) di rute campuran tol + jalan lokal.
// OSRM "driving" profile memakai kecepatan mobil, terlalu cepat untuk estimasi ETA truk.
export const TRUCK_AVG_SPEED_KMH = 45;

// Estimasi durasi truk dari jarak jalan sebenarnya (mater) agar ETA realistis.
export function estimateTruckDurationSeconds(distanceMeters: number): number {
  return Math.round(distanceMeters / ((TRUCK_AVG_SPEED_KMH * 1000) / 3600));
}

export interface OsrmResponse {
  code: string;
  routes: OsrmRoute[];
  waypoints: Array<{ location: [number, number] }>;
}

export async function getRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<OsrmRoute | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=false&geometries=geojson`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    const data: OsrmResponse = await response.json();
    if (data.code !== 'Ok' || !data.routes.length) return null;
    return data.routes[0];
  } catch {
    return null;
  }
}

// Fallback: straight-line estimate with a winding factor when OSRM is unreachable.
export function getRouteFallback(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): OsrmRoute {
  const distanceM = haversineMeters(origin, destination);
  // Jalan berkelok rata-rata ~1.4x jarak lurus; estimasi kecepatan truk 45 km/jam.
  const windingDistanceM = distanceM * 1.4;
  const speedMps = 45000 / 3600;
  const durationS = windingDistanceM / speedMps;
  return { distance: Math.round(windingDistanceM), duration: Math.round(durationS) };
}

// Try live routing, fall back to straight-line estimate so ETA always resolves.
export async function getRouteWithFallback(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<OsrmRoute> {
  const route = await getRoute(origin, destination);
  if (!route) return getRouteFallback(origin, destination);
  // Jaga jarak jalan akurat dari OSRM, tapi hitung ulang durasi dengan kecepatan truk.
  route.duration = estimateTruckDurationSeconds(route.distance);
  return route;
}

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours} jam ${minutes} menit`;
  return `${minutes} menit`;
}

export function calculateEta(departureTime: string, durationSeconds: number): string {
  const departure = new Date(departureTime);
  const arrival = new Date(departure.getTime() + durationSeconds * 1000);
  const dd = arrival.getDate().toString().padStart(2, '0');
  const mm = (arrival.getMonth() + 1).toString().padStart(2, '0');
  const yyyy = arrival.getFullYear();
  const hh = arrival.getHours().toString().padStart(2, '0');
  const min = arrival.getMinutes().toString().padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (reverseGeocodeCache[cacheKey]) return reverseGeocodeCache[cacheKey];

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=id`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, { 
      headers: { 'User-Agent': 'REV-Bumi-OS/1.0' },
      signal: controller.signal 
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    const addr = data.address || {};
    // Format Indonesia: village/subdistrict, district, city/regency, province
    const parts = [
      addr.village || addr.hamlet || addr.suburb || addr.subdivision,
      addr.district || addr.county,
      addr.city || addr.town || addr.municipality || addr.regency,
      addr.state || addr.province
    ].filter(Boolean);
    
    const result = parts.length > 0 ? parts.join(', ') : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    reverseGeocodeCache[cacheKey] = result;
    return result;
  } catch {
    const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    reverseGeocodeCache[cacheKey] = fallback;
    return fallback;
  }
}

const reverseGeocodeCache: Record<string, string> = {};