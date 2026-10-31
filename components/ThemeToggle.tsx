"use client"

import { Moon, Sun } from "lucide-react"
import { useEffect, useState } from "react"

/** Gece / gündüz modu düğmesi. Seçim tarayıcıda saklanır. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"))
  }, [])

  function toggle() {
    const next = !dark
    const root = document.documentElement
    root.classList.toggle("dark", next)
    root.classList.toggle("light", !next)
    try {
      localStorage.setItem("theme", next ? "dark" : "light")
    } catch {}
    setDark(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Gündüz moduna geç" : "Gece moduna geç"}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:bg-muted ${className}`}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
