# reels-factory

Pipeline for 30–60s vertical educational reels (9:16, 1080x1920, 30fps), rendered from code.
Owner: Ramazan (Russian-speaking). Reel language: Russian. Reply to the owner in Russian, briefly.

## Core principle: code once, data forever
A new reel = ONE new JSON file in `episodes/`. Never edit components, theme or scripts
to produce a new episode. If a scene type is missing, add it once in `src/scenes/` and document it below.

## Token rules (highest priority)
1. Never read: `node_modules/`, `out/`, `.cache/`, `public/audio/`, `*.mp4`, `*.wav`, `.env`. They are denied in settings.
2. Never watch a full video. To check a render, extract max 3 frames:
   `npm run frames -- <slug> --lang ru --count 3` and read only those PNGs from `frames/`.
3. Command output: always trim. Use `| tail -20` for builds and renders, never paste full logs.
4. Preview cheap, render once: `npm run preview -- <episode>` (scale 0.25, no audio regeneration).
   Full render only after the owner approves frames.
5. Everything expensive is cached by content hash in `.cache/` (TTS audio, word timings).
   Do not regenerate voice/timings if text and voice id are unchanged.
6. Do not re-read files you just wrote. Do not re-explain the plan. Do not summarize steps after finishing:
   give result + file path + one next step.
7. Prefer Edit with small diffs over rewriting files. Read files with offset/limit when over ~150 lines.
8. Use Grep/Glob before opening files. Open only what the task needs.
9. Long tasks: finish one episode, then suggest `/clear`. Use `/compact` instead of re-pasting context.
10. Delegate to subagents only when the owner asks. Each spawn starts cold and is expensive.

## Model use (suggestion to owner)
- Scenario writing and fact-checking: strongest available model.
- Template/scene code, ffmpeg, config tweaks: Sonnet.
- Trivial renames, JSON edits: Haiku.

## Architecture
```
plan/topics.json              121+ standalone topics, status.ru/status.en, hook hypotheses, sources (titles). Never read whole.
plan/taxonomy.json            allowed categories, hook types, visuals; plan/legacy/curriculum.json = old course, unused
config/{rules,sources,experiment}.json   hard rules (never edit rules.json), domain allowlist, phases and scoring
episodes/<slug>/visual.<lang>.json   scenes: id, type, code, diagram nodes/edges (own visuals per language)
episodes/<slug>/<lang>.json   hook, narration, labels, claims per scene id, voiceId, caption, outro
episodes/_template/           copy this folder for a new episode
facts/<slug>.json             one fact sheet per topic: claims with exact quotes, tier, dates (facts/fetch.log.jsonl = fetch log)
state/<lang>/                 videos.jsonl, metrics.jsonl, requests.jsonl, observations.md
src/                          types, episode, timeline, Frame (header: channel + step n/N), scenes/*.tsx, Captions
scripts/topics.ts             topics load/save, status per (slug, lang); next.ts picks the next topic by phase rules
scripts/facts.ts, verify.ts   fact gate; record.ts, metrics.ts, analyze.ts, requests.ts = learning loop
scripts/tts.ts, timings.ts, pipeline.ts, render.ts, frames.ts, cover.ts, publish.ts (R2 + Instagram, then record)
```
Status of scripts: check `package.json` scripts to see which exist. Do not assume.

## Episode JSON contract
See `episodes/_template/`. Visual and text are per language. Rules:
- `visual.<lang>.json` `scenes[].id` links to `<lang>.json` `scenes[id]`. Missing id = error.
- `scenes[].type`: `diagram | code | checklist | browser`. Reels are Russian only for now; tech names and code stay English.
- `<lang>.json` `labels`: short on-screen text (`caption`, `result`, checklist item ids). Write counts as words unless a claim has the digit.
- `claims`: the hook and every scene list ids of claims from `facts/<slug>.json`. Numbers, dates, Latin names in text must occur in those quotes.
- `hook`: question or bold claim, max 8 words, first 2 seconds, `accent` = word in orange.
- `narration`: short sentences. Scene length = audio length (no audio: words / 2.5 s).
- `caption`: Instagram post text. One sentence, no hashtags, no emoji.
- Total narration 108-125 words (`npm run check -- <slug>`).
- `TTS_PROVIDER` env picks the voice (default `mock` = silence, no keys needed).
- Incident topics: attribute to the operator ("по данным отчёта компании"); hedge what is not confirmed.

## Media scene (`type: "media"`): the picture is built up while the narrator speaks
The title stays, and on every phrase a new on-topic object appears under it. Old objects stay and everything slides and shrinks to make room (the stage reflows by itself). Nothing leaves without a reason; use `until` (seconds) to remove an object. Fields in `visual.<lang>.json`:
`title` (`*word*` = accent), `accent` (hex), `stat {label,value}`, `badge {icon,text}` (max 14 chars), `layers` in order of appearance, each with `at` in seconds from scene start (about 2.5 words per second; put `at` at the moment the matching word is spoken):
- `hub {icon, satellites:[{at,label,icon}]}` big logo with labelled components flying out around it (up to 6)
- `cards {items:[{at,title,lines}]}` a row of up to 3 small UI cards
- `rack {label,icon}` server rack with blinking LEDs and fans
- `phone {messages:[{at,from:"me"|"them",text}]}` phone with chat bubbles
- `form {url,title,fields:[{at,label,value,secret?}],button,click}` dashboard form: values are typed, a cursor presses the button at `click`
- `flow {nodes:[{id,at,label,icon,hot?}], edges:[{from,to,at}], marks?:[{at,ids}]}` mini diagram: nodes pop in, arrows draw on, a white packet runs along each arrow, `marks` highlight nodes with a ring (up to 6 nodes)
- `terminal {lines:[{at,text,out?}]}` command typed character by character, `out:true` lines (output) slide in
- `meter {rows:[{at,label,fill 0..1,value?,tone?}]}` bars that fill up, `checks {title?,items:[{at,text}]}` rows with a check mark that draws itself
- `bar {text,icon}` coloured strip with a headline fact; use rarely, not as a chain of replacing strips: prefer flow, terminal, meter, checks
- `table {url,columns,rows,hit}`, `page {url,headline,button,click}`, `code {code,mark}`, `card {icon,title,value,status,tone}`, `flyer {icon}`
Plan 4-7 objects per scene, one per phrase; the stage shrinks them, and `layout` fails if they would drop below 55% size (then add `until`). Icons: about 2000 generic by lucide name or logos as `brand:<slug>`; find with `npm run icons -- <word>`; unknown names fail `layout`. Text is per language (own visual file), no invented numbers, short labels.
When the library cannot show the topic: scene `{type:"custom", component:"<name>"}` with your own Remotion component in `src/custom/<name>.tsx`, registered in `src/custom/index.ts` (copy `src/custom/example.tsx`; wrap in `Frame`). Use it only for rare topics; everything else stays data.
Rhythm rules (all scene types, `src/rhythm.ts`): an event (`at`, nested `at`, `until`, `click`, beat) at least every 1.2 s of the scene's speech (words / 2.5). `npm run layout` fails when nothing new happens for more than 1.5 s and says where to add an `at`. Chains of `bar` layers, each with `until` equal to the next `at`, are the cheap way to fill speech without shrinking the stage. If a gap still remains, `Frame` adds motion by itself (light sweep, glow on the newest object), never on text.
Text is still after it appears: only an entrance animation (slam, fade, spring). No zoom, drift, sway or size pulse on text; continuous motion only for background, grid, particles, glow, orbit icons, LEDs. Stage reflow in media scenes is short (9 frames) and rounded to whole pixels.
Optional `beats: [{at, icon, text?}]` on any scene adds pop-up stickers; prefer layers.
Motion on every scene comes from `Frame` (drifting glow, scrolling grid, rising particles, flash and slide-in at scene start).
Hook text: up to 6 words, intrigue, number or contradiction, one strong accent word; the words slam in one by one.
Hook (`lang.json` `hook`): `icon` plus `orbit` (3 related icons that circle the main one). The hook screen moves from frame 0 (ring pulses, orbiting icons, slow zoom). Retention data shows about half of viewers leave in the first second: no intro, no greeting, the first words state the point or the intrigue.

## Episode workflow
Each episode is standalone; order comes from the scheduler (`config/experiment.json`).
1. `npm run next -- --lang ru` prints one brief (topic, hook hypothesis, sources, tags, imbalance).
2. `npm run facts -- <slug>`: find primary sources on allowed domains (`config/sources.json`), save claims with exact quotes
   (`--add-file claims.json`). Fresh fact sheets are not re-read.
3. Write `episodes/<slug>/visual.ru.json` + `ru.json` from `_template`, with claims on hook and every scene.
4. `npm run verify -- <slug> --lang ru` (blocks full render; preview only warns), then the `double-check` skill as the meaning pass.
   `npm run check -- <slug>` for the word budget. Then `npm run status -- <slug> ru drafted`.
5. `npm run preview -- <slug> --lang ru`, `npm run frames -- <slug> --lang ru --count 3`, read only those PNGs, fix overflow.
6. After the owner approves frames: `npm run render -- <slug> --lang ru` (sets `rendered`).
7. `npm run publish -- <slug> --lang ru` only on the owner's explicit command; it then runs `record` (state/ru/videos.jsonl with ig_media_id).
Manual: `npm run status -- <slug> <lang> <status>`, `npm run plan:check`.
Outro: soft call tied to the episode topic, never an imperative and never the same phrase twice in a row. On-screen text: "Больше разборов на scalelab".
Narration rotates these patterns, with the topic in 1-3 words (about 10 words, counted in the word budget):
- "Если было полезно про <тема> — на scalelab таких разборов много."
- "Теперь понятно, <что стало понятно>. Другие разборы — на scalelab."
- "Про <тема> теперь знаешь. Такие разборы выходят на scalelab."
- "Если интересно, как устроен <X>, загляни на scalelab — там есть ещё разборы."
Check the last used pattern in `state/ru/videos.jsonl`/recent episodes and pick a different one.

## Content rules
- Plain language first. Explain like to a smart friend: short sentences, one idea, each term explained once.
- One concrete example per video, from any area. No shared storyline between videos.
- Verify technical facts via the fact gate; round numbers honestly ("около"), never invent precision.
- No "always" / "never" / "all" / "best" without grounds; prefer "обычно", "чаще всего".
- All explanations and examples are written from scratch; do not retell other courses or articles.
- Security topics: vulnerable pattern plus fix, textbook payloads only. VPN topics: mechanisms only, no evasion instructions.

## Languages
English setup: copy `_template/en.json` + `visual.en.json`, set `voiceId` (ElevenLabs), word budget 135-160 (~0.38 s/word, `check-words.ts` PACE),
`state/en/` is created on first `record`. `config/rules.json` `publishing.languages` must list `en` (owner edits by hand).
Russian only until then. English will be a separate product: own visuals (`visual.en.json`), own account, `state/en/`, own phase counters.
Nothing learned in one language is applied to another without the owner's promotion. Topic status is per language.

## Visual style
Dark photo background (`public/bg.jpg`, darkened by an overlay in `src/theme.ts`), rounded browser/code cards, monospace code,
white heavy wide sans captions (one word at a time, accent words in teal `#2fd5c0`, hook accent orange, step pill yellow, numbers lime, lighter blue-tinted center of the background), series handle `@scalelab.dev`; header shows the channel and a step counter n/N. Reuse the look, but use our own series name, avatar and accent color
(set in `src/theme.ts`). Do not copy another creator's branding.
Fonts: Unbounded (headings), Onest (text), JetBrains Mono (code). All support Cyrillic.

## Commands
- `npm run studio` Remotion studio for manual checks
- `npm run preview -- <slug> --lang ru` low-res preview
- `npm run frames -- <slug> --lang ru --ids hook,lock,fixes` key frames into `frames/` (default 3 evenly spread)
- `npm run render -- <slug> --lang ru` final mp4 to `out/`
- `npm run check -- <slug>` word budget per language
- `npm run publish:dry -- <slug> --lang ru` checks env, file, caption and video URL, sends nothing
- `npm run publish -- <slug> --lang ru` uploads to R2 and publishes to Instagram, ASK OWNER FIRST
- `npm run next -- --lang ru`, `npm run status -- <slug> <lang> <status>`, `npm run plan:check`, `npm run typecheck`
- `npm run facts -- <slug>`, `npm run verify -- <slug> --lang ru`, `npm run record -- <slug> --lang ru`
- `npm run metrics -- --lang ru`, `npm run metrics:import -- file.csv`, `npm run analyze -- --lang ru`, `npm run requests -- --lang ru`

## External services (keys in `.env`, never read or print them)
- TTS: ElevenLabs or MiniMax (`TTS_PROVIDER`). Compare voices on one phrase before choosing.
- Instagram: needs professional account + Meta app + public video URL. Publish only after explicit
  "publish" from the owner. AI-generated content must be labeled as AI in Meta.
- Network from the sandbox may be restricted. If a call is blocked, say so once and ask the owner to run the command.

## Definition of done for an episode
1. JSON valid, narration within word budget.
2. 3 frames reviewed, no text overflow on 1080x1920.
3. Final mp4 in `out/`, 50-60s, audio and captions in sync.
4. Reply: file path, duration, one suggestion. Nothing else.

## Learning loop
Hard limits live in `config/rules.json` (never edit). Phases: explore (videos 1-30, balanced rotation, no lessons), learn, exploit.
1. After publish, `record` writes the video with tags. `npm run metrics -- --lang ru` snapshots 24/72/168h via Graph API (unavailable metrics stay null, e.g. follows for reels). Manual: `metrics:import`.
2. `npm run analyze -- --lang ru` prints composite score and ranks per attribute. In explore it only appends observations to `state/ru/observations.md`.
3. A lesson goes to `state/lessons.md` only if `promotion_rule` holds AND the owner says "да". Lessons never override rules.json.
4. Comment requests: `npm run requests -- --lang ru` (or `--import file.csv`).
