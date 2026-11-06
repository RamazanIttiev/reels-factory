type R2Body = { text(): Promise<string>; body: ReadableStream; httpMetadata?: { contentType?: string } };
type Bucket = { get(key: string): Promise<R2Body | null>; put(key: string, value: string): Promise<unknown> };
type Env = { BUCKET: Bucket; APPROVE_TOKEN: string; GITHUB_TOKEN?: string };

const REPO = "RamazanIttiev/reels-factory";

const startRender = async (token: string): Promise<void> => {
  await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/render.yml/dispatches`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "user-agent": "reels-approve", "content-type": "application/json" },
    body: JSON.stringify({ ref: "main" }),
  });
};
type Item = { slug: string; state: string; note?: string };

const LANG = "ru";
const json = (data: unknown, status = 200): Response => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

const sameToken = (given: string, expected: string): boolean => {
  if (!expected || given.length !== expected.length) return false;
  return [...given].reduce((diff, char, index) => diff | (char.charCodeAt(0) ^ expected.charCodeAt(index)), 0) === 0;
};

const authorized = (request: Request, env: Env): boolean => sameToken((request.headers.get("authorization") ?? "").replace(/^Bearer /, ""), env.APPROVE_TOKEN);

const readQueue = async (env: Env): Promise<Item[]> => {
  const object = await env.BUCKET.get(`queue/${LANG}.json`);
  return object ? JSON.parse(await object.text()) : [];
};

const PAGE = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Одобрение</title>
<style>body{font:16px system-ui;margin:16px;max-width:900px;background:#0b141a;color:#eee}section{border:1px solid #345;border-radius:12px;padding:14px;margin:14px 0}
.frames{display:flex;gap:8px;overflow-x:auto}img{height:300px;border-radius:8px}button{font:inherit;padding:10px 18px;border-radius:8px;border:0;margin:8px 8px 0 0;cursor:pointer}
.ok{background:#299a8d;color:#fff}.no{background:#7a2e2e;color:#fff}.meta{color:#9ab}details{margin-top:8px}</style>
<h1>На одобрение</h1><div id="list">Загрузка…</div>
<script>
const token = localStorage.token || prompt("Токен доступа"); if (token) localStorage.token = token;
const headers = { authorization: "Bearer " + token };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const blobUrl = async (path) => URL.createObjectURL(await (await fetch(path, { headers, cache: "no-store" })).blob());
async function load() {
  const res = await fetch("/api/items", { headers, cache: "no-store" });
  if (res.status === 401) { localStorage.removeItem("token"); document.getElementById("list").textContent = "Неверный токен. Обновите страницу."; return; }
  const items = await res.json();
  const root = document.getElementById("list");
  root.innerHTML = items.length ? "" : "<p>Очередь пуста.</p>";
  for (const item of items) {
    const section = document.createElement("section");
    section.innerHTML = "<h2>" + esc(item.slug) + "</h2><p><b>" + esc(item.hook) + "</b></p><p>" + esc(item.caption) + "</p><p class='meta'>" + item.words + " слов, ~" + item.seconds + " с</p><div class='frames'></div><details><summary>Текст</summary>" + item.narration.map((n) => "<p>" + esc(n) + "</p>").join("") + "</details><button class='ok'>Одобрить</button><button class='no'>Отклонить</button>";
    root.appendChild(section);
    const frames = section.querySelector(".frames");
    for (const name of item.frames) { const img = document.createElement("img"); blobUrl("/api/frame/" + item.slug + "/" + name).then((u) => (img.src = u)); frames.appendChild(img); }
    for (const [cls, decision] of [["ok", "approved"], ["no", "rejected"]]) section.querySelector("." + cls).onclick = async () => {
      const note = decision === "rejected" ? prompt("Причина (необязательно)") ?? "" : "";
      const r = await fetch("/api/decide", { method: "POST", headers, body: JSON.stringify({ slug: item.slug, decision, note }) });
      if (r.ok) section.remove(); else alert("Ошибка: " + (await r.text()));
    };
  }
}
if (token) load();
</script>`;

export default {
  async fetch(request: Request, env: Env, ctx: { waitUntil(promise: Promise<unknown>): void }): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/") return new Response(PAGE, { headers: { "content-type": "text/html; charset=utf-8" } });
    if (!authorized(request, env)) return json({ error: "unauthorized" }, 401);

    if (request.method === "GET" && url.pathname === "/api/items") {
      const waiting = (await readQueue(env)).filter((item) => item.state === "awaiting_approval");
      const metas = await Promise.all(
        waiting.map(async (item) => {
          const meta = await env.BUCKET.get(`review/${LANG}/${item.slug}/meta.json`);
          return meta ? { slug: item.slug, ...JSON.parse(await meta.text()) } : undefined;
        }),
      );
      return json(metas.filter((meta) => meta !== undefined));
    }

    const frame = url.pathname.match(/^\/api\/frame\/([a-z0-9-]+)\/([A-Za-z0-9_.-]+)$/);
    if (request.method === "GET" && frame) {
      const object = await env.BUCKET.get(`review/${LANG}/${frame[1]}/${frame[2]}`);
      return object ? new Response(object.body, { headers: { "content-type": "image/png", "cache-control": "no-cache" } }) : json({ error: "not found" }, 404);
    }

    if (request.method === "POST" && url.pathname === "/api/decide") {
      const body: unknown = await request.json();
      const { slug, decision, note } = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
      if (typeof slug !== "string" || (decision !== "approved" && decision !== "rejected")) return json({ error: "bad request" }, 400);
      const queue = await readQueue(env);
      const target = queue.find((item) => item.slug === slug);
      if (!target || target.state !== "awaiting_approval") return json({ error: "not awaiting approval" }, 409);
      const updated = queue.map((item) => (item.slug === slug ? { ...item, state: decision, ...(typeof note === "string" && note ? { note } : {}) } : item));
      await env.BUCKET.put(`queue/${LANG}.json`, `${JSON.stringify(updated, null, 2)}\n`);
      if (decision === "approved" && env.GITHUB_TOKEN) ctx.waitUntil(startRender(env.GITHUB_TOKEN));
      return json({ ok: true });
    }

    return json({ error: "not found" }, 404);
  },
};
