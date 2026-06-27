// ============================================================================
// App — top-level composition + lifecycle:
//   • picks the storyline for this visit (once)
//   • preloads the other storyline on idle (desktop) so Shuffle is instant
//   • mounts the touch joystick on touch devices in free-roam
// ============================================================================

import { useEffect } from "react";
import Experience from "./components/Experience.jsx";
import ScrollDriver from "./components/ScrollDriver.jsx";
import ContentOverlay from "./components/ContentOverlay.jsx";
import UI from "./components/UI.jsx";
import ResumeReader from "./components/ResumeReader.jsx";
import Preloader from "./components/Preloader.jsx";
import { StoryDirector } from "./three/Story.jsx";
import AudioController from "./components/AudioController.jsx";
import TouchControls from "./components/TouchControls.jsx";
import { useStore } from "./store/useStore.js";
import { STORYLINES, getStoryline } from "./storylines/registry.js";
import { chooseInitialId, rememberStoryline } from "./storylines/StorylineManager.js";

const isTouch =
  typeof window !== "undefined" &&
  ("ontouchstart" in window || navigator.maxTouchPoints > 0);
const isMobile =
  typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

export default function App() {
  const setActive = useStore((s) => s.setActiveStoryline);
  const entered = useStore((s) => s.entered);
  const activeId = useStore((s) => s.activeStoryline);
  const navMode = getStoryline(activeId)?.navMode;

  // Pick the storyline for this visit, once.
  useEffect(() => {
    const id = chooseInitialId();
    setActive(id);
    rememberStoryline(id);
  }, [setActive]);

  // Preload the other storyline(s) when the browser is idle (desktop only).
  useEffect(() => {
    if (isMobile) return;
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1500));
    const cancel = window.cancelIdleCallback || clearTimeout;
    const handle = idle(() => {
      STORYLINES.forEach((s) => s.preload && s.preload());
    });
    return () => cancel(handle);
  }, []);

  return (
    <>
      <Experience />
      <ScrollDriver />
      <ContentOverlay />
      <UI />
      <ResumeReader />
      <StoryDirector />
      <AudioController />
      {entered && isTouch && navMode === "free-roam" && <TouchControls />}
      <Preloader />
    </>
  );
}
