const API_BASE = `${import.meta.env.VITE_API_URL || ""}/api`

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token")
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.message || "Something went wrong")
  }
  return data
}
