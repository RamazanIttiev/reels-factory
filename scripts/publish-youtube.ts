import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { isLang } from "../src/types";
import { missingEnv } from "./env";
import { refreshTokenEnvName, setThumbnail, uploadShort } from "./youtube";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { lang: { type: "string" }, privacy: { type: "string" }, "dry-run": { type: "boolean" }, "thumb-for": { type: "string" } },
});

const slug = positionals[0];
const lang = values.lang ?? "ru";
if (!slug) {
  console.error("Usage: publish-youtube <slug> --lang ru [--privacy public|private|unlisted] [--dry-run]");
  process.exit(1);
}

const cover = `covers/${slug}.${lang}.jpg`;
const file = `out/${slug}.${lang}.mp4`;
if (!existsSync(file)) {
  console.error(`${file} not found. Render first: npm run render -- ${slug} --lang ${lang}`);
  process.exit(1);
}


const thumbnail = async (videoId: string): Promise<void> => {
  if (!existsSync(cover)) return console.log(`no cover at ${cover}, thumbnail skipped`);
  try {
    await setThumbnail({ channel: lang, videoId, file: cover });
    console.log("thumbnail set");
  } catch (error) {
    console.error(String(error instanceof Error ? error.message : error).slice(0, 300));
  }
};

const missing = missingEnv(["YT_CLIENT_ID", "YT_CLIENT_SECRET", refreshTokenEnvName(lang)]);
if (missing.length > 0) {
  console.error(`Missing in .env: ${missing.join(", ")}. Run: npm run yt:auth -- --channel ${lang}`);
  process.exit(1);
}

const raw: unknown = JSON.parse(readFileSync(`episodes/${slug}/${lang}.json`, "utf8"));
if (!isLang(raw)) throw new Error(`episodes/${slug}/${lang}.json is not a valid language file`);

const title = `${raw.hook.text} #Shorts`.slice(0, 100);
const description = `${raw.caption}\n\n#Shorts`;
const privacy = values.privacy === "private" || values.privacy === "unlisted" ? values.privacy : "public";

if (values["thumb-for"]) {
  await thumbnail(values["thumb-for"]);
  process.exit(0);
}

if (values["dry-run"]) {
  console.log(`dry run, nothing sent\nfile: ${file}\ntitle: ${title}\ndescription: ${description}\nprivacy: ${privacy}`);
  process.exit(0);
}

const videoId = await uploadShort({ channel: lang, file, title, description, language: lang, privacy });
mkdirSync(`state/${lang}`, { recursive: true });
appendFileSync(
  `state/${lang}/youtube.jsonl`,
  `${JSON.stringify({ slug, lang, youtube_video_id: videoId, at: new Date().toISOString() })}\n`,
);
await thumbnail(videoId);
console.log(`${slug} (${lang}) uploaded to YouTube: https://youtube.com/shorts/${videoId}`);
