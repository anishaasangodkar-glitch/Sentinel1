# Sentinel Browser Extension

Manifest V3 Chrome/Edge extension MVP for Sentinel digital safety demos.

## Features

- Ask for page-access permission the first time, then automatically analyze the active page whenever the side panel opens.
- Analyze a PNG, JPEG, or WebP screenshot directly from the side panel.
- Analyze screenshots anonymously; opening **Save evidence** asks for a Sentinel login and uploads the incident plus original image to the shared private backend.
- Analyze highlighted text from the right-click menu.
- Show Risk DNA, consequences, signals, and recommended actions in a side panel.
- Save evidence locally in extension storage for dashboard/backend wiring later.
- Use a local rule engine first, with a clean seam for replacing it with the Sentinel API.

## Run

```bash
npm install
npm run build
```

Then load `dist/` as an unpacked extension in Chrome or Edge.

## Shared backend

Sentinel calls the single shared backend at `http://127.0.0.1:8000/predict`.
From the repository root, start it with `start-backend.bat` (or follow the
backend setup in the root README). If the API is not running, the extension
automatically falls back to the built-in rule engine.

The backend adapter preserves the upstream CyberBERT labels and accepts
`POST /predict` with `text` and `request_id`. The original upstream source is
kept in `../Cyberbullying-detection-complete` for model/reference files; it is
not a second runtime backend or extension.

Page access is requested interactively instead of being silently granted at
install time. Browser-protected pages such as `chrome://` cannot be read by
extensions; those pages fall back to URL-only analysis.

## Privacy

Page content is analyzed only after the user grants access. After that, opening
Sentinel on a normal webpage automatically checks the active page; selected
text analysis remains available from the context menu.

## Screenshot login configuration

Copy `.env.example` to `.env.production.local` and fill in the browser-safe
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` values from the same Supabase
project used by the website. The service-role key must never be placed in the
extension. The production API base is configured by
`VITE_SENTINEL_WEB_API_BASE_URL` and points to the deployed Sentinel backend.
