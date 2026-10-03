import { useEffect, useState } from "react"
import {
  Send, Banknote, Smartphone, Receipt, CreditCard, ArrowRightLeft,
  Landmark, Heart, PiggyBank, ShieldCheck, Sparkles, Wallet, ShieldAlert,
} from "lucide-react"
import { apiFetch } from "../lib/api"
import { hasTicket } from "../lib/tickets"
import SendMoney from "./SendMoney"
import PayBill from "./PayBill"
import MobileRecharge from "./MobileRecharge"
import MakePayment from "./MakePayment"
import Donation from "./Donation"
import FinTrack from "./FinTrack"
import BudgetGoals from "./BudgetGoals"
import BottomNav from "../components/BottomNav"
import AlertFollowUp from "../components/AlertFollowUp"
import Profile from "./Profile"
import Transactions from "./Transactions"
import Notifications from "./Notifications"
import Offers from "./Offers"

const MAIN_SERVICES = [
  { icon: Send, label: "Send Money" },
  { icon: Banknote, label: "Cash Out" },
  { icon: Smartphone, label: "Mobile Recharge" },
  { icon: Receipt, label: "Pay Bill" },
  { icon: CreditCard, label: "Make Payment" },
  { icon: Heart, label: "Donation" },
]

const MORE_SERVICES = [
  { icon: CreditCard, label: "Visa" },
  { icon: Landmark, label: "Gov. Payment" },
  { icon: ArrowRightLeft, label: "Fund Transfer" },
  { icon: PiggyBank, label: "Savings" },
  { icon: ShieldCheck, label: "Insurance" },
  { icon: Wallet, label: "Loan" },
]

export default function Home({ user, onLogout }) {
  const [showBalance, setShowBalance] = useState(false)
  const [openSend, setOpenSend] = useState(false)
  const [openPayBill, setOpenPayBill] = useState(false)
  const [openRecharge, setOpenRecharge] = useState(false)
  const [openMakePayment, setOpenMakePayment] = useState(false)
  const [openDonation, setOpenDonation] = useState(false)
  const [openFinTrack, setOpenFinTrack] = useState(false)
  const [openBudgetGoals, setOpenBudgetGoals] = useState(false)
  const [balance, setBalance] = useState(null)
  const [balError, setBalError] = useState("")
  const [section, setSection] = useState("Home")
  const [redAlerts, setRedAlerts] = useState([])
  const [alertNotice, setAlertNotice] = useState("")

  // Emergency alerts on the home screen: only confidence above 70.
  // Acting on an alert drops it to 65, so it stays in Notifications
  // but never returns here — even after reload.
  useEffect(() => {
    if (section !== "Home") return

    let cancelled = false
    const loadRedAlerts = async () => {
      try {
        const data = await apiFetch("/alerts?unread=true&min_confidence=70")
        // Extra safety for tickets created while the backend sync failed
        if (!cancelled)
          setRedAlerts((data.data ?? []).filter((a) => !hasTicket(a._id)))
      } catch {
        // Alerts are optional
      }
    }
    loadRedAlerts()
    return () => {
      cancelled = true
    }
  }, [section])

  // Auto-hide the confirmation notice
  useEffect(() => {
    if (!alertNotice) return
    const t = setTimeout(() => setAlertNotice(""), 5000)
    return () => clearTimeout(t)
  }, [alertNotice])

  const handleAlertUpdated = (updated, context) => {
    if (updated.userResponse === "confirmed") {
      setRedAlerts((list) => list.filter((a) => a._id !== updated._id))
      setAlertNotice("Thanks for confirming. We've recorded this activity as yours.")
      return
    }
    if (context === "support_ticket") {
      // Ticket saved (local + backend sync): banner stays cleared on reload
      setRedAlerts((list) => list.filter((a) => a._id !== updated._id))
      setAlertNotice("Support ticket created. The alert is cleared from the home screen.")
      return
    }
    if (context === "pin_changed") {
      // Steps taken -> clear the red banner (the alert stays in the panel)
      setRedAlerts((list) => list.filter((a) => a._id !== updated._id))
      setAlertNotice("PIN changed successfully. The alert is cleared from the home screen.")
      return
    }
    if (context === "ignore") {
      // Ignored -> confidence drops to 65: leaves home, stays in panel
      setRedAlerts((list) => list.filter((a) => a._id !== updated._id))
      setAlertNotice("Alert ignored. It won't show on the home screen again.")
      return
    }
    setRedAlerts((list) => list.map((a) => (a._id === updated._id ? updated : a)))
    if (context === "respond") setAlertNotice("Reported as not you. Choose what to do below.")
  }

  const checkBalance = async () => {
    if (showBalance) {
      setShowBalance(false)
      return
    }
    setBalError("")
    try {
      const data = await apiFetch("/user/me")
      setBalance(data.user.currentBalance)
      setShowBalance(true)
    } catch (err) {
      setBalError(err.message)
    }
  }

  const openSendMoney = async () => {
    try {
      const data = await apiFetch("/user/me")
      setBalance(data.user.currentBalance)
    } catch {
      setBalance(0)
    }
    setOpenSend(true)
  }

  const openPayBillHandler = async () => {
    try {
      const data = await apiFetch("/user/me")
      setBalance(data.user.currentBalance)
    } catch {
      setBalance(0)
    }
    setOpenPayBill(true)
  }

  const openRechargeHandler = async () => {
    try {
      const data = await apiFetch("/user/me")
      setBalance(data.user.currentBalance)
    } catch {
      setBalance(0)
    }
    setOpenRecharge(true)
  }

  const openMakePaymentHandler = async () => {
    try {
      const data = await apiFetch("/user/me")
      setBalance(data.user.currentBalance)
    } catch {
      setBalance(0)
    }
    setOpenMakePayment(true)
  }

  const openDonationHandler = async () => {
    try {
      const data = await apiFetch("/user/me")
      setBalance(data.user.currentBalance)
    } catch {
      setBalance(0)
    }
    setOpenDonation(true)
  }

  const openFinTrackHandler = () => {
    setOpenFinTrack(true)
  }

  const openBudgetGoalsHandler = () => {
    setOpenFinTrack(false)
    setOpenBudgetGoals(true)
  }

  if (openSend) {
    return <SendMoney user={user} balance={balance} onClose={() => setOpenSend(false)} />
  }

  if (openPayBill) {
    return <PayBill user={user} balance={balance} onClose={() => setOpenPayBill(false)} />
  }

  if (openRecharge) {
    return <MobileRecharge user={user} balance={balance} onClose={() => setOpenRecharge(false)} />
  }

  if (openMakePayment) {
    return <MakePayment user={user} balance={balance} onClose={() => setOpenMakePayment(false)} />
  }

  if (openDonation) {
    return <Donation user={user} balance={balance} onClose={() => setOpenDonation(false)} />
  }

  if (openFinTrack) {
    return <FinTrack user={user} onClose={() => setOpenFinTrack(false)} onPlanMonth={openBudgetGoalsHandler} />
  }

  if (openBudgetGoals) {
    return (
      <BudgetGoals
        user={user}
        onClose={() => {
          setOpenBudgetGoals(false)
          setOpenFinTrack(true)
        }}
      />
    )
  }

  return (
    <div className="flex h-full flex-col bg-blue-50">
      {section === "Home" && (
        <>
      {/* Header */}
      <div className=" bg-blue-800 px-10 pb-10 pt-15 text-white shadow-md">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSection("Profile")}
            aria-label="Open profile"
            className="flex items-center gap-3 rounded-full transition active:scale-95"
          >
            <div className="flex size-10 items-center justify-center rounded-full bg-white/20">
              <span className="text-lg font-bold">{user?.name?.[0]?.toUpperCase() ?? "U"}</span>
            </div>
            <div className="text-left">
              <p className="text-xs text-blue-100">Welcome back</p>
              <p className="text-sm font-bold leading-tight">{user?.name ?? "User"}</p>
            </div>
          </button>
          <button
            onClick={checkBalance}
            className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold"
          >
            {showBalance ? `৳ ${balance ?? 0}` : "Check Balance"}
          </button>
        </div>
      </div>
      {balError && <p className="px-5 pt-3 text-xs text-red-500">{balError}</p>}

      <div className="no-scrollbar flex-1 overflow-y-auto px-5 py-5">
        {/* Emergency security alert */}
        {redAlerts.length > 0 && (
          <div className="mb-4 rounded-2xl bg-red-600 p-4 text-white shadow-md">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-5" />
              <h3 className="text-sm font-bold">Security Alert</h3>
              {redAlerts.length > 1 && (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">
                  +{redAlerts.length - 1} more
                </span>
              )}
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-red-100">
              {redAlerts[0].message}
            </p>
            <p className="mt-1 text-[10px] font-semibold text-red-200">
              {redAlerts[0].confidence}% confidence
            </p>
            <AlertFollowUp
              alert={redAlerts[0]}
              variant="banner"
              onUpdated={handleAlertUpdated}
              onError={(msg) => setAlertNotice(msg)}
            />
          </div>
        )}

        {alertNotice && (
          <p className="mb-4 rounded-xl bg-blue-100 px-4 py-2.5 text-xs font-semibold text-blue-700">
            {alertNotice}
          </p>
        )}

        {/* Main services */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="grid grid-cols-3 gap-4">
            {MAIN_SERVICES.map(({ icon: Icon, label }) => (
              <button
                key={label}
                onClick={label === "Send Money" ? openSendMoney : label === "Pay Bill" ? openPayBillHandler : label === "Mobile Recharge" ? openRechargeHandler : label === "Make Payment" ? openMakePaymentHandler : label === "Donation" ? openDonationHandler : undefined}
                className="group flex flex-col items-center gap-2 transition-transform duration-150 active:scale-90"
              >
                <span className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-all duration-150 group-hover:bg-blue-100 group-active:scale-90">
                  <Icon className="size-5 transition-transform duration-150 group-active:scale-110" />
                </span>
                <span className="text-center text-[11px] font-medium leading-tight text-gray-600">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Hero banner */}
        <div className="mt-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-400 p-5 text-white shadow-md">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-100">Limited Offer</p>
          <h2 className="mt-1 text-lg font-bold leading-snug">Get 10% cashback on your first Send Money</h2>
          <button className="mt-3 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-blue-600">
            Claim Now
          </button>
        </div>

        {/* More services */}
        <h3 className="mt-5 text-sm font-bold text-gray-900">More Services</h3>
        <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
          <div className="grid grid-cols-3 gap-4">
            {MORE_SERVICES.map(({ icon: Icon, label }) => (
              <button key={label} className="flex flex-col items-center gap-2">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Icon className="size-5" />
                </span>
                <span className="text-center text-[11px] font-medium leading-tight text-gray-600">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Fin-Track */}
        <div className="mt-5 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-blue-600" />
            <h3 className="text-sm font-bold text-gray-900">Fin-Track</h3>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-600">AI</span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
            Your AI-powered personal finance guide. Track spending, get saving tips, and stay on budget.
          </p>
          <button className="mt-3 w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white" onClick={openFinTrackHandler}>
            Open Fin-Track
          </button>
        </div>

      </div>
        </>
      )}

      {section !== "Home" && (
        <div className="min-h-0 flex-1">
          {section === "Profile" && <Profile user={user} onLogout={onLogout} />}
          {section === "Transactions" && <Transactions />}
          {section === "Notifications" && <Notifications />}
          {section === "Offers" && <Offers />}
        </div>
      )}

      <BottomNav active={section} onChange={setSection} onLogout={onLogout} />
    </div>
  )
}
