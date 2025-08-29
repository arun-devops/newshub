# NewsHub v2 (Static + Python Builder + Search + Offline)
Tamil + English daily news hub with **All / General / AI / Gaming** tabs, client-side **search**, and basic **offline** support.
- Static UI in `index.html` (+ `assets/`)
- Headlines prebuilt by a **Python** script (`scripts/fetch_feeds.py`) via **GitHub Actions`
- Data saved to `data/YYYY-MM-DD/*.json` (keeps last N days in `data/index.json`, default 7)
- Service worker `sw.js` caches shell and JSON runtime

## Quick Deploy
1) Create a GitHub repo and upload this folder.
2) **Settings → Pages** → Source: *Deploy from a branch* → `main` root.
3) **Actions** tab → enable workflows → run **Build Daily News (Python)** once.
4) Auto-updates run daily at 05:30 IST (change cron in `.github/workflows/build-news.yml`).

## Edit feeds
`scripts/sources.json` — add/remove feeds per section & language.

## Local test
```
pip install -r requirements.txt
python scripts/fetch_feeds.py
python -m http.server 5500
# open http://localhost:5500
```
