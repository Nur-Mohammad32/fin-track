import { useEffect, useState } from "react"
import {
  ShieldAlert,
  AlertTriangle,
  Bell,
  ShieldCheck,
  Loader2,
} from "lucide-react"
import { apiFetch } from "../lib/api"
import AlertFollowUp from "../components/AlertFollowUp"

const TYPE_LABELS = {
  large_amount: "Unusual amount",
  new_recipient: "New recipient",
  odd_hour: "Late night activity",
  rapid_transactions: "Rapid activity",
}

const SEVERITY_META = {
  high: { Icon: ShieldAlert, iconClass: "bg-red-100 text-red-600" },
  medium: { Icon: AlertTriangle, iconClass: "bg-amber-100 text-amber-600" },
  low: { Icon: Bell, iconClass: "bg-blue-100 text-blue-600" },
}

const timeAgo = (value) => {
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function Notifications() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [unreadOnly, setUnreadOnly] = useState(true)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError("")
      try {
        const data = await apiFetch(`/alerts?unread=${unreadOnly}`)
        if (!cancelled) setAlerts(data.data ?? [])
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [unreadOnly, nonce])

  return (
    <div className="flex h-full flex-col bg-blue-50">
      <div className="rounded-b-2xl bg-blue-600 px-5 pb-4 pt-6 text-white shadow-md">
        <h1 className="text-base font-bold">Notifications</h1>
      </div>

      {/* Filter */}
      <div className="flex gap-2 px-5 pt-4">
        {["All", "Unread"].map((label) => {
          const isUnread = label === "Unread"
          const active = unreadOnly === isUnread
          return (
            <button
              key={label}
              onClick={() => setUnreadOnly(isUnread)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                active
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-500 shadow-sm"
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-5 py-4">
        {loading && (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-5 animate-spin text-blue-600" />
          </div>
        )}

        {error && !loading && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm text-red-500">{error}</p>
            <button
              onClick={() => setNonce((n) => n + 1)}
              className="mt-4 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && alerts.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <ShieldCheck className="size-7" />
            </span>
            <p className="mt-3 text-sm font-bold text-gray-900">
              {unreadOnly ? "No new alerts" : "No alerts yet"}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              We'll notify you of anything unusual on your account.
            </p>
          </div>
        )}

        {!loading && !error && alerts.length > 0 && (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const severity =
                SEVERITY_META[alert.severity] || SEVERITY_META.low
              const { Icon, iconClass } = severity
              const label = TYPE_LABELS[alert.type] || "Security alert"
              const isRed = alert.displayType === "red_alert"

              return (
                <div
                  key={alert._id}
                  className={`rounded-2xl p-4 shadow-sm ${
                    isRed ? "bg-red-50 ring-1 ring-red-200" : "bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex size-10 shrink-0 items-center justify-center rounded-full ${iconClass}`}
                    >
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-sm font-bold ${
                            isRed ? "text-red-700" : "text-gray-900"
                          }`}
                        >
                          {label}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400">
                            {timeAgo(alert.createdAt)}
                          </span>
                          {!alert.read && (
                            <span className="size-2 rounded-full bg-blue-600" />
                          )}
                        </div>
                      </div>
                      <p
                        className={`mt-1 text-xs leading-relaxed ${
                          isRed ? "text-red-700/80" : "text-gray-500"
                        }`}
                      >
                        {alert.message}
                      </p>

                      {alert.userResponse === "confirmed" && (
                        <span className="mt-2 inline-block rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                          You confirmed this
                        </span>
                      )}

                      {!alert.read && (
                        <AlertFollowUp
                          alert={alert}
                          variant="card"
                          onUpdated={(updated) =>
                            setAlerts((list) =>
                              list.map((a) => (a._id === updated._id ? updated : a))
                            )
                          }
                          onError={(msg) => setError(msg)}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
