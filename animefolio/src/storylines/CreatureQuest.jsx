// ============================================================================
// CreatureQuest — Storyline 2 (navMode: 'scroll'), original-IP monster-battler.
//
// Voltie (an original spark-fox, data/quest.js) hops onto the Trainer's
// shoulder and the journey begins. Scroll carries them through biomes —
// friendly encounters tell intro/about/skills/experience/education/contact —
// and each PROJECT is a wild-encounter battle: pick a move (=a project,
// original name) to beat a discipline opponent (=a skill domain). Farm India
// is the boss; defeating it awards a badge. No Pokémon names/designs/assets
// anywhere — see data/quest.js for the original naming layer.
// ============================================================================

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

import { useStore } from "../store/useStore.js";
import { BEATS } from "../data/beats.js";
import { portfolio } from "../data/portfolio.js";
import { CREATURE, TRAINER, BATTLES } from "../data/quest.js";
import { prettyLabel } from "../components/BeatContent.jsx";
import ModelBoundary from "../three/ModelBoundary.jsx";
import CreatureMascot from "../three/models/CreatureMascot.jsx";
import AvatarRPM from "../three/models/AvatarRPM.jsx";
import BattleScene from "../three/BattleScene.jsx";
import { playerPos, setPlayerPos } from "../three/player.js";
import { setFocus } from "../three/cameraRig.js";
import Particles from "../three/Particles.jsx";
import { Billboard, Plaque, Marker, Inspectable, InspectTerminal } from "../three/Surfaces.jsx";
import { Guide, StoryNPC } from "../three/Story.jsx";

// The run path (gentle S-curve heading into -Z).
const PATH = new THREE.CatmullRomCurve3(
  [
    [0, 0, 12],
    [6, 0, -15],
    [-6, 0, -42],
    [5, 0, -70],
    [-5, 0, -100],
    [6, 0, -130],
    [-4, 0, -160],
    [0, 0, -190],
  ].map((p) => new THREE.Vector3(...p))
);
const N = BEATS.length;

const BEAT_COLORS = {
  intro: "#33d6c0",
  about: "#9d4edd",
  skills: "#06d6a0",
  experience: "#ff006e",
  projects: "#ff8c42",
  education: "#ffd60a",
  contact: "#06ffa5",
};

const beatPoint = (i) => PATH.getPoint((i + 0.5) / N);
const cleanDate = (v) => (!v || /confirm/i.test(v) ? "" : String(v).replace(/\/\/.*$/, "").trim());

const _tan = new THREE.Vector3();
const _perp = new THREE.Vector3();
function alongPath(t, side = 0, lift = 0) {
  const tt = THREE.MathUtils.clamp(t, 0, 1);
  const pt = PATH.getPoint(tt);
  _tan.copy(PATH.getTangent(tt));
  _perp.set(-_tan.z, 0, _tan.x).normalize();
  return [pt.x + _perp.x * side, pt.y + lift, pt.z + _perp.z * side];
}

// ----------------------------------------------------------------------------
// Placeholder creature (fallback if the glTF fails) — Voltie's stand-in blob.
// ----------------------------------------------------------------------------
function PlaceholderCreature() {
  const bodyRef = useRef();
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    if (bodyRef.current) {
      bodyRef.current.position.y = 0.65 + Math.abs(Math.sin(t.current * 9)) * 0.18;
      bodyRef.current.rotation.z = Math.sin(t.current * 9) * 0.06;
    }
  });
  return (
    <group ref={bodyRef} position={[0, 0.65, 0]}>
      <mesh castShadow>
        <sphereGeometry args={[0.6, 28, 28]} />
        <meshStandardMaterial color={CREATURE.color} roughness={0.5} metalness={0.1} />
      </mesh>
      <mesh position={[0, -0.05, 0.42]}>
        <sphereGeometry args={[0.42, 20, 20]} />
        <meshStandardMaterial color="#fff6d6" roughness={0.6} />
      </mesh>
      {[-0.28, 0.28].map((x, i) => (
        <mesh key={i} position={[x, 0.62, 0]} rotation={[0, 0, x < 0 ? 0.3 : -0.3]} castShadow>
          <coneGeometry args={[0.13, 0.55, 14]} />
          <meshStandardMaterial color="#d6a40f" />
        </mesh>
      ))}
      {[-0.2, 0.2].map((x, i) => (
        <mesh key={i} position={[x, 0.15, 0.52]}>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshStandardMaterial color="#0a0a14" />
        </mesh>
      ))}
    </group>
  );
}

function PlaceholderTrainer() {
  return (
    <mesh castShadow>
      <capsuleGeometry args={[0.4, 1.0, 8, 16]} />
      <meshStandardMaterial color={TRAINER.color} emissive={TRAINER.color} emissiveIntensity={0.2} metalness={0.4} roughness={0.5} />
    </mesh>
  );
}

// ----------------------------------------------------------------------------
// The runner — places + faces along the path, drives the model's run/idle
// state, shares its position (trail + in-world reveal). The Trainer walks a
// half-step behind/beside; Voltie rides the shoulder until the first beat,
// then leaps down and runs ahead for the rest of the journey.
// ----------------------------------------------------------------------------
function Travelers({ posRef }) {
  const rootRef = useRef();
  const trainerRef = useRef();
  const creatureGroupRef = useRef();
  const smooth = useRef(0);
  const stateRef = useRef("run");
  const { camera } = useThree();

  const setBeat = useStore((s) => s.setBeat);
  const setFocusedProject = useStore((s) => s.setFocusedProject);
  const lastBeat = useRef(-1);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const target = useStore.getState().scrollProgress;
    smooth.current += (target - smooth.current) * 0.08;
    const p = THREE.MathUtils.clamp(smooth.current, 0, 1);

    const point = PATH.getPoint(p);
    const tangent = PATH.getTangent(p);

    if (rootRef.current) {
      rootRef.current.position.set(point.x, point.y, point.z);
      rootRef.current.rotation.y = Math.atan2(tangent.x, tangent.z);
    }

    // Voltie: on the shoulder for the intro beat, running a stride ahead after.
    const hoppedOff = p > 1 / N;
    if (creatureGroupRef.current) {
      if (hoppedOff) {
        creatureGroupRef.current.position.set(1.1, 0, 1.6);
        creatureGroupRef.current.rotation.y = 0;
      } else {
        creatureGroupRef.current.position.set(0.32, 1.0, -0.18); // perched on the shoulder
        creatureGroupRef.current.rotation.y = Math.PI;
      }
    }
    if (trainerRef.current) trainerRef.current.position.set(-0.25, 0, 0.15);

    if (posRef) posRef.current = point;
    setPlayerPos(point.x, point.y, point.z); // share with in-world surfaces
    setFocus(point.x, point.y + 0.8, point.z); // depth-of-field tracks the runner
    stateRef.current = Math.abs(target - smooth.current) > 0.0008 ? "run" : "idle";

    // Side/behind chase-cam.
    const perp = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    camera.position.lerp(
      new THREE.Vector3(
        point.x - tangent.x * 8 + perp.x * 3,
        point.y + 3.6,
        point.z - tangent.z * 8 + perp.z * 3
      ),
      1 - Math.pow(0.002, dt)
    );
    camera.lookAt(point.x + tangent.x * 4, point.y + 0.9, point.z + tangent.z * 4);

    // Encounter → beat.
    const beatIndex = THREE.MathUtils.clamp(Math.floor(p * N), 0, N - 1);
    const beatId = BEATS[beatIndex].id;
    if (beatIndex !== lastBeat.current) {
      lastBeat.current = beatIndex;
      setBeat(beatId);
      if (beatId !== "projects") setFocusedProject(null);
    }
  });

  return (
    <group ref={rootRef}>
      <group ref={trainerRef}>
        <Suspense fallback={<PlaceholderTrainer />}>
          <ModelBoundary fallback={<PlaceholderTrainer />}>
            <AvatarRPM stateRef={stateRef} />
          </ModelBoundary>
        </Suspense>
      </group>
      <group ref={creatureGroupRef}>
        <Suspense fallback={<PlaceholderCreature />}>
          <ModelBoundary fallback={<PlaceholderCreature />}>
            <CreatureMascot stateRef={stateRef} />
          </ModelBoundary>
        </Suspense>
      </group>
    </group>
  );
}

// ----------------------------------------------------------------------------
// Particle trail following the travelers.
// ----------------------------------------------------------------------------
function Trail({ posRef }) {
  const COUNT = 48;
  const ref = useRef();
  const arr = useRef(null);
  if (!arr.current) {
    arr.current = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      arr.current[i * 3 + 1] = 0.5;
      arr.current[i * 3 + 2] = 12;
    }
  }
  const head = useRef(0);

  useFrame(() => {
    const p = posRef.current;
    if (!p || !ref.current) return;
    const i = (head.current % COUNT) * 3;
    arr.current[i] = p.x;
    arr.current[i + 1] = (p.y ?? 0) + 0.5;
    arr.current[i + 2] = p.z;
    head.current++;
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={COUNT} array={arr.current} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.28}
        color={CREATURE.color}
        transparent
        opacity={0.7}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ----------------------------------------------------------------------------
// Track ribbon
// ----------------------------------------------------------------------------
function Track() {
  const segments = useMemo(() => {
    const pts = PATH.getPoints(90);
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const dir = new THREE.Vector3().subVectors(b, a);
      out.push({
        position: [(a.x + b.x) / 2, 0.02, (a.z + b.z) / 2],
        rotZ: Math.atan2(dir.x, dir.z),
        length: a.distanceTo(b) + 0.1,
      });
    }
    return out;
  }, []);

  return (
    <group>
      {segments.map((s, i) => (
        <mesh key={i} position={s.position} rotation={[-Math.PI / 2, 0, s.rotZ]} receiveShadow>
          <planeGeometry args={[5, s.length]} />
          <meshStandardMaterial color="#241a3a" roughness={0.9} metalness={0.05} />
        </mesh>
      ))}
    </group>
  );
}

// A glowing landmark gate (pillar + ground ring) at a beat point.
function Gate({ position, color }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.4, 2.7, 40]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} side={THREE.DoubleSide} />
      </mesh>
      {[-2.6, 2.6].map((x, i) => (
        <mesh key={i} position={[x, 1.5, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.16, 3, 12]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

// All the per-beat content surfaces except projects (handled by BattleEncounters).
function Encounters({ badges }) {
  const idx = (id) => BEATS.findIndex((b) => b.id === id);

  return (
    <>
      {/* INTRO — start arch, the hop-on moment */}
      <group>
        <Gate position={[beatPoint(idx("intro")).x, 0, beatPoint(idx("intro")).z]} color={BEAT_COLORS.intro} />
        <mesh position={[0, 3, beatPoint(idx("intro")).z]} castShadow>
          <torusGeometry args={[3, 0.16, 12, 40, Math.PI]} />
          <meshStandardMaterial color={BEAT_COLORS.intro} emissive={BEAT_COLORS.intro} emissiveIntensity={0.7} />
        </mesh>
        <Billboard
          position={alongPath((idx("intro") + 0.5) / N, 0, 2.6)}
          width={5.4}
          height={2.4}
          color={BEAT_COLORS.intro}
          heading={portfolio.name}
          headingSize={0.44}
          lines={[portfolio.headline, `${TRAINER.name} & ${CREATURE.name} — ${CREATURE.species}`]}
          bodySize={0.22}
          near={8}
          far={20}
          faceCamera
        />
        <Marker position={alongPath((idx("intro") + 0.5) / N, 0, 5)} color={BEAT_COLORS.intro} size={0.6} near={20} far={46}>
          {`${CREATURE.name} HOPS ON`}
        </Marker>
      </group>

      {/* ABOUT — wayside banner */}
      <group>
        <Gate position={[beatPoint(idx("about")).x, 0, beatPoint(idx("about")).z]} color={BEAT_COLORS.about} />
        <Plaque
          position={alongPath((idx("about") + 0.5) / N, 0, 2.4)}
          width={4}
          height={2.4}
          color={BEAT_COLORS.about}
          heading="About"
          headingSize={0.3}
          lines={[portfolio.about]}
          bodySize={0.2}
          near={8}
          far={18}
          faceCamera
        />
      </group>

      {/* SKILLS — creature market of banner stalls */}
      <group>
        <Gate position={[beatPoint(idx("skills")).x, 0, beatPoint(idx("skills")).z]} color={BEAT_COLORS.skills} />
        {Object.entries(portfolio.skills).map(([key, arr], j, all) => {
          const t = (idx("skills") + (j + 0.5) / all.length) / N;
          const side = (j % 2 === 0 ? -1 : 1) * 3.6;
          return (
            <Billboard
              key={key}
              position={alongPath(t, side, 2.2)}
              width={3.4}
              height={2.4}
              color={BEAT_COLORS.skills}
              heading={prettyLabel(key)}
              headingSize={0.36}
              lines={arr}
              bodySize={0.24}
              near={6}
              far={14}
              faceCamera
            />
          );
        })}
        <Inspectable id="skills" beat="skills" title="SKILLS · full stack + certs" range={7} offsetY={2.8}>
          <Marker position={alongPath((idx("skills") + 0.5) / N, 0, 4.5)} color={BEAT_COLORS.skills} size={0.56} near={18} far={42}>
            {"THE TOOLYARD\npress E to inspect"}
          </Marker>
        </Inspectable>
      </group>

      {/* EXPERIENCE — chapters of the journey */}
      <group>
        <Gate position={[beatPoint(idx("experience")).x, 0, beatPoint(idx("experience")).z]} color={BEAT_COLORS.experience} />
        {portfolio.experience.map((e, j) => {
          const t = (idx("experience") + (j + 0.5) / portfolio.experience.length) / N;
          const side = (j % 2 === 0 ? 1 : -1) * 3.4;
          return (
            <Billboard
              key={j}
              position={alongPath(t, side, 2.1)}
              width={3.6}
              height={2}
              color={BEAT_COLORS.experience}
              heading={e.role}
              headingSize={0.32}
              lines={[e.org, cleanDate(e.dates), e.note || ""]}
              bodySize={0.2}
              near={6}
              far={14}
              faceCamera
            />
          );
        })}
        <Marker position={alongPath((idx("experience") + 0.5) / N, 0, 5)} color={BEAT_COLORS.experience} size={0.56} near={18} far={42}>
          CHAPTERS SO FAR
        </Marker>
      </group>

      {/* EDUCATION — the academy */}
      <group>
        <Gate position={[beatPoint(idx("education")).x, 0, beatPoint(idx("education")).z]} color={BEAT_COLORS.education} />
        {portfolio.education.map((ed, j) => {
          const t = (idx("education") + (j + 0.5) / portfolio.education.length) / N;
          const side = (j % 2 === 0 ? -1 : 1) * 3.4;
          return (
            <Plaque
              key={j}
              position={alongPath(t, side, 2)}
              width={3.4}
              height={2.2}
              color={BEAT_COLORS.education}
              heading={ed.school}
              headingSize={0.22}
              lines={[ed.degree, ed.note || "", cleanDate(ed.dates)]}
              bodySize={0.17}
              near={6}
              far={14}
              faceCamera
            />
          );
        })}
        <Marker position={alongPath((idx("education") + 0.5) / N, 0, 5)} color={BEAT_COLORS.education} size={0.56} near={18} far={42}>
          THE ACADEMY
        </Marker>
      </group>

      {/* CONTACT — the send-off, badges collected */}
      <group>
        <Gate position={[beatPoint(idx("contact")).x, 0, beatPoint(idx("contact")).z]} color={BEAT_COLORS.contact} />
        <mesh position={[0, 2.6, beatPoint(idx("contact")).z]}>
          <torusGeometry args={[1.8, 0.22, 18, 44]} />
          <meshStandardMaterial color={BEAT_COLORS.contact} emissive={BEAT_COLORS.contact} emissiveIntensity={1} />
        </mesh>
        <Plaque
          position={alongPath((idx("contact") + 0.5) / N, -3, 2.2)}
          width={3.2}
          height={2}
          color="#ffd60a"
          heading="Badges earned"
          headingSize={0.22}
          lines={badges.length ? badges : ["Battle through the build sites to earn one."]}
          bodySize={0.18}
          near={8}
          far={18}
          faceCamera
        />
        <Inspectable id="contact" beat="contact" title="CONTACT · let's connect" range={7} offsetY={2.8}>
          <Billboard
            position={alongPath((idx("contact") + 0.5) / N, 0, 2.6)}
            width={4.6}
            height={2.4}
            color={BEAT_COLORS.contact}
            heading="Let's Connect"
            headingSize={0.4}
            lines={[`📧 ${portfolio.email}`, `💼 ${portfolio.linkedin.replace(/^https?:\/\//, "")}`, `📍 ${portfolio.location}`]}
            bodySize={0.22}
            near={8}
            far={18}
            faceCamera
          />
        </Inspectable>
      </group>
    </>
  );
}

// ----------------------------------------------------------------------------
// BattleEncounters — projects = wild-encounter battles (3.3/3.4). A small
// opponent creature stands at each spot; step close and a "⚔ Battle" chip
// appears. Win → that project's content reveals + (if boss) a badge.
// ----------------------------------------------------------------------------
function OpponentModel({ color }) {
  const ref = useRef();
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 1.2;
  });
  return (
    <group position={[0, 0.9, 0]}>
      <mesh ref={ref} castShadow>
        <octahedronGeometry args={[0.55, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} flatShading />
      </mesh>
      <pointLight color={color} intensity={4} distance={5} />
    </group>
  );
}

// A battle's own proximity + "⚔ Battle (E)" chip — deliberately NOT using
// <Inspectable>, whose E key is hardwired to the generic project terminal.
// Pressing E here must open the actual turn-based BattleScene instead.
const _bp = new THREE.Vector3();
function BattleSpot({ battle, isDefeated, isOpen, onOpen, onClose }) {
  const ref = useRef();
  const nearRef = useRef(false);
  const [showChip, setShowChip] = useState(false);

  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    g.getWorldPosition(_bp);
    const now = playerPos.distanceTo(_bp) < 5.5;
    nearRef.current = now;
    const want = now && !isDefeated;
    setShowChip((prev) => (prev === want ? prev : want));
  });

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "e" && e.key !== "E") return;
      if (!nearRef.current || isDefeated) return;
      if (isOpen) onClose();
      else onOpen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, isDefeated, onOpen, onClose]);

  return (
    <group ref={ref}>
      <OpponentModel color={isDefeated ? "#4a4a55" : battle.opponent.color} />
      <Marker position={[0, 1.9, 0]} color={battle.opponent.color} size={0.32} near={9} far={20}>
        {isDefeated ? `${battle.project.name}\n✓ defeated` : `${battle.opponent.name}\n⚔ press E to battle`}
      </Marker>
      {showChip && !isOpen && (
        <Html position={[0, 1.9, 0]} center distanceFactor={11} style={{ pointerEvents: "auto" }} zIndexRange={[18, 0]}>
          <button className="inspect-chip" onClick={(e) => { e.stopPropagation(); onOpen(); }}>
            ⚔ Battle <kbd>E</kbd>
          </button>
        </Html>
      )}
    </group>
  );
}

function BattleEncounters({ defeated, onWin, openId, setOpenId }) {
  const projectsIdx = BEATS.findIndex((b) => b.id === "projects");
  const count = BATTLES.length;

  return (
    <>
      {BATTLES.map((battle, j) => {
        const t = (projectsIdx + (j + 0.5) / count) / N;
        const side = j % 2 === 0 ? 1 : -1;
        const pos = alongPath(t, 3 * side, 0);
        const isDefeated = defeated.has(battle.id);
        const isOpen = openId === battle.id;

        return (
          <group key={battle.id} position={pos}>
            <BattleSpot
              battle={battle}
              isDefeated={isDefeated}
              isOpen={isOpen}
              onOpen={() => setOpenId(battle.id)}
              onClose={() => setOpenId(null)}
            />
            {isOpen && (
              <BattleScene
                battle={battle}
                unlockedMoves={BATTLES.filter((b) => defeated.has(b.id)).map((b) => b.move)}
                anchor={[0, 2.4, 0]}
                onWin={() => {
                  onWin(battle);
                  setOpenId(null);
                }}
                onClose={() => setOpenId(null)}
              />
            )}
          </group>
        );
      })}
      <Marker position={alongPath((projectsIdx + 0.5) / N, 0, 6)} color={BEAT_COLORS.projects} size={0.6} near={20} far={48}>
        THE BUILD SITES
      </Marker>
    </>
  );
}

function Scenery() {
  const posts = useMemo(() => {
    const pts = PATH.getPoints(16);
    return pts.map((pt, i) => {
      const tangent = PATH.getTangent(i / pts.length);
      const perp = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const side = i % 2 === 0 ? -1 : 1;
      return [pt.x + perp.x * 5 * side, 0, pt.z + perp.z * 5 * side];
    });
  }, []);

  return (
    <group>
      {posts.map((p, i) => (
        <group key={i} position={p}>
          <mesh position={[0, 1.6, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 3.2, 8]} />
            <meshStandardMaterial color="#2a2440" />
          </mesh>
          <mesh position={[0, 3.3, 0]}>
            <sphereGeometry args={[0.18, 12, 12]} />
            <meshStandardMaterial color="#c9a8ff" emissive="#c9a8ff" emissiveIntensity={1.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ============================================================================
// CreatureQuest root
// ============================================================================
export default function CreatureQuest() {
  const posRef = useRef(null);
  const [defeated, setDefeated] = useState(() => new Set());
  const [openId, setOpenId] = useState(null);
  const setFocusedProject = useStore((s) => s.setFocusedProject);

  const badges = useMemo(
    () => BATTLES.filter((b) => defeated.has(b.id) && b.badge).map((b) => `🏅 ${b.badge} — ${b.project.name}`),
    [defeated]
  );

  function handleWin(battle) {
    setDefeated((prev) => new Set(prev).add(battle.id));
    setFocusedProject(BATTLES.findIndex((b) => b.id === battle.id));
  }

  return (
    <group>
      <color attach="background" args={["#161226"]} />
      <fog attach="fog" args={["#161226", 22, 150]} />
      <pointLight position={[0, 12, -60]} intensity={120} color="#9d6bff" distance={120} />
      {/* richer mood lighting: cool hemisphere fill + a magenta rim */}
      <hemisphereLight args={["#6a5acd", "#0a0612", 0.5]} />
      <directionalLight position={[-8, 10, -20]} intensity={0.8} color="#ff7ad9" />

      {/* drifting motes for depth */}
      <Particles count={150} color="#c9a8ff" center={[0, 8, -90]} area={[60, 26, 240]} size={0.16} opacity={0.45} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, -90]} receiveShadow>
        <planeGeometry args={[220, 340]} />
        <meshStandardMaterial color="#0f0b1e" roughness={1} />
      </mesh>

      <Track />
      <Scenery />
      <Encounters badges={badges} />
      <BattleEncounters defeated={defeated} onWin={handleWin} openId={openId} setOpenId={setOpenId} />
      <Travelers posRef={posRef} />
      <Trail posRef={posRef} />

      {/* story layer — a local NPC beside the path at each beat + the guide */}
      {BEATS.map((b, i) => (
        <StoryNPC key={b.id} beat={b.id} position={alongPath((i + 0.5) / N, i % 2 ? 2.2 : -2.2, 0)} />
      ))}
      <Guide />

      {/* diegetic dense-content terminal (opens from any Inspectable) */}
      <InspectTerminal />
    </group>
  );
}
