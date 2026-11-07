import { isStatus, loadTaxonomy, loadTopics, publicEntries, LANGS } from "./topics";

const MAX_HOOK_WORDS = 8;
const SCENE_TYPES = ["diagram", "code", "checklist", "browser", "media", "custom"];

const words = (text: string): number => text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;

const { topics } = loadTopics();
const { attributes, visual_to_scene_types: visualMap } = loadTaxonomy();
const hookTypes = publicEntries(attributes.hook_type).map(([key]) => key);

const slugCounts = topics.reduce((acc, topic) => acc.set(topic.slug, (acc.get(topic.slug) ?? 0) + 1), new Map<string, number>());

const problems = topics.flatMap((topic, index) => {
  const tag = `#${topic.id} ${topic.slug}`;
  const allowedScenes = publicEntries(visualMap).find(([key]) => key === topic.visual)?.[1] ?? [];
  return [
    ...(topic.id === index + 1 ? [] : [`${tag}: id is not sequential (expected ${index + 1})`]),
    ...((slugCounts.get(topic.slug) ?? 0) > 1 ? [`${tag}: duplicate slug`] : []),
    ...(attributes.category.includes(topic.category) ? [] : [`${tag}: category "${topic.category}" not in taxonomy`]),
    ...(attributes.level.includes(topic.level) ? [] : [`${tag}: level "${topic.level}" not in taxonomy`]),
    ...(attributes.kind.includes(topic.kind) ? [] : [`${tag}: kind "${topic.kind}" not in taxonomy`]),
    ...(hookTypes.includes(topic.hook_type) ? [] : [`${tag}: hook_type "${topic.hook_type}" not in taxonomy`]),
    ...(attributes.visual.includes(topic.visual) ? [] : [`${tag}: visual "${topic.visual}" not in taxonomy`]),
    ...topic.scene_types.flatMap((type) => [
      ...(SCENE_TYPES.includes(type) ? [] : [`${tag}: scene type "${type}" is not diagram|code|checklist|browser|media|custom`]),
      ...(topic.legacy || allowedScenes.includes(type) ? [] : [`${tag}: scene type "${type}" not allowed for visual "${topic.visual}"`]),
    ]),
    ...(words(topic.hook_ru) > MAX_HOOK_WORDS ? [`${tag}: hook_ru over ${MAX_HOOK_WORDS} words`] : []),
    ...(words(topic.hook_en) > MAX_HOOK_WORDS ? [`${tag}: hook_en over ${MAX_HOOK_WORDS} words`] : []),
    ...LANGS.filter((lang) => !isStatus(String(topic.status[lang]))).map((lang) => `${tag}: invalid status.${lang}`),
  ];
});

console.log(problems.length ? problems.join("\n") : `ok: ${topics.length} topics`);
process.exit(problems.length ? 1 : 0);
