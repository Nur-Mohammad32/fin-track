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
    <div className="animate-slide-in flex h-full flex-col bg-[#fafaff] dark:bg-[#171226]">
      {/* Header - back arrow, initial and name (matches reference) */}
      <div className="px-5 pb-4 pt-12">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            aria-label="Back"
            className="shrink-0 text-purple-600 transition active:scale-90 dark:text-purple-500"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-purple-600 bg-transparent dark:border-purple-500">
            <span className="text-lg font-extrabold text-purple-600 dark:text-purple-500">
              {user?.name?.[0]?.toUpperCase() ?? "U"}
            </span>
          </div>
          <p className="text-[15px] font-bold leading-tight text-gray-900 dark:text-white">{user?.name ?? "User"}</p>
        </div>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-28">
        {loading && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-400">Loading your finances...</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm text-red-500">{error}</p>
            <button
              className="mt-4 rounded-xl bg-purple-600 px-6 py-2.5 text-sm font-bold text-white"
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
              <div className="rounded-3xl bg-white p-4 shadow-sm dark:bg-[#231b3d] dark:shadow-none dark:ring-1 dark:ring-white/5">
                <div className="flex items-center gap-2">
                  <span className="flex size-9 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-[#322457] dark:text-purple-300">
                    <Wallet className="size-4" />
                  </span>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-400">Current Balance</p>
                </div>
                <p className="mt-3 text-[22px] font-extrabold tracking-tight text-gray-900 dark:text-white">{formatAmount(balance)}</p>
              </div>

              {/* This Month's Total Expense */}
              <div className="rounded-3xl bg-white p-4 shadow-sm dark:bg-[#231b3d] dark:shadow-none dark:ring-1 dark:ring-white/5">
                <div className="flex items-center gap-2">
                  <span className="flex size-9 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-[#322457] dark:text-purple-300">
                    <Receipt className="size-4" />
                  </span>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-400">This Month</p>
                </div>
                <p className="mt-3 text-[22px] font-extrabold tracking-tight text-gray-900 dark:text-white">{formatAmount(thisMonth)}</p>
                <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">Total expense</p>
              </div>

              {/* Last Month's Total Expense */}
              <div className="rounded-3xl bg-white p-4 shadow-sm dark:bg-[#231b3d] dark:shadow-none dark:ring-1 dark:ring-white/5">
                <div className="flex items-center gap-2">
                  <span className="flex size-9 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-[#322457] dark:text-purple-300">
                    <Calendar className="size-4" />
                  </span>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-400">Last Month</p>
                </div>
                <p className="mt-3 text-[22px] font-extrabold tracking-tight text-gray-900 dark:text-white">{formatAmount(lastMonth)}</p>
                <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">Total expense</p>
              </div>

              {/* Spending Change (%) */}
              <div className="rounded-3xl bg-white p-4 shadow-sm dark:bg-[#231b3d] dark:shadow-none dark:ring-1 dark:ring-white/5">
                <div className="flex items-center gap-2">
                  <span className="flex size-9 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-[#322457] dark:text-purple-300">
                    {change !== null && change > 5 ? (
                      <TrendingUp className="size-4" />
                    ) : change !== null && change < -5 ? (
                      <TrendingDown className="size-4" />
                    ) : (
                      <Percent className="size-4" />
                    )}
                  </span>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-400">Spending Change</p>
                </div>
                <p className={`mt-3 text-[22px] font-extrabold tracking-tight ${
                  change !== null && change > 5
                    ? "text-[#d95f5f] dark:text-[#f08080]"
                    : change !== null && change < -5
                      ? "text-green-500"
                      : "text-gray-900 dark:text-white"
                }`}>
                  {change !== null ? formatChange(change) : "—"}
                </p>
                <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                  {change !== null && change > 5
                    ? "↑ More than last month"
                    : change !== null && change < -5
                      ? "↓ Less than last month"
                      : "No significant change"}
                </p>
              </div>
            </div>

            {/* Current Month Spending */}
            <div className="mt-6">
              <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">Current Month Spending</h3>
              <div className="mt-3 rounded-3xl bg-white px-5 py-2 shadow-sm dark:bg-[#231b3d] dark:shadow-none dark:ring-1 dark:ring-white/5">
                {summary?.categories?.length > 0 ? (
                  summary.categories
                    .filter((c) => c.current > 0)
                    .map((c) => (
                      <div
                        key={c.category}
                        className="flex items-center justify-between border-b border-gray-200/60 py-3 last:border-0 dark:border-white/5"
                      >
                        <span className="text-sm text-gray-600 dark:text-gray-300">{formatCategory(c.category)}</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{formatAmount(c.current)}</span>
                      </div>
                    ))
                ) : (
                  <p className="py-2 text-sm text-gray-400">No spending this month</p>
                )}
              </div>
            </div>

            {/* AI Guide */}
            <div className="mt-4 rounded-3xl bg-white p-5 shadow-sm dark:bg-[#231b3d] dark:shadow-none dark:ring-1 dark:ring-white/5">
              <div className="flex items-center gap-2">
                <span className="text-sm text-purple-600 dark:text-purple-400">✦</span>
                <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">AI Insights</h3>
                {recLoading && (
                  <Loader2 className="ml-auto size-4 animate-spin text-purple-600" />
                )}
              </div>
              {recLoading ? (
                <p className="mt-1.5 text-xs text-gray-400">Generating insights...</p>
              ) : recommendations?.tips?.length > 0 ? (
                <ul className="mt-2 space-y-1.5">
                  {recommendations.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                      <span className="mt-0.5 text-purple-600 dark:text-purple-400">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                  Track your spending, get saving tips, and stay on budget with your personal finance guide.
                </p>
              )}
            </div>

            {/* Plan Your Month */}
            <button
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-purple-600 to-purple-400 p-4 text-left shadow-md transition hover:opacity-90"
              onClick={onPlanMonth}
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-white/20 text-white">
                  <Target className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-white">Plan Your Month</p>
                  <p className="mt-0.5 text-[10px] text-purple-100">Set goals and plan your spending</p>
                </div>
              </div>
            </button>
          </>
        )}
      </div>

      {/* Full-screen AI chat */}
      {chatOpen && (
        <div className="absolute inset-0 z-40 flex flex-col bg-purple-50">
          <div className="bg-purple-800 text-white shadow-md">
            {/* Status bar - transparent so it takes the purple header color */}
            <div className="flex items-start justify-between bg-transparent px-7 pt-2.5 text-xs font-semibold text-white">
              <span>9:41</span>
              <span className="flex items-center gap-1.5">
                <svg width="17" height="12" viewBox="0 0 14 10" fill="currentColor"><rect x="0" y="6" width="3" height="4" rx="1"/><rect x="4" y="4" width="3" height="6" rx="1"/><rect x="8" y="2" width="3" height="8" rx="1"/><rect x="12" y="0" width="2" height="10" rx="1"/></svg>
                <svg width="17" height="14" viewBox="0 0 24 18" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 6a15 15 0 0 1 20 0M5.5 10a10 10 0 0 1 13 0M9 14a5 5 0 0 1 6 0"/><circle cx="12" cy="16.5" r="1.2" fill="currentColor" stroke="none"/></svg>
                <svg width="26" height="13" viewBox="0 0 25 12" fill="none"><rect x="0.5" y="0.5" width="20" height="11" rx="3" stroke="currentColor"/><rect x="2.5" y="2.5" width="14" height="7" rx="1.5" fill="currentColor"/><path d="M23 4v4a2 2 0 0 0 0-4z" fill="currentColor"/></svg>
              </span>
            </div>
            <div className="flex items-center gap-3 px-10 pb-6 pt-4">
            <button
              onClick={() => setChatOpen(false)}
              aria-label="Back"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20 active:scale-90"
            >
              <ArrowLeft className="size-5" />
            </button>
            <h1 className="font-bold" style={{ fontSize: "22px", margin: 0, letterSpacing: "normal", color: "inherit" }}>Ask Fin-Track</h1>
            </div>
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
                      ? "rounded-2xl rounded-br-md bg-purple-600 text-white"
                      : "rounded-2xl rounded-bl-md bg-white text-gray-700 shadow-sm ring-1 ring-purple-100"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 shadow-sm ring-1 ring-purple-100">
                  <span className="text-xs text-gray-500">Fin-Track is writing</span>
                  <span className="flex items-center gap-0.5">
                    <span className="typing-dot size-1 rounded-full bg-purple-600" />
                    <span className="typing-dot size-1 rounded-full bg-purple-600" />
                    <span className="typing-dot size-1 rounded-full bg-purple-600" />
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
              className="h-11 min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3.5 text-sm outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              aria-label="Send message"
              className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white transition hover:bg-purple-700 disabled:opacity-50"
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating AI chat bubble - matches reference */}
      {!chatOpen && (
        <span className="pointer-events-none absolute bottom-[52px] right-[74px] z-50 whitespace-nowrap rounded-full bg-purple-600 py-2 pl-4 pr-8 text-xs font-bold text-white shadow-lg">
          Ask Fin-Track
        </span>
      )}
      <button
        onClick={() => setChatOpen((v) => !v)}
        aria-label={chatOpen ? "Close chat" : "Open AI chat"}
        className="absolute bottom-5 right-5 z-50 flex size-14 items-center justify-center rounded-full bg-purple-600 text-white shadow-xl ring-4 ring-[#ddd1ff] transition-all duration-300 active:scale-90 dark:ring-[#ddd1ff]"
      >
        {chatOpen ? (
          <X className="size-6" />
        ) : (
          <BotMessageSquare className="size-6" />
        )}
      </button>
    </div>
  )
}
