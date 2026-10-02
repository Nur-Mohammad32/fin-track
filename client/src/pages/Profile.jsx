import { useEffect, useState } from "react"
import { User, Phone, MapPin, KeyRound, X, LogOut } from "lucide-react"
import { apiFetch } from "../lib/api"

export default function Profile({ user, onLogout }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showPinForm, setShowPinForm] = useState(false)
  const [currentPin, setCurrentPin] = useState("")
  const [newPin, setNewPin] = useState("")
  const [pinMessage, setPinMessage] = useState(null)
  const [pinLoading, setPinLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiFetch("/user/me")
        setProfile(data.user)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleChangePin = async (e) => {
    e.preventDefault()
    setPinMessage(null)
    setPinLoading(true)
    try {
      const data = await apiFetch("/auth/users/change-pin", {
        method: "PATCH",
        body: JSON.stringify({ currentPin, newPin }),
      })
      setPinMessage({ type: "success", text: data.message || "PIN changed successfully" })
      setCurrentPin("")
      setNewPin("")
    } catch (err) {
      setPinMessage({ type: "error", text: err.message })
    } finally {
      setPinLoading(false)
    }
  }

  const name = profile?.name ?? user?.name ?? "User"
  const phone = profile?.phone ?? user?.phone ?? ""
  const balance = profile?.currentBalance ?? 0

  return (
    <div className="flex h-full flex-col bg-blue-50">
      <div className="rounded-b-2xl bg-blue-600 px-5 pb-4 pt-6 text-white shadow-md">
        <h1 className="text-base font-bold">Profile</h1>
      </div>
      <div className="no-scrollbar flex-1 overflow-y-auto px-5 py-5">
        {loading && <p className="text-center text-sm text-gray-400">Loading...</p>}
        {error && <p className="text-center text-sm text-red-500">{error}</p>}

        {!loading && !error && (
          <>
            <div className="flex flex-col items-center rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex size-20 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <User className="size-9" />
              </div>
              <p className="mt-3 text-lg font-bold text-gray-900">{name}</p>
              <p className="text-xs text-gray-400">{phone}</p>

              <div className="mt-4 w-full rounded-xl bg-blue-50 p-4 text-center">
                <p className="text-xs text-blue-500">Current Balance</p>
                <p className="mt-1 text-2xl font-bold text-blue-700">৳ {balance}</p>
              </div>

              <div className="mt-3 flex w-full items-center justify-center gap-2 text-sm text-gray-500">
                <MapPin className="size-4 text-blue-600" />
                <span>Dhaka, Bangladesh</span>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Phone className="size-4" />
                </span>
                <div>
                  <p className="text-[11px] text-gray-400">Phone</p>
                  <p className="text-sm font-semibold text-gray-800">{phone}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowPinForm((v) => !v)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 text-sm font-bold text-white"
            >
              <KeyRound className="size-4" /> Change PIN
            </button>

            <button
              onClick={onLogout}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-bold text-gray-500 shadow-sm"
            >
              <LogOut className="size-4" /> Logout
            </button>

            {showPinForm && (
              <form onSubmit={handleChangePin} className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">Change PIN</h3>
                  <button type="button" onClick={() => setShowPinForm(false)}>
                    <X className="size-4 text-gray-400" />
                  </button>
                </div>
                <input
                  type="password"
                  placeholder="Current PIN"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value)}
                  className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  required
                />
                <input
                  type="password"
                  placeholder="New PIN"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  required
                />
                {pinMessage && (
                  <p className={`mt-2 text-xs ${pinMessage.type === "success" ? "text-green-600" : "text-red-500"}`}>
                    {pinMessage.text}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={pinLoading}
                  className="mt-3 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  {pinLoading ? "Updating..." : "Update PIN"}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}
