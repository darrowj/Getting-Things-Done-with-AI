#!/usr/bin/env python3
"""
Daily Brief generator — pulls Calendar, Gmail, and Notion; asks a local
Ollama model for two narrow judgments; writes data/daily-brief.json.

Cron example (weekdays 7:00 AM Eastern — set on the Linux box, do not install
from this script):

  0 7 * * 1-5 cd /home/darrowj/development/gtd-app && /home/darrowj/development/gtd-app/.venv-brief/bin/python data/daily_brief.py >> data/daily-brief.log 2>&1
"""

from __future__ import annotations

import json
import os
import re
import tempfile
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

import requests
from dotenv import load_dotenv

# ── Paths / config ──────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).resolve().parent
APP_ROOT = SCRIPT_DIR.parent
OUTPUT_PATH = SCRIPT_DIR / "daily-brief.json"

load_dotenv(APP_ROOT / ".env")
load_dotenv()  # also allow cwd / process env (Linux box)

TZ = ZoneInfo(os.environ.get("TZ", "America/New_York"))
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434/api/generate")
MODEL = os.environ.get("OLLAMA_MODEL", "llama3.1:8b")

NOTION_TOKEN = os.environ.get("NOTION_TOKEN", "")
NOTION_TASKS_DB = os.environ.get("NOTION_TASKS_DB", "305fc6af-d784-498f-a157-67311c0fb2b8")
NOTION_NETWORK_DB = os.environ.get("NOTION_NETWORK_DB", "7fa4230a-ccc1-4213-83e8-42dc2b4aae04")
NOTION_JOB_DB = os.environ.get("NOTION_JOB_DB", "f23d0d93-5b8d-440f-af9b-d399722d9f4e")

# Reuse Wave-1 Google OAuth files by default
_DEFAULT_GTD = Path("/Users/darrowj/Claude_Home/AI Assisted GTD")
_DEFAULT_AGENTS = Path.home() / "development" / "my-ai-agents"
GOOGLE_CREDENTIALS = Path(
    os.environ.get(
        "GOOGLE_CREDENTIALS_PATH",
        str(
            _DEFAULT_GTD / "credentials.json"
            if (_DEFAULT_GTD / "credentials.json").exists()
            else _DEFAULT_AGENTS / "credentials.json"
        ),
    )
)
GOOGLE_TOKEN = Path(
    os.environ.get(
        "GOOGLE_TOKEN_PATH",
        str(
            _DEFAULT_GTD / "token.json"
            if (_DEFAULT_GTD / "token.json").exists()
            else _DEFAULT_AGENTS / "token.json"
        ),
    )
)

SCOPES = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/gmail.readonly",
]

HIGH_PRIORITY_VALUE = "🚨HIGH"
APPLIED_STALE_DAYS = 14


# ── Helpers ─────────────────────────────────────────────────────────────────
def today_local() -> date:
    return datetime.now(TZ).date()


def notion_headers() -> dict[str, str]:
    if not NOTION_TOKEN:
        raise RuntimeError("NOTION_TOKEN is not set (check .env)")
    return {
        "Authorization": f"Bearer {NOTION_TOKEN}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
    }


def notion_query(database_id: str, payload: dict[str, Any]) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    body = dict(payload)
    body.setdefault("page_size", 100)
    while True:
        resp = requests.post(
            f"https://api.notion.com/v1/databases/{database_id}/query",
            headers=notion_headers(),
            json=body,
            timeout=60,
        )
        data = resp.json()
        if resp.status_code != 200:
            raise RuntimeError(f"Notion query failed ({resp.status_code}): {data.get('message', data)}")
        results.extend(data.get("results", []))
        if not data.get("has_more"):
            break
        body["start_cursor"] = data["next_cursor"]
    return results


def prop_title(props: dict[str, Any], keys: list[str] | None = None) -> str:
    keys = keys or ["Name", "Task", "Title", "Company"]
    for key in keys:
        parts = props.get(key, {}).get("title", [])
        if parts:
            return parts[0].get("plain_text", "").strip()
    # fall back: first title-type property
    for p in props.values():
        if p.get("type") == "title":
            parts = p.get("title", [])
            if parts:
                return parts[0].get("plain_text", "").strip()
    return ""


def prop_rich_text(props: dict[str, Any], key: str) -> str:
    parts = props.get(key, {}).get("rich_text", [])
    return "".join(p.get("plain_text", "") for p in parts).strip()


def prop_select(props: dict[str, Any], key: str) -> str:
    sel = props.get(key, {}).get("select")
    return (sel or {}).get("name", "") if sel is not None else ""


def prop_status(props: dict[str, Any], key: str) -> str:
    st = props.get(key, {}).get("status")
    if st:
        return st.get("name", "")
    return prop_select(props, key)


def prop_date_start(props: dict[str, Any], key: str) -> date | None:
    raw = props.get(key, {}).get("date")
    if not raw or not raw.get("start"):
        return None
    start = raw["start"]
    try:
        return date.fromisoformat(start[:10])
    except ValueError:
        return None


def prop_checkbox(props: dict[str, Any], key: str) -> bool:
    return bool(props.get(key, {}).get("checkbox", False))


def prop_relation_names(props: dict[str, Any], key: str) -> str:
    """Best-effort project label from a relation (IDs only) or rollup/text."""
    p = props.get(key, {})
    if p.get("type") == "rich_text":
        return prop_rich_text(props, key)
    if p.get("type") == "select":
        return prop_select(props, key)
    return ""


def parse_date_safe(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None


# ── Google auth ─────────────────────────────────────────────────────────────
def get_google_creds():
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow

    creds = None
    if GOOGLE_TOKEN.exists():
        creds = Credentials.from_authorized_user_file(str(GOOGLE_TOKEN), SCOPES)

    need_reauth = False
    if creds and creds.valid:
        granted = set(creds.scopes or [])
        if not set(SCOPES).issubset(granted):
            need_reauth = True
    elif creds and creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
            granted = set(creds.scopes or [])
            if not set(SCOPES).issubset(granted):
                need_reauth = True
        except Exception:
            need_reauth = True
    else:
        need_reauth = True

    if need_reauth or not creds or not creds.valid:
        if not GOOGLE_CREDENTIALS.exists():
            raise FileNotFoundError(
                f"Google credentials not found at {GOOGLE_CREDENTIALS}. "
                "Set GOOGLE_CREDENTIALS_PATH / GOOGLE_TOKEN_PATH."
            )
        # Headless Linux has no browser. Prefer re-auth on a Mac, then copy token.json.
        # Or: ssh -L 8090:localhost:8090 jesus-guides-me  then open the printed URL on Mac.
        open_browser = os.environ.get("GOOGLE_OAUTH_OPEN_BROWSER", "").lower() in {"1", "true", "yes"}
        if not open_browser and not os.environ.get("DISPLAY"):
            open_browser = False
        elif os.environ.get("DISPLAY") and "GOOGLE_OAUTH_OPEN_BROWSER" not in os.environ:
            open_browser = True

        port = int(os.environ.get("GOOGLE_OAUTH_PORT", "8090"))
        flow = InstalledAppFlow.from_client_secrets_file(str(GOOGLE_CREDENTIALS), SCOPES)
        print(
            "\nGoogle OAuth needs a one-time browser login (calendar + gmail.readonly).\n"
            "If this is a headless server:\n"
            "  1) Easiest: on your Mac, run this script once, then copy token.json here.\n"
            "  2) Or SSH tunnel:  ssh -L 8090:localhost:8090 <linux-host>\n"
            "     then open the URL printed below in your Mac browser.\n"
        )
        try:
            creds = flow.run_local_server(port=port, open_browser=open_browser)
        except Exception as e:
            raise RuntimeError(
                "Google OAuth failed (no browser on this machine). "
                "Re-auth on your Mac with the same credentials.json, then copy "
                f"token.json to {GOOGLE_TOKEN}. Original error: {e}"
            ) from e
        GOOGLE_TOKEN.parent.mkdir(parents=True, exist_ok=True)
        GOOGLE_TOKEN.write_text(creds.to_json())
        print(f"Wrote updated Google token to {GOOGLE_TOKEN}")
    elif creds and creds.valid:
        # Persist refreshed token
        GOOGLE_TOKEN.write_text(creds.to_json())

    return creds


# ── Data collectors ─────────────────────────────────────────────────────────
def get_todays_events() -> list[dict[str, Any]]:
    from googleapiclient.discovery import build

    creds = get_google_creds()
    service = build("calendar", "v3", credentials=creds)

    day = today_local()
    start = datetime(day.year, day.month, day.day, 0, 0, 0, tzinfo=TZ)
    end = start + timedelta(days=1)

    result = (
        service.events()
        .list(
            calendarId="primary",
            timeMin=start.isoformat(),
            timeMax=end.isoformat(),
            singleEvents=True,
            orderBy="startTime",
        )
        .execute()
    )

    events: list[dict[str, Any]] = []
    for item in result.get("items", []):
        start_raw = item["start"].get("dateTime") or item["start"].get("date", "")
        if "T" in start_raw:
            t = datetime.fromisoformat(start_raw).astimezone(TZ)
            time_label = t.strftime("%-I:%M %p") if os.name != "nt" else t.strftime("%I:%M %p").lstrip("0")
        else:
            time_label = "All day"

        attendees = []
        for a in item.get("attendees", []) or []:
            name = (a.get("displayName") or a.get("email") or "").strip()
            if name and not a.get("self"):
                attendees.append(name)

        entry: dict[str, Any] = {"time": time_label, "title": item.get("summary", "(no title)")}
        if attendees:
            entry["attendees"] = attendees
        events.append(entry)

    print(f"Calendar: {len(events)} events today")
    return events


def get_unread_emails(max_results: int = 15) -> list[dict[str, Any]]:
    from email.utils import parseaddr
    from googleapiclient.discovery import build

    creds = get_google_creds()
    service = build("gmail", "v1", credentials=creds)

    listed = (
        service.users()
        .messages()
        .list(userId="me", q="is:unread in:inbox", maxResults=max_results)
        .execute()
    )
    messages = listed.get("messages", []) or []
    emails: list[dict[str, Any]] = []

    urgent_re = re.compile(r"\b(urgent|asap|immediately|eod today|action required)\b", re.I)
    soon_re = re.compile(r"\b(please reply|response needed|follow[\s-]?up|deadline|rsvp)\b", re.I)

    for msg_ref in messages:
        full = (
            service.users()
            .messages()
            .get(userId="me", id=msg_ref["id"], format="metadata", metadataHeaders=["From", "Subject"])
            .execute()
        )
        headers = {h["name"].lower(): h["value"] for h in full.get("payload", {}).get("headers", [])}
        raw_from = headers.get("from", "")
        _, addr = parseaddr(raw_from)
        display = raw_from.split("<")[0].strip().strip('"') or addr or raw_from
        subject = headers.get("subject", "(no subject)")
        snippet = (full.get("snippet") or "").strip()

        blob = f"{subject} {snippet}"
        if urgent_re.search(blob):
            urgency = "Urgent"
        elif soon_re.search(blob):
            urgency = "Soon"
        else:
            urgency = "FYI"

        emails.append({"urgency": urgency, "from": display, "subject": subject})

    print(f"Gmail: {len(emails)} unread")
    return emails


def get_tasks() -> dict[str, list[dict[str, Any]]]:
    """Same Notion filters as Wave-1 morning_briefing.py; bucket in Python."""
    today = today_local()
    week_end = today + timedelta(days=7)

    # Wave-1 filter: open, not quick-capture, due on or before today.
    # Also pull due-within-week separately so dueLaterThisWeek can populate
    # once filters are widened; for now both queries share Done/QCB gates.
    due_today_pages = notion_query(
        NOTION_TASKS_DB,
        {
            "filter": {
                "and": [
                    {"property": "Done", "checkbox": {"equals": False}},
                    {"property": "Quick Capture Box", "formula": {"checkbox": {"equals": False}}},
                    {"property": "Due", "date": {"on_or_before": today.isoformat()}},
                ]
            }
        },
    )
    due_week_pages = notion_query(
        NOTION_TASKS_DB,
        {
            "filter": {
                "and": [
                    {"property": "Done", "checkbox": {"equals": False}},
                    {"property": "Quick Capture Box", "formula": {"checkbox": {"equals": False}}},
                    {"property": "Due", "date": {"after": today.isoformat()}},
                    {"property": "Due", "date": {"on_or_before": week_end.isoformat()}},
                ]
            }
        },
    )

    def to_task(page: dict[str, Any]) -> dict[str, Any] | None:
        props = page["properties"]
        name = prop_title(props, ["Name", "Task", "Title"])
        if not name:
            return None
        due = prop_date_start(props, "Due")
        priority = prop_select(props, "Priority")
        project = prop_relation_names(props, "Project") or prop_select(props, "Project")
        item: dict[str, Any] = {
            "name": name,
            "due": due.isoformat() if due else "",
            "priority": priority,
            "project": project,
            "highPriority": priority == HIGH_PRIORITY_VALUE,
        }
        return item

    due_today: list[dict[str, Any]] = []
    for page in due_today_pages:
        t = to_task(page)
        if t:
            due_today.append(t)
    due_today.sort(key=lambda t: t["due"] or "9999-99-99")

    due_later: list[dict[str, Any]] = []
    for page in due_week_pages:
        t = to_task(page)
        if t:
            due_later.append(t)
    due_later.sort(key=lambda t: t["due"] or "9999-99-99")

    print(f"Tasks: {len(due_today)} due today/overdue, {len(due_later)} later this week")
    out: dict[str, list[dict[str, Any]]] = {}
    if due_today:
        out["dueTodayOrOverdue"] = due_today
    if due_later:
        out["dueLaterThisWeek"] = due_later
    return out


def get_networking() -> list[dict[str, Any]]:
    """Filter in Python so Status can be either Notion 'status' or 'select'."""
    today = today_local()
    pages = notion_query(NOTION_NETWORK_DB, {})

    contacts: list[dict[str, Any]] = []
    for page in pages:
        props = page["properties"]
        status = prop_status(props, "Status") or prop_select(props, "Status")
        if status == "Dead End":
            continue
        follow = prop_date_start(props, "Follow-up Date")
        owed = status in {"Reached Out", "Responded"}
        due = follow is not None and follow <= today
        if not owed and not due:
            continue

        name = prop_title(props, ["Name", "Title"])
        if not name:
            continue
        relationship = prop_select(props, "Relationship")
        how = prop_select(props, "How Contacted")
        notes = prop_rich_text(props, "Notes") or prop_rich_text(props, "What Was Asked")

        why_bits = [b for b in [status, relationship, how] if b]
        if due and follow:
            why_bits.append(f"follow-up due {follow.isoformat()}")
        why = " · ".join(why_bits) if why_bits else "Needs follow-up"

        contacts.append({
            "name": name,
            "why": why,
            "nextStep": notes if notes else "Send a short follow-up",
        })

    print(f"Network: {len(contacts)} contacts needing attention")
    return contacts


def get_job_tracker() -> list[dict[str, Any]]:
    today = today_local()
    pages = notion_query(NOTION_JOB_DB, {})

    jobs: list[dict[str, Any]] = []
    for page in pages:
        props = page["properties"]
        status = prop_status(props, "Status") or prop_select(props, "Status")
        if status == "Rejected":
            continue
        company = prop_title(props, ["Company", "Name", "Title"])
        if not company:
            continue
        follow = prop_date_start(props, "Follow-up Date")
        applied = prop_date_start(props, "Date Applied")
        notes = prop_rich_text(props, "Notes")
        follow_due = follow is not None and follow <= today
        stale_applied = (
            status == "Applied"
            and applied is not None
            and (today - applied).days >= APPLIED_STALE_DAYS
        )

        needs = False
        if follow_due:
            needs = True
        if status in {"Phone Screen", "Interview", "Offer"}:
            needs = True
        if stale_applied:
            needs = True
        if status == "Applied" and not applied and not follow:
            needs = True
        if status == "Interested" and follow_due:
            needs = True

        if not needs:
            continue

        if notes:
            next_action = notes
        elif status == "Interview":
            next_action = "Prep for interview"
        elif status == "Phone Screen":
            next_action = "Prep for phone screen"
        elif status == "Applied":
            next_action = "Follow up on application"
        elif status == "Offer":
            next_action = "Review and respond to offer"
        else:
            next_action = "Review and decide next step"

        jobs.append({"company": company, "stage": status or "Unknown", "nextAction": next_action})

    print(f"Jobs: {len(jobs)} needing action")
    return jobs


# ── LLM (narrow calls only) ─────────────────────────────────────────────────
def ollama_generate(prompt: str) -> str:
    resp = requests.post(
        OLLAMA_URL,
        json={"model": MODEL, "prompt": prompt, "stream": False},
        timeout=180,
    )
    resp.raise_for_status()
    text = (resp.json().get("response") or "").strip()
    # Strip common wrapper noise
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text).strip()
    return text


def pick_most_important(payload: dict[str, Any]) -> str:
    summary = {
        "schedule": payload.get("schedule", []),
        "tasksDue": (payload.get("tasks") or {}).get("dueTodayOrOverdue", []),
        "networking": payload.get("networking", []),
        "jobs": payload.get("jobTracker", []),
        "urgentEmails": [e for e in payload.get("emails", []) if e.get("urgency") in ("Urgent", "Soon")],
    }
    prompt = (
        "You help Jason plan his day. Given this JSON of today's commitments, "
        "reply with ONE sentence naming the single most important thing to do today and why. "
        "No preamble, no bullets, no quotes.\n\n"
        f"{json.dumps(summary, ensure_ascii=False)}"
    )
    try:
        return ollama_generate(prompt)
    except Exception as e:
        print(f"LLM mostImportant failed: {e}")
        # Deterministic fallback
        tasks = summary["tasksDue"]
        high = [t for t in tasks if t.get("highPriority")]
        if high:
            return f"Focus on '{high[0]['name']}' — high-priority and due."
        if summary["schedule"]:
            return f"Protect time for '{summary['schedule'][0]['title']}' — it's on today's calendar."
        if tasks:
            return f"Clear '{tasks[0]['name']}' — it's due or overdue."
        return "Review today's open loops and choose one forward move."


def optional_prep_notes(payload: dict[str, Any]) -> list[str]:
    candidates = []
    for ev in payload.get("schedule", [])[:6]:
        title = ev.get("title", "")
        if any(k in title.lower() for k in ("interview", "meeting", "call", "screen", "coffee")):
            candidates.append(f"calendar:{title}")
    for t in (payload.get("tasks") or {}).get("dueTodayOrOverdue", [])[:6]:
        if t.get("highPriority"):
            candidates.append(f"task:{t['name']}")
    for j in payload.get("jobTracker", [])[:4]:
        if j.get("stage") in ("Interview", "Phone Screen"):
            candidates.append(f"job:{j['company']} ({j['stage']})")

    if not candidates:
        return []

    prompt = (
        "For each item that clearly needs brief prep, write one short sentence prep note. "
        "Skip items that don't need prep. Return plain lines as 'label: note'. "
        "Max 4 lines. No intro.\n\nItems:\n" + "\n".join(f"- {c}" for c in candidates)
    )
    try:
        text = ollama_generate(prompt)
    except Exception as e:
        print(f"LLM prep notes failed: {e}")
        return []

    notes: list[str] = []
    for line in text.splitlines():
        line = line.strip().lstrip("-• ").strip()
        if not line or len(line) < 8:
            continue
        notes.append(line)
        if len(notes) >= 4:
            break
    return notes


def build_action_items(payload: dict[str, Any], prep_notes: list[str]) -> list[str]:
    items: list[str] = []
    for t in (payload.get("tasks") or {}).get("dueTodayOrOverdue", []):
        prefix = "HIGH: " if t.get("highPriority") else ""
        items.append(f"{prefix}{t['name']}" + (f" (due {t['due']})" if t.get("due") else ""))
    for n in payload.get("networking", [])[:5]:
        items.append(f"Network: {n['name']} — {n['nextStep']}")
    for j in payload.get("jobTracker", [])[:5]:
        items.append(f"Job: {j['company']} ({j['stage']}) — {j['nextAction']}")
    for e in payload.get("emails", []):
        if e.get("urgency") == "Urgent":
            items.append(f"Email: {e['subject']} ({e['from']})")
    items.extend(prep_notes)
    # de-dupe preserving order
    seen: set[str] = set()
    out: list[str] = []
    for i in items:
        if i not in seen:
            seen.add(i)
            out.append(i)
    return out[:12]


# ── Output ──────────────────────────────────────────────────────────────────
def atomic_write_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(prefix="daily-brief.", suffix=".json", dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")
        os.replace(tmp_name, path)
    except Exception:
        try:
            os.unlink(tmp_name)
        except OSError:
            pass
        raise


def main() -> None:
    day = today_local()
    print(f"Generating daily brief for {day.isoformat()} ({TZ.key})…")

    schedule = get_todays_events()
    emails = get_unread_emails()
    tasks = get_tasks()
    networking = get_networking()
    jobs = get_job_tracker()

    brief: dict[str, Any] = {
        "date": day.isoformat(),
        "dayOfWeek": day.strftime("%A"),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }
    if schedule:
        brief["schedule"] = schedule
    if emails:
        brief["emails"] = emails
    if tasks:
        brief["tasks"] = tasks
    if networking:
        brief["networking"] = networking
    if jobs:
        brief["jobTracker"] = jobs

    print("Asking Ollama for mostImportant…")
    brief["mostImportant"] = pick_most_important(brief)

    print("Asking Ollama for optional prep notes…")
    prep = optional_prep_notes(brief)
    actions = build_action_items(brief, prep)
    if actions:
        brief["actionItems"] = actions

    atomic_write_json(OUTPUT_PATH, brief)
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
