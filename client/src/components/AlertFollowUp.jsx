import { useState } from "react"
import { apiFetch } from "../lib/api"
import { getTicketId, createLocalTicket } from "../lib/tickets"

// Shared response flow for a security alert:
//   Phase 1: "Yes, it was me" / "No, it was not me"
//   Phase 2: denied -> "Take necessary steps" / "Ignore"
//   Phase 3: steps panel -> change PIN / create support ticket (frontend only for now)
export default function AlertFollowUp({ alert, variant = "card", onUpdated, onError }) {
    const [stepsOpen, setStepsOpen] = useState(false)
    const [showPinForm, setShowPinForm] = useState(false)
    const [currentPin, setCurrentPin] = useState("")
    const [newPin, setNewPin] = useState("")
    const [pinError, setPinError] = useState("")
    const [pinLoading, setPinLoading] = useState(false)
    const [busy, setBusy] = useState(false)
    const [ticketCreated, setTicketCreated] = useState(false)
    const [trackOpen, setTrackOpen] = useState(false)

    const banner = variant === "banner"
    const denied = alert.userResponse === "denied"
    const tookPin = alert.actionsTaken?.includes("pin_changed")
    const storedTicketId = getTicketId(alert._id)
    const hasTicket = ticketCreated || Boolean(storedTicketId)

    const chips = []
    if (alert.userResponse === "confirmed") {
        chips.push({ text: "You confirmed this", cls: banner ? "bg-green-400/20 text-green-100" : "bg-green-100 text-green-700" })
    }
    if (denied && !alert.followUp) {
        chips.push({ text: "Reported as not you", cls: banner ? "bg-white/20 text-red-100" : "bg-red-100 text-red-700" })
    }
    if (alert.followUp === "ignored") {
        chips.push({ text: "Ignored — alert remains active", cls: banner ? "bg-amber-400/20 text-amber-100" : "bg-amber-100 text-amber-700" })
    }
    if (tookPin) {
        chips.push({ text: "PIN changed", cls: banner ? "bg-purple-400/20 text-purple-100" : "bg-purple-100 text-purple-700" })
    }
    if (ticketCreated || storedTicketId) {
        chips.push({ text: "Support ticket created", cls: banner ? "bg-purple-400/20 text-purple-100" : "bg-purple-100 text-purple-700" })
    }

    const handleCreateTicket = () => {
        // Optimistic + persisted: save locally first (instant UI, survives
        // reload), then sync to the backend so the alert is marked handled
        // (confidence 65) and stays off the home banner on any device.
        const ticketId = createLocalTicket(alert._id)
        setTicketCreated(true)
        onUpdated?.({ ...alert, supportTicketId: ticketId }, "support_ticket")
        apiFetch(`/alerts/${alert._id}/ticket`, { method: "POST" })
            .then((data) => onUpdated?.(data.data, "support_ticket"))
            .catch((err) => console.warn("Ticket backend sync failed:", err.message))
    }

    const callFollowUp = async (action, context) => {
        setBusy(true)
        try {
            const data = await apiFetch(`/alerts/${alert._id}/follow-up`, {
                method: "PATCH",
                body: JSON.stringify({ action }),
            })
            onUpdated?.(data.data, context)
        } catch (err) {
            onError?.(err.message)
        } finally {
            setBusy(false)
        }
    }

    const handleRespond = async (wasMe) => {
        setBusy(true)
        try {
            const data = await apiFetch(`/alerts/${alert._id}/respond`, {
                method: "PATCH",
                body: JSON.stringify({ confirmed: wasMe }),
            })
            onUpdated?.(data.data, "respond")
        } catch (err) {
            onError?.(err.message)
        } finally {
            setBusy(false)
        }
    }

    const handlePinSubmit = async (e) => {
        e.preventDefault()
        setPinError("")
        setPinLoading(true)
        try {
            await apiFetch("/auth/users/change-pin", {
                method: "PATCH",
                body: JSON.stringify({ currentPin, newPin }),
            })
            setShowPinForm(false)
            setCurrentPin("")
            setNewPin("")
            await callFollowUp("pin_changed", "pin_changed")
        } catch (err) {
            setPinError(err.message)
        } finally {
            setPinLoading(false)
        }
    }

    return (
        <div className="mt-3">
            {chips.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                    {chips.map((chip) => (
                        <span key={chip.text} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${chip.cls}`}>
                            {chip.text}
                        </span>
                    ))}
                </div>
            )}

            {!alert.userResponse && (
                <div className="flex gap-2">
                    <button onClick={() => handleRespond(true)} disabled={busy} className={`flex-1 rounded-xl py-2 text-xs font-bold transition active:scale-95 disabled:opacity-50 ${banner ? "bg-white text-red-600" : "bg-white text-gray-700 shadow-sm"}`}>
                        Yes, it was me
                    </button>
                    <button onClick={() => handleRespond(false)} disabled={busy} className={`flex-1 rounded-xl py-2 text-xs font-bold transition active:scale-95 disabled:opacity-50 ${banner ? "bg-red-700 text-white ring-1 ring-white/30" : "bg-red-600 text-white"}`}>
                        No, it was not me
                    </button>
                </div>
            )}

            {denied && !alert.followUp && !stepsOpen && !hasTicket && (
                <div className="flex gap-2">
                    <button onClick={() => setStepsOpen(true)} disabled={busy} className={`flex-1 rounded-xl py-2 text-xs font-bold transition active:scale-95 disabled:opacity-50 ${banner ? "bg-white text-red-600" : "bg-purple-600 text-white"}`}>
                        Take necessary steps
                    </button>
                    <button onClick={() => callFollowUp("ignore", "ignore")} disabled={busy} className={`flex-1 rounded-xl py-2 text-xs font-bold transition active:scale-95 disabled:opacity-50 ${banner ? "bg-red-700 text-white ring-1 ring-white/30" : "bg-white text-gray-700 shadow-sm ring-1 ring-gray-200"}`}>
                        Ignore
                    </button>
                </div>
            )}

            {denied && stepsOpen && (
                showPinForm ? (
                    <form onSubmit={handlePinSubmit} className={`rounded-xl p-3 ${banner ? "bg-red-700" : "bg-gray-50 ring-1 ring-gray-100"}`}>
                        <p className={`text-xs font-bold ${banner ? "text-white" : "text-gray-900"}`}>Change PIN</p>
                        <input
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            value={currentPin}
                            onChange={(e) => setCurrentPin(e.target.value)}
                            placeholder="Current PIN"
                            className={`mt-2 w-full rounded-lg px-3 py-2 text-xs outline-none ring-1 focus:ring-2 ${banner ? "bg-white/10 text-white placeholder-red-200 ring-white/20" : "bg-white text-gray-900 placeholder-gray-400 ring-gray-200"}`}
                        />
                        <input
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value)}
                            placeholder="New PIN"
                            className={`mt-2 w-full rounded-lg px-3 py-2 text-xs outline-none ring-1 focus:ring-2 ${banner ? "bg-white/10 text-white placeholder-red-200 ring-white/20" : "bg-white text-gray-900 placeholder-gray-400 ring-gray-200"}`}
                        />
                        {pinError && <p className="mt-1.5 text-[10px] font-semibold text-red-300">{pinError}</p>}
                        <div className="mt-2 flex gap-2">
                            <button type="submit" disabled={pinLoading} className="flex-1 rounded-xl bg-white py-2 text-xs font-bold text-red-600 disabled:opacity-50">
                                {pinLoading ? "Saving..." : "Change PIN"}
                            </button>
                            <button type="button" onClick={() => { setShowPinForm(false); setPinError("") }} className={`flex-1 rounded-xl py-2 text-xs font-bold ${banner ? "bg-white/10 text-white" : "bg-white text-gray-600 ring-1 ring-gray-200"}`}>
                                Cancel
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => setShowPinForm(true)} disabled={tookPin || busy} className={`flex-1 rounded-xl py-2 text-xs font-bold transition active:scale-95 disabled:opacity-50 ${banner ? "bg-white text-red-600" : "bg-purple-600 text-white"}`}>
                            {tookPin ? "PIN changed" : "Change PIN"}
                        </button>
                        <button onClick={handleCreateTicket} disabled={hasTicket || busy} className={`flex-1 rounded-xl py-2 text-xs font-bold transition active:scale-95 disabled:opacity-50 ${banner ? "bg-red-700 text-white ring-1 ring-white/30" : "bg-white text-gray-700 shadow-sm ring-1 ring-gray-200"}`}>
                            {hasTicket ? "Ticket created" : "Create support ticket"}
                        </button>
                        <button onClick={() => setStepsOpen(false)} className={`rounded-xl px-4 py-2 text-xs font-bold ${banner ? "bg-white/10 text-white" : "bg-white text-gray-600 ring-1 ring-gray-200"}`}>
                            Done
                        </button>
                    </div>
                )
            )}

            {denied && alert.followUp && !stepsOpen && !hasTicket && (
                <button onClick={() => setStepsOpen(true)} className={`w-full rounded-xl py-2 text-xs font-bold transition active:scale-95 ${banner ? "bg-red-700 text-white ring-1 ring-white/30" : "bg-white text-gray-700 shadow-sm ring-1 ring-gray-200"}`}>
                    Take necessary steps
                </button>
            )}

            {denied && !stepsOpen && hasTicket && (
                <div>
                    <button
                        onClick={() => setTrackOpen((v) => !v)}
                        className="w-full rounded-xl bg-purple-600 py-2 text-xs font-bold text-white transition active:scale-95"
                    >
                        {trackOpen ? "Hide ticket status" : "Track ticket"}
                    </button>
                    {trackOpen && (
                        <div className={`mt-2 rounded-xl p-3 text-xs leading-relaxed ${banner ? "bg-[#c06a6a]/60 text-red-50" : "bg-gray-50 text-gray-600 ring-1 ring-gray-100"}`}>
                            <p className="font-bold">Unauthorized transaction report</p>
                            <p className="mt-1">
                                Status: <span className="font-bold text-amber-500">Open</span> — our team will contact you.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
