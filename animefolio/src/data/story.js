// ============================================================================
// STORY — the narrative spine (Step 9). A guide companion ("Pixel") ties the
// beats together and hands off to a local NPC at each place. The NPC delivers
// the portfolio AS STORY, not as labels — short, warm, punchy lines that pull
// real facts from portfolio.js so there's still a single source of truth.
//
// Spine:  Arrival (intro/about) → The Toolyard (skills) → The Build Sites
//         (projects) → The Road So Far (experience) → The Academy (education)
//         → The Send-off (contact).
//
// Each entry is keyed by the content beat it surfaces:
//   guide  – the guide's transition line (spoken first, then it hands off)
//   npc    – { id, name, color, lines:[1–3 short lines] }
// ============================================================================

import { portfolio as p } from "./portfolio.js";

// --- a few facts pulled from the data, kept short for dialogue ---------------
const flagship = p.projects.find((x) => x.flagship) || p.projects[0];
const lead = p.experience[0]; // current / most recent role
const schoolShort = p.education[0].school.match(/\(([^)]+)\)/)?.[1] || p.education[0].school;
const skillCount = Object.keys(p.skills).length;

export const GUIDE = { id: "guide", name: "Pixel", color: "#00d4ff" };

export const STORY = [
  {
    beat: "intro",
    chapter: "Arrival",
    guide: "Welcome in — I'm Pixel. Come meet Karthik.",
    npc: {
      id: "herald",
      name: "The Herald",
      color: "#33d6c0",
      lines: [`This is ${p.name}.`, `${p.location} — and building for the metaverse.`],
    },
  },
  {
    beat: "about",
    chapter: "Arrival",
    guide: "Want the short version of who he is?",
    npc: {
      id: "sage",
      name: "The Sage",
      color: "#9d4edd",
      lines: ["A full-stack problem solver.", "Finds the real problem, picks the stack, ships it."],
    },
  },
  {
    beat: "skills",
    chapter: "The Toolyard",
    guide: "This way — the toolyard. Everything he builds with.",
    npc: {
      id: "forge",
      name: "Forge",
      color: "#06d6a0",
      lines: [`${skillCount} kits, one builder.`, "MERN, Android, and deep into agentic AI."],
    },
  },
  {
    beat: "projects",
    chapter: "The Build Sites",
    guide: "Now the good part — what he's actually built.",
    npc: {
      id: "foreman",
      name: "The Foreman",
      color: "#ff8c42",
      lines: [
        `Start with ${flagship.name}.`,
        "Farmers, vendors, and an ML model that spots crop disease.",
        "Fifth in the state for that one.",
      ],
    },
  },
  {
    beat: "experience",
    chapter: "The Road So Far",
    guide: "Every builder's got a road. Here's his.",
    npc: {
      id: "wayfarer",
      name: "The Wayfarer",
      color: "#ff006e",
      lines: [`Right now — ${lead.role} at ${lead.org}.`, "Communities, ambassadorships, a club he founded."],
    },
  },
  {
    beat: "education",
    chapter: "The Academy",
    guide: "Where did it all start? The academy.",
    npc: {
      id: "dean",
      name: "The Dean",
      color: "#ffd60a",
      lines: [`AI & Data Science at ${schoolShort}.`, "A CS diploma before that. Always building."],
    },
  },
  {
    beat: "contact",
    chapter: "The Send-off",
    guide: "That's the tour. One last stop — the send-off.",
    npc: {
      id: "gatekeeper",
      name: "The Gatekeeper",
      color: "#06ffa5",
      lines: ["Like what you saw?", `Reach him at ${p.email}.`, "The door's open."],
    },
  },
];

export const STORY_BY_BEAT = Object.fromEntries(STORY.map((s) => [s.beat, s]));

// Build the ordered dialogue steps for a beat: guide line, then the NPC's.
export function buildSteps(beat) {
  const e = STORY_BY_BEAT[beat];
  if (!e) return null;
  return [
    { speaker: "guide", text: e.guide },
    ...e.npc.lines.map((text) => ({ speaker: "npc", text })),
  ];
}
