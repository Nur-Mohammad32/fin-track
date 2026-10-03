import { useEffect, useRef, useState } from "react"
import { TrendingUp, TrendingDown, Wallet, Receipt, Calendar, Percent, Target, Loader2, Send, X, ArrowLeft, BotMessageSquare } from "lucide-react"
import { apiFetch } from "../lib/api"

export default function FinTrack({ user, onClose, onPlanMonth }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [balance, setBalance] = useState(null)
  const [summary, setSummary] = useState(null)
  const [recommendations, setRecommendations] = useState(null)
  const [recLoading, setRecLoading] = useState(true)

  // AI chatbot
  const [chatMessages, setChatMessages] = useState([
    {
      role: "bot",
      text: "Hi! I'm your finance assistant. Ask me about your spending, like \"How much did I spend on food this month?\" or \"Which category is my biggest expense?\"",
    },
  ])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState("")
  const [chatOpen, setChatOpen] = useState(false)
  const chatScrollRef = useRef(null)

  // Load balance + summary immediately (fast)
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

  // Load AI recommendations separately (can take time)
  useEffect(() => {
    let cancelled = false

    const loadRec = async () => {
      setRecLoading(true)
      try {
        const data = await apiFetch("/analytics/recommendations")
        if (!cancelled) setRecommendations(data.data ?? null)
      } catch {
        // recommendations are optional
      } finally {
        if (!cancelled) setRecLoading(false)
      }
    }

    loadRec()
    return () => {
      cancelled = true
    }
  }, [])

  const sendChat = async (e) => {
    e.preventDefault()
    const text = chatInput.trim()
    if (!text || chatLoading) return

    setChatInput("")
    setChatError("")
    setChatMessages((msgs) => [...msgs, { role: "user", text }])
    setChatLoading(true)

    try {
      const data = await apiFetch("/chat", {
        method: "POST",
        body: JSON.stringify({ question: text }),
      })
      const answer =
        data?.data?.answer ??
        "Sorry, I couldn't get an answer. Please try again."
      setChatMessages((msgs) => [...msgs, { role: "bot", text: answer }])
    } catch (err) {
      setChatMessages((msgs) => [
        ...msgs,
        { role: "bot", text: "Sorry, something went wrong. Please try again." },
      ])
      setChatError(err.message)
    } finally {
      setChatLoading(false)
    }
  }

  // Keep the chat pinned to the latest message
  useEffect(() => {
    const el = chatScrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [chatMessages, chatLoading])

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
      {/* Header - back arrow, icon and name */}
      <div className="px-5 pb-5 pt-15">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            aria-label="Back"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 transition active:scale-90"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="flex size-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <span className="text-lg font-bold">{user?.name?.[0]?.toUpperCase() ?? "U"}</span>
          </div>
          <p className="text-sm font-bold leading-tight text-gray-900">{user?.name ?? "User"}</p>
        </div>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto p-5 pb-24">
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
                {recLoading && (
                  <Loader2 className="ml-auto size-4 animate-spin text-blue-600" />
                )}
              </div>
              {recLoading ? (
                <p className="mt-1.5 text-xs text-gray-400">Generating insights...</p>
              ) : recommendations?.tips?.length > 0 ? (
                <ul className="mt-2 space-y-1.5">
                  {recommendations.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-gray-600">
                      <span className="mt-0.5 text-blue-600">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
                  Track your spending, get saving tips, and stay on budget with your personal finance guide.
                </p>
              )}
            </div>

            {/* Plan Your Month */}
            <button
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-blue-400 p-4 text-left shadow-md transition hover:opacity-90"
              onClick={onPlanMonth}
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-white/20 text-white">
                  <Target className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-white">Plan Your Month</p>
                  <p className="mt-0.5 text-[10px] text-blue-100">Set goals and plan your spending</p>
                </div>
              </div>
            </button>
          </>
        )}
      </div>

      {/* Full-screen AI chat */}
      {chatOpen && (
        <div className="absolute inset-0 z-40 flex flex-col bg-blue-50">
          <div className="flex items-center gap-3 bg-blue-600 px-5 pb-4 pt-15 text-white shadow-md">
            <button
              onClick={() => setChatOpen(false)}
              aria-label="Back"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20 active:scale-90"
            >
              <ArrowLeft className="size-5" />
            </button>
            <h2 className="text-base font-bold">Ask Fin-Track</h2>
          </div>

          <div
            ref={chatScrollRef}
            className="no-scrollbar flex-1 space-y-2.5 overflow-y-auto px-5 py-4"
          >
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "rounded-2xl rounded-br-md bg-blue-600 text-white"
                      : "rounded-2xl rounded-bl-md bg-white text-gray-700 shadow-sm ring-1 ring-blue-100"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 shadow-sm ring-1 ring-blue-100">
                  <span className="text-xs text-gray-500">Fin-Track is writing</span>
                  <span className="flex items-center gap-0.5">
                    <span className="typing-dot size-1 rounded-full bg-blue-600" />
                    <span className="typing-dot size-1 rounded-full bg-blue-600" />
                    <span className="typing-dot size-1 rounded-full bg-blue-600" />
                  </span>
                </div>
              </div>
            )}
          </div>

          {chatError && (
            <p className="px-5 pb-1 text-[10px] text-red-500">{chatError}</p>
          )}

          <form onSubmit={sendChat} className="flex items-center gap-2 border-t border-gray-100 bg-white p-4 pr-24">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask about your finances..."
              className="h-11 min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3.5 text-sm outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              aria-label="Send message"
              className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating AI chat bubble - prominent, on top, click again to close */}
      {!chatOpen && (
        <span className="pointer-events-none absolute bottom-10 right-24 z-50 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-xs font-bold text-blue-600 shadow-md ring-1 ring-blue-100">
          Ask Fin-Track
        </span>
      )}
      <button
        onClick={() => setChatOpen((v) => !v)}
        aria-label={chatOpen ? "Close chat" : "Open AI chat"}
        className="absolute bottom-5 right-5 z-50 flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-400 text-white shadow-xl shadow-blue-600/40 ring-4 ring-white/70 transition-all duration-300 active:scale-90"
      >
        {chatOpen ? (
          <X className="size-7" />
        ) : (
          <BotMessageSquare className="size-7" />
        )}
      </button>
    </div>
  )
}
