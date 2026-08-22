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
