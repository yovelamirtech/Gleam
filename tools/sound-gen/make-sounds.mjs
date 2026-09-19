import { writeFileSync } from 'fs';

const SAMPLE_RATE = 44100;

/** Encode mono float samples (-1..1) as a 16-bit PCM WAV buffer. */
function encodeWav(samples) {
  const header = Buffer.alloc(44);
  const dataSize = samples.length * 2;
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  const data = Buffer.alloc(dataSize);
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(clamped * 32767), i * 2);
  }
  return Buffer.concat([header, data]);
}

function mix(buffers, length) {
  const out = new Float32Array(length);
  for (const buf of buffers) {
    for (let i = 0; i < buf.samples.length; i += 1) {
      const at = buf.at + i;
      if (at >= 0 && at < out.length) out[at] += buf.samples[i];
    }
  }
  return out;
}

/** Linear fade to silence over the last `seconds`, so a one-shot never pops at its end. */
function fadeOutEnd(samples, seconds) {
  const fadeLength = Math.min(samples.length, Math.round(seconds * SAMPLE_RATE));
  const start = samples.length - fadeLength;
  for (let i = 0; i < fadeLength; i += 1) {
    samples[start + i] *= 1 - i / fadeLength;
  }
  return samples;
}

/**
 * One sine partial with a fast attack and exponential decay, for a
 * percussive bell/tick tone. `decay` is the time constant in seconds.
 */
function tone(freq, durationSeconds, { attack = 0.003, decay, amplitude = 1 } = {}) {
  const n = Math.round(durationSeconds * SAMPLE_RATE);
  const out = new Float32Array(n);
  const tau = decay ?? durationSeconds / 3;
  for (let i = 0; i < n; i += 1) {
    const t = i / SAMPLE_RATE;
    const env = t < attack ? t / attack : Math.exp(-(t - attack) / tau);
    out[i] = Math.sin(2 * Math.PI * freq * t) * env * amplitude;
  }
  return out;
}

/** A stone landing: a quick, glassy tick. */
function makeClick() {
  const fundamental = tone(1400, 0.09, { decay: 0.03, amplitude: 0.55 });
  const partial = tone(2800, 0.09, { decay: 0.02, amplitude: 0.18 });
  const samples = mix(
    [
      { samples: fundamental, at: 0 },
      { samples: partial, at: 0 },
    ],
    fundamental.length
  );
  return encodeWav(fadeOutEnd(samples, 0.015));
}

/** A board row filled in: a short two-note upward chime. */
function makeRowComplete() {
  const noteGap = Math.round(0.07 * SAMPLE_RATE);
  const a = tone(783.99, 0.22, { decay: 0.09, amplitude: 0.4 }); // G5
  const b = tone(1046.5, 0.24, { decay: 0.1, amplitude: 0.42 }); // C6
  const length = noteGap + b.length;
  const samples = mix(
    [
      { samples: a, at: 0 },
      { samples: b, at: noteGap },
    ],
    length
  );
  return encodeWav(fadeOutEnd(samples, 0.02));
}

/** A whole board finished: a small four-note fanfare arpeggio. */
function makeBoardComplete() {
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  const noteGap = Math.round(0.1 * SAMPLE_RATE);
  const parts = notes.map((freq, i) => ({
    samples: tone(freq, 0.5, { decay: 0.35, amplitude: 0.32 }),
    at: i * noteGap,
  }));
  const length = Math.max(...parts.map((p) => p.at + p.samples.length));
  const samples = mix(parts, length);
  return encodeWav(fadeOutEnd(samples, 0.03));
}

/**
 * Quiet ambient background pad, looped by the player. A Cmaj7 chord as four
 * detuned sine voices, each with its own slow tremolo. Every voice frequency
 * (and every tremolo rate) is chosen as an exact multiple of 1/LOOP_SECONDS,
 * so every voice completes a whole number of cycles over the loop and the
 * waveform returns to exactly 0 at both ends — a seamless loop with no
 * fade or crossfade needed.
 */
function makeMusic() {
  const LOOP_SECONDS = 6;
  const unit = 1 / LOOP_SECONDS;
  const roundToUnit = (freq) => Math.round(freq / unit) * unit;
  // Low, soft chord: C3 E3 G3 B3.
  const voices = [
    { target: 130.81, trem: 1, tremDepth: 0.25 },
    { target: 164.81, trem: 2, tremDepth: 0.2 },
    { target: 196.0, trem: 1, tremDepth: 0.2 },
    { target: 246.94, trem: 3, tremDepth: 0.15 },
  ];

  const n = Math.round(LOOP_SECONDS * SAMPLE_RATE);
  const out = new Float32Array(n);
  for (const voice of voices) {
    const freq = roundToUnit(voice.target);
    const tremFreq = voice.trem * unit;
    const baseAmplitude = 0.12;
    for (let i = 0; i < n; i += 1) {
      const t = i / SAMPLE_RATE;
      const tremolo = 1 - voice.tremDepth + voice.tremDepth * (0.5 + 0.5 * Math.sin(2 * Math.PI * tremFreq * t));
      out[i] += Math.sin(2 * Math.PI * freq * t) * tremolo * baseAmplitude;
    }
  }
  return encodeWav(out);
}

const OUT_DIR = '../../assets/sounds';
writeFileSync(`${OUT_DIR}/click.wav`, makeClick());
writeFileSync(`${OUT_DIR}/row.wav`, makeRowComplete());
writeFileSync(`${OUT_DIR}/board.wav`, makeBoardComplete());
writeFileSync(`${OUT_DIR}/music.wav`, makeMusic());
console.log('wrote click.wav, row.wav, board.wav, music.wav');
