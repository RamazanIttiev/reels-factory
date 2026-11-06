import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { estimatedSeconds, wordCount } from "./check-words";
import { loadLang } from "./load-episode";
import { loadQueue } from "./queue";

const { values } = parseArgs({ options: { lang: { type: "string" } } });
const lang = values.lang ?? "ru";
const escape = (text: string): string => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const items = loadQueue(lang).filter((item) => item.state === "awaiting_approval" && existsSync(`episodes/${item.slug}/${lang}.json`));

const card = (slug: string): string => {
  const language = loadLang(slug, lang);
  const words = wordCount(slug, lang);
  const frames = ["hook", ...Object.keys(language.scenes), "outro"]
    .map((id) => `../frames/${slug}.${lang}.${id}.png`)
    .filter((path) => existsSync(path.replace("../", "")))
    .map((path) => `<img src="${path}" loading="lazy">`)
    .join("");
  return `<section><h2>${escape(slug)}</h2><p><b>${escape(language.hook.text)}</b></p><p>${escape(language.caption)}</p>
<p class="meta">${words} слов, ~${estimatedSeconds(words, lang)} с. Одобрить: <code>npm run approve -- ${escape(slug)}</code> · Отклонить: <code>npm run reject -- ${escape(slug)} --note "причина"</code></p>
<div class="frames">${frames}</div>
<details><summary>Текст</summary>${Object.values(language.scenes).map((scene) => `<p>${escape(scene.narration)}</p>`).join("")}</details></section>`;
};

mkdirSync("review", { recursive: true });
writeFileSync(
  "review/index.html",
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Review ${lang}</title>
<style>body{font:16px system-ui;margin:24px;max-width:1100px;background:#0b141a;color:#eee}section{border:1px solid #345;border-radius:12px;padding:16px;margin:16px 0}
.frames{display:flex;gap:8px;overflow-x:auto}img{height:360px;border-radius:8px}.meta{color:#9ab}code{background:#1c2a33;padding:2px 6px;border-radius:4px}</style>
<h1>На одобрение (${items.length})</h1>${items.map((item) => card(item.slug)).join("") || "<p>Очередь пуста.</p>"}
<p>Все сразу: <code>npm run approve -- --all</code></p>`,
);
console.log(`review/index.html: ${items.length} items. Open it in a browser.`);
