// ============================================================================
// CreatureMascot — Voltie, Creature Quest's original spark-fox (CC0 stand-in:
// Khronos Fox, see data/assets.js + HUMAN_TODO.md for the swap-in path).
// Blends Survey (idle) / Run based on `stateRef`. Identical rig contract to
// the old FoxCreature — only the in-fiction identity changed (data/quest.js).
// ============================================================================

import { useEffect, useRef } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { assets, DRACO_PATH } from "../../data/assets.js";

const URL = assets.modelFox.path;
const CLIP = { idle: "Survey", walk: "Walk", run: "Run" };

export default function CreatureMascot({ stateRef }) {
  const group = useRef();
  const { scene, animations } = useGLTF(URL, DRACO_PATH);
  const { actions, names } = useAnimations(animations, group);
  const currentName = useRef(null);

  useEffect(() => {
    scene.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
  }, [scene]);

  useEffect(() => {
    const start = actions[CLIP.run] ? CLIP.run : names[0];
    actions[start]?.reset().fadeIn(0.3).play();
    currentName.current = start;
    return () => Object.values(actions).forEach((a) => a?.stop());
  }, [actions, names]);

  useFrame(() => {
    const state = stateRef?.current || "run";
    const want = actions[CLIP[state]] ? CLIP[state] : names[0];
    if (!want || want === currentName.current) return;
    actions[want]?.reset().fadeIn(0.25).play();
    if (currentName.current) actions[currentName.current]?.fadeOut(0.25);
    currentName.current = want;
  });

  // Fox is modelled large and faces +Z; scale/rotation may need a tweak.
  return (
    <group ref={group} scale={0.025} rotation={[0, 0, 0]}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload(URL, DRACO_PATH);
