# QA Checklist — Run Before Every Production Deploy

~5 minutes. No tooling required. All tests manual.

---

## 1. Auth security (run first — these are the highest-risk items)

- [ ] **Cross-album JWT**: unlock a protected album, then try to access a file from a *different* protected album using that cookie (rename it in devtools). Expect **403**.
- [ ] **Tampered token**: unlock an album, edit one character in the cookie value. Expect **401**.
- [ ] **No cookie**: access `/api/photos/<protected-album>/<file>` with no cookie. Expect **401**.
- [ ] **Rate limiting active**: confirm `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set in the Vercel **Production** environment (`vercel env ls` from linked project dir).

## 2. Public album

- [ ] Load a public album → photos display, thumbnail strip is a single horizontal row.
- [ ] Click a photo → lightbox opens, prev/next navigation works, Escape closes.
- [ ] Network tab shows no `/api/photos/` requests for public album photos.

## 3. Protected album

- [ ] Load a protected album → password gate appears as overlay, background is not scrollable.
- [ ] Enter wrong password → error shown, input cleared, button re-enabled.
- [ ] Enter correct password → gate fades out, locked photos appear in thumbnail strip.
- [ ] Reload in the same browser session → auto-unlocks (sessionStorage hit), gate never appears.
- [ ] Return after session expires (or clear sessionStorage) → gate reappears, error reads **"Your session has expired. Please enter the password again."** (not "Something went wrong").

## 4. Dependencies

- [ ] `npm ls sharp` — confirm `sharp` is a direct dependency.
- [ ] `npm run build` — completes without errors.
- [ ] `npm test` — all tests pass.

## 5. Content integrity

- [ ] `curl https://pasqualo.to/gallery/<protected-album>` — confirm no locked filenames appear in the HTML response body.

## 6. Post-deploy

- [ ] Check Vercel function logs for startup warnings or errors after deploy.
- [ ] Load the site in Safari (not just Chrome) — confirm `__Host-` cookies work correctly.

---

*Based on tester review 2026-04-06. Update this list when new protected albums or auth flows are added.*
