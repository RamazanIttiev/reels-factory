import { mkdirSync, writeFileSync } from "node:fs";

const RATE = 44100;

type Voice = { freq: (t: number) => number; decay: number; gain: number };

const synth = (seconds: number, voices: Voice[], noise = 0): Int16Array => {
  const total = Math.round(seconds * RATE);
  const phases = voices.map(() => 0);
  return Int16Array.from({ length: total }, (_, i) => {
    const t = i / RATE;
    const attack = Math.min(1, t / 0.004);
    const tail = Math.min(1, (seconds - t) / 0.02);
    const tone = voices.reduce((sum, voice, index) => {
      phases[index] += (2 * Math.PI * voice.freq(t)) / RATE;
      return sum + Math.sin(phases[index]) * voice.gain * Math.exp(-t * voice.decay);
    }, 0);
    const hiss = (Math.random() * 2 - 1) * noise * Math.exp(-t * 40);
    return Math.round(Math.max(-1, Math.min(1, (tone + hiss) * attack * tail)) * 32767);
  });
};

const wav = (samples: Int16Array): Buffer => {
  const data = Buffer.from(samples.buffer);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
};

const sounds: Record<string, Int16Array> = {
  pop: synth(0.16, [{ freq: (t) => 330 + 260 * Math.exp(-t * 35), decay: 24, gain: 0.8 }]),
  tick: synth(0.07, [{ freq: () => 1900, decay: 70, gain: 0.55 }], 0.25),
  chime: synth(0.55, [
    { freq: () => 880, decay: 9, gain: 0.45 },
    { freq: () => 1320, decay: 12, gain: 0.25 },
  ]),
  click: Int16Array.from([...synth(0.045, [{ freq: () => 1900, decay: 90, gain: 0.5 }], 0.3), ...new Int16Array(Math.round(RATE * 0.07)), ...synth(0.06, [{ freq: () => 1700, decay: 70, gain: 0.3 }], 0.2)]),
  thud: synth(0.3, [{ freq: (t) => 480 - 150 * Math.min(1, t * 8), decay: 14, gain: 0.8 }]),
  knock: synth(0.28, [{ freq: (t) => 130 - 30 * Math.min(1, t * 10), decay: 16, gain: 0.9 }], 0.08),
  swish: synth(0.22, [{ freq: (t) => 500 + 900 * t, decay: 18, gain: 0.15 }], 0.35),
};

mkdirSync("public/sfx-synth", { recursive: true });
Object.entries(sounds).forEach(([name, samples]) => writeFileSync(`public/sfx-synth/${name}.wav`, wav(samples)));
console.log(`sfx: ${Object.keys(sounds).join(", ")}`);
