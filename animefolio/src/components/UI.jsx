// ============================================================================
// UI — on-screen chrome (after "Enter"): active-story badge, discovered
// tracker, a "you got the … cut" replayability banner, mute, and the
// "Shuffle storyline" button.
// ============================================================================

import { useEffect, useState } from "react";
import { useStore } from "../store/useStore.js";
import { STORYLINES, getStoryline } from "../storylines/registry.js";
import { useSwitchStoryline } from "../storylines/StorylineManager.js";

export default function UI() {
  const activeId = useStore((s) => s.activeStoryline);
  const discovered = useStore((s) => s.discoveredStorylines);
  const muted = useStore((s) => s.muted);
  const toggleMute = useStore((s) => s.toggleMute);
  const entered = useStore((s) => s.entered);
  const switchStoryline = useSwitchStoryline();
  const [showCut, setShowCut] = useState(false);

  const entry = getStoryline(activeId);

  // Flash a "you got the … cut" banner whenever the storyline changes.
  useEffect(() => {
    if (!entered || !activeId) return;
    setShowCut(true);
    const t = setTimeout(() => setShowCut(false), 3500);
    return () => clearTimeout(t);
  }, [activeId, entered]);

  if (!entered) return null;

  return (
    <div className="ui-layer">
      <div className="ui-top">
        <span className="story-badge">{entry?.name ?? "…"}</span>
        <span className="discovered">
          {discovered.length} / {STORYLINES.length} discovered
        </span>
      </div>

      {showCut && (
        <div className="cut-banner" key={activeId}>
          ✨ You got the <b>{entry?.name}</b> cut
        </div>
      )}

      <div className="ui-bottom">
        <button className="ui-btn" onClick={toggleMute} aria-label="Toggle sound">
          {muted ? "🔇" : "🔊"}
        </button>
        <button className="ui-btn primary" onClick={switchStoryline}>
          Shuffle storyline 🔀
        </button>
      </div>
    </div>
  );
}
