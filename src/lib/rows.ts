import { BUCKET_META, PRIORITY_META } from "./taxonomy"
import { PRIORITIES, type Filters, type Request, type Row, type TriageMap } from "./types"

const DAY = 86_400_000
const toTime = (d: string) => Date.parse(d + "T00:00:00Z")

/**
 * "New this week" means within 7 days of the newest request in the log, so
 * the flag stays meaningful between digests instead of emptying on a quiet week.
 */
export function newCutoff(requests: Request[]) {
  const newest = requests.reduce((m, r) => Math.max(m, toTime(r.date) || 0), 0)
  return newest - 6 * DAY
}

export function buildRows(requests: Request[], triage: TriageMap): Row[] {
  const cutoff = newCutoff(requests)
  return requests.map((r) => {
    const t = triage[r.id]
    return {
      ...r,
      suggested: r.bucket,
      effectiveBucket: t?.bucket ?? r.bucket,
      priority: t?.priority,
      isNew: toTime(r.date) >= cutoff,
    }
  })
}

const PRIORITY_RANK = Object.fromEntries(PRIORITIES.map((p, i) => [p, i])) as Record<string, number>

export function applyFilters(rows: Row[], f: Filters, opts: { ignoreBucket?: boolean } = {}) {
  const q = f.query.trim().toLowerCase()
  const out = rows.filter((r) => {
    if (!opts.ignoreBucket && f.bucket !== "all" && r.effectiveBucket !== f.bucket) return false
    if (f.priority === "untriaged" ? r.priority : f.priority !== "all" && r.priority !== f.priority)
      return false
    if (f.origin !== "all" && r.origin !== f.origin) return false
    if (f.newOnly && !r.isNew) return false
    if (q) {
      const hay = `#${r.n} ${r.text} ${r.category} ${r.source} ${r.origin}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
  const byNewest = (a: Row, b: Row) => b.date.localeCompare(a.date) || b.n - a.n
  out.sort((a, b) => {
    switch (f.sort) {
      case "newest":
        return byNewest(a, b)
      case "oldest":
        return a.date.localeCompare(b.date) || a.n - b.n
      case "priority": {
        const pa = a.priority ? PRIORITY_RANK[a.priority] : 99
        const pb = b.priority ? PRIORITY_RANK[b.priority] : 99
        return pa - pb || b.mentions - a.mentions || byNewest(a, b)
      }
      default:
        return b.mentions - a.mentions || byNewest(a, b)
    }
  })
  return out
}

const csvCell = (v: unknown) => {
  const s = String(v ?? "")
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(rows: Row[]) {
  const header = [
    "#", "Date", "Request", "Bucket", "Suggested bucket", "Priority", "Mentions",
    "Category", "Origin", "Source", "Links",
  ]
  const lines = [...rows]
    .sort((a, b) => a.n - b.n)
    .map((r) =>
      [
        r.n,
        r.date,
        r.text,
        BUCKET_META[r.effectiveBucket].label,
        BUCKET_META[r.suggested].label,
        r.priority ? PRIORITY_META[r.priority].label : "",
        r.mentions,
        r.category,
        r.origin,
        r.source,
        r.links.join(" "),
      ]
        .map(csvCell)
        .join(","),
    )
  return [header.join(","), ...lines].join("\n")
}

/** Clipboard write with a select-and-copy fallback for viewers that refuse it. */
export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement("textarea")
    ta.value = text
    ta.setAttribute("readonly", "")
    ta.style.position = "fixed"
    ta.style.opacity = "0"
    document.body.appendChild(ta)
    ta.select()
    let ok = false
    try {
      ok = document.execCommand("copy")
    } catch {
      ok = false
    }
    ta.remove()
    return ok
  }
}

export function formatDate(d: string) {
  const t = toTime(d)
  if (!t) return d
  return new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })
}
