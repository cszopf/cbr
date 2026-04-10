import api from './client'

// Generate a random session ID persisted for the browser session
function getSessionId(): string {
  let id = sessionStorage.getItem('cbr_session_id')
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem('cbr_session_id', id)
  }
  return id
}

export function trackEvent(eventType: string, eventData: Record<string, unknown> = {}, pagePath?: string) {
  // Fire and forget — don't block the UI
  api.post('/analytics/track', {
    event_type: eventType,
    event_data: eventData,
    page_path: pagePath || window.location.pathname,
    session_id: getSessionId(),
    referrer: document.referrer || null,
  }).catch(() => {
    // Silently fail — analytics should never break the app
  })
}
