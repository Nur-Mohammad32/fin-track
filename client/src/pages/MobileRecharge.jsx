import { useState } from "react"
import { ArrowLeft, CheckCircle2, Loader2, XCircle } from "lucide-react"
import { apiFetch } from "../lib/api"

export default function MobileRecharge({ user, balance, onClose }) {
  const [step, setStep] = useState(1)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [amount, setAmount] = useState("")
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

  const recharge = async () => {
    setError("")
    if (pin.length < 4) return setError("Enter a valid PIN")
    setStep(4)
    const minDelay = new Promise((r) => setTimeout(r, 1500))
    try {
      const [data] = await Promise.all([
        apiFetch("/transaction", {
          method: "POST",
          body: JSON.stringify({
            to: phoneNumber,
            amount: Number(amount),
            pin,
            transactionType: "payment",
            category: "communication",
            reference: `Mobile: ${phoneNumber}`,
            transactionDate: new Date().toISOString(),
          }),
        }),
        minDelay,
      ])
      setResult(data)
      setTxnId(data.transaction?.transactionId ?? "")
      setStep(5)
    } catch (err) {
      setFailMsg(err.message)
      setStep(6)
    }
  }

  const inputCls =
    "mt-1.5 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-purple-500"
  const btnCls =
    "mt-4 h-12 w-full rounded-2xl bg-purple-600 text-sm font-bold text-white transition hover:bg-purple-700 disabled:opacity-60"

  return (
    <div className="animate-slide-in flex h-full flex-col bg-purple-50">
      <div className="flex items-center gap-3 bg-purple-600 px-5 pb-5 pt-10 text-white">
        {step < 4 && (
          <button onClick={step === 1 ? onClose : back}>
            <ArrowLeft className="size-5" />
          </button>
        )}
        <h1 className="text-base font-bold">Mobile Recharge</h1>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto p-5">
        {/* Step 1: Phone Number */}
        {step === 1 && (
          <>
            <h2 className="text-lg font-bold text-gray-900">Mobile Number</h2>
            <p className="text-xs text-gray-400">Enter the number you want to recharge</p>
            <div className="mt-5">
              <label className="text-sm font-semibold text-gray-900">Mobile Number</label>
              <input
                className={inputCls}
                placeholder="01XXXXXXXXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
            {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
            <button
              className={btnCls}
              onClick={() =>
                goNext(() => {
                  if (!phoneNumber.trim()) return "Mobile number is required"
                  if (!/^01[3-9]\d{8}$/.test(phoneNumber.trim())) return "Enter a valid mobile number"
                  return ""
                })
              }
            >
              Next
            </button>
          </>
        )}

        {/* Step 2: Amount */}
        {step === 2 && (
          <>
            <h2 className="text-lg font-bold text-gray-900">Recharge Amount</h2>
            <p className="text-xs text-gray-400">Available balance: <span className="font-bold text-purple-600">৳ {balance ?? 0}</span></p>
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

        {/* Step 3: PIN */}
        {step === 3 && (
          <>
            <h2 className="text-lg font-bold text-gray-900">Confirm with PIN</h2>
            <div className="mt-4 rounded-2xl bg-white p-4 text-sm shadow-sm">
              <Row label="Mobile Number" value={phoneNumber} />
              <Row label="Amount" value={`৳ ${amount}`} />
              <Row label="Category" value="Communication" />
            </div>
            <div className="mt-4">
              <label className="text-sm font-semibold text-gray-900">PIN</label>
              <input type="password" inputMode="numeric" className={inputCls} placeholder="Enter your PIN" value={pin} onChange={(e) => setPin(e.target.value)} />
            </div>
            {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
            <button className={btnCls} onClick={recharge}>Recharge</button>
          </>
        )}

        {/* Step 4: Processing */}
        {step === 4 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Loader2 className="size-14 animate-spin text-purple-600" />
            <h2 className="mt-5 text-lg font-bold text-gray-900">Processing your recharge...</h2>
            <p className="mt-1 text-xs text-gray-400">Please wait, do not close the app</p>
          </div>
        )}

        {/* Step 5: Success */}
        {step === 5 && (
          <div className="flex flex-col items-center pt-6 text-center">
            <CheckCircle2 className="size-16 text-green-500" />
            <h2 className="mt-4 text-xl font-bold text-gray-900">Recharge Successful</h2>
            <p className="mt-1 text-2xl font-bold text-purple-600">৳ {amount}</p>
            <div className="mt-6 w-full rounded-2xl bg-white p-4 text-sm shadow-sm">
              <Row label="Mobile Number" value={phoneNumber} />
              <Row label="Category" value={result?.category ?? "—"} />
              <Row label="New Balance" value={`৳ ${result?.balance ?? 0}`} />
              <Row label="Transaction ID" value={txnId} />
            </div>
            <button className={btnCls} onClick={onClose}>Done</button>
          </div>
        )}

        {/* Step 6: Failure */}
        {step === 6 && (
          <div className="flex flex-col items-center pt-6 text-center">
            <XCircle className="size-16 text-red-500" />
            <h2 className="mt-4 text-xl font-bold text-gray-900">Recharge Failed</h2>
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
