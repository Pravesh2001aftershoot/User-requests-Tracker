# User Requests Tracker

A one-page dashboard for triaging Aftershoot Gallery feature requests. Each request gets a
**bucket** (Gallery, Brandkit, Collection, Store, Marketing) and a **priority** (Quick Win,
P1, P2, P3, Later). It shows where demand sits and what's been decided.

Live tracker (claude.ai Artifact, private): https://claude.ai/artifact/6uESD6i7q5otNC95atZnG6

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4 via `@tailwindcss/vite`
- shadcn/ui (radix base, nova preset): card, badge, select, tabs, input, toggle-group,
  dropdown-menu, sonner
- Geist + Geist Mono (Fontsource), lucide icons, `@/…` path alias
- `vite-plugin-singlefile` for the Artifact build

## Run

```bash
npm install
npm run dev          # http://localhost:5173
```

Outside claude.ai the app runs on the bundled seed data. Triage is saved to `localStorage`,
and the status dot reads **Saved in this browser**.

## Builds

| Command | Output | Use |
| --- | --- | --- |
| `npm run build` | `dist/` | Any static host |
| `npm run build:artifact` | `dist-artifact/artifact.html` | Publish as a claude.ai Artifact |

`build:artifact` runs `vite build --mode artifact`, which inlines all JS, CSS and fonts
into one file. Then `scripts/build-artifact.mjs` keeps only what the Artifact page needs:
`<title>`, the `claude:viewport-fit-sides` meta, the inlined `<style>`/`<script>`, and
`<div id="root">`.

Publish it with capabilities `{ db: {}, user: {} }`. To update the live tracker, republish
to the URL above.

## Data

- **Seed**: `src/data/seed-requests.json` holds 150 requests from the "Feature Requests"
  sheet of `Gallery_Requests_Log_Oct3-Nov3_2026.xlsx`. To regenerate it (stdlib only, no
  openpyxl):

  ```bash
  npm run import:xlsx -- path/to/Gallery_Requests_Log.xlsx
  ```

  The script maps each sheet category to a starting bucket. A hand-reviewed override list
  (`OVERRIDES` in `scripts/import-xlsx.py`) then moves specific rows: watermarks and email
  styling go to Brandkit, download caps go to Store, and so on.
- **Inside claude.ai** (`src/lib/store.ts`): the app subscribes once to two collections.
  - `triage/<request id>`: `{ bucket?, priority?, at }`, written by the page. A failed
    write rolls back and shows a toast.
  - `requests/<id>`: rows added by the morning digests. A seed id (`r12`) overrides that
    row; a new id becomes a new request numbered after the seed. Every field is validated:
    text is required, links must be `https://` (max 5), and mentions are clamped to 1–99.
  - `user.can("data.write") === false` switches the app to **View only**.
- **New requests without a bucket** get one from `suggestBucket(text, category)` in
  `src/lib/taxonomy.ts`. It agrees with the hand-sorted seed on 148 of 150 rows.
- **Morning digests**: see [docs/daily-digest-ingest.md](docs/daily-digest-ingest.md).

## Folder map

```
src/
  App.tsx                  page layout, filters (remembered in localStorage), toasts
  main.tsx                 entry; applies the theme before first paint
  index.css                Tailwind + shadcn tokens + bucket/priority colors (light & dark)
  claude-env.d.ts          types for the claude.ai runtime (window.claude.use)
  components/
    tracker-header.tsx     title, sync status, Copy CSV, theme menu
    stat-cards.tsx         Requests / Triaged / Quick wins / P1
    bucket-grid.tsx        bucket × priority grid (click to filter)
    demand-bars.tsx        mentions by bucket
    request-list.tsx       tabs, search, filters, sort
    request-row.tsx        one request: badges, links, bucket select, priority toggles
    ui/                    shadcn/ui components
  data/seed-requests.json  seed requests
  lib/
    store.ts               useTracker(): db sync, localStorage fallback, validation
    taxonomy.ts            bucket/priority metadata, suggestBucket()
    rows.ts                join, filter, sort, CSV
    theme.ts               light / dark / system (follows the viewer's data-theme)
    types.ts
scripts/
  import-xlsx.py           xlsx → seed JSON
  build-artifact.mjs       single-file build → artifact.html
docs/
  daily-digest-ingest.md   prompt snippet for the Cowork digest tasks
```

## Privacy

The seed data contains internal Slack/Intercom links and customer feedback. Keep this
repository private, and share the Artifact only within the team.
