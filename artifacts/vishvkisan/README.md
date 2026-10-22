# VishvKisan — From Fields to Families

A polished, responsive front-end prototype for an agricultural support platform, inspired by the supplied VishvKisan screen references. It uses an editorial green palette, warm off-white surfaces, responsive navigation, and practical farmer-first workflows.

## Run locally
1. Extract the ZIP.
2. Open `index.html` in a modern browser.
3. Internet is recommended for the live weather lookup and web fonts; most of the UI works offline.

## Included
- Responsive overview/dashboard and mobile navigation
- Separate Farmer and Customer entry flows with role-specific welcome messaging
- Demo sign-in flow with clearly labelled test code (123456); not real OTP delivery
- Farm profile saved in the current browser (localStorage)
- Live weather lookup through Open-Meteo geocoding + forecast endpoints (internet required, no API key)
- Illustrative market cards with explicit sample-data warnings and official AGMARKNET/e-NAM links
- Scheme discovery cards linked to official portals
- Community post demo saved locally in the browser
- Task checklist, theme toggle, language preference selector, search, help and notification panels
- Technical design, test checklist, sample-data notes and licence guidance

## What is live vs demo
**Live when online:** weather search and forecast from Open-Meteo; links to official scheme/market portals.
**Demo only:** market price values, profile storage, community posts/reactions, task completion, notifications and language preference. Local browser data is not an account and does not sync to other devices.
**Not included / needs configuration:** real OTP delivery, production backend authentication, shared cloud database, verified AI crop diagnosis, official live mandi price feed, live maps/geolocation, push notifications, or government application submission. The role selector and demo code are for UI testing only; they do not secure accounts. Weather lookup uses Open-Meteo when internet is available.

## Important before public launch
- Add a secure backend and managed authentication provider for OTP; store secrets server-side.
- Use a maintained database with row-level access control, backups and deletion/export workflows.
- Integrate market prices only through a permitted, documented API and show source, market, unit, and timestamp for every quote.
- Review scheme content and eligibility against official sources regularly.
- Have qualified agronomists validate crop/soil guidance; never present AI outputs as a guaranteed diagnosis.
- Add privacy policy, consent, security review, accessibility checks, moderation and reporting for community content.
- Use HTTPS and a proper domain/hosting setup. Do not collect Aadhaar, bank details or other sensitive identifiers in this demo.


## Branding and welcome screen update
The latest version opens with a branded welcome screen using the supplied VishvKisan logo, the English tagline “From Fields to Families”, and the Hindi tagline “खेतों से हर परिवार तक” (“From fields to every family”). The visual system now uses a premium charcoal/black and forest-green palette with restrained lime accents. The welcome actions enter the existing dashboard; they do not represent a real account login.

The logo asset is `vishvkisan-logo.png`. It is a cropped version of the logo image supplied by the project owner; replace it with an original high-resolution transparent PNG/SVG if one becomes available.


## Welcome page branding update
The welcome screen now embeds the supplied original VishvKisan hand-and-plant logo directly in the HTML so the logo cannot disappear because of a missing image path. The right-side hero uses a crop from the farmer-with-phone photograph in the user-provided original VishvKisan front-page screenshot; no generated illustration is used in the welcome hero. Keep `farmer-phone.jpg` beside `index.html`.


## Farmer and customer roles
Choose **Farmer Login** to preview the farm-oriented workspace or **Customer Login** to preview the buyer-oriented experience. The demo code `123456` only tests the front-end flow; it does not send an email or SMS and must never be used as production authentication. For real OTP, configure a backend with a managed auth provider (for example Supabase Auth or Firebase Authentication), server-side rate limits, expiry, abuse protection, and verified redirect/domain settings. Never place service-role secrets in browser code.

## Customer marketplace and farmer seller studio update

This version preserves the existing single-page VishvKisan prototype and adds an ecommerce-style **My Produce Listings** seller studio to the Farmer experience. Farmers can add listings with category, price, unit, stock, location and an icon, then edit or remove them. Listings are saved in the current browser's localStorage for this prototype. The Customer experience retains its product browsing, category filters, search, favourites, cart and demo checkout.

**Prototype limitations:** customer/farmer sign-in and verification are demo-only; the customer catalogue is sample data; farmer listings are not shared across browsers/devices; checkout does not create a real order and no real payment is processed. A production marketplace needs a secure backend/database, server-side role permissions, inventory APIs and a payment provider.
