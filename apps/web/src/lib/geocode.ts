export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

// Forward-geocode via Nominatim (OpenStreetMap) — gratis, tanpa API key.
// Patuhi usage policy: 1 request/detik & sertakan User-Agent.
export async function forwardGeocode(query: string): Promise<GeocodeResult | null> {
  const q = query.trim();
  if (!q) return null;

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=id&q=${encodeURIComponent(q)}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, {
      headers: { 'User-Agent': 'REV-Bumi-OS/1.0' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) return null;
    const data: Array<{ lat: string; lon: string; display_name: string }> = await response.json();
    const first = data[0];
    if (!first) return null;

    return {
      lat: Number(first.lat),
      lng: Number(first.lon),
      displayName: first.display_name,
    };
  } catch {
    return null;
  }
}
