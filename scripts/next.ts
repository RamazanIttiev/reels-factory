import { loadPlan } from "./curriculum";
import type { PlanEpisode } from "./curriculum";

const plan = loadPlan();
const next = plan.episodes.find((episode) => episode.status === "todo");

if (!next) {
  console.log("All episodes are done.");
  process.exit(0);
}

const byId = new Map(plan.episodes.map((episode) => [episode.id, episode]));
const module = plan.modules.find((candidate) => candidate.id === next.module);
const previous = [next.id - 2, next.id - 1].flatMap((id) => byId.get(id) ?? []);
const referenced = next.references.flatMap((id) => byId.get(id) ?? []);
const ready = plan.episodes.filter((episode) => episode.status !== "todo" && episode.id < next.id);
const later = plan.episodes.filter((episode) => episode.id > next.id);

const describe = (episode: PlanEpisode): string =>
  `#${episode.id} ${episode.slug} [${episode.status}] ${episode.title_ru}: ${episode.key_idea} Teaser: ${episode.teaser_ru}`;

const lines = [
  `NEXT EPISODE #${next.id}  ${next.slug}`,
  `module ${next.module} "${module?.title_ru}" (${next.indexInModule} of ${next.moduleTotal}), shop users: ${module?.users}`,
  ...(next.indexInModule === 1 ? [`module problem: ${module?.problem_ru}`] : []),
  `title_ru: ${next.title_ru}`,
  `title_en: ${next.title_en}`,
  `key_idea: ${next.key_idea}`,
  `shop_example: ${next.shop_example}`,
  `hook_ru: ${next.hook_ru}`,
  `hook_en: ${next.hook_en}`,
  `scene_types: ${next.scene_types.join(", ")}`,
  `prerequisites: ${next.prerequisites.join(", ") || "none"}`,
  `introduces (explain once, here): ${next.introduces.join("; ")}`,
  `teaser_ru (last phrase of the outro): ${next.teaser_ru}`,
  `teaser_en (last phrase of the outro): ${next.teaser_en}`,
  ...(next.comment_question_ru
    ? [
        `LAST IN MODULE, end with a comment question:`,
        `  ru: ${next.comment_question_ru}`,
        `  en: ${next.comment_question_en}`,
      ]
    : []),
  `episode files: episodes/${next.slug}/visual.json, ru.json, en.json`,
  ``,
  `can reference ("мы уже разобрали..."):`,
  ...(referenced.length ? referenced.map((episode) => `  #${episode.id} ${episode.title_ru}`) : ["  nothing"]),
  ``,
  `previous episodes for context:`,
  ...(previous.length ? previous.map((episode) => `  ${describe(episode)}`) : ["  none"]),
  ``,
  `terms already introduced (do not explain again): ${ready.flatMap((episode) => episode.introduces).join("; ") || "none"}`,
  `terms introduced LATER (do not use yet): ${later.flatMap((episode) => episode.introduces).join("; ")}`,
  ``,
  `Style: plain language, explain like to a smart friend who has not done backend. One idea, one shop.example case.`,
];

console.log(lines.join("\n"));
