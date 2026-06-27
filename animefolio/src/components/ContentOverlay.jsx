// ============================================================================
// ContentOverlay — Step 8 removed the floating content cards. The portfolio is
// now told entirely IN the 3D world (see src/three/Surfaces.jsx) + the diegetic
// inspect terminal + the "Read as résumé" reader.
//
// What remains here is ONLY the visually-hidden layer carrying EVERY beat in the
// DOM, always — so crawlers and screen readers still get the full real content.
// (On-screen HUD chrome lives in <UI>; the résumé reader is <ResumeReader>.)
// ============================================================================

import { BEATS } from "../data/beats.js";
import BeatContent from "./BeatContent.jsx";

export default function ContentOverlay() {
  return (
    <div className="sr-only">
      {BEATS.map((b) => (
        <section key={b.id} data-beat={b.id} aria-label={b.label}>
          <BeatContent beatId={b.id} />
        </section>
      ))}
    </div>
  );
}
