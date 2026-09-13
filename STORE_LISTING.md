# Sentinel Digital Safety Store Listing

This file contains copy-ready material for the Chrome Web Store and Microsoft Edge Add-ons dashboards. The package is prepared locally, but the owner must submit it through the publisher accounts.

## Product name

Sentinel Digital Safety

## Short description

Analyze webpages, screenshots, and selected text for cyberbullying, scams, manipulation, privacy exposure, and other digital safety risks.

## Full description

Sentinel Digital Safety is a safety-focused browser side panel that helps people pause and understand risky online content.

Sentinel can:

- Ask for permission before reading a webpage, then automatically analyze the current page when the user opens Sentinel.
- Analyze highlighted text from the right-click menu.
- Analyze PNG, JPEG, and WebP screenshots directly in the side panel.
- Show a risk score, Low/Medium/High severity, Risk DNA, evidence, possible consequences, and recommended safety actions.
- Detect signals such as urgency, financial pressure, manipulation, targeting, secrecy, privacy exposure, abuse, cyberbullying, insults, profanity, threats, pornography, exclusion, sarcasm, and spam.
- Continue using local safety rules when the model service is unavailable. The panel clearly displays: "Model unavailable - using local safety rules."
- Treat an empty harmful-label response as safe instead of inventing a harmful result.
- Require login only when the user chooses to save screenshot evidence to a private Sentinel account.

Sentinel does not silently read every page at install time. Page access is requested interactively, and the user controls whether page analysis is allowed. Browser-protected pages such as chrome:// and edge:// pages cannot be inspected by extensions.

Sentinel is an educational safety assistant, not a replacement for emergency services, professional advice, or a platform's moderation system. Users should verify important decisions through trusted official channels.

## Permissions justification

### activeTab

Used to work with the webpage the user has actively opened and selected for Sentinel analysis.

### contextMenus

Used to provide the user-invoked "Analyze with Sentinel" action for highlighted text.

### sidePanel

Used to display the Sentinel risk assessment without replacing the webpage.

### storage

Used to keep the latest assessment and recent evidence locally in browser extension storage so the side panel can restore its state.

### scripting

Used after the user grants page access to collect visible text from the current webpage for automatic analysis.

### Optional host permission for webpages

The extension requests access to the current webpage only after the user chooses to allow automatic page analysis. This is required to collect visible page text. The extension does not request access to browser-internal pages, and protected pages remain unavailable to extensions.

### Localhost API host permissions

Used to communicate with the user's locally running Sentinel FastAPI model at http://127.0.0.1:8000/predict during local development.

## Privacy declaration

Sentinel analyzes only the content the user chooses to inspect or the current page after the user grants page access. Page text, selected text, and uploaded screenshots may be sent to the configured Sentinel analysis service so that a risk assessment can be produced.

Screenshot analysis does not require an account. If the user chooses Save evidence, Sentinel asks the user to sign in or create an account and then stores the assessment and original screenshot in the user's private Sentinel account using the same Supabase project as the Sentinel website.

Recent assessment state is stored locally with chrome.storage.local. The extension does not contain the Sentinel service-role key or Gemini API key. Authentication and private evidence access are enforced by the website backend and Supabase row-level security policies.

Sentinel does not sell personal information. Users should avoid submitting content they are not authorized to share and should remove sensitive information when it is not necessary for safety analysis.

## Data types

- User-provided text or selected webpage text for analysis.
- Visible webpage text after the user grants page access.
- User-selected PNG, JPEG, or WebP screenshots for analysis.
- Account email and authentication data only when the user chooses to sign in or create an account.
- Saved incident and evidence records only when the user explicitly chooses Save evidence.

## Support and website

Website: https://hack-two-beta.vercel.app

## Submission checklist

- [ ] Create or verify the Chrome Web Store publisher account.
- [ ] Create or verify the Microsoft Edge Add-ons publisher account.
- [ ] Upload sentinel-extension-0.1.0.zip from the repository root.
- [ ] Add the Sentinel icon and store screenshots.
- [ ] Paste the description and permission justifications above.
- [ ] Complete each store's privacy and data-use questionnaire.
- [ ] Test the approved store version after review.
- [ ] Keep the unpacked extension installation for local troubleshooting only.
