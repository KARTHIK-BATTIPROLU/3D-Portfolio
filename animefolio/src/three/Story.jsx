// ============================================================================
// Story — the character + dialogue layer (Step 9).
//
//   <Guide>        a floating companion ("Pixel") that follows the player in
//                  BOTH worlds and speaks each beat's transition line, then
//                  hands off to the local NPC.
//   <StoryNPC>     a procedural creature at a place; speaks its lines when that
//                  beat is active.
//   <DialogueBubble> drei Html on a character: typewriter, click/tap or Enter to
//                  advance, ✕/Esc to dismiss. Non-blocking + always skippable.
//   <StoryDirector> non-visual: plays each beat's story once per visit and owns
//                  the advance/dismiss keys.
//
// All dialogue text comes from src/data/story.js (which pulls portfolio facts).
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

import { playerPos } from "./player.js";
import { useStore } from "../store/useStore.js";
import { GUIDE, STORY_BY_BEAT, buildSteps } from "../data/story.js";

const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ----------------------------------------------------------------------------
// DialogueBubble — the speech bubble + typewriter, attached to a character.
// ----------------------------------------------------------------------------
function DialogueBubble({ name, color, text, step, total, onAdvance, onDismiss, headY = 1.8 }) {
  const [shown, setShown] = useState(prefersReducedMotion ? text : "");
  const [done, setDone] = useState(prefersReducedMotion);

  useEffect(() => {
    if (prefersReducedMotion) {
      setShown(text);
      setDone(true);
      return;
    }
    setShown("");
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setDone(true);
      }
    }, 24);
    return () => clearInterval(id);
  }, [text]);

  const onClick = (e) => {
    e.stopPropagation();
    if (!done) {
      setShown(text);
      setDone(true);
    } else {
      onAdvance();
    }
  };

  const isLast = step + 1 >= total;

  return (
    <Html position={[0, headY, 0]} center distanceFactor={9} zIndexRange={[30, 0]} style={{ pointerEvents: "auto" }}>
      <div className="npc-bubble" onClick={onClick} style={{ borderColor: color }}>
        <div className="npc-name" style={{ color }}>
          {name}
        </div>
        <div className="npc-text">{shown}</div>
        <div className="npc-foot">
          <span className="npc-hint">{!done ? "…" : isLast ? "done ✓" : "click ▸"}</span>
          <button
            className="npc-skip"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
          >
            skip ✕
          </button>
        </div>
      </div>
    </Html>
  );
}

// ----------------------------------------------------------------------------
// Procedural placeholder creatures (swap for an original glb later).
// ----------------------------------------------------------------------------
const _w = new THREE.Vector3();

function NpcModel({ color }) {
  const ref = useRef();
  const t = useRef(Math.random() * 10);
  useFrame((_, dt) => {
    t.current += dt;
    const g = ref.current;
    if (!g) return;
    g.position.y = 0.7 + Math.sin(t.current * 2) * 0.07;
    // gently turn to face the player
    g.getWorldPosition(_w);
    const yaw = Math.atan2(playerPos.x - _w.x, playerPos.z - _w.z);
    let d = yaw - g.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    g.rotation.y += d * Math.min(1, dt * 6);
  });
  return (
    <group ref={ref} position={[0, 0.7, 0]}>
      {/* body */}
      <mesh castShadow>
        <capsuleGeometry args={[0.32, 0.5, 6, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} roughness={0.5} />
      </mesh>
      {/* belly */}
      <mesh position={[0, -0.05, 0.26]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#0a0f1e" roughness={0.7} />
      </mesh>
      {/* eyes */}
      {[-0.13, 0.13].map((x, i) => (
        <mesh key={i} position={[x, 0.18, 0.3]}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshStandardMaterial color="#ffffff" emissive="#cfeaff" emissiveIntensity={0.8} />
        </mesh>
      ))}
      {/* ears */}
      {[-0.2, 0.2].map((x, i) => (
        <mesh key={i} position={[x, 0.5, 0]} rotation={[0, 0, x < 0 ? 0.4 : -0.4]} castShadow>
          <coneGeometry args={[0.1, 0.34, 12]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function GuideModel() {
  const ref = useRef();
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    if (ref.current) ref.current.rotation.y += dt * 0.8;
  });
  return (
    <group>
      {/* glowing core */}
      <mesh ref={ref}>
        <icosahedronGeometry args={[0.28, 0]} />
        <meshStandardMaterial color={GUIDE.color} emissive={GUIDE.color} emissiveIntensity={1.4} flatShading />
      </mesh>
      {/* halo ring */}
      <mesh rotation={[Math.PI / 2.4, 0, 0]}>
        <torusGeometry args={[0.42, 0.03, 10, 32]} />
        <meshStandardMaterial color={GUIDE.color} emissive={GUIDE.color} emissiveIntensity={1} transparent opacity={0.8} />
      </mesh>
      <pointLight color={GUIDE.color} intensity={6} distance={6} />
    </group>
  );
}

// ----------------------------------------------------------------------------
// Guide — follows the player; speaks the guide steps of the active beat.
// ----------------------------------------------------------------------------
const _target = new THREE.Vector3();

export function Guide() {
  const ref = useRef();
  const t = useRef(0);
  const story = useStore((s) => s.story);
  const advanceStory = useStore((s) => s.advanceStory);
  const dismissStory = useStore((s) => s.dismissStory);

  useFrame((_, dt) => {
    t.current += dt;
    const g = ref.current;
    if (!g) return;
    // Float high and toward the camera side so the bubble sits in clear sky
    // above the content boards (board tops are ≈3.8 world units).
    _target.set(
      playerPos.x + 1.4,
      playerPos.y + 3.0 + Math.sin(t.current * 2) * 0.12,
      playerPos.z + 1.4
    );
    g.position.lerp(_target, 1 - Math.pow(0.002, dt));
  });

  const cur = story?.steps[story.step];
  const show = cur?.speaker === "guide";

  return (
    <group ref={ref}>
      <GuideModel />
      {show && (
        <DialogueBubble
          name={GUIDE.name}
          color={GUIDE.color}
          text={cur.text}
          step={story.step}
          total={story.steps.length}
          onAdvance={advanceStory}
          onDismiss={dismissStory}
          headY={1.3}
        />
      )}
    </group>
  );
}

// ----------------------------------------------------------------------------
// StoryNPC — a creature at a place; speaks the NPC steps of its beat.
// ----------------------------------------------------------------------------
export function StoryNPC({ beat, position = [0, 0, 0] }) {
  const entry = STORY_BY_BEAT[beat];
  const story = useStore((s) => s.story);
  const advanceStory = useStore((s) => s.advanceStory);
  const dismissStory = useStore((s) => s.dismissStory);
  if (!entry) return null;

  const cur = story?.steps[story.step];
  const show = story?.beat === beat && cur?.speaker === "npc";

  return (
    <group position={position}>
      <NpcModel color={entry.npc.color} />
      {show && (
        <DialogueBubble
          name={entry.npc.name}
          color={entry.npc.color}
          text={cur.text}
          step={story.step}
          total={story.steps.length}
          onAdvance={advanceStory}
          onDismiss={dismissStory}
          headY={1.7}
        />
      )}
    </group>
  );
}

// ----------------------------------------------------------------------------
// StoryDirector — non-visual. Plays each beat's story once per visit and owns
// the advance/dismiss keys. Mount once (in App).
// ----------------------------------------------------------------------------
export function StoryDirector() {
  const entered = useStore((s) => s.entered);
  const beat = useStore((s) => s.currentBeat);

  // Drive the per-beat story: dismiss whatever was showing when the player moves
  // on, then start this beat's story the first time it's reached.
  useEffect(() => {
    if (!entered) return;
    const st = useStore.getState();
    // player moved on → auto-dismiss the previous beat's dialogue
    if (st.story && st.story.beat !== beat) st.dismissStory();
    if (!beat || st.seenStory.includes(beat)) return;
    const steps = buildSteps(beat);
    if (steps) st.startStory(beat, steps);
  }, [entered, beat]);

  // keyboard: Enter advances, Esc dismisses (only while a story is playing)
  useEffect(() => {
    const onKey = (e) => {
      const st = useStore.getState();
      if (!st.story) return;
      if (e.key === "Enter") {
        e.preventDefault();
        st.advanceStory();
      } else if (e.key === "Escape") {
        st.dismissStory();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return null;
}
