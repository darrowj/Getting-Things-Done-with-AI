# AI-Assisted GTD — Weekly Organizer

A personal life-organization tool built with Next.js, SQLite, and the Claude API.  Inspired by Microsoft Outlook's calendar.  Designed to run on a local Linux server and be accessible from any device on the home network.

Built by Jason Darrow as portfolio project #2 — demonstrating AI-assisted development and full-stack engineering skills.

---

## What It Does

A single-screen weekly planner with three stacked regions:

**Calendar** — Week view and Day view with a full time grid (6 AM – 10 PM).  Create, edit, and delete events.  Supports all-day events, recurring events (daily or weekly on selected days), overlapping event layout, and per-category color coding.

**Event Modal** — Full create/edit experience: title, day, category, all-day toggle, start/end time, repeat pattern with weekday chips, and reminder settings (phone / email).  Recurring events offer "Save this occurrence" vs "Save all" to handle one-off changes without breaking the series.

**Weekly Planning Panel** — Themed cards below the calendar:
- **Weekly Summary** — a free-text reflection area, scoped per week
- **Daily Routine** — checkbox grid for 5 daily habits across all 7 days of the week
- **SMART Goals** — three goal text areas scoped per week
- **Daily Brief** — read-only card fed by `data/daily-brief.json` (Calendar, Gmail, Notion + local Ollama). Overwritten each weekday morning; no DB table / history.

All data persists to a local SQLite database (except the Daily Brief JSON file).  Theme (Light / Graphite) and navigation position persist across sessions.

---

## Screenshots

![Week view](public/screenshot-week.png)

![Planning panel](public/screenshot-planning.png)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + CSS custom properties |
| Database | SQLite via `better-sqlite3` |
| ORM | Drizzle ORM |
| Process manager | PM2 |
| Hosting | Local Linux server (LAN only) |

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── events/          # GET all, POST create
│   │   │   └── [id]/        # PUT update, DELETE
│   │   ├── routine/         # GET all, PUT toggle
│   │   ├── summary/[weekStart]/   # GET, PUT
│   │   ├── goals/[weekStart]/     # GET, PUT
│   │   └── brief/           # GET daily-brief.json (force-dynamic)
│   ├── globals.css          # Design tokens (light + graphite), keyframes
│   ├── layout.tsx
│   └── page.tsx             # Main app — state, data loading, event handlers
├── components/
│   ├── Toolbar.tsx          # Sticky nav bar
│   ├── WeekView.tsx         # 7-column calendar grid
│   ├── DayView.tsx          # Single-day view
│   ├── EventModal.tsx       # Create / edit modal
│   ├── PlanningPanel.tsx    # Summary, Routine, Goals cards
│   └── DailyBriefPanel.tsx  # Read-only daily brief card
├── db/
│   ├── index.ts             # Drizzle client (better-sqlite3)
│   └── schema.ts            # Table definitions
└── lib/
    ├── types.ts             # TypeScript types + constants
    └── utils.ts             # Date helpers, recurring event logic, overlap layout
data/
├── daily_brief.py           # Cron generator → daily-brief.json
└── gtd.db                   # SQLite (gitignored)
```

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `events` | All calendar events — one-time and recurring |
| `routine` | Checkbox state keyed by `<dayISO>\|<itemIndex>` |
| `routine_items` | Configurable routine item list |
| `week_summary` | Free-text weekly reflection, keyed by week start date |
| `week_goals` | Three SMART goals per week, keyed by week start date |

---

## Running Locally (Mac)

```bash
# Install dependencies
npm install

# Generate and apply DB migrations (first time only)
npx drizzle-kit generate
npx drizzle-kit migrate

# Start dev server
npm run dev
# → http://localhost:3000
```

---

## Deploying to Linux Server

```bash
# From Mac — sync project (excludes node_modules, .next, and the live DB)
rsync -av \
  --exclude node_modules --exclude .next \
  --exclude 'data/*.db*' --exclude 'data/*.json' --exclude 'data/*.log' \
  --exclude 'data/__pycache__' --exclude .env \
  ./ darrowj@192.168.1.246:~/development/gtd-app/

# On Linux server
cd ~/development/gtd-app
npm install

# Back up the live database before any migration
cp data/gtd.db data/gtd.db.bak

# Apply pending migrations (additive only — see below)
npx drizzle-kit migrate

npm run build
pm2 restart gtd             # or: pm2 start npm --name "gtd" -- start  (first time)
pm2 startup                 # follow printed command to enable on reboot
pm2 save
```

Access from any device on the network: `http://192.168.1.246:3000`

### Database migrations (safe deploy)

Your live data lives in `data/gtd.db` on the Linux server. That file is gitignored and is **not** overwritten by rsync (the `data/` directory is excluded above).

When a code update adds new columns or tables, Drizzle runs only **pending** migrations — it does not recreate the database or re-run migrations already applied. Typical schema changes use `ALTER TABLE ... ADD COLUMN`, which leaves all existing rows intact. New columns start as `NULL` and the app treats missing values as defaults (e.g. an empty exceptions list).

**Deploy order on the server:**

1. rsync new code (excluding `data/`)
2. `npm install`
3. `cp data/gtd.db data/gtd.db.bak` — backup before every migration
4. `npx drizzle-kit migrate` — apply pending migrations only
5. `npm run build`
6. `pm2 restart gtd`

**Do not run** `drizzle-kit push` or any command that drops/resets tables on a server with live data. Use `drizzle-kit generate` during development and `drizzle-kit migrate` on the server.

**First-time deploy** (no database yet): skip the backup step; `npx drizzle-kit migrate` creates `data/gtd.db` from scratch.

---

## Daily Brief (cron on Linux)

Generator: `data/daily_brief.py` → writes `data/daily-brief.json` (atomic replace).  
UI reads it via `GET /api/brief` (always dynamic / no-store). If the JSON `date` is not today (America/New_York), the card shows “no brief for today”.

```bash
# One-time setup on the Linux box
cd ~/development/gtd-app
python3 -m venv .venv-brief   # or reuse my-ai-agents venv
.venv-brief/bin/pip install -r requirements-brief.txt
cp .env.example .env          # fill NOTION_TOKEN + Google credential paths
# First Google auth: run once on Mac (has a browser), then copy token.json here
.venv-brief/bin/python data/daily_brief.py
```

Crontab (weekdays 7:00 AM — install manually with `crontab -e`; do not auto-install):

```cron
0 7 * * 1-5 cd /home/darrowj/development/gtd-app && /home/darrowj/development/gtd-app/.venv-brief/bin/python data/daily_brief.py >> /home/darrowj/development/gtd-app/data/daily-brief.log 2>&1
```

---

## Planned Features (Waves 2 & 3)

| Feature | Status |
|---------|--------|
| Google Calendar sync into planner grid | Planned — credentials exist |
| Daily Brief (Notion + Gmail + Calendar + Ollama) | Done — `data/daily_brief.py` + Daily Brief card |
| Reminder delivery (push + email) | Planned — settings captured, backend TBD |
| Editable routine items | Planned |

---

## Why I Built This

I manage my week out of a combination of calendar apps, sticky notes, and mental overhead.  None of it stays in one place.  This project is the one place — calendar, habits, and weekly goals on a single screen, running on hardware I own, with no subscription.

The secondary goal: demonstrate that I can build a full-stack AI-assisted web app from scratch.  The design spec was generated with Claude.  The implementation was built collaboratively with Claude Code.  The result is production-quality software running on real infrastructure.

---

*Built by [Jason Darrow](https://jasondarrow.com) · [GitHub](https://github.com/darrowj)*
