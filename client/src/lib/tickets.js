// Frontend support-ticket store for security alerts.
// localStorage-backed: instant UI + survives reload even if the backend
// sync fails. The backend ticket call (POST /alerts/:id/ticket) is the
// source of truth for hiding the home banner.
const KEY = "fintrack_support_tickets"

function readMap() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {}
  } catch {
    return {}
  }
}

export function getTicketId(alertId) {
  if (!alertId) return null
  return readMap()[alertId] || null
}

export function hasTicket(alertId) {
  return Boolean(getTicketId(alertId))
}

export function createLocalTicket(alertId) {
  const map = readMap()
  if (!map[alertId]) {
    map[alertId] = `TKT-${String(alertId).slice(-6).toUpperCase()}`
    try {
      localStorage.setItem(KEY, JSON.stringify(map))
    } catch {
      // Storage blocked: ticket still works for this session
    }
  }
  return map[alertId]
}
