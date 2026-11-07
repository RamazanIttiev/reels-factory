import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { sendAlert } from "./alert";
import { loadQueue, setState } from "./queue";
import { pullQueue, pushQueue } from "./queue-sync";
import { getFile, r2Configured, readyCoverKey, readyVideoKey } from "./r2";
import { slotOf } from "./record";
import { isRecord, readVideos } from "./state";

type Schedule = { timezone: string; slots: string[]; slot_window_minutes: number; low_queue_alert_below: number };

const loadSchedule = (lang = "ru"): Schedule => {
  const raw: unknown = JSON.parse(readFileSync("config/schedule.json", "utf8"));
  if (!isRecord(raw) || typeof raw.timezone !== "string" || !Array.isArray(raw.slots)) throw new Error("Invalid config/schedule.json");
  const languages = isRecord(raw.languages) ? raw.languages : {};
  const override = isRecord(languages[lang]) ? languages[lang] : {};
  return {
    timezone: typeof override.timezone === "string" ? override.timezone : raw.timezone,
    slots: (Array.isArray(override.slots) ? override.slots : raw.slots).map(String),
    slot_window_minutes: Number(raw.slot_window_minutes ?? 90),
    low_queue_alert_below: Number(raw.low_queue_alert_below ?? 3),
  };
};

const maxPerDay = (): number => {
  const raw: unknown = JSON.parse(readFileSync("config/rules.json", "utf8"));
  const publishing = isRecord(raw) ? raw.publishing : undefined;
  return isRecord(publishing) && typeof publishing.max_posts_per_day === "number" ? publishing.max_posts_per_day : 1;
};

const localClock = (iso: Date, timezone: string): { date: string; minutes: number; hour: number } => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(iso);
  const get = (type: string): string => parts.find((part) => part.type === type)?.value ?? "0";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, minutes: Number(get("hour")) * 60 + Number(get("minute")), hour: Number(get("hour")) };
};

const toMinutes = (slot: string): number => {
  const [h, m] = slot.split(":").map(Number);
  return h * 60 + m;
};

const { values } = parseArgs({ options: { lang: { type: "string" }, "dry-run": { type: "boolean" }, check: { type: "boolean" }, now: { type: "string" } } });
const lang = values.lang ?? "ru";
const dry = values["dry-run"] ?? false;
const schedule = loadSchedule(lang);
const now = values.now ? new Date(values.now) : new Date();
const clock = localClock(now, schedule.timezone);

const say = (message: string): void => console.log(`schedule ${lang} ${clock.date} ${String(Math.floor(clock.minutes / 60)).padStart(2, "0")}:${String(clock.minutes % 60).padStart(2, "0")}: ${message}`);

if (existsSync("PAUSE")) {
  say("PAUSE file present, nothing published");
  process.exit(0);
}

const slotMinutes = schedule.slots.map(toMinutes).filter((minutes) => clock.minutes >= minutes && clock.minutes - minutes <= schedule.slot_window_minutes).at(-1);
if (slotMinutes === undefined) {
  say("no slot window open");
  process.exit(0);
}
const slotLabel = slotOf(Math.floor(slotMinutes / 60));

const todays = readVideos(lang).filter((video) => localClock(new Date(video.published_at), schedule.timezone).date === clock.date);
if (todays.length >= maxPerDay()) {
  say(`daily limit reached (${todays.length}/${maxPerDay()})`);
  process.exit(0);
}
if (todays.some((video) => video.post_slot === slotLabel)) {
  say(`slot ${slotLabel} already used today`);
  process.exit(0);
}

if (values.check) {
  say("slot is open");
  console.log("SLOT_OPEN");
  process.exit(0);
}

if (!dry) await pullQueue(lang);
const eligible = loadQueue(lang).filter((item) => item.state === "approved" || item.state === "rendered");
const next = eligible[0];
if (eligible.length - (next ? 1 : 0) < schedule.low_queue_alert_below && !dry) {
  await sendAlert(lang, `queue is running low: ${eligible.length} approved/rendered left before this post`);
}
if (!next) {
  say("queue is empty");
  if (!dry) await sendAlert(lang, `slot ${slotLabel}: no approved videos in the queue`);
  process.exit(0);
}
say(`slot ${slotLabel}: next is ${next.slug}${dry ? " (dry run, nothing done)" : ""}`);
if (dry) process.exit(0);

const run = (args: string[]): { ok: boolean; output: string } => {
  const result = spawnSync("npm", ["run", "-s", ...args], { encoding: "utf8" });
  const output = `${result.stdout}${result.stderr}`;
  process.stdout.write(output);
  return { ok: result.status === 0, output };
};

const videoFile = `out/${next.slug}.${lang}.mp4`;
if (!existsSync(videoFile) && r2Configured()) {
  const gotVideo = await getFile(readyVideoKey(next.slug, lang), videoFile);
  if (gotVideo) await getFile(readyCoverKey(next.slug, lang), `covers/${next.slug}.${lang}.jpg`);
  say(gotVideo ? `downloaded ready video for ${next.slug} from R2` : `no ready video in R2 for ${next.slug}, will render`);
}
const needsRender = !existsSync(videoFile);
if (needsRender) {
  const rendered = run(["render", "--", next.slug, "--lang", lang]);
  if (!rendered.ok) {
    setState(lang, next.slug, "failed", "render failed or blocked by the fact gate");
    await pushQueue(lang);
    await sendAlert(lang, `render failed for ${next.slug}: ${rendered.output.trim().split("\n").slice(-3).join(" | ")}`);
    process.exit(1);
  }
}

const attempt = (): { published: boolean; output: string } => {
  const result = run(["publish", "--", next.slug, "--lang", lang]);
  return { published: result.output.includes("published, media id"), output: result.output };
};
const first = attempt();
const final = first.published ? first : attempt();

if (final.published) {
  setState(lang, next.slug, "published");
  await pushQueue(lang);
  await sendAlert(lang, `published ${next.slug} in slot ${slotLabel}`);
  process.exit(0);
}
setState(lang, next.slug, "failed", "publish failed twice");
await pushQueue(lang);
await sendAlert(lang, `publish failed for ${next.slug}: ${final.output.trim().split("\n").slice(-3).join(" | ")}`);
process.exit(1);
