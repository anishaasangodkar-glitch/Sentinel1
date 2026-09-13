# Sentinel Verification Report

Verification date: 13 September 2026

## Result

The real Python 3.10.11 backend is now verified. The supplied BERT model loads from `backend/model_save`, the FastAPI health check is green, and the expanded backend and extension regression suites pass.

The remaining release limitation is browser UI acceptance. The available Edge automation connector can read normal webpages but cannot claim the internal `edge://extensions` manager or the browser side-panel surface. Login and private screenshot evidence upload also require the owner to complete the account step in the browser. Those checks are recorded as blocked or unverified below; no fabricated pass result is reported.

The model split is intentional and accepted: the deployed website uses its configured Gemini provider, while the local FastAPI backend and extension integration use the supplied BERT artifact in `backend/model_save`. The parity check verifies the local website rules, extension rules, and real local BERT endpoint together; it does not claim that Gemini and BERT are the same production model.

## Website verification

The local website safety engine now passes nine tests, including safe text, exact sextortion wording, direct physical threat, urgent OTP/payment fraud, and honest screenshot fallback behavior. The local website build and type-check also pass.

The deployed website health endpoint currently returns database, storage, and AI readiness. Its live safe-text request returned LOW risk from Gemini. When Gemini is unavailable, the deployed version currently falls back to the older local-rules build; redeploying the current source is still required before the deployed fallback wording and expanded local rules match this report.

## Task 0 Backend verification

### Live health check

Command:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

Actual result:

```json
{
  "status": "ok",
  "model_loaded": true,
  "python_version": "3.10.11",
  "model_path": "C:\\Users\\Anisha\\OneDrive\\Documents\\ChatGPT\\hack\\backend\\model_save",
  "error": null
}
```

This satisfies the required backend gate: Python 3.10.11, real model loaded, and the expected model path.

### Dependency installation

The pinned requirements are installed in `backend/.venv`, including:

- fastapi 0.115.6
- uvicorn 0.34.0
- transformers 4.48.3
- torch 2.6.0
- numpy 2.2.2
- pydantic 2.10.5
- httpx 0.28.1
- pytest 8.3.4

### Backend tests

Command:

```powershell
.\backend\.venv\Scripts\python.exe -m pytest -q .\backend\tests
```

Result:

```text
8 passed, 1 warning in 3.07s
```

The warning is a Starlette/AnyIO deprecation warning and did not fail any test.

The live API smoke test also passed:

```text
FastAPI smoke test passed at http://127.0.0.1:8001.
```

## Task 1 Expanded safety coverage

The deterministic rules now cover and permanently test:

1. `I hate you` and `kill yourself` - High Risk floor.
2. `you are looking very sexy today,send me ur pic or ill release your nudes` - sextortion/coercion.
3. `I will hurt you if you come here again` - direct physical threat.
4. `Urgent: verify now or your account closes. Send the OTP and payment immediately.` - urgent payment/OTP fraud.

### Live `/predict` results

The real running API returned these results:

| Case | Harmful labels returned | Rule-backed confidence evidence |
|---|---|---|
| Sextortion | Cyberbullying, Profanity, Threat, Pornography, Spam | Cyberbullying 0.94, Threat 0.96, Pornography 0.94 |
| Direct threat | Cyberbullying, Threat | Cyberbullying 0.91, Threat 0.96 |
| Urgent fraud | Spam | Spam 0.94 |

The expanded rules are applied alongside the supplied BERT model. The model was not retrained or replaced.

## Task 2 Honest fallback

### Automated fallback verification

The extension test suite verifies:

- API failure activates the local rules.
- The exact fallback message is `Model unavailable — using local safety rules`.
- Invalid API JSON does not crash the extension.
- `sentiment: []` is safe.
- The local fallback rates the sextortion, direct-threat, and urgent-fraud cases High Risk at 80/100 or above.
- The fallback does not use a fabricated model confidence percentage.

Result after the new regression cases:

```text
9 tests passed
```

The extension type-check also passed, and `npm run build` completed successfully. Vite produced the service worker, side-panel HTML, content script, analyzer asset, and side-panel bundle. The only build note is Vite's non-fatal bundle-size warning for the approximately 684 kB side-panel JavaScript chunk.

### Live panel fallback result

Status: **BLOCKED / UNVERIFIED**.

The API was not stopped for a browser-panel claim because the available browser automation cannot claim Edge's internal `edge://extensions` manager or the side-panel UI. Therefore the exact fallback message was not visually confirmed in the live panel during this run. The code path and automated tests are green, but that is not being represented as a live browser pass.

## Task 3 Manual browser acceptance test

| Step | Result | Evidence or blocker |
|---|---|---|
| 1. Fresh `build-extension.bat` package | PASS | Build completed and generated `extension/dist` and `sentinel-extension-0.1.0.zip`. |
| 2. Load `extension\\dist` as unpacked | BLOCKED / UNVERIFIED | Edge's `edge://extensions` internal tab cannot be claimed by the available browser connector. |
| 3. Permission prompt and automatic page analysis | BLOCKED / UNVERIFIED | Requires the extension side panel, which is not exposed as a controllable tab. |
| 4. Explicit abuse phrase High Risk at least 80/100 | BLOCKED / UNVERIFIED in UI | Backend and local extension tests pass; live side-panel display was not accessible. |
| 5. Safe sentence not harmful | BLOCKED / UNVERIFIED in UI | API contract and extension unit tests pass; live side-panel display was not accessible. |
| 6. Screenshot analysis without login | BLOCKED / UNVERIFIED | Requires selecting a local image in the extension side panel. |
| 7. Login, incident creation, and original-image upload | BLOCKED / OWNER ACTION | Requires the owner to enter credentials and complete the authenticated Supabase save flow. The implementation and shared API routes are present. |
| 8. Stop API and confirm live fallback | BLOCKED / UNVERIFIED | Requires the extension side panel in the target browser. Automated fallback tests pass. |

These are browser-access limitations, not claims that the implementation is broken. The manual steps still need to be run by the owner in Chrome or Edge using the commands in `README.md`.

## Task 4 Store publication readiness

Status: **COMPLETE UP TO OWNER SUBMISSION**.

- `extension/manifest.json` version is `0.1.0`.
- `sentinel-extension-0.1.0.zip` is current and was recreated after the safety-rule changes.
- The ZIP contains `manifest.json`, `background/service-worker.js`, and `src/sidepanel/index.html`.
- Copy-ready store listing, permissions justification, and privacy declaration are in `STORE_LISTING.md`.
- Actual Chrome Web Store and Edge Add-ons submission is intentionally not attempted because it requires the owner's publisher accounts, verification, listing assets, and approval.

## Commands for the owner to finish the browser gate

From the project root:

```powershell
.\build-extension.bat
```

Then:

1. Open `edge://extensions` or `chrome://extensions`.
2. Turn on Developer mode.
3. Select Load unpacked.
4. Select `C:\Users\Anisha\OneDrive\Documents\ChatGPT\hack\extension\dist`.
5. Open a normal webpage and click Sentinel Digital Safety.
6. Grant page access when prompted.
7. Test the abuse, safe, screenshot, login/save, and API-offline cases listed above.

## Final ownership actions

The engineering work is complete and the real Python 3.10 backend gate is green. The owner still needs to complete the manual browser acceptance steps, authenticate once to verify private evidence saving, and submit the current ZIP using the store listing assets in `STORE_LISTING.md`.
