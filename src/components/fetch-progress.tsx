import { CheckIcon, CircleDashedIcon, LoaderCircleIcon, MinusIcon, SquareIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Estimates, FetchStep } from "@/lib/fetch-now"
import { formatDuration, useTicker } from "@/lib/time"
import { cn } from "@/lib/utils"

const ICON: Record<FetchStep["state"], { Icon: typeof CheckIcon; cls: string; label: string }> = {
  waiting: { Icon: CircleDashedIcon, cls: "text-muted-foreground/60", label: "Waiting" },
  running: { Icon: LoaderCircleIcon, cls: "animate-spin text-foreground", label: "Running" },
  done: { Icon: CheckIcon, cls: "text-priority-quickwin", label: "Done" },
  skipped: { Icon: MinusIcon, cls: "text-muted-foreground", label: "Skipped" },
  failed: { Icon: XIcon, cls: "text-destructive", label: "Failed" },
}

export function FetchProgress({
  steps,
  estimates,
  startedAt,
  endedAt,
  onStop,
  onClose,
}: {
  steps: FetchStep[]
  estimates: Estimates
  startedAt: number
  /** Set once the run has finished (or failed / stopped). */
  endedAt: number | null
  onStop: () => void
  onClose: () => void
}) {
  const running = endedAt === null
  const now = useTicker(running)
  const elapsed = (endedAt ?? now) - startedAt
  // Never show 100% before it's actually done, even if it overruns the estimate.
  const pct = running ? Math.min(95, (elapsed / estimates.total) * 100) : 100
  const sources = steps.filter((s) => s.kind === "source")
  const rest = steps.filter((s) => s.kind !== "source")

  return (
    <Card size="sm" aria-label="Fetch progress">
      <CardHeader>
        <CardTitle>{running ? "Fetching new requests…" : "Fetch finished"}</CardTitle>
        <CardDescription className="tabular-nums">
          {running ? (
            <>
              {formatDuration(elapsed)} of about {formatDuration(estimates.total)}
              {elapsed > estimates.total && " · taking longer than usual"}
            </>
          ) : (
            <>Took {formatDuration(elapsed)} (estimate was {formatDuration(estimates.total)})</>
          )}
          <span className="text-muted-foreground/80">
            {" · "}
            {estimates.basedOn
              ? `estimate from the last ${estimates.basedOn} run${estimates.basedOn === 1 ? "" : "s"}`
              : "rough estimate until a few runs are timed"}
          </span>
        </CardDescription>
        <CardAction>
          {running ? (
            <Button variant="outline" size="sm" onClick={onStop}>
              <SquareIcon data-icon="inline-start" className="fill-current" />
              Stop
            </Button>
          ) : (
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close fetch details">
              <XIcon />
            </Button>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
          aria-label="Overall progress"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
          <StepGroup title="Sources (read in parallel)" steps={sources} estimates={estimates} now={now} />
          <StepGroup title="Then" steps={rest} estimates={estimates} now={now} />
        </div>
      </CardContent>
    </Card>
  )
}

function StepGroup({
  title,
  steps,
  estimates,
  now,
}: {
  title: string
  steps: FetchStep[]
  estimates: Estimates
  now: number
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">{title}</p>
      <ul className="flex flex-col gap-1">
        {steps.map((s) => {
          const { Icon, cls, label } = ICON[s.state]
          const est = estimates.steps[s.key]
          const time =
            s.ms !== undefined
              ? formatDuration(s.ms)
              : s.state === "running" && s.startedAt
                ? `${formatDuration(now - s.startedAt)} / ~${formatDuration(est)}`
                : s.state === "waiting"
                  ? `~${formatDuration(est)}`
                  : ""
          return (
            <li key={s.key} className="flex min-w-0 items-center gap-2 text-sm">
              <Icon className={cn("size-3.5 shrink-0", cls)} aria-label={label} />
              <span className={cn("truncate", s.state === "waiting" && "text-muted-foreground")}>
                {s.label}
              </span>
              {s.note && (
                <span
                  className={cn(
                    "truncate text-xs",
                    s.state === "failed" ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  · {s.note}
                </span>
              )}
              <span className="ml-auto shrink-0 pl-2 font-mono text-xs text-muted-foreground tabular-nums">
                {time}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
