# Test Checklist

## Navigation and responsive UI
- [ ] Open `index.html` on desktop, tablet and mobile widths.
- [ ] Verify each sidebar/mobile navigation item opens the correct view.
- [ ] Verify mobile navigation does not cover the last content (bottom padding).
- [ ] Check keyboard focus, form labels, readable contrast and browser zoom.

## Dashboard
- [ ] Mark a farm task complete and reopen it.
- [ ] Navigate from hero actions to Market and Farm Profile.
- [ ] Verify weather card changes after a successful weather lookup.

## Weather
- [ ] Search for Guwahati, Assam and another valid city.
- [ ] Search an unknown place; verify a helpful error appears and no fabricated result is shown.
- [ ] Test offline/network failure; verify the rest of the app remains usable.
- [ ] Compare current and daily data labels/units with the provider response.

## Market
- [ ] Switch All / Vegetables / Fruits / Grains.
- [ ] Verify sample-data warning is visible.
- [ ] Confirm official AGMARKNET and e-NAM links open in a new tab.

## Schemes
- [ ] Search for PM-KISAN and a non-matching phrase.
- [ ] Verify every scheme card links to its stated official portal.
- [ ] Confirm scheme caveat remains visible.

## Community
- [ ] Create a post; verify it appears at the top.
- [ ] Reload the page; verify local demo post persistence.
- [ ] Like a post; verify the count increments.
- [ ] Verify replies clearly state that shared messaging is not connected.

## Profile and preferences
- [ ] Save profile details; reload and verify local persistence.
- [ ] Clear profile and verify fields and dashboard status reset.
- [ ] Toggle dark mode and reload.
- [ ] Save a language preference and confirm the limitation is explained.

## Production blockers (not implemented)
- [ ] Real SMS/email OTP with backend verification, expiry, throttling and anti-abuse.
- [ ] Secure accounts, cloud database and data deletion/export.
- [ ] Licensed live market data with source, market, unit and timestamp.
- [ ] Verified scheme content and reviewed translations.
- [ ] Expert-validated crop/soil guidance, permission-based maps and community moderation.
