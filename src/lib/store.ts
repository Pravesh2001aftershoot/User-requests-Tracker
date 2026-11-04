import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import seedJson from "@/data/seed-requests.json"
import { isBucket, isPriority, suggestBucket } from "./taxonomy"
import type { Bucket, Priority, Request, SyncStatus, TriageEntry, TriageMap } from "./types"

/* ------------------------------------------------------------------ */
/* Seed data                                                           */
/* ------------------------------------------------------------------ */

export const SEED: Request[] = (seedJson as Request[]).map((r) => ({ ...r, links: [...r.links] }))
const SEED_BY_ID = new Map(SEED.map((r) => [r.id, r]))
const SEED_MAX_N = SEED.reduce((m, r) => Math.max(m, r.n), 0)

const TRIAGE_COLLECTION = "triage"
const REQUESTS_COLLECTION = "requests"
const LOCAL_TRIAGE_KEY = "urt:triage:v1"
const CONNECT_TIMEOUT_MS = 10_000

const MAX_LINKS = 5

/* ------------------------------------------------------------------ */
/* Validation — everything from the shared store is untrusted          */
/* ------------------------------------------------------------------ */

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "")

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const validDate = (v: unknown) =>
  typeof v === "string" && DATE_RE.test(v) && !Number.isNaN(Date.parse(v + "T00:00:00Z")) ? v : ""

function isHttpsUrl(v: unknown): v is string {
  if (typeof v !== "string" || v.length > 2048) return false
  try {
    return new URL(v).protocol === "https:"
  } catch {
    return false
  }
}

export function cleanLinks(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined
  const out: string[] = []
  for (const l of v) {
    const url = typeof l === "string" ? l.trim() : l
    if (isHttpsUrl(url) && !out.includes(url)) out.push(url)
    if (out.length === MAX_LINKS) break
  }
  return out
}

export function clampMentions(v: unknown): number | undefined {
  const n = typeof v === "string" ? Number(v) : v
  if (typeof n !== "number" || !Number.isFinite(n)) return undefined
  return Math.min(99, Math.max(1, Math.round(n)))
}

/**
 * Validate a doc from the "requests" collection. When `base` is a seed row
 * with the same id, the doc overrides it field by field; missing or invalid
 * fields keep the seed value. Returns null when there is no usable text.
 */
export function sanitizeRequest(
  id: string,
  raw: Record<string, unknown>,
  base?: Request,
): Omit<Request, "n"> | null {
  const text = str(raw.text, 2000) || base?.text || ""
  if (!text) return null
  const category = str(raw.category, 80) || base?.category || "Other"
  const addedAt = str(raw.addedAt, 40) || undefined
  return {
    id,
    text,
    category,
    date:
      validDate(raw.date) ||
      base?.date ||
      validDate(addedAt?.slice(0, 10)) ||
      new Date().toISOString().slice(0, 10),
    mentions: clampMentions(raw.mentions) ?? base?.mentions ?? 1,
    origin: str(raw.origin, 60) || base?.origin || "Morning digest",
    source: str(raw.source, 160) || base?.source || "",
    links: cleanLinks(raw.links) ?? base?.links ?? [],
    bucket: isBucket(raw.bucket) ? raw.bucket : (base?.bucket ?? suggestBucket(text, category)),
    addedAt,
    addedBy: str(raw.addedBy, 80) || undefined,
  }
}

export function sanitizeTriage(raw: Record<string, unknown> | undefined): TriageEntry | null {
  if (!raw) return null
  const entry: TriageEntry = { at: typeof raw.at === "number" && Number.isFinite(raw.at) ? raw.at : 0 }
  if (isBucket(raw.bucket)) entry.bucket = raw.bucket
  if (isPriority(raw.priority)) entry.priority = raw.priority
  return entry.bucket || entry.priority ? entry : null
}

/** Seed rows, overridden by same-id docs, plus new docs numbered after the seed. */
export function mergeRequests(remote: Map<string, Record<string, unknown>>): Request[] {
  const overrides = new Map<string, Request>()
  const added: Omit<Request, "n">[] = []
  for (const [id, raw] of remote) {
    const base = SEED_BY_ID.get(id)
    const clean = sanitizeRequest(id, raw, base)
    if (!clean) continue
    if (base) overrides.set(id, { ...clean, n: base.n })
    else added.push(clean)
  }
  added.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      (a.addedAt ?? "").localeCompare(b.addedAt ?? "") ||
      a.id.localeCompare(b.id),
  )
  return [
    ...SEED.map((r) => overrides.get(r.id) ?? r),
    ...added.map((r, i) => ({ ...r, n: SEED_MAX_N + i + 1 })),
  ]
}

/* ------------------------------------------------------------------ */
/* localStorage helpers (may throw or be empty in some viewers)        */
/* ------------------------------------------------------------------ */

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage blocked: keep working in memory */
  }
}

function readLocalTriage(): TriageMap {
  const raw = readLocal<Record<string, Record<string, unknown>>>(LOCAL_TRIAGE_KEY, {})
  const out: TriageMap = {}
  if (raw && typeof raw === "object") {
    for (const [id, v] of Object.entries(raw)) {
      const e = sanitizeTriage(v)
      if (e) out[id] = e
    }
  }
  return out
}

/* ------------------------------------------------------------------ */
/* The hook                                                            */
/* ------------------------------------------------------------------ */

export interface TriageChange {
  bucket?: Bucket | null
  priority?: Priority | null
}

export interface Tracker {
  status: SyncStatus
  requests: Request[]
  triage: TriageMap
  canWrite: boolean
  /** Resolves true when saved, false when refused (state rolled back). */
  update(id: string, change: TriageChange): Promise<boolean>
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))])
}

const toBody = (e: TriageEntry) => {
  const body: Record<string, unknown> = { at: e.at }
  if (e.bucket) body.bucket = e.bucket
  if (e.priority) body.priority = e.priority
  return body
}

export function useTracker(): Tracker {
  const [status, setStatus] = useState<SyncStatus>("connecting")
  const [triage, setTriage] = useState<TriageMap>({})
  const [remote, setRemote] = useState<Map<string, Record<string, unknown>>>(new Map())

  const dbRef = useRef<ClaudeDb | null>(null)
  const modeRef = useRef<"pending" | "db" | "local">("pending")
  const triageRef = useRef<TriageMap>({})
  const writeQueue = useRef(new Map<string, Promise<unknown>>())

  /** Keep the ref (read by update) and the rendered state in step. */
  const replaceTriage = useCallback((map: TriageMap) => {
    triageRef.current = map
    setTriage(map)
  }, [])

  // Connect once.
  useEffect(() => {
    let cancelled = false
    const unsubs: Array<() => void> = []

    const goLocal = () => {
      if (cancelled) return
      modeRef.current = "local"
      dbRef.current = null
      setRemote(new Map())
      replaceTriage(readLocalTriage())
      setStatus("local")
    }

    ;(async () => {
      const claude = window.claude
      if (!claude?.use) return goLocal()
      const db = await withTimeout(claude.use("db").catch(() => null), CONNECT_TIMEOUT_MS)
      if (cancelled) return
      if (!db) return goLocal()

      const user = await withTimeout(claude.use("user").catch(() => null), CONNECT_TIMEOUT_MS)
      const canWrite = user ? await user.can("data.write").catch(() => null) : null
      if (cancelled) return

      dbRef.current = db
      modeRef.current = "db"
      if (canWrite === false) setStatus("readonly")

      let terminal = false
      const onError = (e: ClaudeDbError) => {
        if (terminal || cancelled) return
        terminal = true
        console.warn("[tracker] shared data unavailable:", e.code, e.message)
        unsubs.splice(0).forEach((u) => u())
        goLocal()
      }

      unsubs.push(
        db.collection(TRIAGE_COLLECTION).onSnapshot((snap) => {
          if (cancelled) return
          const next: TriageMap = {}
          for (const d of snap.docs) {
            const e = sanitizeTriage(d.data())
            if (e) next[d.id] = e
          }
          replaceTriage(next)
          if (!snap.metadata.fromCache) setStatus((s) => (s === "readonly" ? s : "synced"))
        }, onError),
      )

      unsubs.push(
        db.collection(REQUESTS_COLLECTION).onSnapshot((snap) => {
          if (cancelled) return
          const next = new Map<string, Record<string, unknown>>()
          for (const d of snap.docs) {
            const data = d.data()
            if (data && typeof data === "object") next.set(d.id, data)
          }
          setRemote(next)
        }, onError),
      )
    })()

    return () => {
      cancelled = true
      unsubs.forEach((u) => u())
    }
  }, [replaceTriage])

  const requests = useMemo(() => mergeRequests(remote), [remote])

  const update = useCallback(async (id: string, change: TriageChange) => {
    if (modeRef.current === "pending") return false
    const prev = triageRef.current[id]
    const next: TriageEntry = { ...prev, at: Date.now() }
    if (change.bucket !== undefined) {
      if (change.bucket) next.bucket = change.bucket
      else delete next.bucket
    }
    if (change.priority !== undefined) {
      if (change.priority) next.priority = change.priority
      else delete next.priority
    }
    const empty = !next.bucket && !next.priority

    const apply = (entry: TriageEntry | undefined) => {
      const map = { ...triageRef.current }
      if (entry) map[id] = entry
      else delete map[id]
      replaceTriage(map)
      return map
    }

    const map = apply(empty ? undefined : next)

    if (modeRef.current === "local") {
      writeLocal(LOCAL_TRIAGE_KEY, map)
      return true
    }

    // One write at a time per doc: chain onto the previous write for this id.
    const db = dbRef.current!
    const ref = db.collection(TRIAGE_COLLECTION).doc(id)
    const prior = writeQueue.current.get(id) ?? Promise.resolve()
    const write = prior.catch(() => {}).then(() => (empty ? ref.delete() : ref.set(toBody(next))))
    writeQueue.current.set(id, write)
    try {
      await write
      return true
    } catch (e) {
      // Roll back only if nothing newer has been applied to this row.
      const current = triageRef.current[id]
      if (empty ? !current : current === next) apply(prev)
      const code = (e as ClaudeDbError)?.code
      if (code === "invalid_argument") setStatus("readonly")
      console.warn("[tracker] write refused:", code, (e as ClaudeDbError)?.message)
      return false
    } finally {
      if (writeQueue.current.get(id) === write) writeQueue.current.delete(id)
    }
  }, [replaceTriage])

  return {
    status,
    requests,
    triage,
    canWrite: status !== "readonly" && status !== "connecting",
    update,
  }
}
