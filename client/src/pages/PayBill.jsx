import { useEffect, useState } from "react"
import {
  ArrowLeft, CheckCircle2, Loader2, XCircle,
  Zap, Droplets, Flame, Wifi, Phone, Receipt,
} from "lucide-react"
import { apiFetch } from "../lib/api"

// Fallback list in case the providers endpoint is unreachable
const FALLBACK_PROVIDERS = [
  { id: "desco", name: "DESCO", type: "Electricity" },
  { id: "dpdc", name: "DPDC", type: "Electricity" },
  { id: "nesco", name: "NESCO", type: "Electricity" },
  { id: "dhaka-wasa", name: "Dhaka WASA", type: "Water" },
  { id: "ctg-wasa", name: "Chattogram WASA", type: "Water" },
  { id: "titas-gas", name: "Titas Gas", type: "Gas" },
  { id: "bakhrabad-gas", name: "Bakhrabad Gas", type: "Gas" },
  { id: "btcl", name: "BTCL", type: "Telephone" },
  { id: "link3", name: "Link3", type: "Internet" },
  { id: "amberit", name: "Amber IT", type: "Internet" },
]

const TYPE_ICONS = {
  Electricity: Zap,
  Water: Droplets,
  Gas: Flame,
  Telephone: Phone,
  Internet: Wifi,
}

export default function PayBill({ user, balance, onClose }) {
  const [step, setStep] = useState(1)
  const [providers, setProviders] = useState(FALLBACK_PROVIDERS)
  const [provider, setProvider] = useState(null)
  const [accountNumber, setAccountNumber] = useState("")
  const [amount, setAmount] = useState("")
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const [txnId, setTxnId] = useState("")
  const [result, setResult] = useState(null)
  const [failMsg, setFailMsg] = useState("")

  useEffect(() => {
    apiFetch("/bill/providers")
      .then((data) => {
        if (Array.isArray(data.providers) && data.providers.length > 0) {
          setProviders(data.providers)
        }
      })
      .catch(() => {
        // keep the fallback list
      })
  }, [])

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

  const pay = async () => {
    setError("")
    if (pin.length < 4) return setError("Enter a valid PIN")
    setStep(4)
    const minDelay = new Promise((r) => setTimeout(r, 1500))
    try {
      const [data] = await Promise.all([
        apiFetch("/bill/pay", {
          method: "POST",
          body: JSON.stringify({
            provider: provider.id,
            accountNumber,
            amount: Number(amount),
            pin,
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
    "mt-1.5 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-blue-500"
  const btnCls =
    "mt-4 h-12 w-full rounded-2xl bg-blue-600 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"

  return (
    <div className="animate-slide-in flex h-full flex-col bg-blue-50">
      <div className="flex items-center gap-3 bg-blue-600 px-5 pb-5 pt-10 text-white">
        {step < 4 && (
          <button onClick={step === 1 ? onClose : back}>
            <ArrowLeft className="size-5" />
          </button>
        )}
        <h1 className="text-base font-bold">Pay Bill</h1>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto p-5">
        {/* Step 1: Provider + Account Number */}
        {step === 1 && (
          <>
            <h2 className="text-lg font-bold text-gray-900">Bill Provider</h2>
            <p className="text-xs text-gray-400">Select your utility provider</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {providers.map((p) => {
                const Icon = TYPE_ICONS[p.type] ?? Receipt
                const isSelected = provider?.id === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => setProvider(p)}
                    className={`flex flex-col items-center gap-2 rounded-2xl border-2 bg-white p-3 transition ${
                      isSelected ? "border-blue-600 bg-blue-50" : "border-transparent"
                    }`}
                  >
                    <span
                      className={`flex size-11 items-center justify-center rounded-2xl ${
                        isSelected ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      <Icon className="size-5" />
                    </span>
                    <span className="text-center text-[11px] font-medium leading-tight text-gray-700">
                      {p.name}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="mt-5">
              <label className="text-sm font-semibold text-gray-900">Account / Customer Number</label>
              <input
                className={inputCls}
                placeholder="e.g. 123456789"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
              />
            </div>
            {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
            <button
              className={btnCls}
              onClick={() =>
                goNext(() => {
                  if (!provider) return "Select a bill provider"
                  if (!accountNumber.trim()) return "Account/customer number is required"
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
            <h2 className="text-lg font-bold text-gray-900">Bill Amount</h2>
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

        {/* Step 3: PIN */}
        {step === 3 && (
          <>
            <h2 className="text-lg font-bold text-gray-900">Confirm with PIN</h2>
            <div className="mt-4 rounded-2xl bg-white p-4 text-sm shadow-sm">
              <Row label="Provider" value={provider?.name ?? "—"} />
              <Row label="Account No" value={accountNumber} />
              <Row label="Amount" value={`৳ ${amount}`} />
            </div>
            <div className="mt-4">
              <label className="text-sm font-semibold text-gray-900">PIN</label>
              <input type="password" inputMode="numeric" className={inputCls} placeholder="Enter your PIN" value={pin} onChange={(e) => setPin(e.target.value)} />
            </div>
            {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
            <button className={btnCls} onClick={pay}>Pay Bill</button>
          </>
        )}

        {/* Step 4: Processing */}
        {step === 4 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Loader2 className="size-14 animate-spin text-blue-600" />
            <h2 className="mt-5 text-lg font-bold text-gray-900">Processing your bill payment...</h2>
            <p className="mt-1 text-xs text-gray-400">Please wait, do not close the app</p>
          </div>
        )}

        {/* Step 5: Success */}
        {step === 5 && (
          <div className="flex flex-col items-center pt-6 text-center">
            <CheckCircle2 className="size-16 text-green-500" />
            <h2 className="mt-4 text-xl font-bold text-gray-900">Bill Payment Successful</h2>
            <p className="mt-1 text-2xl font-bold text-blue-600">৳ {amount}</p>
            <div className="mt-6 w-full rounded-2xl bg-white p-4 text-sm shadow-sm">
              <Row label="Provider" value={provider?.name ?? "—"} />
              <Row label="Account No" value={accountNumber} />
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
            <h2 className="mt-4 text-xl font-bold text-gray-900">Bill Payment Failed</h2>
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
