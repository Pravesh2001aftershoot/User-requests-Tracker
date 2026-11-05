import { memo } from "react"
import { ExternalLinkIcon, MessageSquareIcon, MessagesSquareIcon, SquareKanbanIcon, Undo2Icon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { formatDate } from "@/lib/rows"
import { BUCKET_META, BUCKET_OPTIONS, PRIORITY_OPTIONS, isBucket, isPriority } from "@/lib/taxonomy"
import type { Bucket, Priority, Row } from "@/lib/types"
import { cn } from "@/lib/utils"

function linkKind(url: string) {
  let host = ""
  try {
    host = new URL(url).hostname
  } catch {
    return { label: "Link", Icon: ExternalLinkIcon }
  }
  if (host.endsWith("slack.com")) return { label: "Slack", Icon: MessageSquareIcon }
  if (host.endsWith("intercom.com") || host.endsWith("intercom.io"))
    return { label: "Intercom", Icon: MessagesSquareIcon }
  if (host.endsWith("atlassian.net") || host.includes("jira")) return { label: "Jira", Icon: SquareKanbanIcon }
  return { label: host.replace(/^www\./, ""), Icon: ExternalLinkIcon }
}

function SourceLinks({ links }: { links: string[] }) {
  const seen: Record<string, number> = {}
  return (
    <>
      {links.map((url) => {
        const { label, Icon } = linkKind(url)
        seen[label] = (seen[label] ?? 0) + 1
        const text = seen[label] > 1 ? `${label} ${seen[label]}` : label
        return (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-sm text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <Icon className="size-3.5" aria-hidden />
            {text}
          </a>
        )
      })}
    </>
  )
}

export const RequestRow = memo(function RequestRow({
  row,
  canWrite,
  onBucket,
  onPriority,
}: {
  row: Row
  canWrite: boolean
  onBucket: (row: Row, bucket: Bucket | null) => void
  onPriority: (row: Row, priority: Priority | null) => void
}) {
  const moved = row.effectiveBucket !== row.suggested
  return (
    <li className="grid gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-6">
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-sm leading-relaxed break-words">
          <span className="mr-2 font-mono text-xs text-muted-foreground tabular-nums">#{row.n}</span>
          {row.text}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {row.isNew && (
              <Badge className="bg-priority-quickwin/15 text-priority-quickwin">New</Badge>
            )}
            <Badge
              variant={row.mentions > 1 ? "default" : "secondary"}
              className="font-mono tabular-nums"
              title={`${row.mentions} mention${row.mentions === 1 ? "" : "s"}`}
            >
              ×{row.mentions}
            </Badge>
            {row.origin && <Badge variant="outline">{row.origin}</Badge>}
            <Badge variant="secondary" className="max-w-full truncate">
              {row.category}
            </Badge>
          </div>
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            <time dateTime={row.date}>{formatDate(row.date)}</time>
          </span>
          {row.links.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <SourceLinks links={row.links} />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:gap-x-4 lg:flex-nowrap lg:justify-end">
        <div className="flex flex-col gap-1">
          <Select
            value={row.effectiveBucket}
            onValueChange={(v) => isBucket(v) && v !== row.effectiveBucket && onBucket(row, v)}
            disabled={!canWrite}
          >
            <SelectTrigger
              size="sm"
              className="w-full data-[size=sm]:h-9 sm:w-36 sm:data-[size=sm]:h-7"
              aria-label={`Bucket for request ${row.n}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUCKET_OPTIONS.map((b) => (
                <SelectItem key={b.value} value={b.value}>
                  <span className={cn("size-2 rounded-full", b.dot)} aria-hidden />
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="h-4 text-[0.7rem] leading-4 text-muted-foreground">
            {moved ? (
              <>
                Moved from {BUCKET_META[row.suggested].label} ·{" "}
                <button
                  type="button"
                  disabled={!canWrite}
                  onClick={() => onBucket(row, null)}
                  className="inline-flex items-center gap-0.5 rounded-sm font-medium text-foreground underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50"
                >
                  <Undo2Icon className="size-3" aria-hidden />
                  undo
                </button>
              </>
            ) : (
              "Auto-suggested"
            )}
          </span>
        </div>

        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          spacing={0}
          value={row.priority ?? ""}
          onValueChange={(v) => onPriority(row, isPriority(v) ? v : null)}
          disabled={!canWrite}
          aria-label={`Priority for request ${row.n}`}
          className="w-full sm:w-fit"
        >
          {PRIORITY_OPTIONS.map((p) => (
            <ToggleGroupItem
              key={p.value}
              value={p.value}
              aria-label={p.label}
              className={cn("h-9 flex-1 px-2 font-mono text-xs sm:h-7 sm:flex-none", p.on)}
            >
              {p.short}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </li>
  )
})
