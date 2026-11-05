import { RotateCcwIcon, SearchIcon, SparklesIcon } from "lucide-react"

import { RequestRow } from "@/components/request-row"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Toggle } from "@/components/ui/toggle"
import { applyFilters } from "@/lib/rows"
import { BUCKET_META, PRIORITY_OPTIONS } from "@/lib/taxonomy"
import { BUCKETS, type Bucket, type Filters, type Priority, type Row } from "@/lib/types"

const SORTS: Array<{ value: Filters["sort"]; label: string }> = [
  { value: "mentions", label: "Most mentions" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "priority", label: "Priority" },
]

export function RequestList({
  rows,
  filters,
  setFilters,
  isDefault,
  onReset,
  canWrite,
  onBucket,
  onPriority,
}: {
  rows: Row[]
  filters: Filters
  setFilters: (patch: Partial<Filters>) => void
  isDefault: boolean
  onReset: () => void
  canWrite: boolean
  onBucket: (row: Row, bucket: Bucket | null) => void
  onPriority: (row: Row, priority: Priority | null) => void
}) {
  // Tab counts respect every filter except the bucket itself.
  const forTabs = applyFilters(rows, filters, { ignoreBucket: true })
  const visible =
    filters.bucket === "all" ? forTabs : forTabs.filter((r) => r.effectiveBucket === filters.bucket)
  const origins = [...new Set(rows.map((r) => r.origin).filter(Boolean))].sort()
  const tabs: Array<"all" | Bucket> = ["all", ...BUCKETS]

  return (
    <Card id="requests" className="min-w-0 scroll-mt-4 gap-0 pb-0">
      <CardHeader className="pb-4">
        <CardTitle>Requests</CardTitle>
        <CardDescription className="tabular-nums">
          Showing {visible.length} of {rows.length}
        </CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm" onClick={onReset} disabled={isDefault}>
            <RotateCcwIcon data-icon="inline-start" />
            Reset
          </Button>
        </CardAction>
      </CardHeader>

      <div className="flex flex-col gap-3 border-b px-4 pb-4">
        <div className="-mx-4 overflow-x-auto px-4">
          <Tabs
            value={filters.bucket}
            onValueChange={(v) => setFilters({ bucket: v as Filters["bucket"] })}
          >
            <TabsList>
              {tabs.map((t) => {
                const n = t === "all" ? forTabs.length : forTabs.filter((r) => r.effectiveBucket === t).length
                return (
                  <TabsTrigger key={t} value={t} className="px-2.5">
                    {t === "all" ? "All" : BUCKET_META[t].label}
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">{n}</span>
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </Tabs>
        </div>

        <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap">
          <div className="relative col-span-2 sm:w-64">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="request-search"
              type="search"
              placeholder="Search requests, #number, source…"
              value={filters.query}
              onChange={(e) => setFilters({ query: e.target.value })}
              className="pl-8"
              aria-label="Search requests"
            />
          </div>

          <Select
            value={filters.priority}
            onValueChange={(v) => setFilters({ priority: v as Filters["priority"] })}
          >
            <SelectTrigger className="w-full sm:w-[9.5rem]" aria-label="Filter by priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any priority</SelectItem>
              <SelectItem value="untriaged">Untriaged</SelectItem>
              {PRIORITY_OPTIONS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  <span className={`size-2 rounded-full ${p.dot}`} aria-hidden />
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.origin} onValueChange={(v) => setFilters({ origin: v })}>
            <SelectTrigger className="w-full sm:w-[11.5rem]" aria-label="Filter by origin">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any origin</SelectItem>
              {origins.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Toggle
            variant="outline"
            pressed={filters.newOnly}
            onPressedChange={(v) => setFilters({ newOnly: v })}
            aria-label="Only requests new this week"
            className="w-full sm:w-auto"
          >
            <SparklesIcon />
            New this week
          </Toggle>

          <Select
            value={filters.sort}
            onValueChange={(v) => setFilters({ sort: v as Filters["sort"] })}
          >
            <SelectTrigger className="w-full sm:ml-auto sm:w-[9.5rem]" aria-label="Sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {SORTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {visible.length ? (
        <ul className="divide-y">
          {visible.map((r) => (
            <RequestRow
              key={r.id}
              row={r}
              canWrite={canWrite}
              onBucket={onBucket}
              onPriority={onPriority}
            />
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-3 px-4 py-12 text-center text-sm text-muted-foreground">
          No requests match these filters.
          <Button variant="outline" size="sm" onClick={onReset}>
            Reset filters
          </Button>
        </div>
      )}
    </Card>
  )
}
