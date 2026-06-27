// ============================================================================
// ScrollDriver — owns page scroll. For 'scroll' storylines it sets up Lenis
// smooth-scroll, gives the page height, and feeds store.scrollProgress (0–1).
// For 'free-roam' storylines it disables page scrolling entirely. Re-runs and
// cleans up whenever the active storyline's navMode changes.
// ============================================================================

import { useEffect } from "react";
import Lenis from "lenis";
import { useStore } from "../store/useStore.js";
import { getStoryline } from "../storylines/registry.js";

const SCROLL_PAGES = 6; // viewport-heights of scroll for a scroll storyline

export default function ScrollDriver() {
  const activeId = useStore((s) => s.activeStoryline);
  const setScrollProgress = useStore((s) => s.setScrollProgress);
  const navMode = getStoryline(activeId)?.navMode;

  useEffect(() => {
    // Free-roam (or nothing mounted yet): lock the page, no scroll.
    if (navMode !== "scroll") {
      document.documentElement.style.overflowY = "hidden";
      document.body.style.height = "";
      setScrollProgress(0);
      return;
    }

    // Scroll mode: enable smooth scroll + map scroll → progress.
    document.documentElement.style.overflowY = "auto";
    document.body.style.height = `${SCROLL_PAGES * 100}vh`;
    window.scrollTo(0, 0);

    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    let rafId;
    const raf = (time) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    lenis.on("scroll", ({ scroll, limit }) => {
      const p = limit > 0 ? Math.min(1, Math.max(0, scroll / limit)) : 0;
      setScrollProgress(p);
    });

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      document.body.style.height = "";
    };
  }, [navMode, setScrollProgress]);

  return null;
}
