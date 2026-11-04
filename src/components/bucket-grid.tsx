import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BUCKET_META, PRIORITY_META } from "@/lib/taxonomy"
import { BUCKETS, PRIORITIES, type Bucket, type PriorityFilter, type Row } from "@/lib/types"
import { cn } from "@/lib/utils"

type Col = PriorityFilter
const COLS: Col[] = [...PRIORITIES, "untriaged", "all"]
const colLabel = (c: Col) => (c === "untriaged" ? "Untriaged" : c === "all" ? "Total" : PRIORITY_META[c].short)

export function BucketGrid({
  rows,
  active,
  onPick,
}: {
  rows: Row[]
  active: { bucket: "all" | Bucket; priority: PriorityFilter }
  onPick: (bucket: "all" | Bucket, priority: PriorityFilter) => void
}) {
  const count = (b: "all" | Bucket, c: Col) =>
    rows.filter(
      (r) =>
        (b === "all" || r.effectiveBucket === b) &&
        (c === "all" ? true : c === "untriaged" ? !r.priority : r.priority === c),
    ).length

  const rowKeys: Array<"all" | Bucket> = [...BUCKETS, "all"]

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Bucket × priority</CardTitle>
        <CardDescription>Select a cell to filter the list below.</CardDescription>
      </CardHeader>
      <CardContent className="min-w-0">
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[30rem] border-separate border-spacing-1 text-sm tabular-nums">
            <thead>
              <tr>
                <th scope="col" className="sr-only">
                  Bucket
                </th>
                {COLS.map((c) => (
                  <th
                    key={c}
                    scope="col"
                    className="px-1 pb-1 text-center text-xs font-medium whitespace-nowrap text-muted-foreground"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {c !== "all" && c !== "untriaged" && (
                        <span className={cn("size-2 rounded-full", PRIORITY_META[c].dot)} aria-hidden />
                      )}
                      {colLabel(c)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowKeys.map((b) => (
                <tr key={b}>
                  <th
                    scope="row"
                    className={cn(
                      "pr-2 text-left text-sm font-medium whitespace-nowrap",
                      b === "all" && "pt-1",
                    )}
                  >
                    <span className="inline-flex items-center gap-2">
                      {b !== "all" && (
                        <span className={cn("size-2 rounded-full", BUCKET_META[b].dot)} aria-hidden />
                      )}
                      {b === "all" ? "All" : BUCKET_META[b].label}
                    </span>
                  </th>
                  {COLS.map((c) => {
                    const n = count(b, c)
                    const isActive = active.bucket === b && active.priority === c
                    const tint =
                      c === "all" || c === "untriaged"
                        ? "bg-muted/60 hover:bg-muted"
                        : n
                          ? PRIORITY_META[c].tint
                          : "bg-muted/30 hover:bg-muted/60"
                    return (
                      <td key={c} className={cn(b === "all" && "pt-1")}>
                        <button
                          type="button"
                          onClick={() => onPick(b, c)}
                          aria-pressed={isActive}
                          aria-label={`${b === "all" ? "All buckets" : BUCKET_META[b].label}, ${colLabel(c)}: ${n}`}
                          className={cn(
                            "h-8 w-full min-w-10 rounded-md font-mono text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                            tint,
                            !n && "text-muted-foreground",
                            (c === "all" || b === "all") && "font-semibold",
                            isActive && "ring-2 ring-foreground",
                          )}
                        >
                          {n || "·"}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
