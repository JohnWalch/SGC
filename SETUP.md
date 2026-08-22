# Deploy setup

This repo is now a Vite + React app with a Cloudflare Pages Function for
shared storage (registrations / chat / results), instead of the Claude-only
`window.storage` API the original file used.

## 1. Create a KV namespace (one-time, in the Cloudflare dashboard)

1. Cloudflare dashboard -> Workers & Pages -> KV -> Create namespace, e.g. `SGC_KV`.
2. Open your Pages project -> Settings -> Functions -> KV namespace bindings ->
   Add binding: variable name `SGC_KV`, select the namespace you just created.
   (Do this for both Production and Preview environments.)

## 2. Set the build configuration (Pages project -> Settings -> Builds)

- Build command: `npm run build`
- Build output directory: `dist`

## 3. Commit and push

From your machine:

```
cd "SGC 26/SGC"
git add -A
git rm --cached swiss-go-championship-2026.jsx   # optional: drop the old standalone file
git commit -m "Turn into deployable Vite app with Cloudflare KV-backed storage"
git push
```

## 4. Verify

- Run `npm install && npm run build` locally first to confirm it compiles.
- After Cloudflare finishes the build/deploy, open the site and check the
  Register / Chat / Results tabs actually save and reload data (confirms the
  KV binding is wired up correctly).

## 5. Protect organizer actions with Cloudflare Access

The hardcoded "organizer PIN" is gone. Organizer-only actions (add/delete
match results, delete a registration, delete chat messages, clear chat, and
seeing registrants' email addresses) now go through `/api/organizer/*`,
which the app expects Cloudflare Access to protect.

1. Cloudflare dashboard -> Zero Trust (may prompt you to set up a free Zero
   Trust team the first time — pick any team name).
2. Zero Trust -> Access -> Applications -> Add an application -> Self-hosted.
3. Application domain: `swiss-go-championship-2026.pages.dev`, path:
   `/api/organizer/*`.
4. Add a policy, e.g. "Organizer" -> Allow -> Include -> Emails -> your own
   email address (add co-organizers here too if needed). Cloudflare will
   email a one-time code to log in — no password/PIN to manage.
5. Save. That's it — Pages Functions automatically receive a verified
   `Cf-Access-Authenticated-User-Email` header for requests that pass this
   policy, which `functions/api/organizer/storage.js` checks.

### How signing in works in the app

Because this is a single-page app, the "Organiser sign-in" button can't
trigger the Access login by itself — Access needs a real page load to show
its login challenge. So the flow is:

1. Click "organiser sign-in" in the app, then "open the sign-in link" (opens
   `/api/organizer/storage?...` in a new tab).
2. Complete the Cloudflare Access login there (email one-time code).
3. Close that tab, go back to the app, click "I've signed in".

Once signed in, the browser holds a Cloudflare Access cookie for the whole
site, so organizer actions work directly from the app until the session
expires.
