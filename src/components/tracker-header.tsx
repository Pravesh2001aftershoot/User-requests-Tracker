import { useEffect, useState } from "react"
import {
  CheckIcon,
  ClipboardCopyIcon,
  HistoryIcon,
  MonitorIcon,
  MoonIcon,
  RefreshCwIcon,
  SquareIcon,
  SunIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { formatDuration, useTicker } from "@/lib/time"
import type { ThemePref } from "@/lib/theme"
import type { LastFetch, SyncStatus } from "@/lib/types"

const STATUS: Record<SyncStatus, { label: string; dot: string; hint: string }> = {
  connecting: {
    label: "Connecting",
    dot: "bg-muted-foreground animate-pulse",
    hint: "Loading shared triage…",
  },
  synced: {
    label: "Synced",
    dot: "bg-priority-quickwin",
    hint: "Changes are shared with everyone who opens this tracker.",
  },
  local: {
    label: "Saved in this browser",
    dot: "bg-priority-p2",
    hint: "Shared data isn't available here, so changes stay in this browser.",
  },
  readonly: {
    label: "View only",
    dot: "bg-priority-later",
    hint: "You can browse and filter, but not change buckets or priorities.",
  },
}

/** Digests run every morning; past this, the chip turns amber. */
const STALE_MS = 26 * 60 * 60 * 1000

function relative(ms: number, now: number): string {
  const diff = Math.max(0, now - ms)
  const min = Math.floor(diff / 60_000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

/** Re-render every minute so "5m ago" keeps counting. */
function useNow() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])
  return now
}

function LastFetchChip({ last }: { last: LastFetch }) {
  const now = useNow()
  const stale = now - last.at > STALE_MS
  // Seed dates are calendar days (stored as UTC midnight), so don't shift them by zone.
  const exact =
    last.kind === "seed"
      ? new Date(last.at).toLocaleDateString(undefined, { dateStyle: "medium", timeZone: "UTC" })
      : new Date(last.at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
  const counts =
    last.added !== undefined || last.repeats !== undefined
      ? ` (+${last.added ?? 0} new, ${last.repeats ?? 0} repeats)`
      : ""
  const hint =
    last.kind === "seed"
      ? `No morning digest has filed requests yet. Showing the original log, which runs to ${exact}.`
      : `Last pulled in ${exact}${last.by ? ` by ${last.by}` : ""}${counts}.` +
        (stale ? " The morning digests may not have run since." : "")
  return (
    <span
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs text-muted-foreground",
        stale && "border-priority-p2/50",
      )}
      title={hint}
    >
      <HistoryIcon className={cn("size-3.5", stale && "text-priority-p2")} aria-hidden />
      <span>
        {last.kind === "seed" ? "Log to " : "Fetched "}
        <time dateTime={new Date(last.at).toISOString()} className="font-medium text-foreground">
          {last.kind === "seed"
            ? new Date(last.at).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })
            : relative(last.at, now)}
        </time>
      </span>
      <span className="sr-only">. {hint}</span>
    </span>
  )
}

function FetchButton({
  startedAt,
  estimateMs,
  onFetch,
  onStop,
}: {
  startedAt: number | null
  estimateMs: number
  onFetch: () => void
  onStop: () => void
}) {
  const now = useTicker(startedAt !== null)
  if (startedAt === null) {
    return (
      <Button
        variant="outline"
        onClick={onFetch}
        title={`Check Slack and Intercom for new Gallery feature requests since the last fetch. Usually takes about ${formatDuration(estimateMs)}.`}
      >
        <RefreshCwIcon data-icon="inline-start" />
        Fetch now
        <span className="font-mono text-xs font-normal text-muted-foreground tabular-nums">
          ~{formatDuration(estimateMs)}
        </span>
      </Button>
    )
  }
  return (
    <Button variant="outline" onClick={onStop} title="Stop fetching">
      <RefreshCwIcon data-icon="inline-start" className="animate-spin" />
      Fetching…
      <span className="font-mono text-xs font-normal text-muted-foreground tabular-nums">
        {formatDuration(now - startedAt)}
      </span>
      <span className="sr-only">Stop</span>
      <SquareIcon data-icon="inline-end" className="fill-current opacity-60" />
    </Button>
  )
}

const THEMES: Array<{ value: ThemePref; label: string; Icon: typeof SunIcon }> = [
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
  { value: "system", label: "System", Icon: MonitorIcon },
]

export function TrackerHeader({
  status,
  lastFetch,
  fetch,
  theme,
  resolvedTheme,
  onTheme,
  onCopyCsv,
}: {
  status: SyncStatus
  lastFetch: LastFetch
  /** Omitted when this view can't fetch (no connectors, Claude or write access). */
  fetch?: { startedAt: number | null; estimateMs: number; onFetch: () => void; onStop: () => void }
  theme: ThemePref
  resolvedTheme: "light" | "dark"
  onTheme: (t: ThemePref) => void
  onCopyCsv: () => void
}) {
  const s = STATUS[status]
  const ThemeIcon = theme === "system" ? MonitorIcon : resolvedTheme === "dark" ? MoonIcon : SunIcon
  return (
    <header className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
          Aftershoot Gallery
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">User Requests Tracker</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Feature requests from Slack, Intercom and support. Pick a bucket and a priority for each one.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 xl:shrink-0 xl:flex-nowrap">
        <LastFetchChip last={lastFetch} />
        {fetch && <FetchButton {...fetch} />}
        <span
          className="inline-flex h-8 items-center gap-2 rounded-lg border px-2.5 text-xs text-muted-foreground"
          title={s.hint}
          role="status"
          aria-live="polite"
        >
          <span className={cn("size-2 rounded-full", s.dot)} aria-hidden />
          {s.label}
        </span>
        <Button variant="outline" onClick={onCopyCsv}>
          <ClipboardCopyIcon data-icon="inline-start" />
          Copy CSV
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label={`Theme: ${theme}`}>
              <ThemeIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {THEMES.map(({ value, label, Icon }) => (
              <DropdownMenuItem key={value} onSelect={() => onTheme(value)}>
                <Icon />
                {label}
                {theme === value && <CheckIcon className="ml-auto" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
