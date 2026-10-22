# VishvKisan — Technical Design (Prototype)

## Experience principles
- Farmer-first, calm and legible visual design; dark forest green with restrained lime accents.
- Responsive sidebar on larger screens and compact fixed navigation on mobile.
- Clear distinction between verified live services and illustrative/demo information.
- Avoid presenting sample market data, eligibility or agronomic suggestions as authoritative.

## Current architecture
`Browser (index.html) → UI state + localStorage → Open-Meteo public HTTP endpoints`
- Static HTML/CSS/JavaScript, no build step.
- Weather flow: geocoding search → coordinates → 5-day forecast request → display current conditions and daily high/low.
- Profile and community demo data are stored in localStorage. This is device/browser-local and is not secure account storage.
- Scheme cards link to official portals; scheme details are intentionally short and carry a verification warning.
- Market prices are explicitly illustrative, not connected to a live source.

## Recommended production architecture
1. **Web/mobile client:** React/Next.js or Flutter, accessible components, localisation files, input validation.
2. **Backend API:** authenticated REST/JSON API, rate limiting, audit logging, server-side input validation.
3. **Authentication:** managed provider such as Firebase Authentication or AWS Cognito; OTP rate limits, expiry, abuse prevention, resend throttling and secure recovery. Never trust a client-only OTP.
4. **Database:** PostgreSQL or managed Firestore with per-user access rules; encrypt in transit and at rest; retention and deletion controls.
5. **Weather:** Open-Meteo or another licensed provider; cache responses, show retrieval time, gracefully handle outages.
6. **Market data:** permitted AGMARKNET/e-NAM or state-market data source where API access is available; store source market, commodity, variety, unit, date/time and price type. Do not scrape without permission.
7. **Schemes:** curated records with official URL, ministry, last-reviewed date, state applicability, eligibility caveats and content owner.
8. **AI/soil recommendations:** validated model + agricultural extension review, confidence/limitations, region/season context, and safe fallback to official advice.
9. **Community:** persistent posts, abuse reporting, moderation queue, spam controls, privacy controls and deletion.
10. **Maps:** permission-based geolocation, manual location entry fallback, clear consent and map-provider terms.
11. **Operations:** HTTPS, environment secrets, monitoring, backups, automated tests and incident response.

## Weather API calls used
- `https://geocoding-api.open-meteo.com/v1/search`
- `https://api.open-meteo.com/v1/forecast`
The client handles failures by displaying an error instead of fabricating live results.

## Suggested milestones
- M1: UI acceptance, accessibility and mobile browser QA.
- M2: backend, real auth/OTP and account lifecycle.
- M3: official market feed, provenance/timestamps and cache.
- M4: multilingual translation review and Assamese-first usability test.
- M5: expert-reviewed agriculture guidance and scheme content governance.
- M6: security/privacy review, moderation and production deployment.
