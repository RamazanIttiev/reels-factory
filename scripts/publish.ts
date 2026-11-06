import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { isLang } from "../src/types";
import { instagramEnvNames, missingEnv, requireEnv } from "./env";
import { recordVideo } from "./record";
import { advanceStatus } from "./topics";

const REQUIRED_ENV = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "PUBLIC_VIDEO_BASE_URL",
];

const GRAPH_HOST = "https://graph.facebook.com";
const POLL_INTERVAL_MS = 15_000;
const POLL_ATTEMPTS = 20;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const readCaption = (slug: string, lang: string): string => {
  const raw: unknown = JSON.parse(readFileSync(`episodes/${slug}/${lang}.json`, "utf8"));
  if (!isLang(raw)) throw new Error(`episodes/${slug}/${lang}.json is not a valid language file`);
  return raw.caption;
};

const graph = async (token: string, path: string, method: "GET" | "POST", body?: Record<string, unknown>): Promise<Record<string, unknown>> => {
  const version = process.env.GRAPH_API_VERSION ?? "v27.0";
  const response = await fetch(`${GRAPH_HOST}/${version}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json: unknown = await response.json();
  if (!response.ok || !isRecord(json)) {
    const detail = isRecord(json) && isRecord(json.error) ? String(json.error.message) : `HTTP ${response.status}`;
    throw new Error(`Instagram API error on ${method} ${path}: ${detail}`);
  }
  return json;
};

const idOf = (json: Record<string, unknown>, what: string): string => {
  if (typeof json.id !== "string") throw new Error(`Instagram API returned no ${what} id`);
  return json.id;
};

type Upload = { file: string; key: string; contentType: string };

const uploadToR2 = async (uploads: Upload[]): Promise<S3Client> => {
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
  for (const { file, key, contentType } of uploads) {
    await client.send(
      new PutObjectCommand({ Bucket: requireEnv("R2_BUCKET"), Key: key, Body: readFileSync(file), ContentType: contentType }),
    );
  }
  return client;
};

const waitUntilReady = async (containerId: string): Promise<void> => {
  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
    const status = (await graph(account.token, `${containerId}?fields=status_code`, "GET")).status_code;
    console.log(`instagram status: ${String(status)} (${attempt + 1}/${POLL_ATTEMPTS})`);
    if (status === "FINISHED") return;
    if (status === "ERROR" || status === "EXPIRED") throw new Error(`Instagram container status: ${String(status)}`);
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error("Instagram did not finish processing the video in 5 minutes");
};

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { lang: { type: "string" }, "dry-run": { type: "boolean" } },
});

const slug = positionals[0];
if (!slug) {
  console.error("Usage: publish <slug> --lang ru [--dry-run]");
  process.exit(1);
}

const lang = values.lang ?? "ru";
const file = `out/${slug}.${lang}.mp4`;
const key = `${slug}.${lang}.mp4`;
const coverFile = `covers/${slug}.${lang}.jpg`;
const coverKey = `${slug}.${lang}.cover.jpg`;

if (!existsSync(file)) {
  console.error(`${file} not found. Render the episode first: npm run render -- ${slug} --lang ${lang}`);
  process.exit(1);
}

const accountEnv = instagramEnvNames(lang);
const missing = missingEnv([...REQUIRED_ENV, accountEnv.token, accountEnv.userId]);
if (missing.length > 0) {
  console.error(`Missing in .env: ${missing.join(", ")}`);
  process.exit(1);
}
const account = { token: requireEnv(accountEnv.token), userId: requireEnv(accountEnv.userId) };

const caption = readCaption(slug, lang);
const baseUrl = requireEnv("PUBLIC_VIDEO_BASE_URL");
const videoUrl = `${baseUrl}/${key}`;
const coverUrl = `${baseUrl}/${coverKey}`;

if (values["dry-run"]) {
  console.log(
    `dry run, no requests sent\nfile: ${file}\nvideo url: ${videoUrl}\ncover: ${coverFile} (${existsSync(coverFile) ? "exists" : "will be rendered"})\ncover url: ${coverUrl}\ncaption: ${caption}\nai label: is_ai_generated=true`,
  );
  process.exit(0);
}

if (!existsSync(coverFile)) {
  const rendered = spawnSync("npx", ["tsx", "scripts/cover.ts", slug, "--lang", lang], { stdio: "inherit" });
  if (rendered.status !== 0) process.exit(rendered.status ?? 1);
}

const r2 = await uploadToR2([
  { file, key, contentType: "video/mp4" },
  { file: coverFile, key: coverKey, contentType: "image/jpeg" },
]);
console.log(`uploaded ${videoUrl} and ${coverUrl}`);

const containerId = idOf(
  await graph(account.token, `${account.userId}/media`, "POST", {
    media_type: "REELS",
    video_url: videoUrl,
    caption,
    is_ai_generated: true,
    cover_url: coverUrl,
  }),
  "container",
);
await waitUntilReady(containerId);
const mediaId = idOf(await graph(account.token, `${account.userId}/media_publish`, "POST", { creation_id: containerId }), "media");

for (const objectKey of [key, coverKey]) {
  await r2.send(new DeleteObjectCommand({ Bucket: requireEnv("R2_BUCKET"), Key: objectKey }));
}
advanceStatus(slug, lang, "published");
console.log(`${slug} (${lang}) published, media id ${mediaId}`);
try {
  recordVideo({ slug, lang, igMediaId: mediaId });
  console.log(`recorded in state/${lang}/videos.jsonl`);
} catch (error) {
  console.error(`Published, but record failed: ${error instanceof Error ? error.message : String(error)}`);
  console.error(`Run by hand: npm run record -- ${slug} --lang ${lang} --ig-media-id ${mediaId}`);
}
