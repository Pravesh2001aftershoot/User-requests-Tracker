export const BUCKETS = ["gallery", "brandkit", "collection", "store", "marketing"] as const
export type Bucket = (typeof BUCKETS)[number]

export const PRIORITIES = ["quickwin", "p1", "p2", "p3", "later"] as const
export type Priority = (typeof PRIORITIES)[number]

/** One feature request, as seeded from the sheet or added by a morning digest. */
export interface Request {
  id: string
  n: number
  /** YYYY-MM-DD */
  date: string
  text: string
  category: string
  mentions: number
  origin: string
  source: string
  links: string[]
  /** Suggested bucket. The user's choice lives in triage. */
  bucket: Bucket
  /** Set on rows that came from the "requests" collection. */
  addedAt?: string
  addedBy?: string
}

/** A user's triage decision for one request (doc id = request id). */
export interface TriageEntry {
  bucket?: Bucket
  priority?: Priority
  at: number
}

export type TriageMap = Record<string, TriageEntry>

export type SyncStatus = "connecting" | "synced" | "local" | "readonly"

/** When requests were last pulled in, for the header indicator. */
export interface LastFetch {
  /** Epoch ms. */
  at: number
  /** "digest": a morning digest run or a row it filed. "seed": only the bundled log. */
  kind: "digest" | "seed"
  by?: string
  added?: number
  repeats?: number
}

export type PriorityFilter = "all" | "untriaged" | Priority
export type SortKey = "mentions" | "newest" | "oldest" | "priority"

export interface Filters {
  bucket: "all" | Bucket
  priority: PriorityFilter
  origin: string
  newOnly: boolean
  query: string
  sort: SortKey
}

/** A request joined with its triage state. */
export interface Row extends Request {
  suggested: Bucket
  effectiveBucket: Bucket
  priority?: Priority
  isNew: boolean
}
