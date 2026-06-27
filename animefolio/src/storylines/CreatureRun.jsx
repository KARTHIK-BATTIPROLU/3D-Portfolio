// ============================================================================
// CreatureRun — Storyline 2 (navMode: 'scroll').
//
// A rigged creature (CC0 Fox stand-in) runs a path mapped to scroll progress,
// with a particle trail. Step 8: the same content is now told IN the world as
// the runner passes through it — a start arch (intro), a creature market of
// banners (skills), biome signposts (experience), project shrines with stone
// tablets, a training ground (education) and a journey's-end board (contact).
// Surfaces reveal as the runner reaches them; dense content opens a terminal.
// ============================================================================

import { Suspense, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { useStore } from "../store/useStore.js";
import { BEATS } from "../data/beats.js";
import { portfolio } from "../data/portfolio.js";
import { prettyLabel } from "../components/BeatContent.jsx";
import ModelBoundary from "../three/ModelBoundary.jsx";
import FoxCreature from "../three/models/FoxCreature.jsx";
import { setPlayerPos } from "../three/player.js";
import { setFocus } from "../three/cameraRig.js";
import Particles from "../three/Particles.jsx";
import {
  Billboard,
  Plaque,
  Marker,
  Inspectable,
  InspectTerminal,
} from "../three/Surfaces.jsx";
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

// point along the path with a sideways offset + vertical lift.
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
// Placeholder creature (fallback if the glTF fails) — the Step-3 blob.
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
        <meshStandardMaterial color="#33d6c0" roughness={0.5} metalness={0.1} />
      </mesh>
      <mesh position={[0, -0.05, 0.42]}>
        <sphereGeometry args={[0.42, 20, 20]} />
        <meshStandardMaterial color="#e9fffb" roughness={0.6} />
      </mesh>
      {[-0.28, 0.28].map((x, i) => (
        <mesh key={i} position={[x, 0.62, 0]} rotation={[0, 0, x < 0 ? 0.3 : -0.3]} castShadow>
          <coneGeometry args={[0.13, 0.55, 14]} />
          <meshStandardMaterial color="#2bbfaa" />
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

// ----------------------------------------------------------------------------
// The runner — places + faces along the path, drives the model's run/idle
// state, shares its position (trail + in-world reveal).
// ----------------------------------------------------------------------------
function Creature({ posRef }) {
  const rootRef = useRef();
  const smooth = useRef(0);
  const stateRef = useRef("run");
  const { camera } = useThree();

  const setBeat = useStore((s) => s.setBeat);
  const setFocusedProject = useStore((s) => s.setFocusedProject);
  const lastBeat = useRef(-1);
  const lastFocus = useRef(-1);

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
      if (beatId !== "projects") {
        lastFocus.current = -1;
        setFocusedProject(null);
      }
    }
    if (beatId === "projects") {
      const sub = THREE.MathUtils.clamp((p - beatIndex / N) / (1 / N), 0, 0.999);
      const idx = Math.floor(sub * portfolio.projects.length);
      if (idx !== lastFocus.current) {
        lastFocus.current = idx;
        setFocusedProject(idx);
      }
    }
  });

  return (
    <group ref={rootRef}>
      <Suspense fallback={<PlaceholderCreature />}>
        <ModelBoundary fallback={<PlaceholderCreature />}>
          <FoxCreature stateRef={stateRef} />
        </ModelBoundary>
      </Suspense>
    </group>
  );
}

// ----------------------------------------------------------------------------
// Particle trail following the creature.
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
        color="#ffd166"
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

// All the per-beat content surfaces (projects handled separately).
function Encounters() {
  const idx = (id) => BEATS.findIndex((b) => b.id === id);

  return (
    <>
      {/* INTRO — start arch */}
      <group>
        <Gate position={[beatPoint(idx("intro")).x, 0, beatPoint(idx("intro")).z]} color={BEAT_COLORS.intro} />
        <mesh position={[0, 3, beatPoint(idx("intro")).z]} castShadow>
          <torusGeometry args={[3, 0.16, 12, 40, Math.PI]} />
          <meshStandardMaterial color={BEAT_COLORS.intro} emissive={BEAT_COLORS.intro} emissiveIntensity={0.7} />
        </mesh>
        <Billboard
          position={alongPath((idx("intro") + 0.5) / N, 0, 2.6)}
          width={5.4}
          height={2.2}
          color={BEAT_COLORS.intro}
          heading={portfolio.name}
          headingSize={0.48}
          lines={[portfolio.headline, `📍 ${portfolio.location}`]}
          bodySize={0.24}
          near={8}
          far={20}
          faceCamera
        />
        <Marker position={alongPath((idx("intro") + 0.5) / N, 0, 5)} color={BEAT_COLORS.intro} size={0.6} near={20} far={46}>
          START
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

      {/* EXPERIENCE — biome signposts */}
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
          THE ROAD SO FAR
        </Marker>
      </group>

      {/* EDUCATION — training ground plaques */}
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

      {/* CONTACT — journey's-end board */}
      <group>
        <Gate position={[beatPoint(idx("contact")).x, 0, beatPoint(idx("contact")).z]} color={BEAT_COLORS.contact} />
        <mesh position={[0, 2.6, beatPoint(idx("contact")).z]}>
          <torusGeometry args={[1.8, 0.22, 18, 44]} />
          <meshStandardMaterial color={BEAT_COLORS.contact} emissive={BEAT_COLORS.contact} emissiveIntensity={1} />
        </mesh>
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

// Projects = a row of "shrine" monoliths with stone-tablet descriptions.
function ProjectShrines() {
  const projectsIndex = BEATS.findIndex((b) => b.id === "projects");
  const color = BEAT_COLORS.projects;
  const count = portfolio.projects.length;

  return (
    <>
      {portfolio.projects.map((proj, j) => {
        const t = (projectsIndex + (j + 0.5) / count) / N;
        const side = j % 2 === 0 ? 1 : -1;
        const pos = alongPath(t, 3 * side, 0);
        const h = 2.5 + j * 0.6;

        return (
          <group key={proj.name} position={pos}>
            {/* monolith */}
            <mesh position={[0, h / 2, 0]} castShadow>
              <boxGeometry args={[1.6, h, 1.6]} />
              <meshStandardMaterial
                color={proj.flagship ? "#ff5d8f" : color}
                emissive={proj.flagship ? "#ff5d8f" : color}
                emissiveIntensity={0.3}
                metalness={0.5}
                roughness={0.35}
              />
            </mesh>
            <mesh position={[0, h + 0.4, 0]}>
              <icosahedronGeometry args={[0.45, 0]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} flatShading />
            </mesh>
            {/* stone tablet description */}
            <Inspectable id={`proj-${j}`} beat="projects" title={`PROJECT · ${proj.name}`} range={6} offsetY={h + 1}>
              <Plaque
                position={[0, h / 2, 1.2]}
                width={3.2}
                height={2.2}
                color={proj.flagship ? "#ff5d8f" : color}
                heading={`${proj.flagship ? "★ " : ""}${proj.name}`}
                headingSize={0.24}
                lines={[proj.blurb.length > 140 ? proj.blurb.slice(0, 137) + "…" : proj.blurb, "", proj.status]}
                bodySize={0.17}
                near={6}
                far={14}
                faceCamera
              />
            </Inspectable>
          </group>
        );
      })}
      <Marker position={alongPath((projectsIndex + 0.5) / N, 0, 6)} color={color} size={0.6} near={20} far={48}>
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
// CreatureRun root
// ============================================================================
export default function CreatureRun() {
  const posRef = useRef(null);

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
      <Encounters />
      <ProjectShrines />
      <Creature posRef={posRef} />
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
