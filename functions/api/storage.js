// Cloudflare Pages Function: public shared key/value storage backed by a KV
// namespace. Bind a KV namespace named SGC_KV to this Pages project
// (Settings -> Functions -> KV namespace bindings) so `env.SGC_KV` is
// available here.
//
// GET  /api/storage?key=<key>        -> { value: string | null }
// POST /api/storage  { key, value }  -> { ok: true }
//
// This endpoint is intentionally unauthenticated (registration + chat need
// to be open to any visitor), so it only allows the keys below and never
// allows writing match results. Match results and moderation/deletion
// actions go through /api/organizer/storage instead, which is protected by
// Cloudflare Access.

const READABLE_KEYS = new Set([
  "sgc2026-registrations-v2",
  "sgc2026-chat-v2",
  "sgc2026-results-v2",
]);

const WRITABLE_KEYS = new Set([
  "sgc2026-registrations-v2", // new sign-ups
  "sgc2026-chat-v2",          // new chat messages
]);

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!env.SGC_KV) {
    return json({ error: "SGC_KV binding not configured" }, 500);
  }

  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (!key || !READABLE_KEYS.has(key)) {
    return json({ error: "invalid key" }, 400);
  }

  const value = await env.SGC_KV.get(key);

  if (key === "sgc2026-registrations-v2" && value) {
    // Public view: strip email addresses. Organizers get the full record
    // (including email) via /api/organizer/storage.
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        const stripped = parsed.map(({ email, ...rest }) => rest);
        return json({ value: JSON.stringify(stripped) });
      }
    } catch (e) {
      // fall through and return the raw value if parsing fails
    }
  }

  return json({ value });
}

export async function onRequestPost(context) {
  const { request, env } = context;

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
  if (!key || !WRITABLE_KEYS.has(key) || typeof value !== "string") {
    return json({ error: "invalid key or value" }, 400);
  }

  await env.SGC_KV.put(key, value);
  return json({ ok: true });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
