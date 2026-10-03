import { Home as HomeIcon, ArrowLeftRight, Bell, Tag, LogOut } from "lucide-react"

const NAV_ITEMS = [
  { icon: HomeIcon, label: "Home" },
  { icon: ArrowLeftRight, label: "Transactions" },
  { icon: Bell, label: "Notifications" },
  { icon: Tag, label: "Offers" },
  { icon: LogOut, label: "Logout" },
]

export default function BottomNav({ active = "Home", onChange, onLogout }) {
  return (
    <nav className="sticky bottom-0 z-20 rounded-t-3xl bg-white px-2 pb-4 pt-2 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-around">
        {NAV_ITEMS.map(({ icon: Icon, label }) => {
          const isActive = active === label
          const handleClick =
            label === "Logout" ? onLogout : () => onChange?.(label)
          return (
            <button
              key={label}
              onClick={handleClick}
              aria-label={label}
              className={`flex flex-1 flex-col items-center gap-1 py-1 text-[10px] font-medium transition ${
                isActive ? "text-blue-600" : "text-gray-400"
              }`}
            >
              <span
                className={`flex size-9 items-center justify-center rounded-full transition ${
                  isActive ? "bg-blue-50" : ""
                }`}
              >
                <Icon className="size-5" />
              </span>
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
