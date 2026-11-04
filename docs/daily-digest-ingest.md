# Morning digest → User Requests Tracker

Two Cowork tasks already post a digest each morning:

| Task | Time |
| --- | --- |
| **Daily Jira + Slack** | 8:00 |
| **Gallery Feature Requests** | 9:00 |

After it posts, each task also files new Gallery feature requests into the
tracker's shared database. The tracker shows them within seconds.

- Tracker: https://claude.ai/artifact/6uESD6i7q5otNC95atZnG6
- Collections the digests write: `requests` (the rows) and `runs` (one doc per run,
  drives the **Fetched … ago** chip in the header)
- Collection the digests **never** touch: `triage` (people's bucket and priority choices)

Between digests, anyone who can edit the tracker can click **Fetch now** in its header. It
runs the same ingest from the page (see `src/lib/fetch-now.ts`) and logs a `runs` doc with
`by: "Fetch now"`. Rows it files carry `addedBy: "Fetch now"`.

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

## Prompt snippet

Paste this at the end of both tasks' prompts.

```text
AFTER POSTING THE DIGEST — file Gallery feature requests into the tracker.

Tracker URL: https://claude.ai/artifact/6uESD6i7q5otNC95atZnG6
Only file Gallery *feature requests* from today's digest (skip bugs, how-to
questions and non-Gallery items). If there are none, skip to step 4 (still
log the run so the tracker shows it checked today).

1. Read what's already there:
   ArtifactData action "list", url <Tracker URL>, collection "requests",
   query {limit: 1000}. Keep each doc's id, text, mentions, links and version.

2. For each new feature request, decide if it repeats one already in the list
   (same underlying ask, even if worded differently).

   a) Repeat of a doc in the list → "update" that doc_id with
      if_version = the version you just read, and data:
        { mentions: <current mentions + 1, max 99>,
          links: <existing links + today's link, https only, max 5, no duplicates>,
          date: "<today YYYY-MM-DD>" }
      If the write fails because the version changed, re-list and redo it.

   b) Repeat of an original log row (#1–#150, not yet in the list) → "set"
      doc_id "r<number>" (no if_version), data:
        { mentions: <seed mentions + 1>, links: [<today's link>, ...seed links if known],
          date: "<today>", addedAt: "<now ISO>", addedBy: "<this task's name>" }
      Seed mentions are 1 except: r22×2, r28×2, r49×2, r76×2, r87×2, r91×2,
      r114×2, r116×2, r123×2, r127×2, r131×3. Only do this when you're
      confident it's the same ask; otherwise treat it as new (c).

   c) New → "set" doc_id "<YYYY-MM-DD>-<slug>" (slug: 3–6 lowercase words
      joined by hyphens, letters/digits only, e.g. 2026-11-05-bulk-watermark-toggle),
      no if_version, data:
        { text: "<one-sentence request, customer's ask in plain words>",
          date: "<YYYY-MM-DD the ask was made>",
          category: "<one of: Store, Pricing & Payments | Print Labs & Products |
                      Integrations, CRM & Website | Gallery Design & Branding |
                      Organization (Sets/Folders/Collections) | Proofing, Favorites & Comments |
                      Downloads & Watermarks | Notifications, Emails & Analytics |
                      Privacy, Access & Security | Settings & Presets | Slideshow & Video |
                      Localization | Mobile | Other>",
          bucket: "<gallery | brandkit | collection | store | marketing>",
          mentions: 1,
          origin: "<Customer feedback (website) | Support / Oncall | Internal / Team | Intercom>",
          source: "<channel or ref, e.g. #customer-support (ONCL-12345)>",
          links: ["<https Slack/Intercom/Jira permalink>", ...max 5],
          addedAt: "<now, ISO 8601>",
          addedBy: "<this task's name>" }

      Bucket guide: watermarks and delivery-email styling → brandkit; paid
      download caps and selling unwatermarked files → store; layouts, image
      viewing, imports, API, Lightroom, webhooks → gallery; per-collection
      branding and the collections view → collection; time-based sales, link
      previews, promo banners → marketing. Otherwise: store/pricing/print →
      store; CRM/website/integrations → marketing; cover/banner/fonts →
      brandkit; folders/sets/collections → collection; everything else → gallery.

3. With more than two writes, send them as one ArtifactData "batch"
   (max 50 entries; each entry {op, collection: "requests", doc_id, data,
   if_version when updating}).

4. Log this run, even when nothing was filed: "set" collection "runs",
   doc_id "<YYYY-MM-DD>-<task slug, e.g. daily-jira-slack>", data:
     { at: "<now, ISO 8601>", by: "<this task's name>",
       added: <number of new docs from c>, repeats: <number from a + b> }
   (Include it in the batch from step 3 when there is one.)

5. NEVER write to the "triage" collection. It holds the team's decisions.

6. End the digest thread with one line: "Tracker: +N new, M repeats".

FALLBACK — if ArtifactData isn't available in this run (tool missing, or the
call errors with not found / not granted):
- Don't retry in a loop. Post the would-be docs in the digest thread as a
  fenced JSON array: [{ "doc_id": "...", "op": "set" | "update", "data": {...} }].
- Add the line: "Tracker not updated — paste this into Claude Code with
  'file these into the User Requests Tracker'."
- Never paste request data into any other tool or site as a workaround.
```

## Checking it worked

- The header chip reads **Fetched 2h ago** (hover for the exact time, task and
  counts). It is the latest of any `runs` doc's `at` and any `requests` doc's
  `addedAt`. It turns amber after 26 hours with no run. Before any digest has run
  it reads **Log to Nov 3**, the last date in the seed log.

- Open the tracker and sort by **Newest**. New rows carry a **New** badge and
  numbers after #150.
- From Claude Code: `ArtifactData list` on collection `requests` for the
  tracker URL above.
- To remove a bad row: `ArtifactData delete` with its `doc_id` and the
  `version` from the list. Triage on that row is kept in `triage/<doc_id>` but
  stops showing once the request is gone.
