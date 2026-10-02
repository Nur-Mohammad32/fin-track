import { useState } from "react"
import PhoneFrame from "./components/PhoneFrame"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Home from "./pages/Home"

function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user"))
    } catch {
      return null
    }
  })
  const [tab, setTab] = useState("login")

  const logout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setUser(null)
    setTab("login")
  }

  return (
    <PhoneFrame>
      {user ? (
        <Home user={user} onLogout={logout} />
      ) : (
        <div className="flex h-full flex-col bg-white p-5">
          <div className="mt-6 flex rounded-2xl bg-blue-50 p-1.5">
            <button
              onClick={() => setTab("login")}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
                tab === "login" ? "bg-white text-blue-600 shadow" : "text-gray-500"
              }`}
            >
              Log in
            </button>
            <button
              onClick={() => setTab("register")}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
                tab === "register" ? "bg-white text-blue-600 shadow" : "text-gray-500"
              }`}
            >
              Create account
            </button>
          </div>
          <div className="mt-4 flex-1 min-h-0 overflow-y-auto no-scrollbar">
            {tab === "login" ? (
              <Login onLogin={setUser} />
            ) : (
              <Register onRegistered={() => setTab("login")} />
            )}
          </div>
        </div>
      )}
    </PhoneFrame>
  )
}

export default App
