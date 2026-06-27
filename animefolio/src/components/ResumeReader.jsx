// ============================================================================
// ResumeReader — one unobtrusive corner button ("📄 Read as résumé") that opens
// a clean, no-motion text view of EVERYTHING in portfolio.js (via BeatContent,
// the single content renderer). This is also the prefers-reduced-motion
// fallback: a complete, readable portfolio with zero 3D required. Quiet styling
// so it never competes with the world.
// ============================================================================

import { useEffect } from "react";
import { useStore } from "../store/useStore.js";
import { BEATS } from "../data/beats.js";
import BeatContent from "./BeatContent.jsx";

export default function ResumeReader() {
  const entered = useStore((s) => s.entered);
  const open = useStore((s) => s.resumeOpen);
  const setOpen = useStore((s) => s.setResumeOpen);

  // Esc closes the reader.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!entered) return null;

  return (
    <>
      <button
        className="resume-btn"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        📄 Read as résumé
      </button>

      {open && (
        <div className="resume-overlay" role="dialog" aria-modal="true" aria-label="Résumé">
          <div className="resume-doc">
            <button className="resume-close" onClick={() => setOpen(false)} aria-label="Close résumé">
              ✕
            </button>
            {BEATS.map((b) => (
              <section key={b.id} className="resume-section" aria-label={b.label}>
                <BeatContent beatId={b.id} />
              </section>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
