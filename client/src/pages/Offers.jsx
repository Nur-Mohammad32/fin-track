import { Tag } from "lucide-react"

const OFFERS = [
  { id: 1, title: "10% cashback on Send Money", desc: "Up to ৳200 on your first transaction.", tag: "New" },
  { id: 2, title: "Free mobile recharge", desc: "Get ৳50 bonus on recharge above ৳300.", tag: "Hot" },
  { id: 3, title: "5% off on bill payments", desc: "Electricity, gas and water bills.", tag: "Weekend" },
]

export default function Offers() {
  return (
    <div className="flex h-full flex-col bg-blue-50">
      <div className="rounded-b-2xl bg-blue-600 px-5 pb-4 pt-6 text-white shadow-md">
        <h1 className="text-base font-bold">Offers</h1>
      </div>
      <div className="no-scrollbar flex-1 overflow-y-auto px-5 py-5">
        <div className="space-y-3">
          {OFFERS.map((o) => (
            <div key={o.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Tag className="size-5" />
                </span>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-600">
                  {o.tag}
                </span>
              </div>
              <p className="mt-3 text-sm font-bold text-gray-900">{o.title}</p>
              <p className="mt-1 text-xs text-gray-500">{o.desc}</p>
              <button className="mt-3 w-full rounded-xl bg-blue-600 py-2 text-xs font-bold text-white">
                Claim Offer
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
