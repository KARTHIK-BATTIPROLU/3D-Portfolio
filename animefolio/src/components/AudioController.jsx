// ============================================================================
// AudioController — bridges store state to the procedural audio engine.
// (Renders nothing.) Mute follows store.muted; the pad re-tunes per storyline;
// a soft cue fires on each beat change.
// ============================================================================

import { useEffect } from "react";
import { useStore } from "../store/useStore.js";
import * as audio from "../three/audioBus.js";

export default function AudioController() {
  const muted = useStore((s) => s.muted);
  const beat = useStore((s) => s.currentBeat);
  const story = useStore((s) => s.activeStoryline);

  useEffect(() => {
    audio.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    audio.setTheme(story);
  }, [story]);

  useEffect(() => {
    if (beat) audio.cue();
  }, [beat]);

  return null;
}
