# Daily Brief — Status & Next Steps

Last updated: 2026-07-18

## Status: Working (manual run)

End-to-end pipeline is live on the Linux box.

| Piece | Location / notes | Status |
|-------|------------------|--------|
| Next.js planner | `/home/darrowj/development/gtd-app` (PM2 process `gtd`) | Working |
| Daily Brief UI card | Below Routine + SMART Goals (red / fishing-net icon) | Working |
| Generator script | `data/daily_brief.py` | Working |
| Output JSON | `data/daily-brief.json` (overwritten each run) | Working |
| API | `GET /api/brief` (force-dynamic, date must match today ET) | Working |
| Google Calendar + Gmail | `credentials.json` / `token.json` in app root; Gmail API enabled | Working |
| Notion Tasks | DB `0ca7aa07fab04c9487daf530f0f4185d` (same as my-ai-agents) | Working |
| Notion Network | DB `7fa4230a-ccc1-4213-83e8-42dc2b4aae04` | Working |
| Notion Job Tracker | DB `f23d0d93-5b8d-440f-af9b-d399722d9f4e` | Working |
| Ollama | `llama3.1:8b` on Linux | Working |
| Cron | Weekdays 7:00 AM Eastern | **Installed** |

### Machine roles

- **Mac** — edit code in `/Users/darrowj/Claude_Home/Getting_Things_Done_with_AI`; rsync to Linux when UI/script changes.
- **Linux** (`jesus-guides-me`) — production runtime; brief + PM2 live here.

### Important path / config notes

- App path: `/home/darrowj/development/gtd-app` (not `~/gtd-app`).
- Python venv: `.venv-brief` inside the app directory.
- Env file: `.env` (gitignored). Tasks DB ID differs from the original placeholder — use the working ID above.
- Wave-1 script still at `/home/darrowj/development/my-ai-agents/morning_briefing.py` (separate; can retire later).

---

## Install cron (manual)

On Linux, via SSH:

```bash
crontab -e
```

Add this line (weekdays at 7:00 AM, machine local time — confirm the box is on Eastern):

```cron
0 7 * * 1-5 cd /home/darrowj/development/gtd-app && /home/darrowj/development/gtd-app/.venv-brief/bin/python data/daily_brief.py >> /home/darrowj/development/gtd-app/data/daily-brief.log 2>&1
```

Optional: keep or remove the old Wave-1 job:

```cron
30 6 * * 1-5 cd /home/darrowj/development/my-ai-agents && /home/darrowj/development/my-ai-agents/venv/bin/python morning_briefing.py >> /home/darrowj/development/my-ai-agents/briefing.log 2>&1
```

Verify:

```bash
crontab -l
# After a weekday 7am run (or a manual test):
tail -50 /home/darrowj/development/gtd-app/data/daily-brief.log
ls -la /home/darrowj/development/gtd-app/data/daily-brief.json
```

Manual test anytime:

```bash
cd /home/darrowj/development/gtd-app
.venv-brief/bin/python data/daily_brief.py
```

---

## Next steps (filters & polish) — later

Priority ideas from first real run (2026-07-18):

1. **Networking** — too broad today (all `Reached Out` / `Responded`). Prefer follow-up date due/overdue only, or a tighter status set.
2. **Job Tracker** — many `Applied` / `Interested` rows. Prefer follow-up due, Phone Screen, Interview, Offer; stale Applied only.
3. **Emails** — almost all FYI marketing. Filter senders/subjects, or cap list / drop pure promo.
4. **mostImportant** — LLM picked a medium task over the `🚨HIGH` BTG item. Improve prompt or prefer high-priority overdue in Python before calling Ollama.
5. **Action items** — currently dumps many overdue tasks. Cap length; lead with HIGH + calendar + active job screens.
6. **Tasks “later this week”** — empty with current Notion due filter; widen when ready.
7. **Deploy habit** — when changing UI: rsync from Mac → `npm run build` → `pm2 restart gtd` (load nvm if needed).
8. **Retire Wave-1** — after cron is trusted, disable the 6:30 my-ai-agents briefing job to avoid duplicate work.

---

## Quick troubleshooting

| Symptom | Likely fix |
|---------|------------|
| UI card missing | UI not on server — rsync `src/`, rebuild, `pm2 restart gtd` |
| “No brief for today” | JSON `date` ≠ today ET, or cron hasn’t run; run script manually |
| Notion 404 | Wrong DB ID or integration not connected to that DB |
| Gmail 403 | Enable Gmail API in Google Cloud for the OAuth project |
| Google browser error on Linux | Re-auth via SSH tunnel or copy `token.json` from a machine with a browser |
| `better-sqlite3` build fail | `npm install-scripts approve better-sqlite3` then rebuild |
