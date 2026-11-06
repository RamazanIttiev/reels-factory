import { describe, expect, it } from "vitest";
import { audioHash, elevenLabsBody, providerByName } from "../scripts/tts";

const base = { text: "Привет", voiceId: "v1", lang: "ru" };

describe("ElevenLabs voice settings", () => {
  it("sends only text and model when no settings are given", () => {
    expect(elevenLabsBody(base)).toEqual({ text: "Привет", model_id: "eleven_v4" });
  });

  it("sends the given settings as voice_settings", () => {
    const body = elevenLabsBody({ ...base, voiceSettings: { stability: 0.3, style: 0.4, speed: 1.1 } });
    expect(body.voice_settings).toEqual({ stability: 0.3, style: 0.4, speed: 1.1 });
  });

  it("keeps the cache key unchanged without settings", () => {
    const provider = providerByName("elevenlabs");
    expect(audioHash(provider, base)).toBe(audioHash(provider, { ...base, voiceSettings: undefined }));
  });

  it("changes the cache key when settings change", () => {
    const provider = providerByName("elevenlabs");
    const plain = audioHash(provider, base);
    const tuned = audioHash(provider, { ...base, voiceSettings: { speed: 1.1 } });
    expect(tuned).not.toBe(plain);
  });
});
