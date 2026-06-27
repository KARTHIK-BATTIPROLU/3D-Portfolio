// ============================================================================
// audioBus — the audio controller (Phase 0). A Howler-based ambient bed + cue
// API. When real audio files are registered in assets.js it uses them; until
// then it transparently falls back to the existing procedural synth engine, so
// sound works at every stage. Same API either way; mute hits both.
// ============================================================================

import { Howl, Howler } from "howler";
import * as procedural from "./audio.js";
import { assets } from "../data/assets.js";

let usingHowler = false;
let started = false;
let ambient = null;
const sfx = {};

export function unlock(sceneId) {
  if (started) return;
  started = true;

  if (assets.audioAmbient?.path) {
    usingHowler = true;
    ambient = new Howl({ src: [assets.audioAmbient.path], loop: true, volume: 0, html5: true });
    ambient.play();
    ambient.fade(0, 0.4, 1500);
    if (assets.audioWhoosh?.path) {
      sfx.whoosh = new Howl({ src: [assets.audioWhoosh.path], volume: 0.6 });
    }
  } else {
    // no real audio yet → procedural ambient bed
    procedural.unlock(sceneId);
  }
}

export function setMuted(value) {
  Howler.mute(value); // affects all Howler playback
  procedural.setMuted(value); // affects the synth fallback
}

export function setTheme(sceneId) {
  if (!usingHowler) procedural.setTheme(sceneId);
  // (with real audio: cross-fade ambient stems per scene here later)
}

// Interaction / transition cue. Named cues play their Howl if registered;
// otherwise a soft procedural blip is used.
export function cue(name) {
  if (usingHowler && name && sfx[name]) {
    sfx[name].play();
    return;
  }
  procedural.cue();
}
