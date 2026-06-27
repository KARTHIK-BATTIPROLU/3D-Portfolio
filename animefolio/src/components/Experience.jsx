// ============================================================================
// Experience — the R3F <Canvas>, lighting rig, and the craft layer (Phase 0):
//   • ACESFilmic tone mapping + exposure, soft shadows
//   • post stack: Bloom + Depth-of-Field (subject-tracked) + color grade
//     (hue/sat + brightness/contrast) + Vignette + grain — tuned PER SCENE via
//     each storyline's registry `post` config
//   • Theatre.js SheetProvider wraps the scene so authored camera moves plug in
//   • quality adapts to device + live FPS; reduced-motion drops camera punch,
//     DOF and grain
// ============================================================================

import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import {
  EffectComposer,
  Bloom,
  Vignette,
  Noise,
  DepthOfField,
  HueSaturation,
  BrightnessContrast,
} from "@react-three/postprocessing";
import { PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";

import ActiveStoryline from "./ActiveStoryline.jsx";
import { useStore } from "../store/useStore.js";
import { getStoryline } from "../storylines/registry.js";
import { focusTarget } from "../three/cameraRig.js";

const BASE_FOV = 50;

const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const isMobile =
  typeof navigator !== "undefined" &&
  (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ||
    ("ontouchstart" in window && window.innerWidth < 900));

// Subtle FOV "punch" each time a content beat becomes active.
function CameraFx() {
  const { camera } = useThree();
  const beat = useStore((s) => s.currentBeat);
  useEffect(() => {
    gsap.killTweensOf(camera);
    gsap.fromTo(
      camera,
      { fov: BASE_FOV - 3 },
      {
        fov: BASE_FOV,
        duration: 0.5,
        ease: "power2.out",
        onUpdate: () => camera.updateProjectionMatrix(),
      }
    );
  }, [beat, camera]);
  return null;
}

function PostFx({ post, enabled }) {
  const grade = post?.grade || {};
  const dofOn = enabled && post?.dof?.enabled && !prefersReducedMotion && !isMobile;

  const effects = [
    <Bloom key="bloom" intensity={post?.bloom ?? 0.7} luminanceThreshold={0.25} luminanceSmoothing={0.2} mipmapBlur />,
  ];
  if (dofOn) {
    effects.push(
      <DepthOfField
        key="dof"
        target={focusTarget}
        focalLength={post.dof.focalLength ?? 0.02}
        bokehScale={post.dof.bokehScale ?? 2.5}
      />
    );
  }
  effects.push(<HueSaturation key="hs" hue={grade.hue ?? 0} saturation={grade.saturation ?? 0} />);
  effects.push(<BrightnessContrast key="bc" brightness={grade.brightness ?? 0} contrast={grade.contrast ?? 0} />);
  effects.push(<Vignette key="vignette" offset={0.3} darkness={0.7} />);
  if (!prefersReducedMotion) effects.push(<Noise key="noise" opacity={0.02} />);

  return <EffectComposer disableNormalPass>{effects}</EffectComposer>;
}

export default function Experience() {
  const [dpr, setDpr] = useState(isMobile ? 1 : 1.5);
  const [fx, setFx] = useState(!isMobile);
  const activeId = useStore((s) => s.activeStoryline);
  const post = getStoryline(activeId)?.post;

  return (
    <Canvas
      className="canvas3d"
      shadows={isMobile ? false : "soft"}
      dpr={dpr}
      gl={{
        antialias: !isMobile,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
        powerPreference: "high-performance",
      }}
      camera={{ position: [0, 3, 9], fov: BASE_FOV, near: 0.1, far: 200 }}
    >
      <PerformanceMonitor
        onDecline={() => {
          setDpr(1);
          setFx(false);
        }}
        onIncline={() => {
          if (!isMobile) setDpr(1.5);
        }}
      />

      <color attach="background" args={["#0a0e27"]} />
      <fog attach="fog" args={["#0a0e27", 12, 40]} />

      <hemisphereLight args={["#9bb8ff", "#1a1030", 0.55]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[6, 14, 6]}
        intensity={1.7}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-near={1}
        shadow-camera-far={80}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
      />

      <Suspense fallback={null}>
        {/* A-steps wrap this in <SheetProvider sheet={sheet}> for authored
            (Theatre) camera moves; the scaffold is ready in three/theatre.js. */}
        <ActiveStoryline />
      </Suspense>

      {!prefersReducedMotion && <CameraFx />}
      {fx && <PostFx post={post} enabled={fx} />}
    </Canvas>
  );
}
