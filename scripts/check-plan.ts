import { loadPlan } from "./curriculum";

const MAX_HOOK_WORDS = 8;

const plan = loadPlan();
const ids = new Set(plan.episodes.map((episode) => episode.id));
const words = (text: string): number => text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;

const problems = plan.episodes.flatMap((episode, index) => [
  ...(episode.id === index + 1 ? [] : [`#${episode.id}: id is not sequential (expected ${index + 1})`]),
  ...[...episode.prerequisites, ...episode.references]
    .filter((id) => !ids.has(id) || id >= episode.id)
    .map((id) => `#${episode.id}: link to #${id} is not an earlier episode`),
  ...(words(episode.hook_ru) > MAX_HOOK_WORDS ? [`#${episode.id}: hook_ru over ${MAX_HOOK_WORDS} words`] : []),
  ...(words(episode.hook_en) > MAX_HOOK_WORDS ? [`#${episode.id}: hook_en over ${MAX_HOOK_WORDS} words`] : []),
  ...(episode.indexInModule === episode.moduleTotal && !episode.comment_question_ru
    ? [`#${episode.id}: last in module without comment question`]
    : []),
]);

const modulesOk = plan.modules.every(
  (module) => plan.episodes.filter((episode) => episode.module === module.id).length === plan.episodes.find((e) => e.module === module.id)?.moduleTotal,
);
if (!modulesOk) problems.push("moduleTotal does not match the episode count of a module");

console.log(problems.length ? problems.join("\n") : `ok: ${plan.episodes.length} episodes, ${plan.modules.length} modules`);
process.exit(problems.length ? 1 : 0);
