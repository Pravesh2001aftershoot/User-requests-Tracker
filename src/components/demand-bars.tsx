import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BUCKET_META } from "@/lib/taxonomy"
import { BUCKETS, type Row } from "@/lib/types"
import { cn } from "@/lib/utils"

export function DemandBars({ rows }: { rows: Row[] }) {
  const total = rows.reduce((s, r) => s + r.mentions, 0) || 1
  const data = BUCKETS.map((b) => {
    const inBucket = rows.filter((r) => r.effectiveBucket === b)
    return { b, mentions: inBucket.reduce((s, r) => s + r.mentions, 0), requests: inBucket.length }
  }).sort((a, z) => z.mentions - a.mentions)
  const max = Math.max(...data.map((d) => d.mentions), 1)

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Demand by bucket</CardTitle>
        <CardDescription>Mentions across all requests, by current bucket.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-3">
          {data.map(({ b, mentions, requests }) => {
            const share = Math.round((mentions / total) * 100)
            return (
              <li key={b} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium">{BUCKET_META[b].label}</span>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    <span className="text-foreground">{mentions}</span> mentions · {share}% ·{" "}
                    {requests} req
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", BUCKET_META[b].bar)}
                    style={{ width: `${(mentions / max) * 100}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
