// ============================================================================
// AvatarRPM — Karthik's avatar (the "Trainer" in Creature Quest, the roaming
// character in Metaverse). CC0 stand-in: three.js RobotExpressive. Swap for a
// Ready Player Me export later — see data/assets.js + HUMAN_TODO.md.
// Blends Idle / Walking / Running based on the `stateRef` the controller sets.
// ============================================================================

import { useEffect, useRef } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { assets, DRACO_PATH } from "../../data/assets.js";

const URL = assets.modelRobot.path;
const CLIP = { idle: "Idle", walk: "Walking", run: "Running" };

export default function AvatarRPM({ stateRef }) {
  const group = useRef();
  const { scene, animations } = useGLTF(URL, DRACO_PATH);
  const { actions, names } = useAnimations(animations, group);
  const currentName = useRef(null);

  // Shadows on the imported meshes.
  useEffect(() => {
    scene.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
  }, [scene]);

  // Start in idle (fall back to the first available clip).
  useEffect(() => {
    const start = actions[CLIP.idle] ? CLIP.idle : names[0];
    actions[start]?.reset().fadeIn(0.3).play();
    currentName.current = start;
    return () => Object.values(actions).forEach((a) => a?.stop());
  }, [actions, names]);

  // Crossfade to the clip for the current movement state.
  useFrame(() => {
    const state = stateRef?.current || "idle";
    const want = actions[CLIP[state]] ? CLIP[state] : names[0];
    if (!want || want === currentName.current) return;
    actions[want]?.reset().fadeIn(0.25).play();
    if (currentName.current) actions[currentName.current]?.fadeOut(0.25);
    currentName.current = want;
  });

  // scale / rotation are the two values most likely to need a tweak.
  return (
    <group ref={group} position={[0, -0.9, 0]} scale={0.45} rotation={[0, 0, 0]}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload(URL, DRACO_PATH);
