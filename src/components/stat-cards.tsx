import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PRIORITY_META } from "@/lib/taxonomy"
import { PRIORITIES, type Row } from "@/lib/types"
import { cn } from "@/lib/utils"

const sumMentions = (rows: Row[]) => rows.reduce((s, r) => s + r.mentions, 0)

function Stat({
  label,
  value,
  detail,
  children,
}: {
  label: string
  value: React.ReactNode
  detail: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <Card size="sm" className="min-w-0">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="font-mono text-2xl font-semibold tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-xs text-muted-foreground">
        {children}
        <span>{detail}</span>
      </CardContent>
    </Card>
  )
}

export function StatCards({ rows }: { rows: Row[] }) {
  const triaged = rows.filter((r) => r.priority)
  const pct = rows.length ? Math.round((triaged.length / rows.length) * 100) : 0
  const qw = rows.filter((r) => r.priority === "quickwin")
  const p1 = rows.filter((r) => r.priority === "p1")
  const counts = PRIORITIES.map((p) => ({ p, n: triaged.filter((r) => r.priority === p).length }))

  return (
    <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat
        label="Requests"
        value={rows.length}
        detail={`${sumMentions(rows)} mentions in total`}
      />
      <Stat
        label="Triaged"
        value={
          <>
            {triaged.length}
            <span className="ml-1.5 text-sm font-normal text-muted-foreground">{pct}%</span>
          </>
        }
        detail={triaged.length ? `${rows.length - triaged.length} still untriaged` : "Nothing prioritised yet"}
      >
        <div
          className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label={counts.map((c) => `${PRIORITY_META[c.p].label}: ${c.n}`).join(", ")}
        >
          {counts.map(({ p, n }) =>
            n ? (
              <span
                key={p}
                className={cn("h-full", PRIORITY_META[p].dot)}
                style={{ width: `${(n / Math.max(rows.length, 1)) * 100}%` }}
              />
            ) : null,
          )}
        </div>
      </Stat>
      <Stat
        label="Quick wins"
        value={qw.length}
        detail={qw.length ? `${sumMentions(qw)} mentions behind them` : "Mark small, high-value asks as QW"}
      />
      <Stat
        label="P1"
        value={p1.length}
        detail={p1.length ? `${sumMentions(p1)} mentions behind them` : "No P1s yet"}
      />
    </section>
  )
}
