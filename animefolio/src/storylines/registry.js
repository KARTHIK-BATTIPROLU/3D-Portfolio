// ============================================================================
// STORYLINE REGISTRY + CONTRACT
//
// Every storyline is described by an entry here:
//   id        unique kebab-case id
//   name      human label
//   navMode   'free-roam' (mouse/WASD) | 'scroll' (Lenis-driven)
//   theme     { primary, bg } palette metadata
//   Component a React.lazy() 3D component (renders inside the <Canvas>), reads
//             portfolio.js and calls store.setBeat(beatId) as beats are reached
//
// React.lazy keeps each storyline's code in its own chunk — only the chosen
// one is downloaded. ▶ TO ADD A STORYLINE: drop a file in this folder and add
// ONE entry below.
// ============================================================================

import { lazy } from "react";

export const STORYLINES = [
  {
    id: "hub-world",
    name: "Hub World",
    navMode: "free-roam",
    theme: { primary: "#00d4ff", bg: "#0a0e27" },
    // per-scene post-processing grade (Phase 0) — tuned to each world's mood
    post: {
      bloom: 0.82,
      dof: { enabled: true, focalLength: 0.018, bokehScale: 2.2 },
      grade: { hue: 0.0, saturation: 0.16, brightness: 0.0, contrast: 0.12 },
    },
    Component: lazy(() => import("./HubWorld.jsx")),
    preload: () => import("./HubWorld.jsx"),
  },
  {
    id: "creature-run",
    name: "Creature Run",
    navMode: "scroll",
    theme: { primary: "#33d6c0", bg: "#161226" },
    post: {
      bloom: 0.95,
      dof: { enabled: true, focalLength: 0.02, bokehScale: 3.0 },
      grade: { hue: -0.02, saturation: 0.18, brightness: -0.02, contrast: 0.12 },
    },
    Component: lazy(() => import("./CreatureRun.jsx")),
    preload: () => import("./CreatureRun.jsx"),
  },
];

export const getStoryline = (id) => STORYLINES.find((s) => s.id === id);
