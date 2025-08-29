# scripts/fetch_feeds.py — Python builder (dynamic sections, cleanup)
import json, os, re, time, shutil
from datetime import datetime, timedelta, timezone
from pathlib import Path

import feedparser

ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / "scripts" / "sources.json").read_text(encoding="utf-8"))

TZ_NAME = CONFIG.get("timezone", "Asia/Kolkata")
# Simple map for common TZ; for portability we use fixed IST; change if needed
TZ = timezone(timedelta(hours=5, minutes=30)) if "Kolkata" in TZ_NAME else timezone.utc
KEEP_DAYS = int(CONFIG.get("keep_days", 7))

DATA = ROOT / "data"

def ist_date(dt=None):
    if dt is None:
        dt = datetime.now(TZ)
    return dt.strftime("%Y-%m-%d")

def sanitize(entry, fallback_source):
    title = (entry.get("title") or "(untitled)").strip()
    link = entry.get("link") or entry.get("id") or "#"
    source = entry.get("author") or fallback_source
    published = entry.get("published") or entry.get("updated") or datetime.now(TZ).isoformat()
    summary = re.sub("<[^>]+>", "", entry.get("summary", "")).strip()[:300]
    image = ""
    media = entry.get("media_content") or entry.get("media_thumbnail") or []
    if isinstance(media, list) and media and isinstance(media[0], dict):
        image = media[0].get("url","")
    return {"title": title, "url": link, "source": source, "published": published, "summary": summary, "image": image}

def dedupe(items):
    seen, out = set(), []
    for it in items:
        key = (it.get("url") or it.get("title") or "").lower()
        if key in seen: 
            continue
        seen.add(key)
        out.append(it)
    return out

def write_json(path: Path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Wrote", path)

def build():
    today = ist_date()
    day_dir = DATA / today
    day_dir.mkdir(parents=True, exist_ok=True)

    sections = CONFIG.get("sections", {})
    per_lang = {}  # {lang: merged items}

    for section, langs in sections.items():
        for lang, feeds in langs.items():
            items = []
            for f in feeds:
                try:
                    feed = feedparser.parse(f["url"], request_headers={"User-Agent": "NewsHubBot/1.0"})
                except Exception as e:
                    print("FEED ERROR:", f["url"], str(e))
                    continue
                for entry in getattr(feed, "entries", []):
                    items.append(sanitize(entry, f.get("name","")))
                time.sleep(0.2)  # be gentle
            items.sort(key=lambda x: x["published"], reverse=True)
            items = dedupe(items)[:100]
            write_json(day_dir / f"{section}.{('ta' if lang=='ta' else 'en')}.json",
                       {"date": today, "section": section, "lang": lang, "items": items})
            per_lang.setdefault(lang, []).extend(items)

    # build "all" per lang
    for lang, items in per_lang.items():
        items.sort(key=lambda x: x["published"], reverse=True)
        items = dedupe(items)[:150]
        write_json(day_dir / f"all.{('ta' if lang=='ta' else 'en')}.json",
                   {"date": today, "section": "all", "lang": lang, "items": items})

    # update last-7 index.json and prune old date folders
    index_path = DATA / "index.json"
    existing = []
    if index_path.exists():
        try:
            existing = json.loads(index_path.read_text(encoding="utf-8"))
        except Exception:
            pass
    dates = sorted({today, *existing}, reverse=True)[:KEEP_DAYS]
    write_json(index_path, dates)

    # cleanup directories older than retained dates
    keep_set = set(dates)
    for d in DATA.iterdir():
        if d.is_dir() and re.match(r"^\d{4}-\d{2}-\d{2}$", d.name) and d.name not in keep_set:
            print("Removing old date folder:", d)
            shutil.rmtree(d, ignore_errors=True)

if __name__ == "__main__":
    build()
