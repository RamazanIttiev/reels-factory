import { parseArgs } from "node:util";
import { loadLang, loadVisual } from "./load-episode";
import type { VisualScene } from "../src/types";

const PAGE_WIDTH = 960;
const CARD_INNER = 870;
const HEADING_EM = 0.72;
const TEXT_EM = 0.55;
const MONO_EM = 0.6;

const wrapLines = (text: string, charsPerLine: number): number =>
  text.split(/\s+/).filter(Boolean).reduce<{ lines: number; used: number }>(
    (acc, word) => {
      const needed = acc.used === 0 ? word.length : acc.used + 1 + word.length;
      return needed <= charsPerLine ? { lines: acc.lines, used: needed } : { lines: acc.lines + 1, used: word.length };
    },
    { lines: 1, used: 0 },
  ).lines;

const longestWord = (text: string): number => Math.max(0, ...text.split(/\s+/).map((word) => word.length));

const perLine = (width: number, fontSize: number, em: number): number => Math.floor(width / (fontSize * em));

type Box = { label: string; text: string; width: number; fontSize: number; em: number; maxLines: number };

const checkBox = ({ label, text, width, fontSize, em, maxLines }: Box): string[] => {
  const chars = perLine(width, fontSize, em);
  const lines = wrapLines(text, chars);
  return [
    ...(longestWord(text) > chars ? [`${label}: word of ${longestWord(text)} chars does not fit a line (~${chars} chars)`] : []),
    ...(lines > maxLines ? [`${label}: ~${lines} lines, max ${maxLines} ("${text.slice(0, 40)}")`] : []),
  ];
};

const checkScene = (scene: VisualScene, labels: Record<string, string>): string[] => {
  const tag = `scene ${scene.id}`;
  const caption = labels.caption ?? "";
  if (scene.type === "code") {
    const lines = scene.code.split("\n");
    const room = Math.floor((CARD_INNER - scene.file.length * 18 - 40) / (32 * TEXT_EM));
    return [
      ...lines.filter((line) => line.length > perLine(CARD_INNER, 36, MONO_EM)).map((line) => `${tag}: code line too wide (${line.length} chars, max ${perLine(CARD_INNER, 36, MONO_EM)}): "${line.slice(0, 30)}"`),
      ...(lines.length > 13 ? [`${tag}: ${lines.length} code lines, max 13`] : []),
      ...(caption.length > room ? [`${tag}: caption ${caption.length} chars, room for ${room}`] : []),
      ...(labels.result ? checkBox({ label: `${tag} result`, text: labels.result, width: CARD_INNER, fontSize: 40, em: HEADING_EM, maxLines: 2 }) : []),
    ];
  }
  if (scene.type === "checklist") {
    return [
      ...(scene.items.length > 6 ? [`${tag}: ${scene.items.length} items, max 6`] : []),
      ...checkBox({ label: `${tag} caption`, text: caption, width: PAGE_WIDTH, fontSize: 52, em: HEADING_EM, maxLines: 1 }),
      ...scene.items.flatMap((item) => [
        ...checkBox({ label: `${tag} item ${item.id}`, text: labels[item.id] ?? "", width: 760, fontSize: 40, em: HEADING_EM, maxLines: 1 }),
        ...(item.tag.length > perLine(760, 28, MONO_EM) ? [`${tag}: tag "${item.tag}" too long`] : []),
      ]),
    ];
  }
  if (scene.type === "diagram") {
    const nodeChars = perLine(190, 28, HEADING_EM);
    const overlaps = scene.nodes.flatMap((a, i) =>
      scene.nodes.slice(i + 1).filter((b) => Math.abs(a.x - b.x) * 960 < 232 && Math.abs(a.y - b.y) * 860 < 120).map((b) => `${tag}: nodes ${a.id} and ${b.id} overlap`),
    );
    return [
      ...(scene.nodes.length > 6 ? [`${tag}: ${scene.nodes.length} nodes, max 6`] : []),
      ...scene.nodes.flatMap((node) => [
        ...(node.x < 0.1 || node.x > 0.9 || node.y < 0.05 || node.y > 0.95 ? [`${tag}: node ${node.id} too close to the edge`] : []),
        ...(longestWord(node.label) > nodeChars || wrapLines(node.label, nodeChars) > 2 ? [`${tag}: node label "${node.label}" too long (~${nodeChars} chars per line, 2 lines)`] : []),
        ...(node.badge && node.badge.text.length > 16 ? [`${tag}: badge "${node.badge.text}" over 16 chars`] : []),
      ]),
      ...scene.edges.filter((edge) => (edge.label?.length ?? 0) > 16).map((edge) => `${tag}: edge label "${edge.label}" over 16 chars`),
      ...overlaps,
      ...checkBox({ label: `${tag} caption`, text: caption, width: PAGE_WIDTH, fontSize: 44, em: HEADING_EM, maxLines: 2 }),
    ];
  }
  return [
    ...(scene.url.length > 42 ? [`${tag}: url ${scene.url.length} chars, max 42`] : []),
    ...(scene.input.length > 30 ? [`${tag}: input ${scene.input.length} chars, max 30`] : []),
  ];
};

export const layoutProblems = (slug: string, lang: string): string[] => {
  const visual = loadVisual(slug, lang);
  const language = loadLang(slug, lang);
  return [
    ...checkBox({ label: "hook", text: language.hook.text, width: PAGE_WIDTH, fontSize: 88, em: HEADING_EM, maxLines: 6 }),
    ...checkBox({ label: "outro", text: language.outro.text, width: PAGE_WIDTH, fontSize: 70, em: HEADING_EM, maxLines: 4 }),
    ...(language.hook.text.includes(language.hook.accent) ? [] : ["hook: accent word is not in the hook text"]),
    ...visual.scenes.flatMap((scene) => checkScene(scene, language.scenes[scene.id]?.labels ?? {})),
  ];
};

const isMain = process.argv[1]?.endsWith("layout.ts") ?? false;

if (isMain) {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { lang: { type: "string" } } });
  const slug = positionals[0];
  if (!slug) {
    console.error("Usage: layout <slug> --lang ru");
    process.exit(1);
  }
  const problems = layoutProblems(slug, values.lang ?? "ru");
  console.log(problems.length ? problems.map((line) => `LAYOUT ${line}`).join("\n") : "ok   layout: no overflow expected");
  process.exit(problems.length ? 1 : 0);
}
