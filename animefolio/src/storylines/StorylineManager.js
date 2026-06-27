// ============================================================================
// StorylineManager — selection + switching logic.
//   • chooseInitialId(): ?story=<id> forces one; else random, avoiding the
//     last-shown (localStorage) so reloads tend to surprise.
//   • useSwitchStoryline(): returns a callback that swaps to a different
//     storyline. The actual mount/dispose is handled by <ActiveStoryline>,
//     which is keyed by id so React + R3F tear down the old world's GPU
//     resources on unmount (no leaks).
// ============================================================================

import { useCallback } from "react";
import { useStore } from "../store/useStore.js";
import { STORYLINES } from "./registry.js";

const LAST_KEY = "animefolio:lastStory";

export function getLastStoryline() {
  try {
    return localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
}

export function rememberStoryline(id) {
  try {
    localStorage.setItem(LAST_KEY, id);
  } catch {
    /* ignore (private mode) */
  }
}

export function pickStorylineId({ exclude = [] } = {}) {
  const avoid = new Set([...exclude, getLastStoryline()].filter(Boolean));
  let pool = STORYLINES.filter((s) => !avoid.has(s.id));
  if (pool.length === 0) pool = STORYLINES.filter((s) => !exclude.includes(s.id));
  if (pool.length === 0) pool = STORYLINES;
  return pool[Math.floor(Math.random() * pool.length)].id;
}

export function chooseInitialId() {
  const forced = new URLSearchParams(location.search).get("story");
  return STORYLINES.some((s) => s.id === forced) ? forced : pickStorylineId();
}

/** Hook: returns switchStoryline() — picks a different storyline and resets state. */
export function useSwitchStoryline() {
  const setActive = useStore((s) => s.setActiveStoryline);
  return useCallback(() => {
    const current = useStore.getState().activeStoryline;
    const id = pickStorylineId({ exclude: [current] });
    setActive(id);
    rememberStoryline(id);
    useStore.getState().setBeat("intro");
    useStore.getState().setFocusedProject(null);
    useStore.getState().setScrollProgress(0);
    useStore.getState().setInspectTarget(null);
    useStore.getState().setNearInspect(null);
    useStore.getState().dismissStory();
    useStore.setState({ seenStory: [] }); // replay the story in the new world
    window.scrollTo(0, 0);
  }, [setActive]);
}
