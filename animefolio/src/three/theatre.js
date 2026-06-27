// ============================================================================
// theatre — the authored-animation scaffold (Phase 0 foundation).
//
// Theatre.js drives the cinematic, keyframed camera moves used in the story
// steps (A2 cloud-dive, A3 establishing sweep, A5 sunset lift). In Phase 0 we
// only boot the Studio EDITOR in development so those timelines can be authored
// in the browser — and we do it through fully-dynamic, dev-only imports so that
// NONE of Theatre ships to production until an A-step actually uses a sheet.
//
// When authoring begins, an A-step will: import { getProject } from
// "@theatre/core", create a sheet, wrap the scene in <SheetProvider sheet={…}>
// (from "@theatre/r3f"), and drive an <editable.perspectiveCamera>.
// ============================================================================

let booted = false;

export async function initStudioDev() {
  if (booted) return;
  // Theatre.js Studio is an AUTHORING tool — its editor/inspector chrome must
  // NEVER appear to visitors (not even on the dev server). Boot it only when a
  // developer explicitly opts in with ?studio=1 (dev builds only). Production
  // never includes it because import.meta.env.DEV is false.
  const optedIn =
    import.meta.env.DEV &&
    typeof location !== "undefined" &&
    new URLSearchParams(location.search).get("studio") === "1";
  if (!optedIn) return;
  booted = true;
  try {
    const { getProject } = await import("@theatre/core");
    const studio = (await import("@theatre/studio")).default;
    const { extension } = await import("@theatre/r3f");
    studio.initialize();
    studio.extend(extension);
    // Create the project/sheet so the editor has something to attach to, and
    // expose it for authoring sessions during development.
    const project = getProject("AnimeFolio");
    window.__theatre = { project, sheet: project.sheet("Main") };
  } catch {
    /* Studio is optional — ignore if it fails to load */
  }
}
