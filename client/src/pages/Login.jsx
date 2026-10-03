import { useState } from "react"
import { apiFetch } from "../lib/api"

export default function Login({ onLogin }) {
  const [phone, setPhone] = useState("")
  const [pin, setPin] = useState("")
  const [showPin, setShowPin] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError("")
    if (!phone || !pin) return setError("Phone and PIN are required")
    setLoading(true)
    try {
      const data = await apiFetch("/auth/users/login", {
        method: "POST",
        body: JSON.stringify({ phone, pin }),
      })
      localStorage.setItem("token", data.token)
      localStorage.setItem("user", JSON.stringify(data.user))
      onLogin(data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-black">Welcome back</h2>
      <p className="mt-1 text-sm text-gray-400">Log in to continue.</p>
      <br />
      <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
        <div>
          <label className="text-sm font-semibold text-gray-900">Phone number</label>
          <input
            className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-purple-500"
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
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 pr-14 text-sm outline-none focus:border-purple-500"
              placeholder="4 digits"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
            <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
              {showPin ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          disabled={loading}
          className="mt-2 h-11 rounded-2xl bg-purple-600 text-sm font-bold text-white transition hover:bg-purple-700 disabled:opacity-60"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>
    </div>
  )
}
