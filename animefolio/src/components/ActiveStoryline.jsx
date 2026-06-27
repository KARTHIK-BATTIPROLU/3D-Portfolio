// ============================================================================
// ActiveStoryline — mounts the chosen storyline's 3D component inside the
// Canvas. Keyed by id so switching storylines fully unmounts the previous
// one; R3F disposes its geometries/materials/textures automatically (no leak).
// ============================================================================

import { Suspense } from "react";
import { useStore } from "../store/useStore.js";
import { getStoryline } from "../storylines/registry.js";

export default function ActiveStoryline() {
  const activeId = useStore((s) => s.activeStoryline);
  const entry = getStoryline(activeId);

  if (!entry) return null;
  const Storyline = entry.Component;

  return (
    <Suspense fallback={null}>
      <Storyline key={entry.id} />
    </Suspense>
  );
}
