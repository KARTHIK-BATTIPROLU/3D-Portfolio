// ============================================================================
// Procedural ambient audio (Web Audio API) — a gentle synth pad per storyline
// plus a soft cue on each beat. No audio files needed. (Howler is installed
// for when you add real music/sfx tracks later — drop them in and play here.)
//
// Must be unlocked from a user gesture (the "Enter" click) due to autoplay
// policies. Everything is mute-able via setMuted().
// ============================================================================

let ctx = null;
let master = null;
let osc1 = null;
let osc2 = null;
let lfo = null;
let filter = null;
let started = false;
let muted = false;

const BASE_GAIN = 0.07;

const THEME = {
  "hub-world": 110, // A2-ish, warm
  "creature-run": 146, // a touch higher, playful
};

export function unlock(storyId) {
  if (started) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    ctx = new AudioCtx();

    master = ctx.createGain();
    master.gain.value = muted ? 0 : BASE_GAIN;
    master.connect(ctx.destination);

    filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 650;
    filter.Q.value = 5;
    filter.connect(master);

    const base = THEME[storyId] ?? 110;
    osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.value = base;
    osc2 = ctx.createOscillator();
    osc2.type = "triangle";
    osc2.frequency.value = base * 1.5;
    osc1.connect(filter);
    osc2.connect(filter);

    // Slow filter sweep for movement.
    lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 220;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    osc1.start();
    osc2.start();
    lfo.start();
    started = true;
  } catch {
    /* audio unavailable — silently ignore */
  }
}

export function setMuted(value) {
  muted = value;
  if (ctx && master) {
    master.gain.linearRampToValueAtTime(value ? 0 : BASE_GAIN, ctx.currentTime + 0.3);
  }
}

export function setTheme(storyId) {
  if (!started || !ctx) return;
  const base = THEME[storyId] ?? 110;
  osc1?.frequency.linearRampToValueAtTime(base, ctx.currentTime + 0.6);
  osc2?.frequency.linearRampToValueAtTime(base * 1.5, ctx.currentTime + 0.6);
}

// A short, soft blip when a content beat activates.
export function cue() {
  if (!started || !ctx || muted) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(620, t);
  o.frequency.exponentialRampToValueAtTime(880, t + 0.12);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.05, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + 0.4);
}
