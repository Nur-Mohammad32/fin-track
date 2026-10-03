export default function PhoneFrame({ children }) {
  return (
    <div className="min-h-screen bg-gray-400 flex items-center justify-center p-4">
      <div className="relative h-[calc(100vh-2rem)] aspect-[410/844] max-w-full bg-[#f4f1fa] rounded-[40px] shadow-2xl overflow-hidden border-8 border-black">
        {/* Punch-hole camera */}
        <div className="absolute left-1/2 top-3 z-20 size-3 -translate-x-1/2 rounded-full bg-black" />
        {/* Status bar */}
        <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between px-7 pt-2.5 text-xs font-semibold text-gray-900">
          <span>9:41</span>
          <span className="flex items-center gap-1.5">
            {/* signal */}
            <svg width="17" height="12" viewBox="0 0 14 10" fill="currentColor"><rect x="0" y="6" width="3" height="4" rx="1"/><rect x="4" y="4" width="3" height="6" rx="1"/><rect x="8" y="2" width="3" height="8" rx="1"/><rect x="12" y="0" width="2" height="10" rx="1"/></svg>
            {/* wifi */}
            <svg width="17" height="14" viewBox="0 0 24 18" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 6a15 15 0 0 1 20 0M5.5 10a10 10 0 0 1 13 0M9 14a5 5 0 0 1 6 0"/><circle cx="12" cy="16.5" r="1.2" fill="currentColor" stroke="none"/></svg>
            {/* battery */}
            <svg width="26" height="13" viewBox="0 0 25 12" fill="none"><rect x="0.5" y="0.5" width="20" height="11" rx="3" stroke="currentColor"/><rect x="2.5" y="2.5" width="14" height="7" rx="1.5" fill="currentColor"/><path d="M23 4v4a2 2 0 0 0 0-4z" fill="currentColor"/></svg>
          </span>
        </div>
        <div className="h-full">{children}</div>
      </div>
    </div>
  )
}
