// ============================================================================
// QUEST DATA — Story Two's original IP layer (Creature Quest).
//
// No Pokémon names/designs/typings anywhere here — original creature, original
// trainer framing, original "discipline" labels, original move names. Every
// fact (project blurb, tech, status) is still pulled live from portfolio.js;
// this file only adds the narrative skin (names + flavor + effectiveness).
// ============================================================================

import { portfolio as p } from "./portfolio.js";

export const CREATURE = {
  name: "Voltie",
  species: "a spark-fox, original AnimeFolio mascot",
  element: "Spark",
  color: "#ffd23f",
};

export const TRAINER = { name: p.name.split(" ")[0], color: "#33d6c0" };

// One opponent "discipline domain" per project, matched to that project's tech
// focus. Each domain has an original name/color/line — never a real-world IP.
const DOMAINS = {
  ai:       { name: "Cortexa",  discipline: "Cognition", color: "#9d4edd", line: "I see every disease before it spreads." },
  mobile:   { name: "Tapper",   discipline: "Touch",     color: "#06d6a0", line: "Swipe all you like — I never drop a frame." },
  frontend: { name: "Pixelisk", discipline: "Render",    color: "#00d4ff", line: "I render the whole community at once." },
  backend:  { name: "Vaultir",  discipline: "Logic",     color: "#ff8c42", line: "No token gets past my fifteen minutes." },
};

// project.name → { domainKey, move name, flavor }. Order = battle order.
const MOVES_BY_PROJECT = {
  "Farm India": { domain: "ai", move: "Harvest Surge", boss: true,
    flavor: "An ML model spots crop disease in a snapshot — 5th place, State level." },
  "Student Resource Sharing App": { domain: "mobile", move: "Flutter Dash",
    flavor: "Resources land in every student's hand, instantly." },
  "HyderabadCoders Community Platform": { domain: "frontend", move: "Community Beacon",
    flavor: "A live, authenticated home for an entire dev community." },
  "Certificate Generator": { domain: "backend", move: "Cert Flash",
    flavor: "JWT-gated, rendered, delivered — before the link expires." },
};

// Build the ordered battle list straight from portfolio.projects so the quest
// can never drift from the résumé data (new projects "just work" with a
// generic domain/move fallback).
export const BATTLES = p.projects.map((proj, i) => {
  const meta = MOVES_BY_PROJECT[proj.name] || { domain: "backend", move: `${proj.name} Combo` };
  const domain = DOMAINS[meta.domain];
  return {
    id: `battle-${i}`,
    project: proj,
    move: meta.move,
    boss: !!meta.boss || !!proj.flagship,
    badge: (meta.boss || proj.flagship) ? "Srujana Badge" : null,
    opponent: domain,
    flavor: meta.flavor || proj.blurb,
  };
});

export const TOTAL_XP_TO_LEVEL = 100;
