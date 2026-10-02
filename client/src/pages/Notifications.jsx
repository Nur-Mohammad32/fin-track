import { Bell, Gift, ShieldAlert, Percent } from "lucide-react"

const NOTIFICATIONS = [
  { id: 1, icon: Gift, title: "Cashback received", desc: "You got ৳150 cashback on your last payment.", time: "2h ago", color: "bg-green-50 text-green-600" },
  { id: 2, icon: ShieldAlert, title: "Security alert", desc: "New login from a Chrome device on Windows.", time: "5h ago", color: "bg-orange-50 text-orange-500" },
  { id: 3, icon: Percent, title: "New offer available", desc: "10% off on mobile recharge this weekend.", time: "1d ago", color: "bg-blue-50 text-blue-600" },
  { id: 4, icon: Bell, title: "Bill reminder", desc: "Your electricity bill is due in 3 days.", time: "2d ago", color: "bg-purple-50 text-purple-600" },
]

export default function Notifications() {
  return (
    <div className="flex h-full flex-col bg-blue-50">
      <div className="rounded-b-2xl bg-blue-600 px-5 pb-4 pt-6 text-white shadow-md">
        <h1 className="text-base font-bold">Notifications</h1>
      </div>
      <div className="no-scrollbar flex-1 overflow-y-auto px-5 py-5">
        <div className="space-y-3">
          {NOTIFICATIONS.map(({ id, icon: Icon, title, desc, time, color }) => (
            <div key={id} className="flex gap-3 rounded-2xl bg-white p-4 shadow-sm">
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${color}`}>
                <Icon className="size-5" />
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-900">{title}</p>
                  <p className="text-[10px] text-gray-400">{time}</p>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
