# Kerja — personal workspace

`/kerja` is the personal workspace behind <https://thio.cc.cd/kerja>. It started
as a browser start page (search engines, shortcuts, pins, recent searches) and
now also carries a local-first task list, reminders, an official BMKG forecast,
and an explicitly manual GitHub cloud backup.

Everything on this page is implemented in this repository: Vue 3 components in
`.vitepress/theme/`, framework-free logic in `.vitepress/theme/kerja/`, and
Cloudflare Pages Functions in `functions/`.

---

## 1. What the workspace does

### Home (unchanged start page)

- 33 curated shortcuts from `data/kerja.md`, compiled at
  build time into `virtual:kerja-shortcuts` and
  `.vitepress/dist/kerja-shortcuts.json`.
- Ten search engines, `!gh` / `!yt` / `!w` style prefixes, a command palette,
  pinned shortcuts, recently opened shortcuts, recent search terms, and a
  comfortable/compact grid.
- Theme (system/light/dark), five seed colours, paper surfaces, and density.
  Preferences live in this browser only.

### Today

A ranked dashboard rather than a dump of every task: the three best things to do
now (with a one-line reason), then overdue, due today, next up, completed today,
and undated work. Progress is shown with a small ring
(`completed / (completed + open)`), plus counts for open, overdue, finished
today, and remaining planned minutes.

### Tasks

- Fields: title, description, priority (Critical/High/Medium/Low), category,
  subtasks, start date, deadline, estimated duration, reminder, outdoor flag.
- Views: search, status filter (open/done/all), priority filter, category
  filter, six sort modes, and grouped buckets (overdue, today, tomorrow, this
  week, later, no date, completed).
- Quick add from the dashboard with priority and due-date presets; “More” opens
  the full editor.
- Clear completed with a confirmation dialog.

### Reminders

- A reminder is a timestamp on a task. The workspace checks every 20 seconds
  while it is open, shows a toast, and marks the occurrence as notified.
- Snooze (5/10/30 minutes, 1 hour, 3 hours, tomorrow 09:00) and dismiss. Both
  are stored on the task so the same occurrence does not ring twice.
- In-app reminders can be turned off. Browser notifications are opt-in and
  require the browser permission.
- **Honest limitation:** browser notifications only fire while the tab or
  browser is running. When the browser is completely closed, Kerja cannot
  notify you. The UI says this next to the controls; there is no service worker
  push, and no claim that closing the browser is fine.

### Weather

- Data comes from the official BMKG forecast API,
  `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4={adm4}`, proxied through
  `GET /api/cuaca?adm4=…` so the upstream host never has to be called from the
  browser.
- The location is always chosen by the visitor. The picker searches the 514
  kabupaten/kota in `data/bmkg-locations.json` by name, regency capital,
  province, nickname (`Jogja`, `Ujung Pandang`, `Bjm`) or `adm4` prefix, can be
  filtered by island group and province, and still accepts a manual village code.
  There is no inferred or hard-coded home city.
- An optional **Leaflet atlas** drawn from the bundled province polygons lets you
  click a forecast dot or a province directly. It needs no tiles and no API key:
  the base map is the cahyadsn/wilayah geometry, with dots sized by population.
  A **Street map** button is the only thing that loads OpenStreetMap tiles, and
  only after that explicit click (with OSM attribution shown). Map hover/focus
  details, keyboard list navigation and reduced-motion handling are all built in;
  the list remains the accessible primary control when the map is closed.
- Shows current conditions (temperature, humidity, wind, visibility, cloud
  cover, rain), a three-day three-hourly timeline, and an outdoor-task outlook.
- Caching: the client keeps a per-`adm4` copy for 20 minutes; the Pages Function
  caches fresh responses for 30 minutes and a stale copy for 24 hours, and
  serves the stale copy with a visible “stale” note if BMKG is unreachable.
- **Attribution is mandatory.** The weather panel links to BMKG and states that
  BMKG is the data source, as required by BMKG’s data terms.
- A forecast is not a warning. Nothing in the UI presents an ordinary forecast
  as an official BMKG warning.

### Weather × tasks

When a task is marked **outdoor** and has a start time or deadline, the task row
shows a small rain hint based on the nearest forecast slot. It is advisory:
Kerja never moves, reschedules, or edits a task because of weather.

### Cloud (manual only)

- GitHub App user authorization, a private repository, and one versioned JSON
  file. No database, no Neon/Supabase/Firebase, no third-party storage.
- Every action is a click: **Sync to Cloud**, **Restore from Cloud**, **Check
  cloud**. There is no background sync, no periodic sync, and no autosync
  setting.
- Restore always asks for confirmation before replacing local data.
- Conflicts are detected with the file SHA plus a content fingerprint and offer
  **Keep local**, **Use cloud**, or **Review differences**.
- Normal use never needs GitHub: the workspace is fully usable offline; cloud is
  a backup path, not a dependency.

---

## 2. Architecture

```
Browser (Vue 3, /kerja)
├── .vitepress/theme/components/Kerja.vue      shell: bar, rail, bottom nav, shortcuts
├── .vitepress/theme/components/KerjaHome.vue  original start page
├── .vitepress/theme/components/kerja/*.vue    Today, Tasks, Weather, Cloud, dialogs
├── .vitepress/theme/kerja/*.ts                model, dates, tasks, reminders,
│                                              bmkg, region, cloud, storage,
│                                              state, cloud-client, UI
├── IndexedDB `kerja-workspace`                local-first source of truth
└── same-origin fetch only → /api/*
        │
Cloudflare Pages Functions (functions/)
├── /api/auth/github/{login,callback,session,logout}
├── /api/cloud/workspace   GET / PUT
└── /api/cuaca             cached BMKG proxy
        │
        ├── GitHub Contents API → private repo `flessan/kerja-cloud`
        └── https://api.bmkg.go.id/publik/prakiraan-cuaca
```

### Client modules

| Module | Responsibility |
| --- | --- |
| `kerja/model.ts` | Task/workspace types, priorities, defaults, validation, normalization |
| `kerja/dates.ts` | Local date helpers, ISO parsing, labels, `datetime-local` conversion |
| `kerja/tasks.ts` | Filtering, sorting, grouping, focus ranking, progress, categories |
| `kerja/reminders.ts` | Due/upcoming selection, snooze, dismiss, notification state |
| `kerja/bmkg.ts` | BMKG payload parsing, weather kinds, slot selection, outdoor advice |
| `kerja/region.ts` | Region search ranking, aliases, island groups, formatting |
| `components/kerja/RegionMap.vue` | Lazy Leaflet atlas: province polygons, forecast dots, hover/pick |
| `kerja/cloud.ts` | Envelope validation, canonical JSON, fingerprints, diffing, sync decisions |
| `kerja/storage.ts` | IndexedDB with localStorage/memory fallback, device id, sync meta |
| `kerja/state.ts` | Reactive store, debounced saves, task mutations, doc snapshots |
| `kerja/cloud-client.ts` | Session calls, manual sync/restore, conflicts, backups |
| `kerja/useWeather.ts` | Location state, fetch/cache, refresh, stale handling |
| `kerja/useReminders.ts` | Browser-side reminder scheduler and toast delivery |
| `kerja/notifications.ts` | Permission state, opt-in preference, limitation copy |
| `kerja/appearance.ts` | Theme mode, system listener, dark toggle |
| `kerja/animations.ts` | Small anime.js helpers that no-op with reduced motion |
| `kerja/ui.ts` | Active tab, editor/reminder panel state, global search focus |

### Server modules

| Module | Responsibility |
| --- | --- |
| `server/lib/config.ts` | Reads and validates environment variables |
| `server/lib/crypto.ts` | AES-256-GCM sealing, HMAC helpers |
| `server/lib/session.ts` | Sealed 30-day session cookie, 10-minute OAuth state |
| `server/lib/github.ts` | Code exchange, refresh, viewer, Contents API read/write |
| `server/lib/workspace.ts` | Envelope validation, size limits, canonical serialization |
| `server/lib/http.ts` | JSON responses, errors, same-origin checks, cache helpers |
| `server/lib/route.ts` | Authenticated Pages Function wrapper |

---

## 3. Configuration (Cloudflare Pages)

Cloud sync is optional. Without configuration the workspace still runs; the
Cloud tab explains that sync is unavailable. **Never commit real secret values.**
Set these in the Cloudflare dashboard (Pages → your project → Settings →
Environment variables) or in a local `.dev.vars` file copied from
`.dev.vars.example`.

### Required

| Variable | Type | What it is |
| --- | --- | --- |
| `GITHUB_CLIENT_ID` | plain | Client ID of the GitHub App (or OAuth App) used for sign-in |
| `GITHUB_CLIENT_SECRET` | **secret** | Client secret for the same GitHub App |
| `SESSION_SECRET` | **secret** | At least 32 random characters; seals cookies with AES-256-GCM |

Generate a session secret locally, for example:

```sh
openssl rand -base64 48
```

### Optional

| Variable | Default | Notes |
| --- | --- | --- |
| `GITHUB_REPO_OWNER` | `flessan` | Owner of the private workspace repository |
| `GITHUB_REPO_NAME` | `kerja-cloud` | Repository name |
| `GITHUB_REPO_BRANCH` | `main` | Branch that receives the workspace file |
| `GITHUB_WORKSPACE_PATH` | `workspace/kerja-workspace.json` | Relative `.json` path inside the repo |
| `KERJA_ALLOWED_LOGINS` | the repo owner | Comma-separated GitHub logins allowed to sign in |
| `GITHUB_REDIRECT_URI` | `<origin>/api/auth/github/callback` | Override only for a custom domain/proxy |
| `KERJA_COOKIE_SECURE` | `true` | Set to `false` only for plain-HTTP local testing |

Each request validates these values; invalid owners, paths containing `..`,
short session secrets, and non-absolute redirect URIs are rejected with a
readable error instead of being used.

---

## 4. Manual setup

### 4.1 Create the private storage repository

1. Create a **private** repository, by default `flessan/kerja-cloud`.
2. It can start empty. The first sync creates
   `workspace/kerja-workspace.json` and commits it to `main`.
3. Do not edit that file by hand while also using the app; a hand edit looks
   like a remote change and will prompt a conflict resolution.

### 4.2 Create the GitHub App

1. GitHub → **Settings → Developer settings → GitHub Apps → New GitHub App**.
2. Homepage URL: `https://thio.cc.cd/kerja`.
3. Callback URL: `https://thio.cc.cd/api/auth/github/callback`.
   For local development add `http://localhost:8788/api/auth/github/callback`.
4. Under **Webhooks**, disable the webhook (this app does not need one).
5. Repository permissions:
   - **Contents: Read and write** — read and commit the workspace file.
   - **Metadata: Read-only** — mandatory for every GitHub App.
6. Account permissions: none beyond the default.
7. “Where can this GitHub App be installed?” → **Only on this account**.
8. Create the App, then generate a **client secret**.
9. Copy the **Client ID** into `GITHUB_CLIENT_ID` and the secret into
   `GITHUB_CLIENT_SECRET`. The secret is read only by the Pages Functions.
10. **Install** the App on the account and select the private
    `kerja-cloud` repository.
11. Make sure the authorizing account is listed in `KERJA_ALLOWED_LOGINS` (it
    defaults to `GITHUB_REPO_OWNER`).

An OAuth App works too if it has the `repo` scope, but a GitHub App is narrower:
it is limited to the repositories it is installed on.

### 4.3 Configure Cloudflare Pages

1. Pages project → **Settings → Environment variables**. Add the required
   variables to **Production** (and Preview if you test there).
2. Mark `GITHUB_CLIENT_SECRET` and `SESSION_SECRET` as **Secret**.
3. Keep the build command `pnpm run build` and output directory
   `.vitepress/dist`.
4. Redeploy. Functions in `functions/` are deployed automatically with the
   Pages project.
5. Visit `/kerja#cloud`, press **Connect GitHub**, complete authorization, and
   return to the Cloud tab.

Local development:

```sh
cp .dev.vars.example .dev.vars   # fill in your own values
pnpm run build
pnpm run preview:pages           # wrangler pages dev .vitepress/dist
```

`wrangler pages dev` serves the built site and the Functions together so the
`/api/*` routes work. `.dev.vars` is git-ignored.

### 4.4 Repository layout and file format

The workspace file is a single JSON document:

```json
{
  "format": "kerja-workspace",
  "version": 1,
  "savedAt": "2026-01-01T00:00:00.000Z",
  "revision": 1,
  "device": { "id": "…", "name": "…" },
  "tasks": [],
  "settings": {
    "weatherLocation": null,
    "recentLocations": [],
    "defaultReminderMinutes": null,
    "inAppReminders": true
  }
}
```

Sync writes two-space JSON with a trailing newline and the commit message
`kerja: sync from <device> (N tasks)`.

---

## 5. Security model

- The OAuth code exchange, client secret, access token, and refresh token never
  reach the browser. They live in an encrypted, `HttpOnly`, `SameSite=Lax`
  cookie (`kerja_session`; `Secure` unless `KERJA_COOKIE_SECURE=false`).
  The browser only ever sees `/api/*` JSON.
- OAuth state is a separate 10-minute, single-use encrypted cookie
  (`kerja_oauth`) and is compared before the code exchange.
- State-changing routes require a JSON body and reject cross-origin
  `Origin`/`Sec-Fetch-Site` values. `PUT` and `POST` are the only write verbs.
- Logout revokes the GitHub token and clears both cookies.
- Access tokens are refreshed with the refresh token when they are close to
  expiry; a failed refresh clears the session and asks the visitor to reconnect.
- The cloud repository is private; the server validates the file envelope and
  refuses documents over 2 MB or with duplicate ids.
- BMKG is fetched only from the fixed `api.bmkg.go.id` host with a validated
  `adm4` code, so `/api/cuaca` cannot be used as an open proxy.

### What is stored where

| Data | Location | Notes |
| --- | --- | --- |
| Tasks, subtasks, settings | IndexedDB `kerja-workspace` | localStorage fallback, memory fallback as a last resort |
| Sync bookkeeping (last SHA, fingerprint, last result) | IndexedDB `meta` + localStorage | Device-local |
| Device id / name | localStorage | Used only in commit messages and conflict copy |
| Pins, recent shortcuts, recent searches | localStorage | Start-page data, unchanged |
| Theme/accent/paper/density | localStorage | Site-wide preferences |
| GitHub tokens | encrypted cookie, server only | Never localStorage |
| BMKG forecasts | in-memory + Cache API | 20 min client, 30 min fresh/24 h stale server |
| Weather location | workspace settings | Chosen by the visitor |

Data is not encrypted at rest in the browser. The device is the security
boundary, as with any local-first app.

---

## 6. Sync behaviour in detail

1. **Connect** — `GET /api/auth/github/login` sets the state cookie and
   redirects to GitHub. The callback verifies state, exchanges the code, checks
   the login against the allow-list, and confirms the App can see the private
   repository.
2. **Check** — `GET /api/cloud/workspace` returns the current file, its SHA and
   parsed document, or `exists: false`.
3. **Decide** (`kerja/cloud.ts`) — compare the remote SHA with the last synced
   SHA, and the local fingerprint with the base fingerprint:
   - no cloud file → `create`
   - local changed, cloud unchanged → `push`
   - local unchanged, cloud changed → `pull`
   - neither changed → `up-to-date`
   - both changed → `conflict`
4. **Sync to Cloud** — `PUT` with `{ doc, expectedSha }`. A stale SHA is
   rejected by the server with `409 conflict` and the current cloud file, so a
   second device can never be silently overwritten.
5. **Restore from Cloud** — fetches, previews, asks for confirmation, replaces
   the local document, and records the new base fingerprint. A safety copy of
   the previous local document can be downloaded from the Cloud tab first.
6. **Conflict** — choose **Keep local** (force-push after review), **Use cloud**
   (pull and replace), or **Review differences** (task-by-task diff summary).
   Nothing is written until one of those is chosen.

Fingerprints hash canonical JSON while ignoring `savedAt`, `device`, `revision`
and per-device `reminderNotifiedAt`, so a reminder firing on one device does not
count as a content change.

---

## 7. Keyboard shortcuts

| Key | Action |
| --- | --- |
| `/` | Focus the workspace search (Home) |
| `⌘K` / `Ctrl K` | Focus the global search from anywhere |
| `Alt 1…5` | Jump to Home, Today, Tasks, Weather, Cloud |
| `N` | New task |
| `R` | Open the reminder panel |
| `Esc` | Close a dialog, panel, or palette |
| `Enter` (editor) | Save with `⌘ Enter` / `Ctrl Enter` |

Shortcuts are ignored while typing in an input, textarea, select, or content
editable element, and while a dialog is open.

---

## 8. Tests and checks

```sh
pnpm install
pnpm run typecheck       # tsc --noEmit (server, data modules, tests)
pnpm run typecheck:vue   # vue-tsc over the workspace components
pnpm run test            # vitest run
pnpm run build           # vitepress build
pnpm run check           # all of the above in order
```

The suite (127 tests) covers the task model and ranking, reminder
timing/snooze/dismiss, BMKG parsing and outdoor advice, region search aliases
and adm4 prefixes, the bundled 38-province / 514-point dataset, cloud envelope
validation and conflict detection, storage fallbacks, GitHub auth/config
helpers, session sealing, and a jsdom smoke test that mounts the real shell,
walks every tab and renders the region picker. `vue-tsc` also type checks the
templates, so prop and event drift fails the build instead of runtime.

A ready-to-use GitHub Actions workflow (typecheck, tests, production build) is
kept at [`docs/ci.yml`](ci.yml). Enable it by moving it to
`.github/workflows/ci.yml`; this sandbox's GitHub connection is a GitHub App
token without the `workflows` permission, so it could not push that path itself.
The same three commands run locally with `pnpm run check`.

---

## 8a. Region data and the atlas

- `data/bmkg-locations.json` — one representative BMKG `adm4` per
  kabupaten/kota, joined with coordinates, capital, area and population.
- `data/wilayah-provinces.json` — the 38 provinces with capital, area,
  population, regency count and island group, used for browsing and search.
- `public/geo/indonesia-provinces.geojson` — simplified province polygons for
  the atlas (fetched only when the map is opened).

Sources and provenance:

| Data | Source | Licence |
| --- | --- | --- |
| Province/regency names, codes, capitals, coordinates, area, population, polygons | [`cahyadsn/wilayah`](https://github.com/cahyadsn/wilayah), Kepmendagri No 300.2.2-2430 Tahun 2025 | MIT |
| Forecast points (`adm4`) and weather | BMKG | BMKG data terms, attribution in the UI |
| Optional street tiles | OpenStreetMap contributors | ODbL, attribution shown when enabled |

Regenerate the derived files when the upstream data changes:

```sh
git clone --depth 1 --filter=blob:none --sparse \
    https://github.com/cahyadsn/wilayah.git /tmp/wilayah
git -C /tmp/wilayah sparse-checkout set --no-cone 'db/wilayah_level_1_2.sql'
python3 scripts/build-region-data.py /tmp/wilayah/db/wilayah_level_1_2.sql
```

The script validates every coordinate against Indonesia's bounding box, repairs
the one bad regency centroid in the source by deriving it from the polygon, and
fails loudly if a BMKG location cannot be matched to a regency.

The map uses Leaflet (`leaflet` + `@types/leaflet`), loaded lazily the first
time the map is shown. No tile requests are made until **Street map** is pressed.

---

## 9. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| “Cloud sync is not configured yet. Missing: …” | Env vars absent | Add them in Pages settings and redeploy |
| 401 after returning from GitHub | State cookie expired or blocked | Retry from the Cloud tab; allow cookies for the site |
| `forbidden` after sign-in | Login not in `KERJA_ALLOWED_LOGINS` | Add the login or change the repository owner |
| `repository` error | App not installed on the repo | Install the GitHub App on `kerja-cloud` |
| `409 conflict` | The cloud file changed since the last check | Choose an option in the conflict panel |
| Weather says unavailable | BMKG unreachable or invalid `adm4` | Pick the location again; the proxy retries and can serve stale data |
| Notifications never appear | Permission denied or browser closed | Use in-app reminders, or allow notifications; closed browsers cannot be reached |
| Data missing after clearing site data | Local-first storage was erased | Restore from the Cloud tab if a backup exists |

---

## 10. Licence and data credits

- Forecast data: **Badan Meteorologi, Klimatologi, dan Geofisika (BMKG)**,
  <https://data.bmkg.go.id/prakiraan-cuaca>. BMKG is credited in the weather
  panel and every forecast surface.
- Administrative location codes: BMKG `adm4` codes, bundled in
  `data/bmkg-locations.json`.
- Region names, coordinates, populations and province polygons:
  [`cahyadsn/wilayah`](https://github.com/cahyadsn/wilayah), MIT, based on
  Kepmendagri No 300.2.2-2430 Tahun 2025.
- Optional street map tiles: © OpenStreetMap contributors (ODbL).
- Everything else follows the repository licence.
