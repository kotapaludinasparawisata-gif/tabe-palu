const corsHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, max-age=0"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const gasUrl = env.GAS_WEB_APP_URL;
  const secret = env.TABE_API_SECRET;
  if (!gasUrl || !secret) {
    return json({ result: "error", message: "Cloudflare belum memiliki GAS_WEB_APP_URL dan TABE_API_SECRET." }, 500);
  }

  const route = Array.isArray(params.path) ? params.path.join("/") : String(params.path || "");
  const method = request.method.toUpperCase();
  let action;
  if (route === "visits" && method === "GET") action = "list";
  else if (route === "attractions" && method === "GET") action = "listAttractions";
  else if (route === "visits" && method === "POST") action = "saveVisit";
  else if (route === "attractions" && method === "POST") action = "saveAttractions";
  else return json({ result: "error", message: "Rute API tidak dikenal." }, 404);

  try {
    const target = new URL(gasUrl);
    if (method === "GET") {
      target.searchParams.set("action", action);
      target.searchParams.set("secret", secret);
      const upstream = await fetch(target.toString(), { method: "GET", redirect: "follow" });
      const payload = await upstream.json();
      return json(payload, upstream.ok ? 200 : upstream.status);
    }

    const incoming = await request.json();
    if (action === "saveAttractions") {
      const adminPin = request.headers.get("X-Admin-Pin") || "";
      if (!env.TABE_ADMIN_PIN || adminPin !== env.TABE_ADMIN_PIN) {
        return json({ result: "error", message: "PIN admin tidak sesuai atau TABE_ADMIN_PIN belum diatur di Cloudflare." }, 401);
      }
    }
    const body = action === "saveVisit"
      ? { action, secret, visit: incoming }
      : { action, secret, attractions: incoming.attractions };
    const upstream = await fetch(target.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      redirect: "follow"
    });
    const payload = await upstream.json();
    return json(payload, upstream.ok ? 200 : upstream.status);
  } catch (error) {
    return json({ result: "error", message: `Gagal menghubungi Google Apps Script: ${error.message}` }, 502);
  }
}
