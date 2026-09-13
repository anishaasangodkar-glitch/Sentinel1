# Sentinel Digital Safety

Sentinel is a privacy-conscious digital-safety workspace for analyzing suspicious messages, links, and screenshots. It explains the signals behind a risk assessment, suggests practical next steps, and lets a signed-in user preserve incidents and evidence in Supabase. Anonymous analysis remains available when the backend is not configured, using the local safety rules.

The repository contains the web application, its Vercel-compatible API, the optional FastAPI cyberbullying model adapter, and a Chrome/Edge Manifest V3 extension.

## Web app

The web app is a Vite + React + TypeScript application. The production build is emitted to `dist/`, and `vercel.json` routes `/api/*` to the serverless API while sending browser routes to `index.html`.

Install dependencies and run locally:

```powershell
npm install
npm run dev
```

Build and test the web app:

```powershell
npm run build
npm test
```

### Vercel deployment

Import the repository into Vercel with the project root set to this directory. Vercel will use the checked-in `vercel.json` settings (`npm run build` and `dist`). Add only the required production secrets in the Vercel project settings:

```text
GEMINI_API_KEY
GEMINI_MODEL
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY
RESEND_API_KEY                 # optional email delivery
NOTIFICATION_FROM              # optional sender override
APP_ORIGIN                     # deployed site URL
VITE_SENTINEL_MODE             # live or demo
VITE_SUPABASE_URL              # public browser configuration
VITE_SUPABASE_ANON_KEY         # public browser configuration
```

Run the SQL migrations in `supabase/migrations/` in order before enabling account-backed incident storage. Never commit `.env.local`, service-role keys, Gemini keys, or model weights. `.env.example` documents the expected names and is safe to copy for local setup.

This monorepo contains a FastAPI cyberbullying model adapter and a Chrome/Edge Manifest V3 side-panel extension. The extension sends text to `http://127.0.0.1:8000/predict` and falls back to local safety rules when the API is unavailable or returns an invalid response.

## Structure

```text
backend/                 FastAPI + Transformers + PyTorch API
  app/                   API, model adapter, labels, and safe rules
  tests/                 Python unit tests
  model_save/            PLACE THE SUPPLIED MODEL FOLDER HERE
extension/              React + TypeScript + Vite MV3 extension
  src/sidepanel/        Side-panel UI
  src/background/       Toolbar and context-menu worker
  manifest.json         Manifest V3
start-backend.bat        Starts http://127.0.0.1:8000
build-extension.bat      Builds extension/dist
```

## Model requirement

The referenced project is [wanguiwaweru/Cyberbullying-detection](https://github.com/wanguiwaweru/Cyberbullying-detection). Its published application uses `AutoModelForSequenceClassification.from_pretrained('./model_save')`, `AutoTokenizer.from_pretrained('./model_save')`, sigmoid multi-label probabilities, and the eight requested labels. The Sentinel adapter preserves those labels and safely normalizes model output.

Copy the supplied `model_save` directory unchanged to:

```text
backend/model_save/
```

It must contain the original `pytorch_model.bin`, tokenizer files, `config.json`, vocabulary, and any other files shipped with that model. Do not retrain or replace it. The complete upstream model is installed in this workspace, so `/health` should report `model_loaded: true`. If it is missing in a fresh checkout, clone the upstream project with Git LFS and copy its `model_save` folder here before starting the backend.

## Backend setup

Use Python 3.10 for the pinned PyTorch/Transformers environment. Python 3.14 is not supported by this pinned environment, and the startup script will not silently fall back to it.

```powershell
cd backend
py -3.10 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

If Python 3.10 is not installed, install it first:

```powershell
winget install Python.Python.3.10
```

Copy `.env.example` to `.env` if you need to change the model path or port. Then start the API:

```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Open Swagger at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs). Test `POST /predict` with:

```json
{
  "request_id": "test-1",
  "text": "I hate you"
}
```

The response always contains `status_code`, `message`, `post`, a numeric confidence map for all eight labels, and `sentiment`. An empty `sentiment` array is safe. Blank text and overlong text are rejected.

## Extension setup and build

```powershell
cd extension
npm install
npm run type-check
npm run build
```

The build output must include `dist/manifest.json`, `dist/src/sidepanel/index.html`, `dist/background/service-worker.js`, and the generated assets. `VITE_SENTINEL_API_URL` defaults to `http://127.0.0.1:8000/predict`; copy `.env.example` to `.env` only if you need another API URL.

The production extension build uses the deployed Sentinel API from
`extension/.env.production`; local development can continue using the
Python backend at `127.0.0.1:8000`.

## Load in Chrome or Edge

1. Run the backend and build the extension.
2. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
3. Enable **Developer mode**.
4. Choose **Load unpacked**.
5. Select the `extension/dist` folder.
6. Pin Sentinel Digital Safety, open a webpage, and click the toolbar icon. The extension reads the current page text. Highlight text, right-click, and choose **Analyze with Sentinel** to analyze a selection.

## Publish the extension

Run `build-extension.bat`. It builds the single canonical `extension/` source
and creates `sentinel-extension-0.1.0.zip` at the repository root. Upload that
ZIP in the Chrome Web Store Developer Dashboard or the equivalent Edge Add-ons
developer dashboard. Store account registration, identity/payment verification,
and final submission approval must be completed by the extension owner; they
cannot be completed from this repository without that account access.

The extension does not require a login for page or screenshot analysis. Login is
requested only when saving evidence to the shared Sentinel/Supabase backend;
never place a Gemini key or service-role key in the extension.

## Screenshot analysis and saving

The extension can analyze PNG, JPEG, and WebP screenshots directly through the
shared `POST /api/analyze/image` backend. Analysis does not require login. When
the user chooses **Save evidence**, the extension requests a Sentinel login,
then uses the same Supabase project and authenticated API routes as the website:
`POST /api/incidents` followed by `POST /api/incidents/:id/evidence`.

No new SQL query is required for this feature. The existing migrations already
provide the required private `incidents`, `analysis_results`, and `evidence`
tables plus the `sentinel-evidence` storage bucket and ownership policies. In a
new Supabase project, run these files in order in the Supabase SQL Editor:

```text
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_trusted_contacts_and_shares.sql
```

The extension only needs the public Supabase URL and anon key. Never put
`SUPABASE_SERVICE_ROLE_KEY` or `GEMINI_API_KEY` in extension environment files.

## Reliability behavior

- Network errors, timeouts, non-2xx responses, malformed JSON, missing confidence, unknown labels, and `sentiment: []` are handled without crashing.
- When the API cannot provide a valid result, the panel displays exactly: **Model unavailable — using local safety rules**.
- Explicit abuse/harm phrases such as `I hate you` and `kill yourself` receive High Risk and at least 80/100 in the local fallback.
- For backend labels, the highest matching category confidence drives the risk score.
- Recent results are stored only in `chrome.storage.local`.
- CORS is enabled for Chrome/Edge extension requests.

## Tests

Backend unit tests:

```powershell
cd backend
python -m pytest -q
```

API smoke test (starts a temporary server on port 8001 when one is not already running):

```powershell
.\test_api.ps1
```

Extension tests and checks:

```powershell
cd extension
npm run type-check
npm run test
npm run build
```

The smoke test reuses an already-running server when the selected port is occupied. The full BERT inference test requires the supplied `backend/model_save` folder; without it, the exact blocker is model availability, not a fabricated substitute.

## Troubleshooting

- **Model directory not found:** copy the supplied folder unchanged to `backend/model_save`.
- **PyTorch installation fails:** use Python 3.10 and recreate `backend/.venv`.
- **The virtual environment points to a missing Python:** install Python 3.10, then run `start-backend.bat`; the script preserves the broken environment as `backend/.venv.broken` and creates a fresh one.
- **Panel says model unavailable:** confirm the API is running, browse to `/health`, and check that `/predict` is reachable. The panel will still use its local rules.
- **Current page is empty:** browser-protected pages may prevent script access; highlight and analyze text instead.
- **CORS error:** use the provided API URL and restart the backend after changing configuration.
