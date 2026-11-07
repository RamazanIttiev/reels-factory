import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { parseArgs } from "node:util";
import { paceOf } from "./check-words";
import { upsert } from "./queue";
import { pushQueue, pushReviewAssets } from "./queue-sync";
import { findTopic, loadTopics } from "./topics";

const MAX_FIX_ROUNDS = 2;

const { values } = parseArgs({ options: { lang: { type: "string" }, slug: { type: "string" }, "dry-run": { type: "boolean" } } });
const lang = values.lang ?? "ru";

const run = (args: string[]): { ok: boolean; output: string } => {
  const result = spawnSync("npm", ["run", "-s", ...args], { encoding: "utf8", env: { ...process.env, TTS_PROVIDER: process.env.TTS_PROVIDER ?? "mock" } });
  return { ok: result.status === 0, output: `${result.stdout}${result.stderr}`.trim() };
};

const claude = (prompt: string): boolean => {
  const result = spawnSync(
    "claude",
    ["-p", prompt, "--model", process.env.MAKE_MODEL ?? "sonnet", "--permission-mode", "acceptEdits", "--allowedTools", "Read", "Write", "Edit", "Grep", "Glob", "Bash(npm run *)", "Bash(curl *)"],
    { stdio: "inherit" },
  );
  return result.status === 0;
};

const stop = (message: string): never => {
  console.error(`STOP: ${message}`);
  spawnSync("npm", ["run", "-s", "alert", "--", "--lang", lang, `make stopped on ${String(slug)}: ${message.split("\n")[0].slice(0, 200)}`], { stdio: "ignore" });
  const failed = findTopic(loadTopics(), String(slug));
  if (failed) upsert(lang, { slug: failed.slug, category: failed.category, hook_type: failed.hook_type, state: "failed", note: message.split("\n")[0].slice(0, 160) });
  process.exit(1);
};

const next = values.slug ? { ok: true, output: `NEXT ${lang} #0 ${values.slug}` } : run(["next", "--", "--lang", lang]);
const slug = next.output.match(/NEXT \w+ #\d+ (\S+)/)?.[1];
if (!slug) stop(`no topic to make: ${next.output}`);
console.log(`topic: ${slug}`);

const target = String(slug);
const draftPrompt = (problem: string): string =>
  `Работай по CLAUDE.md в этом проекте. Тема: ${target}, язык ${lang}. ${problem} ` +
  `Сделай шаги: facts (источники только с разрешённых доменов, claims с точными цитатами), создай или исправь episodes/${target}/visual.${lang}.json и ${lang}.json с claims, ` +
  `добейся прохождения npm run verify -- ${target} --lang ${lang} и npm run check -- ${target}. Длина 50-60 секунд: ${paceOf(lang).min}-${paceOf(lang).max} слов для языка ${lang} (npm run check -- ${target} --lang ${lang} считает оценку). Для en пиши естественный английский, не перевод по слову; не используй слова always/never/every/best без цитаты. Код в сцене: provenance "quoted" (только то, что есть в цитатах) или "schematic" (тогда в labels.caption слово «схема»). ` +
  `Визуал: в каждой сцене, где это возможно, используй тип "media" (см. раздел Media scene в CLAUDE.md): карточки, окна браузера с таблицей, страница с кнопкой, летящая иконка, акцентный цвет сцены, значок темы и счётчик. Иконки только по теме ролика, без выдуманных цифр: подбирай их командой npm run icons -- <слово> (обычные иконки и логотипы brand:<slug>), для хука тоже. У каждой сцены должна быть своя иконка или логотип по смыслу. ` +
  `Не публикуй, не рендери полностью, не читай .env, не меняй config/rules.json.`;

if (values["dry-run"]) {
  console.log("dry run: would draft with claude -p, verify, check, preview, frames");
  process.exit(0);
}

const needsDraft = !existsSync(`episodes/${target}/${lang}.json`);
if (needsDraft && !claude(draftPrompt(`Скопируй episodes/_template. Бриф:\n${next.output}`))) stop("drafting failed");

const gate = (): { ok: boolean; output: string } => {
  const verify = run(["verify", "--", target, "--lang", lang]);
  const words = run(["check", "--", target, "--lang", lang]);
  const layout = run(["layout", "--", target, "--lang", lang]);
  return { ok: verify.ok && layout.ok && !words.output.includes("WARN"), output: `${verify.output}\n${words.output}\n${layout.output}` };
};

const fixed = Array.from({ length: MAX_FIX_ROUNDS + 1 }).reduce<{ ok: boolean; output: string }>(
  (state, _, round) => {
    if (state.ok) return state;
    const current = gate();
    if (current.ok || round === MAX_FIX_ROUNDS) return current;
    claude(draftPrompt(`Исправь замечания гейта:\n${current.output}`));
    return { ok: false, output: current.output };
  },
  { ok: false, output: "" },
);
if (!fixed.ok) stop(`gate still failing:\n${fixed.output}`);

run(["status", "--", target, lang, "drafted"]);
const preview = run(["preview", "--", target, "--lang", lang]);
if (!preview.ok) stop(`preview failed:\n${preview.output.split("\n").slice(-10).join("\n")}`);
const frames = run(["frames", "--", target, "--lang", lang, "--count", "3"]);
if (!frames.ok) stop(`frames failed:\n${frames.output.split("\n").slice(-10).join("\n")}`);

const readyTopic = findTopic(loadTopics(), target);
if (readyTopic) upsert(lang, { slug: target, category: readyTopic.category, hook_type: readyTopic.hook_type, state: "awaiting_approval" });
if (readyTopic) {
  await pushQueue(lang);
  await pushReviewAssets(lang, target);
}
console.log(`READY for approval: ${target}\n${frames.output}\nApprove: npm run approve -- ${target} (then npm run render:approved)`);
