import { useEffect, useState } from "react"
import { ArrowDownLeft, ArrowUpRight } from "lucide-react"
import { apiFetch } from "../lib/api"

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [myPhone, setMyPhone] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const load = async () => {
      try {
        const [me, data] = await Promise.all([
          apiFetch("/user/me"),
          apiFetch("/transaction"),
        ])
        setMyPhone(me.user.phone)
        setTransactions(data.transactions || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="flex h-full flex-col bg-purple-50">
      <div className=" bg-purple-800 px-10 pb-10 pt-15 text-white shadow-md">
        <h1 className="font-bold" style={{ fontSize: "22px", margin: 0, letterSpacing: "normal", color: "inherit" }}>Transactions</h1>
      </div>
      <div className="no-scrollbar flex-1 overflow-y-auto px-5 py-5">
        <div className="rounded-2xl bg-white p-2 shadow-sm">
          {loading && <p className="p-4 text-center text-sm text-gray-400">Loading...</p>}
          {error && <p className="p-4 text-center text-sm text-red-500">{error}</p>}
          {!loading && !error && transactions.length === 0 && (
            <p className="p-4 text-center text-sm text-gray-400">No transactions yet</p>
          )}
          {transactions.map((t) => {
            const isIn = t.to === myPhone && t.from !== myPhone
            return (
              <div key={t._id || t.transactionId} className="flex items-center gap-3 rounded-xl p-3">
                <span
                  className={`flex size-10 items-center justify-center rounded-full ${
                    isIn ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
                  }`}
                >
                  {isIn ? <ArrowDownLeft className="size-5" /> : <ArrowUpRight className="size-5" />}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">
                    {isIn ? `Received from ${t.from}` : `Sent to ${t.to}`}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {new Date(t.transactionDate).toLocaleString()}
                  </p>
                  <p
                    className={`text-[11px] font-medium ${
                      t.status === "success" ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {t.status === "success" ? "Success" : `Failed${t.failReason ? ` - ${t.failReason}` : ""}`}
                  </p>
                </div>
                <p className={`text-sm font-bold ${isIn ? "text-green-600" : "text-gray-800"}`}>
                  {isIn ? "+" : "-"}৳ {t.amount}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
