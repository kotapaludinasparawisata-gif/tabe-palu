const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, max-age=0"
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

async function readUpstreamJson(response) {
  const raw = await response.text();
  try {
    return JSON.parse(raw);
  } catch {
    const preview = raw.replace(/\s+/g, " ").slice(0, 180);
    throw new Error(
      `Google Apps Script tidak mengembalikan JSON (HTTP ${response.status}). ` +
      (preview ? `Respons: ${preview}` : "Respons kosong.")
    );
  }
}

async function handleApi(request, env, url) {
  const gasUrl = env.GAS_WEB_APP_URL;
  const secret = env.TABE_API_SECRET;

  if (!gasUrl || !secret) {
    return jsonResponse({
      result: "error",
      message: "Konfigurasi Cloudflare belum lengkap. Atur GAS_WEB_APP_URL dan TABE_API_SECRET pada Variables and Secrets."
    }, 500);
  }

  const route = url.pathname.replace(/^\/api\/?/, "").replace(/\/+$/, "");
  const method = request.method.toUpperCase();
  let action = "";

  if (route === "visits" && method === "GET") action = "list";
  else if (route === "attractions" && method === "GET") action = "listAttractions";
  else if (route === "visits" && method === "POST") action = "saveVisit";
  else if (route === "attractions" && method === "POST") action = "saveAttractions";
  else if (route === "visits" || route === "attractions") {
    return jsonResponse({ result: "error", message: "Metode HTTP tidak diizinkan." }, 405);
  } else {
    return jsonResponse({ result: "error", message: "Rute API tidak dikenal." }, 404);
  }

  try {
    const target = new URL(gasUrl);
    target.searchParams.delete("action");
    target.searchParams.delete("secret");

    let upstream;
    if (method === "GET") {
      target.searchParams.set("action", action);
      target.searchParams.set("secret", secret);
      upstream = await fetch(target.toString(), {
        method: "GET",
        headers: { "Accept": "application/json" },
        redirect: "follow"
      });
    } else {
      let incoming;
      try {
        incoming = await request.json();
      } catch {
        return jsonResponse({ result: "error", message: "Isi permintaan bukan JSON yang valid." }, 400);
      }

      if (action === "saveAttractions") {
        const adminPin = request.headers.get("X-Admin-Pin") || "";
        if (!env.TABE_ADMIN_PIN || adminPin !== env.TABE_ADMIN_PIN) {
          return jsonResponse({
            result: "error",
            message: "PIN admin tidak sesuai atau TABE_ADMIN_PIN belum diatur di Cloudflare."
          }, 401);
        }
        if (!incoming || !Array.isArray(incoming.attractions)) {
          return jsonResponse({ result: "error", message: "Data objek wisata tidak valid." }, 400);
        }
      }

      const body = action === "saveVisit"
        ? { action, secret, visit: incoming }
        : { action, secret, attractions: incoming.attractions };

      upstream = await fetch(target.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(body),
        redirect: "follow"
      });
    }

    const payload = await readUpstreamJson(upstream);
    return jsonResponse(payload, upstream.ok ? 200 : upstream.status);
  } catch (error) {
    return jsonResponse({
      result: "error",
      message: `Gagal menghubungi Google Apps Script: ${error.message}`
    }, 502);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      return handleApi(request, env, url);
    }

    // Semua halaman, gambar, dan aset website tetap disajikan dari folder public.
    return env.ASSETS.fetch(request);
  }
};
