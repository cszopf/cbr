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

export function trackEvent(eventType: string, eventData: Record<string, unknown> = {}, pagePath?: string) {
  axios.post(`${SUPABASE_URL}/rest/v1/cbr_analytics`, {
    event_type: eventType,
    event_data: eventData,
    page_path: pagePath || window.location.pathname,
    session_id: getSessionId(),
    referrer: document.referrer || null,
  }, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
  }).catch(() => {})
}
