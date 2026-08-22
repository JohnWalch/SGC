// Cloudflare Pages Function for organizer-only actions (add/delete match
// results, delete a registration, moderate chat).
//
// This path (/api/organizer/*) is meant to sit behind a Cloudflare Access
// application (Zero Trust -> Access -> Applications), with a policy that
// only allows the organizer's own email. Access authenticates the visitor
// at Cloudflare's edge before this code ever runs.
//
// As defense-in-depth (in case Access is ever misconfigured or removed),
// this function also checks for the Cf-Access-Authenticated-User-Email
// header that Access injects into authenticated requests, and refuses to
// do anything if it's missing.

const ALLOWED_KEYS = new Set([
  "sgc2026-registrations-v2", // delete a registration
  "sgc2026-results-v2",       // add / delete a match result
  "sgc2026-chat-v2",          // delete a message / clear chat
]);

function organizerEmail(request) {
  return request.headers.get("Cf-Access-Authenticated-User-Email") || null;
}

export async function onRequestGet(context) {
  const { request, env } = context;

  const email = organizerEmail(request);
  if (!email) {
    return json({ error: "not authenticated via Cloudflare Access" }, 401);
  }
  if (!env.SGC_KV) {
    return json({ error: "SGC_KV binding not configured" }, 500);
  }

  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (!key || !ALLOWED_KEYS.has(key)) {
    return json({ error: "invalid key" }, 400);
  }

  const value = await env.SGC_KV.get(key);
  return json({ value, organizer: email });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const email = organizerEmail(request);
  if (!email) {
    return json({ error: "not authenticated via Cloudflare Access" }, 401);
  }
  if (!env.SGC_KV) {
    return json({ error: "SGC_KV binding not configured" }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "invalid JSON body" }, 400);
  }

  const { key, value } = body || {};
  if (!key || !ALLOWED_KEYS.has(key) || typeof value !== "string") {
    return json({ error: "invalid key or value" }, 400);
  }

  await env.SGC_KV.put(key, value);
  return json({ ok: true, organizer: email });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
