import { CheckIcon, ClipboardCopyIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { ThemePref } from "@/lib/theme"
import type { SyncStatus } from "@/lib/types"

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

const THEMES: Array<{ value: ThemePref; label: string; Icon: typeof SunIcon }> = [
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
  { value: "system", label: "System", Icon: MonitorIcon },
]

export function TrackerHeader({
  status,
  theme,
  resolvedTheme,
  onTheme,
  onCopyCsv,
}: {
  status: SyncStatus
  theme: ThemePref
  resolvedTheme: "light" | "dark"
  onTheme: (t: ThemePref) => void
  onCopyCsv: () => void
}) {
  const s = STATUS[status]
  const ThemeIcon = theme === "system" ? MonitorIcon : resolvedTheme === "dark" ? MoonIcon : SunIcon
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
          Aftershoot Gallery
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">User Requests Tracker</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Feature requests from Slack, Intercom and support. Pick a bucket and a priority for each one.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
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
