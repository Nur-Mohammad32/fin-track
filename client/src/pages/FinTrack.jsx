import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown, Wallet, Receipt, Calendar, Percent } from "lucide-react"
import { apiFetch } from "../lib/api"

export default function FinTrack({ user, onClose }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [balance, setBalance] = useState(null)
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError("")
      try {
        const [profileData, summaryData] = await Promise.all([
          apiFetch("/user/me"),
          apiFetch("/analytics/summary"),
        ])

        if (cancelled) return

        setBalance(profileData.user?.currentBalance ?? null)
        setSummary(summaryData.data ?? null)
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
  }, [])

  const thisMonth = summary?.spent ?? 0
  const lastMonth = summary?.prevSpent ?? 0
  const change =
    thisMonth && lastMonth
      ? ((thisMonth - lastMonth) / lastMonth) * 100
      : null

  const formatAmount = (value) => {
    if (value === null || value === undefined) return "—"
    return `৳ ${Number(value).toLocaleString()}`
  }

  const formatChange = (value) => {
    if (value === null || value === undefined || !Number.isFinite(value)) return "—"
    const sign = value > 0 ? "+" : ""
    return `${sign}${value.toFixed(1)}%`
  }

  const formatCategory = (value) => {
    if (!value) return "Other"
    return value
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  return (
    <div className="animate-slide-in flex h-full flex-col bg-blue-50">
      {/* Header - icon and name only */}
      <div className="px-5 pb-5 pt-15">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <span className="text-lg font-bold">{user?.name?.[0]?.toUpperCase() ?? "U"}</span>
          </div>
          <p className="text-sm font-bold leading-tight text-gray-900">{user?.name ?? "User"}</p>
        </div>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto p-5">
        {loading && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-400">Loading your finances...</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm text-red-500">{error}</p>
            <button
              className="mt-4 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Dashboard cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Current Balance */}
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Wallet className="size-4" />
                  </span>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Current Balance</p>
                </div>
                <p className="mt-3 text-xl font-bold text-gray-900">{formatAmount(balance)}</p>
              </div>

              {/* This Month's Total Expense */}
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Receipt className="size-4" />
                  </span>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">This Month</p>
                </div>
                <p className="mt-3 text-xl font-bold text-gray-900">{formatAmount(thisMonth)}</p>
                <p className="mt-0.5 text-[10px] text-gray-400">Total expense</p>
              </div>

              {/* Last Month's Total Expense */}
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Calendar className="size-4" />
                  </span>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Last Month</p>
                </div>
                <p className="mt-3 text-xl font-bold text-gray-900">{formatAmount(lastMonth)}</p>
                <p className="mt-0.5 text-[10px] text-gray-400">Total expense</p>
              </div>

              {/* Spending Change (%) */}
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    {change !== null && change > 5 ? (
                      <TrendingUp className="size-4" />
                    ) : change !== null && change < -5 ? (
                      <TrendingDown className="size-4" />
                    ) : (
                      <Percent className="size-4" />
                    )}
                  </span>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Spending Change</p>
                </div>
                <p className={`mt-3 text-xl font-bold ${
                  change !== null && change > 5
                    ? "text-red-600"
                    : change !== null && change < -5
                      ? "text-green-600"
                      : "text-gray-900"
                }`}>
                  {change !== null ? formatChange(change) : "—"}
                </p>
                <p className="mt-0.5 text-[10px] text-gray-400">
                  {change !== null && change > 5
                    ? "↑ More than last month"
                    : change !== null && change < -5
                      ? "↓ Less than last month"
                      : "No significant change"}
                </p>
              </div>
            </div>

            {/* Current Month Spending */}
            <div className="mt-5">
              <h3 className="text-sm font-bold text-gray-900">Current Month Spending</h3>
              <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
                {summary?.categories?.length > 0 ? (
                  summary.categories
                    .filter((c) => c.current > 0)
                    .map((c) => (
                      <div
                        key={c.category}
                        className="flex items-center justify-between border-b border-gray-50 py-2 last:border-0"
                      >
                        <span className="text-sm text-gray-600">{formatCategory(c.category)}</span>
                        <span className="text-sm font-bold text-gray-900">{formatAmount(c.current)}</span>
                      </div>
                    ))
                ) : (
                  <p className="py-2 text-sm text-gray-400">No spending this month</p>
                )}
              </div>
            </div>

            {/* AI Guide */}
            <div className="mt-5 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-blue-600">✦</span>
                <h3 className="text-sm font-bold text-gray-900">AI Insights</h3>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
                Track your spending, get saving tips, and stay on budget with your personal finance guide.
              </p>
            </div>

            {/* Back button */}
            <button
              className="mt-5 h-12 w-full rounded-2xl bg-blue-600 text-sm font-bold text-white transition hover:bg-blue-700"
              onClick={onClose}
            >
              Back
            </button>
          </>
        )}
      </div>
    </div>
  )
}
