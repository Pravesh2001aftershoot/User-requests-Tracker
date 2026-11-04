import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"

// Apply the saved theme before first paint so dark viewers don't see a light flash.
;(() => {
  let pref = "system"
  try {
    pref = JSON.parse(localStorage.getItem("urt:theme") ?? '"system"')
  } catch {
    /* storage blocked */
  }
  const attr = document.documentElement.getAttribute("data-theme")
  const dark =
    pref === "dark" ||
    (pref !== "light" &&
      (attr === "dark" || (attr !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches)))
  document.documentElement.classList.toggle("dark", dark)
})()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
