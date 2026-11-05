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
episodes/<slug>/visual.json   language-free scenes: id, type, code, diagram nodes/edges (English)
episodes/<slug>/<lang>.json   per language: narration + labels per scene id, hook, outro, voiceId, ui
episodes/_template/           copy this folder for a new episode
src/types.ts, episode.ts      data model, visual + lang -> Episode
src/timeline.ts               Episode + audio info -> ReelProps (segment lengths from voice duration)
src/theme.ts                  colors, fonts, series name/handle/avatar placeholders
src/scenes/*.tsx              Hook, Browser, Code, Diagram, Checklist, Outro
src/Captions.tsx, Frame.tsx   one-word captions, grid background + header
scripts/tts.ts                providers mock | elevenlabs | minimax, cache .cache/audio/<sha256>
scripts/timings.ts            word timings: provider timestamps, else local Whisper, else uniform
scripts/pipeline.ts           audio + timings -> .cache/props/<slug>.<lang>.json
scripts/check-words.ts        70-110 word budget warning per language
scripts/render.ts, frames.ts  render mp4, extract key frames into frames/
scripts/publish.ts            stub, TODO, no network calls
```
Status of scripts: check `package.json` scripts to see which exist. Do not assume.

## Episode JSON contract
See `episodes/_template/`. Visual is shared, language files only carry text. Rules:
- `visual.json` `scenes[].id` links to `<lang>.json` `scenes[id]`. Missing id = error.
- `scenes[].type`: `diagram | code | checklist | browser`. Tech names, code, node labels stay English.
- `<lang>.json` `labels`: short on-screen text (`caption`, `result`, checklist item ids). Optional.
- `hook`: question or bold claim, max 8 words, first 2 seconds, `accent` = word in orange.
- `narration`: short sentences. Scene length = audio length (no audio: words / 2.5 s).
- `caption`: text of the Instagram post. One sentence or phrase on the topic of the episode, no hashtags, no emoji.
- Total narration 70–110 words per language (`npm run check -- <slug>`).
- `TTS_PROVIDER` env picks the voice (default `mock` = silence, no keys needed).
- Every technical claim must be correct. Verify code, outputs and numbers before writing them in a scene.
  If unsure, search the web once, do not guess.

## Episode workflow (curriculum: 51 episodes, 9 modules)
The plan lives in `plan/curriculum.json`. NEVER read the whole file; get the brief only through `npm run next`.
1. `npm run next` prints the next `todo` episode, the 2 previous ones, terms already introduced and terms not to use yet.
2. Create `episodes/<slug>/visual.json`, `ru.json`, `en.json` from the brief (copy `episodes/_template/`).
3. `npm run check -- <slug>` (word budget). Then run the `double-check` skill on the episode (facts, code, numbers,
   plain language, caption). Fix what both agents agree on. Only then `npm run status -- <id> drafted`.
4. `npm run preview -- <slug> --lang ru`, then `npm run frames -- <slug> --lang ru --count 3`, read only those PNGs, fix overflow.
5. After the owner approves frames: `npm run render -- <slug> --lang ru|en` (sets status `rendered` by itself).
6. `npm run publish -- <slug>` only on the owner's explicit command (sets `published` after success; stub for now).
Manual status change: `npm run status -- <id> todo|drafted|rendered|published`. Plan sanity check: `npm run plan:check`.
Series logic: each episode = one idea, ends with the `teaser` of the next one (last phrase of the outro);
the last episode of a module ends with its `comment_question`. Counter "closed N of M" = `indexInModule` of `moduleTotal`.
Terms from `introduces` are explained once, in that episode. Use `references` as "мы уже разобрали...".

## Content rules
- Plain language first. Explain like to a smart friend who has not done backend: short sentences, one idea,
  every term gets a one-phrase explanation the first time it appears, no jargon for its own sake.
- Verify technical facts (search the web once if unsure). Round numbers honestly ("около", "порядка"), never invent precision.
- No "always" / "never" / "all" / "best" without grounds; prefer "обычно", "чаще всего", "в таком случае".
- Exactly one running example per episode, from the shop.example story. Module 9 mapping:
  URL shortener = short links for mailings, messenger = buyer–support chat, geosearch = nearest pickup point.
- All explanations and examples are written from scratch. Do not retell other courses, articles or their structure.
- The shop grows with the course: 100 users in module 1, 1 000 000 by module 9. Each module opens with its problem.

## Visual style
Dark photo background (`public/bg.jpg`, darkened by an overlay in `src/theme.ts`), rounded browser/code cards, monospace code,
white heavy wide sans captions (one word at a time, accent words in teal `#299a8d`), series handle `@scalelab.dev`, progress counter
in the header ("closed N of M"). Reuse the look, but use our own series name, avatar and accent color
(set in `src/theme.ts`). Do not copy another creator's branding.
Fonts: Unbounded (headings), Onest (text), JetBrains Mono (code). All support Cyrillic.

## Commands
- `npm run studio` Remotion studio for manual checks
- `npm run preview -- <slug> --lang ru|en` low-res preview
- `npm run frames -- <slug> --lang ru --ids hook,lock,fixes` key frames into `frames/` (default 3 evenly spread)
- `npm run render -- <slug> --lang ru|en` final mp4 to `out/`
- `npm run check -- <slug>` word budget per language
- `npm run publish:dry -- <slug> --lang ru|en` checks env, file, caption and video URL, sends nothing
- `npm run publish -- <slug> --lang ru|en` uploads to R2 and publishes to Instagram, ASK OWNER FIRST
- `npm run next` next todo episode brief; `npm run status -- <id> <status>`; `npm run plan:check`; `npm run typecheck`

## External services (keys in `.env`, never read or print them)
- TTS: ElevenLabs or MiniMax (`TTS_PROVIDER`). Compare voices on one phrase before choosing.
- Instagram: needs professional account + Meta app + public video URL. Publish only after explicit
  "publish" from the owner. AI-generated content must be labeled as AI in Meta.
- Network from the sandbox may be restricted. If a call is blocked, say so once and ask the owner to run the command.

## Definition of done for an episode
1. JSON valid, narration within word budget.
2. 3 frames reviewed, no text overflow on 1080x1920.
3. Final mp4 in `out/`, under 90s, audio and captions in sync.
4. Reply: file path, duration, one suggestion. Nothing else.

## Metrics loop
After publishing, the owner pastes views / retention / shares into `metrics/<slug>.md`.
Read only the latest 5 files, compare with previous, propose max 3 concrete changes to hook or pacing.
