import { useState } from "react"
import { ArrowLeft, Loader2 } from "lucide-react"
import { apiFetch } from "../lib/api"

export default function BudgetGoals({ user, onClose }) {
  const [goal, setGoal] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [plan, setPlan] = useState(null)

  // Extract a goal amount and duration from natural language.
  // e.g. "save 5000 taka in 2 months" -> { goalAmount: 5000, months: 2 }
  const parseGoal = (text) => {
    const numbers = (text.match(/\d+/g) || []).map(Number)
    let goalAmount = null
    let months = 1

    if (numbers.length > 0) {
      goalAmount = numbers[0]
      if (numbers.length > 1 && numbers[1] >= 1 && numbers[1] <= 120) {
        months = numbers[1]
      }
    }

    return { goalAmount, months }
  }

  const generate = async () => {
    setLoading(true)
    setError("")
    setPlan(null)
    try {
      const { goalAmount, months } = parseGoal(goal)

      // Use the existing budget endpoint. It builds a monthly
      // budget per category from the goal + last 3 months of spending.
      const data = await apiFetch("/budget", {
        method: "POST",
        body: JSON.stringify({
          goalAmount: goalAmount ?? 5000,
          months,
        }),
      })

      setPlan(data.data ?? null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatCategory = (value) => {
    if (!value) return "Other"
    return value
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  const formatAmount = (value) => {
    if (value === null || value === undefined) return "—"
    return `৳ ${Number(value).toLocaleString()}`
  }

  const budgets =
    plan?.categoryBudgets?.slice().sort((a, b) => b.limit - a.limit) ?? []
  const total = budgets.reduce((s, b) => s + b.limit, 0)

  return (
    <div className="animate-slide-in flex h-full flex-col bg-blue-50">
      {/* Header */}
      <div className="px-5 pb-5 pt-15">
        <div className="flex items-center gap-3">
          <button onClick={onClose}>
            <ArrowLeft className="size-5" />
          </button>
          <p className="text-sm font-bold leading-tight text-gray-900">
            {user?.name ?? "User"}
          </p>
        </div>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto p-5">
        <h2 className="text-lg font-bold text-gray-900">
          Set a Goal & Plan Your Month
        </h2>
        <p className="mt-1 text-xs text-gray-400">
          Describe your financial goal (optional)
        </p>

        {/* Goal input */}
        <div className="mt-5">
          <label className="text-sm font-semibold text-gray-900">
            Your goal
          </label>
          <textarea
            className="mt-1.5 h-28 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
            placeholder="e.g. I want to save 5000 taka in 2 months"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />
        </div>

        {/* Generate Plan button */}
        <button
          className="mt-4 h-12 w-full rounded-2xl bg-blue-600 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
          onClick={generate}
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Generating...
            </span>
          ) : (
            "Generate Plan"
          )}
        </button>

        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

        {/* Generated plan table */}
        {plan && (
          <div className="mt-6">
            <h3 className="text-sm font-bold text-gray-900">
              Your Monthly Budget
            </h3>

            {plan.message && (
              <p className="mt-1 text-xs leading-relaxed text-gray-500">
                {plan.message}
              </p>
            )}

            <div className="mt-3 overflow-hidden rounded-2xl bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                      Category
                    </th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                      Recommended Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {budgets.length > 0 ? (
                    budgets.map((b) => (
                      <tr
                        key={b.category}
                        className="border-b border-gray-50 last:border-0"
                      >
                        <td className="px-4 py-2.5 text-gray-600">
                          {formatCategory(b.category)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-gray-900">
                          {formatAmount(b.limit)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="2"
                        className="px-4 py-4 text-center text-sm text-gray-400"
                      >
                        No spending data available yet
                      </td>
                    </tr>
                  )}
                </tbody>
                {budgets.length > 0 && (
                  <tfoot>
                    <tr className="bg-blue-50">
                      <td className="px-4 py-2.5 font-bold text-gray-900">
                        Total
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-blue-600">
                        {formatAmount(total)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {plan.avgMonthlyExpense !== undefined && (
              <p className="mt-2 text-[10px] text-gray-400">
                Based on your last {plan.basedOnMonths ?? 3} month(s) • Avg
                spending: {formatAmount(plan.avgMonthlyExpense)}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
