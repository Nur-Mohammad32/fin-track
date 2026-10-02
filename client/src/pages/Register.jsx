import { useState } from "react"
import { apiFetch } from "../lib/api"

const BUSINESS_TYPES = [
  "food_restaurant", "grocery", "clothing_fashion", "electronics",
  "healthcare_pharmacy", "education", "transport", "travel_hotel",
  "beauty_personal_care", "home_furniture", "entertainment",
  "professional_services", "online_ecommerce", "wholesale", "other",
]

const formatLabel = (s) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

export default function Register({ onRegistered }) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [pin, setPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [showPin, setShowPin] = useState(false)
  const [accountType, setAccountType] = useState("general")
  const [businessType, setBusinessType] = useState([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError("")
    if (!name || !phone || !pin || !accountType) return setError("All required fields must be filled")
    if (pin !== confirmPin) return setError("PINs do not match")
    if (accountType === "merchant" && businessType.length === 0) return setError("Select at least one business type")
    setLoading(true)
    try {
      const data = await apiFetch("/auth/users/register", {
        method: "POST",
        body: JSON.stringify({
          name,
          phone,
          pin,
          accountType,
          businessType: accountType === "merchant" ? businessType : [],
        }),
      })
      if (data.success) onRegistered()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-black">Create your account</h2>
      <p className="mt-1 text-sm text-gray-400">It takes about a minute.</p>
      <br />
      <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
        <div>
          <label className="text-sm font-semibold text-gray-900">Full name</label>
          <input
            className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-blue-500"
            placeholder="Rahim Uddin"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-900">Phone number</label>
          <input
            className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-blue-500"
            placeholder="01XXXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-900">PIN</label>
          <div className="relative mt-1.5">
            <input
              type={showPin ? "text" : "password"}
              inputMode="numeric"
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 pr-14 text-sm outline-none focus:border-blue-500"
              placeholder="4 digits"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
            <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
              {showPin ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-900">Confirm PIN</label>
          <input
            type={showPin ? "text" : "password"}
            inputMode="numeric"
            className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-blue-500"
            placeholder="Re-enter PIN"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-900">Account type</label>
          <div className="mt-1.5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAccountType("general")}
              className={`rounded-xl border p-4 text-left transition ${
                accountType === "general" ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white"
              }`}
            >
              <p className="font-bold text-gray-900">Personal</p>
              <p className="mt-1 text-xs text-gray-400">Send, pay and track spending</p>
            </button>
            <button
              type="button"
              onClick={() => setAccountType("merchant")}
              className={`rounded-xl border p-4 text-left transition ${
                accountType === "merchant" ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white"
              }`}
            >
              <p className="font-bold text-gray-900">Merchant</p>
              <p className="mt-1 text-xs text-gray-400">Accept payments for a business</p>
            </button>
          </div>
        </div>
        {accountType === "merchant" && (
          <div>
            <label className="text-sm font-semibold text-gray-900">Business types (select all that apply)</label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {BUSINESS_TYPES.map((b) => {
                const selected = businessType.includes(b)
                return (
                  <button
                    type="button"
                    key={b}
                    onClick={() =>
                      setBusinessType(selected ? businessType.filter((x) => x !== b) : [...businessType, b])
                    }
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      selected ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 bg-white text-gray-600"
                    }`}
                  >
                    {formatLabel(b)}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          disabled={loading}
          className="mt-2 h-11 rounded-2xl bg-blue-600 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Creating..." : "Create account"}
        </button>
      </form>
    </div>
  )
}
