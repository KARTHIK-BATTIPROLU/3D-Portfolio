// ============================================================================
// Preloader — real asset-load progress via drei's useProgress, then an
// "Enter" gate that transitions into the world.
// ============================================================================

import { useEffect, useState } from "react";
import { useProgress } from "@react-three/drei";
import { useStore } from "../store/useStore.js";
import * as audio from "../three/audioBus.js";

export default function Preloader() {
  const { progress, active } = useProgress();
  const entered = useStore((s) => s.entered);
  const setEntered = useStore((s) => s.setEntered);
  const setLoading = useStore((s) => s.setLoading);
  const [ready, setReady] = useState(false);

  // Considered ready once nothing is actively loading.
  useEffect(() => {
    if (active) return;
    const t = setTimeout(() => {
      setReady(true);
      setLoading(false);
    }, 600);
    return () => clearTimeout(t);
  }, [active, setLoading]);

  if (entered) return null;

  return (
    <div className={`preloader ${ready ? "is-ready" : ""}`}>
      <div className="preloader-inner">
        <h1 className="brand">AnimeFolio</h1>
        <p className="brand-sub">Karthik Battiprolu — interactive 3D portfolio</p>

        {!ready ? (
          <>
            <div className="bar">
              <div className="bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <p className="loading-pct">{Math.floor(progress)}%</p>
          </>
        ) : (
          <button
            className="enter-btn"
            onClick={() => {
              // user gesture → unlock the procedural audio engine
              audio.unlock(useStore.getState().activeStoryline);
              setEntered(true);
            }}
          >
            Enter ↵
          </button>
        )}
      </div>
    </div>
  );
}
