import { useEffect, useState, useSyncExternalStore } from "react"

import { readLocal, writeLocal } from "./store"

export type ThemePref = "light" | "dark" | "system"
const KEY = "urt:theme"

/**
 * "system" follows the claude.ai viewer's data-theme attribute on <html>
 * when it is set, otherwise the OS preference.
 */
function systemIsDark() {
  const attr = document.documentElement.getAttribute("data-theme")
  if (attr === "dark") return true
  if (attr === "light") return false
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

function subscribeSystem(cb: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)")
  mq.addEventListener("change", cb)
  const mo = new MutationObserver(cb)
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] })
  return () => {
    mq.removeEventListener("change", cb)
    mo.disconnect()
  }
}

export function useTheme() {
  const [pref, setPref] = useState<ThemePref>(() => {
    const v = readLocal<string>(KEY, "system")
    return v === "light" || v === "dark" ? v : "system"
  })
  const sysDark = useSyncExternalStore(subscribeSystem, systemIsDark, () => false)
  const resolved: "light" | "dark" = pref === "system" ? (sysDark ? "dark" : "light") : pref

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", resolved === "dark")
    root.style.colorScheme = resolved
  }, [resolved])

  const set = (p: ThemePref) => {
    setPref(p)
    writeLocal(KEY, p)
  }

  return { pref, resolved, setPref: set }
}
