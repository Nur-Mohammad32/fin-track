import { useState } from "react"
import { ArrowLeft, CheckCircle2, Loader2, XCircle } from "lucide-react"
import { apiFetch } from "../lib/api"

export default function Donation({ user, balance, onClose }) {
  const [step, setStep] = useState(1)
  const [recipient, setRecipient] = useState("")
  const [reference, setReference] = useState("")
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const [txnId, setTxnId] = useState("")
  const [result, setResult] = useState(null)
  const [failMsg, setFailMsg] = useState("")

  const goNext = (validate) => {
    const msg = validate?.()
    if (msg) return setError(msg)
    setError("")
    setStep((s) => s + 1)
  }

  const back = () => {
    setError("")
    setStep((s) => Math.max(1, s - 1))
  }

  const donate = async () => {
    setError("")
    if (pin.length < 4) return setError("Enter a valid PIN")
    setStep(5)
    const minDelay = new Promise((r) => setTimeout(r, 1500))
    try {
      const [data] = await Promise.all([
        apiFetch("/transaction", {
          method: "POST",
          body: JSON.stringify({
            to: recipient,
            amount: Number(amount),
            pin,
            transactionType: "payment",
            category: "donation",
            reference,
            user_note: note,
            transactionDate: new Date().toISOString(),
          }),
        }),
        minDelay,
      ])
      setResult(data)
      setTxnId(data.transaction?.transactionId ?? "")
      setStep(6)
    } catch (err) {
      setFailMsg(err.message)
      setStep(7)
    }
  }

  const inputCls =
    "mt-1.5 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-blue-500"
  const btnCls =
    "mt-4 h-12 w-full rounded-2xl bg-blue-600 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"

  return (
    <div className="animate-slide-in flex h-full flex-col bg-blue-50">
      <div className="flex items-center gap-3 bg-blue-600 px-5 pb-5 pt-10 text-white">
        {step < 5 && (
          <button onClick={step === 1 ? onClose : back}>
            <ArrowLeft className="size-5" />
          </button>
        )}
        <h1 className="text-base font-bold">Donation</h1>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto p-5">
        {/* Step 1: Recipient */}
        {step === 1 && (
          <>
            <h2 className="text-lg font-bold text-gray-900">Recipient</h2>
            <p className="text-xs text-gray-400">Enter recipient name or mobile number</p>
            <div className="mt-5">
              <label className="text-sm font-semibold text-gray-900">Name / Mobile Number</label>
              <input className={inputCls} placeholder="01XXXXXXXXX" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
            </div>
            <div className="mt-4">
              <label className="text-sm font-semibold text-gray-900">Reference</label>
              <input className={inputCls} placeholder="e.g. Rahim Uddin" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
            {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
            <button className={btnCls} onClick={() => goNext(() => !recipient && "Recipient is required")}>Next</button>
          </>
        )}

        {/* Step 2: Amount */}
        {step === 2 && (
          <>
            <h2 className="text-lg font-bold text-gray-900">Amount</h2>
            <p className="text-xs text-gray-400">Available balance: <span className="font-bold text-blue-600">৳ {balance ?? 0}</span></p>
            <div className="mt-5">
              <label className="text-sm font-semibold text-gray-900">Enter amount</label>
              <input type="number" min="0" className={inputCls} placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
            <button
              className={btnCls}
              onClick={() =>
                goNext(() => {
                  if (!amount || Number(amount) <= 0) return "Enter a valid amount"
                  if (Number(amount) > (balance ?? 0)) return "Insufficient Balance"
                  return ""
                })
              }
            >
              Next
            </button>
          </>
        )}

        {/* Step 3: Note */}
        {step === 3 && (
          <>
            <h2 className="text-lg font-bold text-gray-900">Note</h2>
            <p className="text-xs text-gray-400">Add an optional note</p>
            <div className="mt-5">
              <label className="text-sm font-semibold text-gray-900">Note (optional)</label>
              <input className={inputCls} placeholder="e.g. For flood relief" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <button className={btnCls} onClick={() => goNext()}>Next</button>
          </>
        )}

        {/* Step 4: PIN */}
        {step === 4 && (
          <>
            <h2 className="text-lg font-bold text-gray-900">Confirm with PIN</h2>
            <div className="mt-4 rounded-2xl bg-white p-4 text-sm shadow-sm">
              <Row label="Recipient" value={recipient} />
              <Row label="Reference" value={reference || "—"} />
              <Row label="Amount" value={`৳ ${amount}`} />
              <Row label="Note" value={note || "—"} />
            </div>
            <div className="mt-4">
              <label className="text-sm font-semibold text-gray-900">PIN</label>
              <input type="password" inputMode="numeric" className={inputCls} placeholder="Enter your PIN" value={pin} onChange={(e) => setPin(e.target.value)} />
            </div>
            {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
            <button className={btnCls} onClick={donate}>Donate</button>
          </>
        )}

        {/* Step 5: Processing */}
        {step === 5 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Loader2 className="size-14 animate-spin text-blue-600" />
            <h2 className="mt-5 text-lg font-bold text-gray-900">Processing your donation...</h2>
            <p className="mt-1 text-xs text-gray-400">Please wait, do not close the app</p>
          </div>
        )}

        {/* Step 6: Success */}
        {step === 6 && (
          <div className="flex flex-col items-center pt-6 text-center">
            <CheckCircle2 className="size-16 text-green-500" />
            <h2 className="mt-4 text-xl font-bold text-gray-900">Donation Successful</h2>
            <p className="mt-1 text-2xl font-bold text-blue-600">৳ {amount}</p>
            <div className="mt-6 w-full rounded-2xl bg-white p-4 text-sm shadow-sm">
              <Row label="Recipient" value={recipient} />
              <Row label="Reference" value={reference || "—"} />
              <Row label="Note" value={note || "—"} />
              <Row label="Category" value={result?.category ?? "—"} />
              <Row label="Fee" value={`৳ ${result?.fee ?? 0}`} />
              <Row label="New Balance" value={`৳ ${result?.balance ?? 0}`} />
              <Row label="Transaction ID" value={txnId} />
            </div>
            <button className={btnCls} onClick={onClose}>Done</button>
          </div>
        )}

        {/* Step 7: Failure */}
        {step === 7 && (
          <div className="flex flex-col items-center pt-6 text-center">
            <XCircle className="size-16 text-red-500" />
            <h2 className="mt-4 text-xl font-bold text-gray-900">Donation Failed</h2>
            <p className="mt-2 text-sm text-red-500">{failMsg}</p>
            <button className={btnCls} onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-50 py-2 last:border-0">
      <span className="text-gray-400">{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  )
}
