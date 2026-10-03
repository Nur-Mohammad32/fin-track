import { useEffect, useState } from "react"
import { User, Phone, MapPin, KeyRound, X, LogOut, Moon, Sun } from "lucide-react"
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
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const stored = localStorage.getItem("theme")
      if (stored) return stored === "dark"
      return document.documentElement.classList.contains("dark")
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      if (darkMode) {
        document.documentElement.classList.add("dark")
        localStorage.setItem("theme", "dark")
      } else {
        document.documentElement.classList.remove("dark")
        localStorage.setItem("theme", "light")
      }
    } catch {
      document.documentElement.classList.toggle("dark", darkMode)
    }
  }, [darkMode])

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
    <div className="flex h-full flex-col bg-purple-50 dark:bg-[#171226]">
      <div className=" bg-purple-800 px-10 pb-10 pt-15 text-white shadow-md">
        <h1 className="font-bold" style={{ fontSize: "22px", margin: 0, letterSpacing: "normal", color: "inherit" }}>Profile</h1>
      </div>
      <div className="no-scrollbar flex-1 overflow-y-auto px-5 py-5">
        {loading && <p className="text-center text-sm text-gray-400 dark:text-purple-300/70">Loading...</p>}
        {error && <p className="text-center text-sm text-red-500">{error}</p>}

        {!loading && !error && (
          <>
            <div className="flex flex-col items-center rounded-2xl bg-white p-6 shadow-sm dark:bg-purple-950/40 dark:shadow-none dark:ring-1 dark:ring-purple-800">
              <div className="flex size-20 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-800 dark:text-white">
                <User className="size-9" />
              </div>
              <p className="mt-3 text-lg font-bold text-gray-900 dark:text-white">{name}</p>
              <p className="text-xs text-gray-400 dark:text-purple-300/70">{phone}</p>

              <div className="mt-4 w-full rounded-xl bg-purple-50 p-4 text-center dark:bg-[#171226] dark:ring-1 dark:ring-purple-800">
                <p className="text-xs text-purple-500 dark:text-purple-300">Current Balance</p>
                <p className="mt-1 text-2xl font-bold text-purple-700 dark:text-purple-200">৳ {balance}</p>
              </div>

              <div className="mt-3 flex w-full items-center justify-center gap-2 text-sm text-gray-500 dark:text-purple-200/80">
                <MapPin className="size-4 text-purple-600 dark:text-purple-400" />
                <span>Dhaka, Bangladesh</span>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-purple-950/40 dark:shadow-none dark:ring-1 dark:ring-purple-800">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-800 dark:text-white">
                  <Phone className="size-4" />
                </span>
                <div>
                  <p className="text-[11px] text-gray-400 dark:text-purple-300/70">Phone</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">{phone}</p>
                </div>
              </div>
            </div>

            {/* Appearance */}
            <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-purple-950/40 dark:shadow-none dark:ring-1 dark:ring-purple-800">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-800 dark:text-white">
                    {darkMode ? <Moon className="size-4" /> : <Sun className="size-4" />}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">Dark mode</p>
                    <p className="text-[11px] text-gray-400 dark:text-purple-300/70">Black and purple theme</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={darkMode}
                  aria-label="Toggle dark mode"
                  onClick={() => setDarkMode((v) => !v)}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition ${darkMode ? "bg-purple-600" : "bg-gray-200"}`}
                >
                  <span
                    className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${darkMode ? "left-6" : "left-1"}`}
                  />
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowPinForm((v) => !v)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 py-3 text-sm font-bold text-white"
            >
              <KeyRound className="size-4" /> Change PIN
            </button>

            <button
              onClick={onLogout}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-bold text-gray-500 shadow-sm dark:bg-[#171226] dark:text-purple-200 dark:shadow-none dark:ring-1 dark:ring-purple-800"
            >
              <LogOut className="size-4" /> Logout
            </button>

            {showPinForm && (
              <form onSubmit={handleChangePin} className="mt-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-purple-950/40 dark:shadow-none dark:ring-1 dark:ring-purple-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Change PIN</h3>
                  <button type="button" onClick={() => setShowPinForm(false)}>
                    <X className="size-4 text-gray-400 dark:text-purple-300" />
                  </button>
                </div>
                <input
                  type="password"
                  placeholder="Current PIN"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value)}
                  className="mt-3 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-purple-500 dark:border-purple-800 dark:bg-[#171226] dark:text-white dark:placeholder-purple-300/50"
                  required
                />
                <input
                  type="password"
                  placeholder="New PIN"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-purple-500 dark:border-purple-800 dark:bg-[#171226] dark:text-white dark:placeholder-purple-300/50"
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
                  className="mt-3 w-full rounded-xl bg-purple-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
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
