import { useCallback, useMemo, useState } from "react"
import { toast } from "sonner"

import { BucketGrid } from "@/components/bucket-grid"
import { DemandBars } from "@/components/demand-bars"
import { RequestList } from "@/components/request-list"
import { StatCards } from "@/components/stat-cards"
import { TrackerHeader } from "@/components/tracker-header"
import { Toaster } from "@/components/ui/sonner"
import { buildRows, copyText, toCsv } from "@/lib/rows"
import { readLocal, useTracker, writeLocal } from "@/lib/store"
import { BUCKET_META, PRIORITY_META, isBucket, isPriority } from "@/lib/taxonomy"
import { useTheme } from "@/lib/theme"
import type { Bucket, Filters, Priority, Row } from "@/lib/types"

const FILTERS_KEY = "urt:filters:v1"
const DEFAULT_FILTERS: Filters = {
  bucket: "all",
  priority: "all",
  origin: "all",
  newOnly: false,
  query: "",
  sort: "mentions",
}

function loadFilters(): Filters {
  const raw = readLocal<Partial<Filters>>(FILTERS_KEY, {})
  const f = { ...DEFAULT_FILTERS }
  if (raw && typeof raw === "object") {
    if (raw.bucket === "all" || isBucket(raw.bucket)) f.bucket = raw.bucket
    if (raw.priority === "all" || raw.priority === "untriaged" || isPriority(raw.priority))
      f.priority = raw.priority
    if (typeof raw.origin === "string") f.origin = raw.origin
    if (typeof raw.newOnly === "boolean") f.newOnly = raw.newOnly
    if (typeof raw.query === "string") f.query = raw.query.slice(0, 200)
    if (raw.sort && ["mentions", "newest", "oldest", "priority"].includes(raw.sort)) f.sort = raw.sort
  }
  return f
}

export default function App() {
  const tracker = useTracker()
  const { update } = tracker
  const theme = useTheme()
  const [filters, setFiltersState] = useState<Filters>(loadFilters)

  const setFilters = useCallback((patch: Partial<Filters>) => {
    setFiltersState((prev) => {
      const next = { ...prev, ...patch }
      writeLocal(FILTERS_KEY, next)
      return next
    })
  }, [])

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS)
    writeLocal(FILTERS_KEY, DEFAULT_FILTERS)
  }, [])

  const rows = useMemo(() => buildRows(tracker.requests, tracker.triage), [tracker.requests, tracker.triage])
  const isDefault = JSON.stringify(filters) === JSON.stringify(DEFAULT_FILTERS)

  const save = useCallback(
    async (row: Row, change: Parameters<typeof update>[1], message: string, undo: () => void) => {
      const id = toast.success(message, { action: { label: "Undo", onClick: undo } })
      const ok = await update(row.id, change)
      if (!ok) {
        toast.dismiss(id)
        toast.error(`Couldn't save #${row.n}. Your change was undone.`)
      }
    },
    [update],
  )

  const onBucket = useCallback(
    (row: Row, bucket: Bucket | null) => {
      const target = bucket ?? row.suggested
      const prevOverride = row.effectiveBucket === row.suggested ? null : row.effectiveBucket
      // Picking the suggested bucket clears the override instead of storing a copy.
      const stored = target === row.suggested ? null : target
      void save(
        row,
        { bucket: stored },
        bucket
          ? `#${row.n} moved to ${BUCKET_META[target].label}`
          : `#${row.n} back in ${BUCKET_META[target].label}`,
        () => void update(row.id, { bucket: prevOverride }),
      )
    },
    [save, update],
  )

  const onPriority = useCallback(
    (row: Row, priority: Priority | null) => {
      const prev = row.priority ?? null
      void save(
        row,
        { priority },
        priority ? `#${row.n} set to ${PRIORITY_META[priority].label}` : `#${row.n} priority cleared`,
        () => void update(row.id, { priority: prev }),
      )
    },
    [save, update],
  )

  const onPick = useCallback(
    (bucket: Filters["bucket"], priority: Filters["priority"]) => {
      setFilters({ bucket, priority, origin: "all", newOnly: false, query: "" })
      document.getElementById("requests")?.scrollIntoView({ behavior: "smooth", block: "start" })
    },
    [setFilters],
  )

  const onCopyCsv = async () => {
    const ok = await copyText(toCsv(rows))
    if (ok) toast.success(`Copied ${rows.length} requests as CSV`)
    else toast.error("Your browser blocked the clipboard. Try again from a regular browser tab.")
  }

  return (
    <div className="min-h-full bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 pr-[max(16px,env(safe-area-inset-right,0px))] pl-[max(16px,env(safe-area-inset-left,0px))] py-6 sm:gap-6 sm:py-8">
        <TrackerHeader
          status={tracker.status}
          theme={theme.pref}
          resolvedTheme={theme.resolved}
          onTheme={(t) => {
            theme.setPref(t)
            toast(`Theme: ${t === "system" ? "System" : t === "dark" ? "Dark" : "Light"}`)
          }}
          onCopyCsv={onCopyCsv}
        />
        <StatCards rows={rows} />
        <div className="grid min-w-0 gap-5 sm:gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <BucketGrid rows={rows} active={filters} onPick={onPick} />
          <DemandBars rows={rows} />
        </div>
        <RequestList
          rows={rows}
          filters={filters}
          setFilters={setFilters}
          isDefault={isDefault}
          onReset={resetFilters}
          canWrite={tracker.canWrite}
          onBucket={onBucket}
          onPriority={onPriority}
        />
      </main>
      <Toaster theme={theme.resolved} position="bottom-right" />
    </div>
  )
}
