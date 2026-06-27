// ============================================================================
// HubWorld — Storyline 1 (navMode: 'free-roam').
//
// A walkable hub: a kinematic capsule avatar (Rapier character controller) you
// steer with click-to-move OR WASD, with a damped third-person camera. Seven
// landmark zones map to content beats via proximity.
//
// Step 8: the floating cards are gone — every portfolio detail now lives IN the
// world on believable surfaces (welcome arch, skills street, tower rooms,
// trackside billboards, academy plaques, trophy plinth, contact kiosk) and
// reveals as you approach. Dense content opens a diegetic inspect terminal.
// ============================================================================

import { Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Physics,
  RigidBody,
  CapsuleCollider,
  CuboidCollider,
} from "@react-three/rapier";
import { useRapier } from "@react-three/rapier";
import { Environment, Instances, Instance } from "@react-three/drei";
import * as THREE from "three";

import { useStore } from "../store/useStore.js";
import { portfolio } from "../data/portfolio.js";
import { prettyLabel } from "../components/BeatContent.jsx";
import ModelBoundary from "../three/ModelBoundary.jsx";
import RobotAvatar from "../three/models/RobotAvatar.jsx";
import { touchInput } from "../three/input.js";
import { setPlayerPos } from "../three/player.js";
import { setFocus } from "../three/cameraRig.js";
import Particles from "../three/Particles.jsx";
import { EnergyMat } from "../three/shaders/EnergyMaterial.jsx";
import {
  Billboard,
  Plaque,
  Marker,
  Inspectable,
  InspectTerminal,
} from "../three/Surfaces.jsx";
import { Guide, StoryNPC } from "../three/Story.jsx";

// Where each beat's local NPC stands (near its landmark).
const NPC_SPOTS = {
  intro: [2.6, 0, 3.5],
  about: [11, 0, 5.5],
  skills: [-18, 0, 22],
  experience: [16, 0, -12],
  projects: [-14, 0, -14],
  education: [16, 0, 15],
  contact: [3, 0, 27],
};

// --- world layout -----------------------------------------------------------
const TOWER = { x: -18, z: -18 };
const LIFT_RADIUS = 3;
const GROUND_Y = 0.9; // avatar capsule resting centre height
const LIFT_TOP_Y = GROUND_Y + 8;
const LIFT_SPEED = 4;

const LANDMARKS = [
  { id: "plaza",   beat: "intro",      label: "Plaza · Intro",        pos: [0, 0, 4],     radius: 5, color: "#00d4ff" },
  { id: "statue",  beat: "about",      label: "Statue · About",       pos: [9, 0, 6],     radius: 4, color: "#9d4edd" },
  { id: "tower",   beat: "projects",   label: "Tower · Projects",     pos: [TOWER.x, 0, TOWER.z], radius: 8, color: "#ff8c42" },
  { id: "coaster", beat: "experience", label: "Coaster · Experience", pos: [20, 0, -16],  radius: 7, color: "#ff006e" },
  { id: "street",  beat: "skills",     label: "Street · Skills",      pos: [-20, 0, 16],  radius: 7, color: "#06d6a0" },
  { id: "academy", beat: "education",  label: "Academy · Education",  pos: [20, 0, 18],   radius: 6, color: "#ffd60a" },
  { id: "portal",  beat: "contact",    label: "Portal · Contact",     pos: [0, 0, 30],    radius: 5, color: "#06ffa5" },
];

const cleanDate = (v) => (!v || /confirm/i.test(v) ? "" : String(v).replace(/\/\/.*$/, "").trim());

// Placeholder avatar (fallback if the glTF fails to load).
function PlaceholderAvatar() {
  return (
    <>
      <mesh castShadow>
        <capsuleGeometry args={[0.4, 1.0, 8, 16]} />
        <meshStandardMaterial color="#667eea" emissive="#667eea" emissiveIntensity={0.25} metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.35, 0.42]}>
        <boxGeometry args={[0.3, 0.1, 0.06]} />
        <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={1.6} />
      </mesh>
    </>
  );
}

// ============================================================================
// Avatar + controller — the only piece that touches Rapier internals.
// ============================================================================
function Avatar({ moveTargetRef }) {
  const bodyRef = useRef();
  const meshRef = useRef();
  const { world } = useRapier();
  const { camera } = useThree();

  const controllerRef = useRef(null);
  const keys = useRef({});
  const velocityY = useRef(0);
  const currentZoneId = useRef("__none__");
  const lastFocused = useRef(-1);
  const stateRef = useRef("idle");

  const setBeat = useStore((s) => s.setBeat);
  const setFocusedProject = useStore((s) => s.setFocusedProject);

  // Create the Rapier kinematic character controller once.
  useEffect(() => {
    const c = world.createCharacterController(0.01);
    c.enableAutostep(0.5, 0.2, true);
    c.enableSnapToGround(0.5);
    c.setMaxSlopeClimbAngle((50 * Math.PI) / 180);
    c.setMinSlopeSlideAngle((30 * Math.PI) / 180);
    controllerRef.current = c;
    return () => {
      world.removeCharacterController(c);
      controllerRef.current = null;
    };
  }, [world]);

  // Keyboard (WASD / arrows). Cleaned up on unmount → no stuck input on switch.
  useEffect(() => {
    const down = (e) => (keys.current[e.code] = true);
    const up = (e) => (keys.current[e.code] = false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useFrame((_, rawDt) => {
    const body = bodyRef.current;
    const controller = controllerRef.current;
    if (!body || !controller) return;
    const collider = body.collider(0);
    if (!collider) return;

    const dt = Math.min(rawDt, 0.05);
    const speed = 6;
    const pos = body.translation();
    const k = keys.current;

    // Lift detection (Tower → layer-by-layer projects).
    const distToTower = Math.hypot(pos.x - TOWER.x, pos.z - TOWER.z);
    const vUp =
      (k.KeyW || k.ArrowUp ? 1 : 0) -
      (k.KeyS || k.ArrowDown ? 1 : 0) +
      (touchInput.y < -0.4 ? 1 : touchInput.y > 0.4 ? -1 : 0);
    const inLift = distToTower < LIFT_RADIUS && (vUp !== 0 || pos.y > GROUND_Y + 0.15);

    let next;
    if (inLift) {
      // Ride the lift: lock to the column, drive Y by W/S.
      next = {
        x: THREE.MathUtils.lerp(pos.x, TOWER.x, Math.min(1, dt * 5)),
        y: THREE.MathUtils.clamp(pos.y + vUp * LIFT_SPEED * dt, GROUND_Y, LIFT_TOP_Y),
        z: THREE.MathUtils.lerp(pos.z, TOWER.z, Math.min(1, dt * 5)),
      };
      velocityY.current = 0;
    } else {
      // Camera-relative movement basis (horizontal only).
      const camForward = new THREE.Vector3();
      camera.getWorldDirection(camForward);
      camForward.y = 0;
      camForward.normalize();
      const camRight = new THREE.Vector3()
        .crossVectors(camForward, new THREE.Vector3(0, 1, 0))
        .normalize();

      const input = new THREE.Vector3();
      let usingKeys = false;
      if (k.KeyW || k.ArrowUp) { input.add(camForward); usingKeys = true; }
      if (k.KeyS || k.ArrowDown) { input.sub(camForward); usingKeys = true; }
      if (k.KeyD || k.ArrowRight) { input.add(camRight); usingKeys = true; }
      if (k.KeyA || k.ArrowLeft) { input.sub(camRight); usingKeys = true; }
      // touch joystick (mobile)
      if (Math.hypot(touchInput.x, touchInput.y) > 0.12) {
        input.add(camForward.clone().multiplyScalar(-touchInput.y));
        input.add(camRight.clone().multiplyScalar(touchInput.x));
        usingKeys = true;
      }
      if (usingKeys) moveTargetRef.current = null;

      const horiz = new THREE.Vector3();
      if (usingKeys && input.lengthSq() > 0) {
        input.normalize().multiplyScalar(speed * dt);
        horiz.copy(input);
      } else if (moveTargetRef.current) {
        const to = new THREE.Vector3(
          moveTargetRef.current.x - pos.x,
          0,
          moveTargetRef.current.z - pos.z
        );
        const dist = to.length();
        if (dist < 0.3) moveTargetRef.current = null;
        else horiz.copy(to.normalize().multiplyScalar(Math.min(speed * dt, dist)));
      }

      // Gravity via the controller.
      velocityY.current -= 20 * dt;
      const desired = { x: horiz.x, y: velocityY.current * dt, z: horiz.z };
      controller.computeColliderMovement(collider, desired);
      const mv = controller.computedMovement();
      if (controller.computedGrounded()) velocityY.current = 0;
      next = { x: pos.x + mv.x, y: pos.y + mv.y, z: pos.z + mv.z };
    }

    body.setNextKinematicTranslation(next);
    setPlayerPos(next.x, next.y, next.z); // share with in-world surfaces
    setFocus(next.x, next.y + 1.2, next.z); // depth-of-field tracks the avatar

    // Animation state from horizontal speed.
    const stepDist = Math.hypot(next.x - pos.x, next.z - pos.z);
    const speedPerSec = stepDist / dt;
    stateRef.current = inLift
      ? "idle"
      : speedPerSec < 0.4
      ? "idle"
      : speedPerSec < 3.2
      ? "walk"
      : "run";

    // Face the movement direction.
    const moveX = next.x - pos.x;
    const moveZ = next.z - pos.z;
    if (meshRef.current && moveX * moveX + moveZ * moveZ > 1e-5) {
      const targetYaw = Math.atan2(moveX, moveZ);
      let diff = targetYaw - meshRef.current.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      meshRef.current.rotation.y += diff * Math.min(1, dt * 10);
    }

    // Damped follow camera (frame-rate independent).
    const damp = 1 - Math.pow(0.0015, dt);
    camera.position.lerp(
      new THREE.Vector3(next.x, next.y + 9, next.z + 14),
      damp
    );
    camera.lookAt(next.x, next.y + 1.2, next.z);

    // Proximity → content beat.
    let zone = null;
    for (const lm of LANDMARKS) {
      if (Math.hypot(next.x - lm.pos[0], next.z - lm.pos[2]) < lm.radius) {
        zone = lm;
        break;
      }
    }
    const zoneId = zone ? zone.id : "__none__";
    if (zoneId !== currentZoneId.current) {
      currentZoneId.current = zoneId;
      setBeat(zone ? zone.beat : null);
      if (!zone || zone.beat !== "projects") {
        lastFocused.current = -1;
        setFocusedProject(null);
      }
    }

    // Tower ascent → focused project (only fire on change).
    if (zone && zone.beat === "projects") {
      const idx = THREE.MathUtils.clamp(
        Math.floor((next.y - GROUND_Y) / 2),
        0,
        portfolio.projects.length - 1
      );
      if (idx !== lastFocused.current) {
        lastFocused.current = idx;
        setFocusedProject(idx);
      }
    }
  });

  return (
    <RigidBody
      ref={bodyRef}
      type="kinematicPosition"
      colliders={false}
      position={[0, GROUND_Y, 8]}
    >
      <CapsuleCollider args={[0.5, 0.4]} />
      <group ref={meshRef}>
        <Suspense fallback={<PlaceholderAvatar />}>
          <ModelBoundary fallback={<PlaceholderAvatar />}>
            <RobotAvatar stateRef={stateRef} />
          </ModelBoundary>
        </Suspense>
      </group>
    </RigidBody>
  );
}

// ============================================================================
// Static set-pieces.
// ============================================================================
// A soft warm→dark radial gradient, baked once into a CanvasTexture. Gives the
// floor a "pool of light fading into atmosphere" read instead of a flat grey box.
function useGroundTexture() {
  return useMemo(() => {
    const s = 512;
    const cnv = document.createElement("canvas");
    cnv.width = cnv.height = s;
    const ctx = cnv.getContext("2d");
    const g = ctx.createRadialGradient(s / 2, s / 2, s * 0.04, s / 2, s / 2, s * 0.5);
    g.addColorStop(0, "#5a4148"); // warm, lit centre (matches the sunset HDRI)
    g.addColorStop(0.45, "#33272f");
    g.addColorStop(1, "#1a141f"); // darker, hazier edges
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    const tex = new THREE.CanvasTexture(cnv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

function Ground({ moveTargetRef }) {
  const tex = useGroundTexture();
  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[60, 0.5, 60]} position={[0, -0.5, 0]} />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onPointerDown={(e) => {
          e.stopPropagation();
          moveTargetRef.current = e.point.clone();
        }}
      >
        <planeGeometry args={[140, 140]} />
        <meshStandardMaterial map={tex} roughness={0.9} metalness={0.05} />
      </mesh>
    </RigidBody>
  );
}

// A steel beam (cylinder) oriented between two points — builds lattice towers.
function Beam({ from, to, radius = 0.08, color = "#d98a4f" }) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const dir = b.clone().sub(a);
  const len = dir.length();
  const quat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.normalize()
  );
  return (
    <mesh position={[mid.x, mid.y, mid.z]} quaternion={quat} castShadow>
      <cylinderGeometry args={[radius, radius, len, 8]} />
      <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} />
    </mesh>
  );
}

// Tower = projects. Lattice structure + a stacked "room" per project (title in
// big letters, blurb on a wall screen, tech as glowing chips). The lift reveals
// one floor at a time as the avatar ascends.
function Tower() {
  const C = "#ff8c42";
  const levels = [
    { y: 0, s: 2.6 },
    { y: 4, s: 1.7 },
    { y: 8, s: 1.0 },
    { y: 11, s: 0.5 },
  ];
  const corners = (s) => [
    [-s, s],
    [s, s],
    [s, -s],
    [-s, -s],
  ];
  const legs = [];
  const braces = [];
  for (let i = 0; i < levels.length - 1; i++) {
    const a = levels[i];
    const b = levels[i + 1];
    const ca = corners(a.s);
    const cb = corners(b.s);
    for (let k = 0; k < 4; k++) {
      legs.push([[ca[k][0], a.y, ca[k][1]], [cb[k][0], b.y, cb[k][1]]]);
      const k2 = (k + 1) % 4;
      braces.push([[ca[k][0], a.y, ca[k][1]], [cb[k2][0], b.y, cb[k2][1]]]);
      braces.push([[ca[k2][0], a.y, ca[k2][1]], [cb[k][0], b.y, cb[k][1]]]);
    }
  }

  return (
    <group position={[TOWER.x, 0, TOWER.z]}>
      {legs.map((l, i) => (
        <Beam key={`leg${i}`} from={l[0]} to={l[1]} radius={0.14} color="#d98a4f" />
      ))}
      {braces.map((l, i) => (
        <Beam key={`br${i}`} from={l[0]} to={l[1]} radius={0.05} color="#d98a4f" />
      ))}
      {levels.slice(0, 3).map((lv, i) => (
        <mesh key={i} position={[0, lv.y, 0]} castShadow receiveShadow>
          <boxGeometry args={[lv.s * 2 + 0.6, 0.18, lv.s * 2 + 0.6]} />
          <meshStandardMaterial color="#d98a4f" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 12.2, 0]} castShadow>
        <coneGeometry args={[0.34, 2.4, 12]} />
        <meshStandardMaterial color="#ffb066" emissive="#ff8c42" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 13.6, 0]}>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshStandardMaterial color="#ffd166" emissive="#ffd166" emissiveIntensity={1.4} />
      </mesh>

      {/* lift pad */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <cylinderGeometry args={[LIFT_RADIUS - 0.4, LIFT_RADIUS - 0.4, 0.1, 32]} />
        <meshStandardMaterial color="#ff8c42" emissive="#ff8c42" emissiveIntensity={0.6} transparent opacity={0.5} />
      </mesh>

      {/* per-project ROOMS — title + blurb + tech, revealed as the lift rises */}
      {portfolio.projects.map((p, i) => {
        const y = GROUND_Y + i * 2;
        return (
          <group key={p.name} position={[0, y, 0]}>
            {/* floor disc for the room */}
            <mesh position={[2.4, -0.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.4, 2.2, 32]} />
              <meshStandardMaterial color="#ff8c42" emissive="#ff8c42" emissiveIntensity={0.3} transparent opacity={0.25} side={THREE.DoubleSide} />
            </mesh>
            <Inspectable id={`proj-${i}`} beat="projects" title={`PROJECT · ${p.name}`} range={4} offsetY={1.7}>
              <Billboard
                position={[2.4, 0.4, 0]}
                width={4.6}
                height={2.6}
                color={p.flagship ? "#ff5d8f" : C}
                heading={`${i + 1}. ${p.name}${p.flagship ? "  ★" : ""}`}
                headingSize={0.42}
                lines={[p.blurb.length > 150 ? p.blurb.slice(0, 147) + "…" : p.blurb, "", p.status]}
                bodySize={0.21}
                chips={p.tech}
                near={2.6}
                far={3.8}
                faceCamera
              />
            </Inspectable>
          </group>
        );
      })}

      <Marker position={[0, 11, 0]} color="#ff8c42" size={0.62} near={11} far={26}>
        {"PROJECTS\nride the lift (W/S)"}
      </Marker>
    </group>
  );
}

const COASTER_CURVE = new THREE.CatmullRomCurve3(
  [
    [0, 2, 6],
    [5, 5, 2],
    [2, 1.5, -4],
    [-4, 4, -6],
    [-6, 2, 0],
    [-2, 3, 5],
    [0, 2, 6],
  ].map((p) => new THREE.Vector3(...p)),
  true
);

function CoasterCart() {
  const ref = useRef();
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current = (t.current + dt * 0.07) % 1;
    const p = COASTER_CURVE.getPointAt(t.current);
    const tan = COASTER_CURVE.getTangentAt(t.current);
    if (ref.current) {
      ref.current.position.set(p.x, p.y + 0.28, p.z);
      ref.current.rotation.y = Math.atan2(tan.x, tan.z);
    }
  });
  return (
    <mesh ref={ref} castShadow>
      <boxGeometry args={[0.8, 0.5, 1.2]} />
      <meshStandardMaterial color="#ffd166" emissive="#ffd166" emissiveIntensity={0.4} metalness={0.4} roughness={0.4} />
    </mesh>
  );
}

// Coaster = experience. Trackside billboards (role + org + dates).
function Coaster() {
  const C = "#ff006e";
  const spots = [
    [6, 2.8, 3],
    [-6, 2.8, 2],
    [5, 2.8, -6],
    [-5, 2.8, -5],
  ];
  return (
    <group position={[20, 0, -16]}>
      <mesh>
        <tubeGeometry args={[COASTER_CURVE, 120, 0.18, 10, true]} />
        <meshStandardMaterial color="#ff006e" emissive="#ff006e" emissiveIntensity={0.4} metalness={0.5} roughness={0.4} />
      </mesh>
      {[-5, 0, 5].map((x, i) => (
        <mesh key={i} position={[x, 1, 0]} castShadow>
          <boxGeometry args={[0.3, 2, 0.3]} />
          <meshStandardMaterial color="#1a2332" />
        </mesh>
      ))}
      <CoasterCart />

      {portfolio.experience.map((e, i) => {
        const spot = spots[i % spots.length];
        return (
          <Billboard
            key={i}
            position={spot}
            width={3.8}
            height={2.1}
            color={C}
            heading={e.role}
            headingSize={0.34}
            lines={[e.org, cleanDate(e.dates), e.note || ""]}
            bodySize={0.22}
            near={7}
            far={16}
            faceCamera
          />
        );
      })}

      <Marker position={[0, 7, 0]} color={C} size={0.7} near={11} far={26}>
        EXPERIENCE
      </Marker>
    </group>
  );
}

// Skills street = a row of category billboards down a neon street.
function SkillsStreet() {
  const C = "#06d6a0";
  const cats = Object.entries(portfolio.skills); // [key, arr]
  return (
    <group position={[-20, 0, 16]}>
      {/* street strip — dark asphalt with neon edge trim (was a flat green plane) */}
      <mesh position={[0, 0.03, -2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5.5, 16]} />
        <meshStandardMaterial color="#16131c" roughness={0.85} metalness={0.1} />
      </mesh>
      {[-2.55, 2.55].map((x, i) => (
        <mesh key={i} position={[x, 0.04, -2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.12, 16]} />
          <meshStandardMaterial color={C} emissive={C} emissiveIntensity={1.3} toneMapped={false} />
        </mesh>
      ))}

      {cats.map(([key, arr], i) => {
        const left = i % 2 === 0;
        const z = 6 - i * 2; // 6,4,2,0,-2,-4,-6
        const x = left ? -3.8 : 3.8;
        const ry = left ? Math.PI / 2 : -Math.PI / 2;
        return (
          <Billboard
            key={key}
            position={[x, 2.3, z]}
            rotation={[0, ry, 0]}
            width={3.7}
            height={2.6}
            color={C}
            heading={prettyLabel(key)}
            headingSize={0.4}
            lines={arr}
            bodySize={0.26}
            near={5.5}
            far={13}
            faceCamera
          />
        );
      })}

      {/* entrance: a marker + an inspect point for the full skills + certs */}
      <Inspectable id="skills" beat="skills" title="SKILLS · full stack + certs" range={6} offsetY={2.6}>
        <Marker position={[0, 3.4, 7.5]} color={C} size={0.6} near={10} far={22}>
          {"SKILLS STREET\nwalk through · press E to inspect"}
        </Marker>
      </Inspectable>
    </group>
  );
}

// Academy = education. Façade rotated toward the plaza, with engraved plaques.
function Academy() {
  const C = "#ffd60a";
  // face the columned (+Z) façade toward the origin/plaza
  const yaw = Math.atan2(-20, -18);
  return (
    <group position={[20, 0, 18]} rotation={[0, yaw, 0]}>
      <mesh position={[0, 2, 0]} castShadow>
        <boxGeometry args={[6, 4, 4]} />
        <meshStandardMaterial color="#ffd60a" emissive="#ffd60a" emissiveIntensity={0.1} metalness={0.3} roughness={0.6} />
      </mesh>
      {[-2.2, -0.7, 0.7, 2.2].map((x, i) => (
        <mesh key={i} position={[x, 2, 2.1]} castShadow>
          <cylinderGeometry args={[0.3, 0.3, 4, 16]} />
          <meshStandardMaterial color="#fff3c4" />
        </mesh>
      ))}
      <mesh position={[0, 4.4, 0]} castShadow>
        <coneGeometry args={[4, 1.4, 4]} />
        <meshStandardMaterial color="#ffb020" emissive="#ffb020" emissiveIntensity={0.3} />
      </mesh>

      {portfolio.education.map((ed, i) => (
        <Plaque
          key={i}
          position={[(i - 1) * 2.05, 1.9, 2.25]}
          width={1.9}
          height={2.3}
          color={C}
          heading={ed.school}
          headingSize={0.2}
          lines={[ed.degree, ed.note || "", cleanDate(ed.dates)]}
          bodySize={0.16}
          near={7}
          far={15}
          faceCamera
        />
      ))}

      <Marker position={[0, 6.4, 0]} color={C} size={0.66} near={11} far={26}>
        EDUCATION
      </Marker>
    </group>
  );
}

// Portal = contact. A kiosk whose panels physically carry the links.
function Portal() {
  const C = "#06ffa5";
  const linkedin = portfolio.linkedin.replace(/^https?:\/\//, "");
  return (
    <group position={[0, 0, 30]}>
      <mesh position={[0, 2.5, 0]}>
        <torusGeometry args={[2, 0.25, 20, 48]} />
        <meshStandardMaterial color={C} emissive={C} emissiveIntensity={1} />
      </mesh>
      <mesh position={[0, 2.5, 0]}>
        <circleGeometry args={[1.8, 48]} />
        {/* custom-GLSL energy field (shader scaffold) */}
        <EnergyMat color={C} intensity={0.9} speed={1.6} />
      </mesh>

      <Inspectable id="contact" beat="contact" title="CONTACT · let's connect" range={6} offsetY={3.4}>
        <Billboard
          position={[0, 2.6, 2.4]}
          width={4.4}
          height={2.4}
          color={C}
          heading="Let's Connect"
          headingSize={0.42}
          lines={[`📧 ${portfolio.email}`, `💼 ${linkedin}`, `📍 ${portfolio.location}`]}
          bodySize={0.24}
          near={8}
          far={18}
          faceCamera
        />
      </Inspectable>
    </group>
  );
}

// Plaza = intro + about. Welcome arch (name/headline) + bio engraved on a plinth.
function Plaza() {
  const C = "#00d4ff";
  return (
    <group>
      {/* plaza ring */}
      <mesh position={[0, 0.03, 4]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.6, 4, 48]} />
        <meshStandardMaterial color={C} emissive={C} emissiveIntensity={0.6} side={THREE.DoubleSide} />
      </mesh>

      {/* welcome arch */}
      {[-3, 3].map((x, i) => (
        <mesh key={i} position={[x, 2, 1.2]} castShadow>
          <cylinderGeometry args={[0.28, 0.32, 4, 16]} />
          <meshStandardMaterial color="#1c2746" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 4, 1.2]} castShadow>
        <boxGeometry args={[6.6, 0.4, 0.6]} />
        <meshStandardMaterial color="#1c2746" metalness={0.5} roughness={0.5} />
      </mesh>
      <Billboard
        position={[0, 2.5, 1.25]}
        width={5.6}
        height={2.2}
        color={C}
        heading={portfolio.name}
        headingSize={0.5}
        lines={[portfolio.headline, `📍 ${portfolio.location}`]}
        bodySize={0.26}
        near={9}
        far={22}
        faceCamera
      />

      {/* about statue + engraved plinth */}
      <group position={[9, 0, 6]}>
        <mesh position={[0, 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.8, 1, 1, 24]} />
          <meshStandardMaterial color="#2a2a3a" metalness={0.4} roughness={0.6} />
        </mesh>
        <mesh position={[0, 1.6, 0]} castShadow>
          <icosahedronGeometry args={[0.7, 0]} />
          <meshStandardMaterial color="#9d4edd" emissive="#9d4edd" emissiveIntensity={0.4} flatShading />
        </mesh>
        <Plaque
          position={[0, 2.6, 0]}
          width={3.6}
          height={2.4}
          color="#9d4edd"
          heading="About"
          headingSize={0.3}
          lines={[portfolio.about]}
          bodySize={0.2}
          near={6}
          far={14}
          faceCamera
        />
      </group>
    </group>
  );
}

// Trophy podium — the Srujana TechFest award + certifications, engraved.
// West side of the plaza so name (N) / about (E) / achievements (W) stay clear.
function Trophy() {
  const C = "#ffd166";
  return (
    <group position={[-6.5, 0, -3]}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.7, 0.9, 1, 24]} />
        <meshStandardMaterial color="#2a2a3a" metalness={0.4} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.55, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.2, 0.7, 20]} />
        <meshStandardMaterial color="#ffd166" emissive="#ffb020" emissiveIntensity={0.5} metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.35, 12]} />
        <meshStandardMaterial color="#ffd166" metalness={0.9} roughness={0.2} />
      </mesh>
      {[-0.5, 0.5].map((x, i) => (
        <mesh key={i} position={[x, 1.55, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.18, 0.04, 8, 20, Math.PI]} />
          <meshStandardMaterial color="#ffd166" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
      <Plaque
        position={[0, 3, 0]}
        width={3.8}
        height={2.2}
        color={C}
        heading="🏆 Achievements"
        headingSize={0.26}
        lines={portfolio.certifications}
        bodySize={0.18}
        near={6}
        far={14}
        faceCamera
      />
    </group>
  );
}

// Instanced pillars ringing the plaza (single draw call).
function PlazaPillars() {
  const positions = useMemo(() => {
    const out = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      out.push([Math.cos(a) * 6, 1, 4 + Math.sin(a) * 6]);
    }
    return out;
  }, []);
  return (
    <Instances limit={positions.length}>
      <cylinderGeometry args={[0.12, 0.12, 2, 10]} />
      <meshStandardMaterial color="#3a3358" metalness={0.4} roughness={0.5} />
      {positions.map((p, i) => (
        <Instance key={i} position={p} />
      ))}
    </Instances>
  );
}

// ============================================================================
// HubWorld root
// ============================================================================
export default function HubWorld() {
  const moveTargetRef = useRef(null);

  return (
    <>
      {/* Warm dusk sky + matching haze (mirrors CreatureRun's recipe). The HDRI
          below drives image-based lighting only; an explicit <color> guarantees a
          warm, atmospheric backdrop that wins over the global Experience color and
          doesn't depend on the HDRI streaming in as a background. */}
      <color attach="background" args={["#241823"]} />
      <fog attach="fog" args={["#3a2a30", 28, 130]} />
      <Suspense fallback={null}>
        <ModelBoundary fallback={null}>
          <Environment files="/hdri/venice_sunset_1k.hdr" environmentIntensity={1.3} />
        </ModelBoundary>
      </Suspense>

      {/* HubWorld mood rig (on top of the global lights): warm sunset key/rim +
          cool fill, and pools of light at the plaza, portal and tower beacon so
          the world reads as lit rather than a flat grey box. */}
      <hemisphereLight args={["#ffcf9e", "#241526", 0.6]} />
      <ambientLight intensity={0.12} color="#ffcaa0" />
      <directionalLight position={[-26, 16, -8]} intensity={0.9} color="#ff9a5a" />
      <pointLight position={[0, 8, 6]} intensity={130} distance={34} color="#ffb066" />
      <pointLight position={[0, 5, 30]} intensity={70} distance={24} color="#06ffa5" />
      <pointLight position={[TOWER.x, 13, TOWER.z]} intensity={80} distance={26} color="#ff8c42" />

      {/* ambient atmosphere motes */}
      <Particles count={170} color="#d8c4a0" center={[0, 9, 0]} area={[120, 28, 120]} size={0.16} opacity={0.4} />

      <Physics gravity={[0, -20, 0]}>
        <Ground moveTargetRef={moveTargetRef} />
        <Avatar moveTargetRef={moveTargetRef} />
        <Plaza />
        <PlazaPillars />
        <Trophy />
        <Tower />
        <Coaster />
        <SkillsStreet />
        <Academy />
        <Portal />
      </Physics>

      {/* story layer — guide companion + a local NPC at each landmark */}
      <Guide />
      {Object.entries(NPC_SPOTS).map(([beat, pos]) => (
        <StoryNPC key={beat} beat={beat} position={pos} />
      ))}

      {/* diegetic dense-content terminal (opens from any Inspectable) */}
      <InspectTerminal />
    </>
  );
}
