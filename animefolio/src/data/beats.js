// ============================================================================
// CONTENT BEATS — the ordered sections every storyline must present.
// A storyline decides HOW to reveal a beat; never WHICH beats or their order.
// ============================================================================

export const BEATS = [
  { id: "intro",      label: "Intro" },
  { id: "about",      label: "About" },
  { id: "skills",     label: "Skills" },
  { id: "experience", label: "Experience" },
  { id: "projects",   label: "Projects" },
  { id: "education",  label: "Education" },
  { id: "contact",    label: "Contact" },
];

export const BEAT_IDS = BEATS.map((b) => b.id);
