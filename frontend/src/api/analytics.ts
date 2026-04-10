import axios from 'axios'
import { SUPABASE_URL, SUPABASE_KEY } from './client'

function getSessionId(): string {
  let id = sessionStorage.getItem('cbr_session_id')
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem('cbr_session_id', id)
  }
  return id
}

interface GeoInfo {
  city: string
  region: string
  country: string
  lat: number
  lon: number
  ip: string
}

let geoCache: GeoInfo | null = null
let geoFetching = false

async function getGeo(): Promise<GeoInfo | null> {
  if (geoCache) return geoCache
  if (geoFetching) return null
  geoFetching = true
  try {
    const { data } = await axios.get('https://ip-api.com/json/?fields=status,city,regionName,country,lat,lon,query', { timeout: 3000 })
    if (data.status === 'success') {
      geoCache = { city: data.city, region: data.regionName, country: data.country, lat: data.lat, lon: data.lon, ip: data.query }
      return geoCache
    }
  } catch { /* silent */ }
  geoFetching = false
  return null
}

export function trackEvent(eventType: string, eventData: Record<string, unknown> = {}, pagePath?: string) {
  getGeo().then((geo) => {
    const payload: Record<string, unknown> = {
      event_type: eventType,
      event_data: {
        ...eventData,
        ...(geo ? { city: geo.city, region: geo.region, country: geo.country, lat: geo.lat, lon: geo.lon } : {}),
      },
      page_path: pagePath || window.location.pathname,
      session_id: getSessionId(),
      referrer: document.referrer || null,
      ip_hash: geo?.ip || null,
    }

    axios.post(`${SUPABASE_URL}/rest/v1/cbr_analytics`, payload, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
    }).catch(() => {})
  })
}
