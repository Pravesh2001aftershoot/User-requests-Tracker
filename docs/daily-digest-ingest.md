# Ingest → User Requests Tracker

New Gallery feature requests reach the tracker's shared database in two ways:

| How | When | `addedBy` / `by` |
| --- | --- | --- |
| **Scheduled ingest** (cloud routine) | 4:00 and 21:00 IST, daily | `Scheduled ingest` |
| **Fetch now** button in the tracker header | on demand, by anyone who can edit | `Fetch now` |

- Tracker: https://claude.ai/artifact/6uESD6i7q5otNC95atZnG6
- Collections they write: `requests` (the rows) and `runs` (one doc per run, which
  drives the **Fetched … ago** chip in the header)
- Collection they **never** touch: `triage` (people's bucket and priority choices)

The two Cowork tasks, **Daily Gallery Feature Request Digest** and **Daily Jira + Slack**,
only send Slack DMs. They don't write to the tracker, and they shouldn't: the routine
is the single writer, so nothing gets counted twice.

## Scheduled ingest

A Claude Code cloud routine, **Gallery requests – scheduled ingest**, runs twice a day:
**4:00 and 21:00 IST** (cron `30 15,22 * * *`, UTC).

- Manage, pause or run it now: https://claude.ai/code/routines/trig_013Vgo4KhrxnBBbGDZh8nAGa
- Connectors: Slack, Intercom, Atlassian (Jira). If one is disconnected, the run
  carries on with the others and lists it in the run's `skipped` field.
- Sources (the same ones as the Gallery digest DM, plus Jira):
  - Slack: #gallery-user-feedback-website, #customer-support (Gallery threads only),
    #pod-gallery, #gallery-internal-feedback, #gallery-core, #aftershoot-community
    (Galleries asks only)
  - Intercom: the Gallery Inbox team (`team_assignee_id` 10104882), every page
  - Jira: new issues that mention Gallery and read as feature requests
- Fetch now (`src/lib/fetch-now.ts`) reads a smaller set: the first five channels above
  and Intercom, without Jira.

How it avoids counting the same message twice:

1. **Cursor.** It only reads messages posted after the latest `runs` doc's `at` (minus a
   10-minute overlap). Every run logs a `runs` doc, even when it finds nothing, so the
   cursor always moves forward.
2. **Known links.** A message whose permalink is already on any row, including the 150
   seed rows (they're embedded in the routine's prompt), is skipped: no new row, no +1.
3. **One +1 per row per run**, however many messages repeat that ask in the window.

If the seed log ever changes, update the SEED LOG block at the end of the routine's
prompt too. Otherwise the routine will file seed requests as new rows. To change the
sources or rules, edit the routine's prompt at the link above.

## How the tracker reads `requests`

- A doc whose id matches a seed row (`r1` … `r150`) **overrides** that row field by
  field. Fields you leave out keep the seed value.
- Any other id is a **new request**, numbered after the seed (#151, #152, …) in
  date order.
- Every field is validated on the way in:
  - `text` is required. Without it, the doc is ignored.
  - `links` must be `https://` URLs. Others are dropped, and at most 5 are kept.
  - `mentions` is clamped to 1–99.
  - `bucket` must be one of `gallery`, `brandkit`, `collection`, `store`,
    `marketing`. Otherwise the tracker suggests one from the text and category.
  - `date` must be `YYYY-MM-DD`.

## Old prompt snippet (retired)

An earlier version of this doc had a snippet for pasting into the Cowork digests so
they filed rows themselves. Don't use it. It had no cursor or known-links check, so
running it alongside the routine double counts mentions. If a Cowork task still
contains `AFTER POSTING THE DIGEST — file Gallery feature requests into the tracker`,
delete that part.

## Checking it worked

- The header chip reads **Fetched 2h ago** (hover for the exact time, task and
  counts). It is the latest of any `runs` doc's `at` and any `requests` doc's
  `addedAt`. It turns amber after 26 hours with no run. Before any run has
  logged anything it reads **Log to Nov 2**, the last date in the seed log.

- Open the tracker and sort by **Newest**. New rows carry a **New** badge and
  numbers after #150.
- From Claude Code: `ArtifactData list` on collection `requests` for the
  tracker URL above.
- To remove a bad row: `ArtifactData delete` with its `doc_id` and the
  `version` from the list. Triage on that row is kept in `triage/<doc_id>` but
  stops showing once the request is gone.
