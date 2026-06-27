// ============================================================================
// Global store (zustand) — the shared state every part of the engine reads.
// ============================================================================

import { create } from "zustand";

export const useStore = create((set) => ({
  // --- state ---
  activeStoryline: null, // id of the mounted storyline
  currentBeat: "intro", // content beat currently revealed (null = none)
  focusedProject: null, // when in the Tower: which project index to spotlight
  scrollProgress: 0, // 0–1, driven by Lenis in scroll-mode storylines
  isLoading: true, // asset preloader active
  entered: false, // user clicked "Enter" past the preloader
  muted: false, // audio mute (wired to Howler in Step 6)
  discoveredStorylines: [], // ids the visitor has seen this session

  // --- diegetic "inspect" (Step 8): dense content opens an in-world terminal ---
  inspectTarget: null, // {beat, title, anchor:[x,y,z]} currently open, else null
  nearInspect: null, // {id, beat, title, anchor} in range (drives the E key)
  resumeOpen: false, // the "Read as résumé" reader overlay

  // --- story layer (Step 9): guide + NPC dialogue, played per beat ---
  story: null, // {beat, step, steps:[{speaker:'guide'|'npc', text}]} or null
  seenStory: [], // beat ids whose story has already played this visit

  // --- setters ---
  setActiveStoryline: (id) =>
    set((s) => ({
      activeStoryline: id,
      discoveredStorylines: s.discoveredStorylines.includes(id)
        ? s.discoveredStorylines
        : [...s.discoveredStorylines, id],
    })),
  setBeat: (beatId) => set({ currentBeat: beatId }),
  setFocusedProject: (index) => set({ focusedProject: index }),
  setScrollProgress: (p) => set({ scrollProgress: p }),
  setLoading: (v) => set({ isLoading: v }),
  setEntered: (v) => set({ entered: v }),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  setInspectTarget: (t) => set({ inspectTarget: t }),
  setNearInspect: (t) => set({ nearInspect: t }),
  setResumeOpen: (v) => set({ resumeOpen: v }),

  // story actions
  startStory: (beat, steps) =>
    set((s) => ({
      story: { beat, step: 0, steps },
      seenStory: s.seenStory.includes(beat) ? s.seenStory : [...s.seenStory, beat],
    })),
  advanceStory: () =>
    set((s) => {
      if (!s.story) return {};
      const next = s.story.step + 1;
      return next >= s.story.steps.length
        ? { story: null }
        : { story: { ...s.story, step: next } };
    }),
  dismissStory: () => set({ story: null }),
}));
