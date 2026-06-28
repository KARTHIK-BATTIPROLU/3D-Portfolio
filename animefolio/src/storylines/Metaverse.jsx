// ============================================================================
// Metaverse — Storyline 1 (navMode: 'free-roam'), the open-world rebuild
// (Phase 2). First contact: a podium reveal under drifting clouds ("scroll to
// begin"). The clouds part, the camera descends into a walkable grassland —
// central podium + world-map plaque, four zones (Left: Eiffel Tower +
// Racetrack · Right: Roller Coaster + Circus Tent), the remaining beats
// (skills/education/contact/achievements) as world features. Diegetic
// proximity reveals throughout; a kinematic Rapier character controller
// (click-to-move + WASD + joystick) drives the avatar.
// ============================================================================

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Physics, RigidBody, CapsuleCollider, CuboidCollider, useRapier } from "@react-three/rapier";
import { Environment, Instances, Instance, Sky, Cloud, Html } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";

import { useStore } from "../store/useStore.js";
import { portfolio } from "../data/portfolio.js";
import { prettyLabel } from "../components/BeatContent.jsx";
import ModelBoundary from "../three/ModelBoundary.jsx";
import AvatarRPM from "../three/models/AvatarRPM.jsx";
import { touchInput } from "../three/input.js";
import { setPlayerPos } from "../three/player.js";
import { setFocus } from "../three/cameraRig.js";
import { rideLock } from "../three/rideLock.js";
import Particles from "../three/Particles.jsx";
import { EnergyMat } from "../three/shaders/EnergyMaterial.jsx";
import { Billboard, Plaque, Marker, Inspectable, InspectTerminal } from "../three/Surfaces.jsx";
import { Guide, StoryNPC } from "../three/Story.jsx";

import EiffelLift, { EIFFEL_POS, LIFT_RADIUS, GROUND_Y, LIFT_TOP_Y, LIFT_SPEED } from "../three/zones/EiffelLift.jsx";
import RollerCoaster, { COASTER_POS } from "../three/zones/RollerCoaster.jsx";
import CircusTent, { CIRCUS_POS } from "../three/zones/CircusTent.jsx";
import Racetrack, { RACETRACK_POS } from "../three/zones/Racetrack.jsx";

const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Where each beat's local NPC stands (near its landmark).
const NPC_SPOTS = {
  intro: [2.6, 0, 3.5],
  about: [11, 0, 5.5],
  skills: [-14, 0, 24],
  experience: [COASTER_POS.x - 5, 0, COASTER_POS.z + 5],
  projects: [EIFFEL_POS.x + 3, 0, EIFFEL_POS.z + 5],
  education: [14, 0, 26],
  contact: [3, 0, 40],
};

const LANDMARKS = [
  { id: "plaza",     beat: "intro",      label: "Plaza · Intro",                pos: [0, 0, 4],                              radius: 5 },
  { id: "statue",    beat: "about",      label: "Statue · About",               pos: [9, 0, 6],                              radius: 4 },
  { id: "eiffel",    beat: "projects",   label: "Eiffel Lift · Projects",       pos: [EIFFEL_POS.x, 0, EIFFEL_POS.z],        radius: 8 },
  { id: "coaster",   beat: "experience", label: "Roller Coaster · Experience",  pos: [COASTER_POS.x, 0, COASTER_POS.z],      radius: 8 },
  { id: "circus",    beat: "projects",   label: "Circus Tent · Projects",       pos: [CIRCUS_POS.x, 0, CIRCUS_POS.z],        radius: 9 },
  { id: "racetrack", beat: "projects",   label: "Racetrack · Projects",         pos: [RACETRACK_POS.x, 0, RACETRACK_POS.z],  radius: 12 },
  { id: "street",    beat: "skills",     label: "Skills Street",                pos: [-14, 0, 28],                           radius: 7 },
  { id: "academy",   beat: "education",  label: "Academy · Education",          pos: [14, 0, 30],                            radius: 6 },
  { id: "portal",    beat: "contact",    label: "Portal · Contact",             pos: [0, 0, 40],                             radius: 5 },
];

const cleanDate = (v) => (!v || /confirm/i.test(v) ? "" : String(v).replace(/\/\/.*$/, "").trim());

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
// First contact — podium + rotating avatar under a drifting sky, "scroll to
// begin." First wheel/touch gesture triggers the cloud-part camera descent
// (Phase 2.1/2.2), then hands control to the free-roam Avatar below.
// ============================================================================
function CloudIntro({ onDone }) {
  const { camera } = useThree();
  const groupRef = useRef();
  // Refs, not state: the trigger must attach exactly once on mount and stay
  // attached for the component's whole life — re-render churn (parent state,
  // PerformanceMonitor, etc.) must never tear down/rebuild this listener.
  const startedRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    camera.position.set(0, 2.4, 6.5);
    camera.lookAt(0, 1.6, 0);
  }, [camera]);

  useFrame((_, dt) => {
    if (groupRef.current) groupRef.current.rotation.y += dt * 0.5;
  });

  // Plain function (not effect-scoped) so the fallback "Enter the world"
  // button below can call the exact same path as the scroll/key gesture.
  const begin = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    gsap.to(camera.position, {
      x: 0,
      y: 16,
      z: 30,
      duration: 2.6,
      ease: "power2.inOut",
      onUpdate: () => camera.lookAt(0, 1, 4),
    });
    gsap.to(camera, {
      fov: 58,
      duration: 2.6,
      ease: "power2.inOut",
      onUpdate: () => camera.updateProjectionMatrix(),
      onComplete: () => onDoneRef.current(),
    });
  };

  useEffect(() => {
    if (prefersReducedMotion) {
      onDoneRef.current();
      return;
    }
    window.addEventListener("wheel", begin, { passive: true });
    window.addEventListener("touchmove", begin, { passive: true });
    window.addEventListener("keydown", begin);
    return () => {
      window.removeEventListener("wheel", begin);
      window.removeEventListener("touchmove", begin);
      window.removeEventListener("keydown", begin);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera]);

  return (
    <>
      <Sky distance={4500} sunPosition={[10, 4, -20]} turbidity={6} rayleigh={1.5} />
      {!prefersReducedMotion && (
        <>
          <Cloud position={[-6, 5, -4]} speed={0.2} opacity={0.7} />
          <Cloud position={[5, 4, -2]} speed={0.25} opacity={0.6} />
          <Cloud position={[0, 6, -8]} speed={0.15} opacity={0.5} />
        </>
      )}
      <group ref={groupRef} position={[0, 0.2, 0]}>
        <mesh position={[0, -0.05, 0]} receiveShadow>
          <cylinderGeometry args={[1.4, 1.6, 0.5, 32]} />
          <meshStandardMaterial color="#cfd6e6" metalness={0.3} roughness={0.5} />
        </mesh>
        <Suspense fallback={<PlaceholderAvatar />}>
          <ModelBoundary fallback={<PlaceholderAvatar />}>
            <group position={[0, 0.3, 0]}>
              <AvatarRPM stateRef={{ current: "idle" }} />
            </group>
          </ModelBoundary>
        </Suspense>
      </group>
      <Html center position={[0, 3.4, 0]} style={{ pointerEvents: "none" }}>
        <div className="label-3d" style={{ fontSize: "0.85rem", letterSpacing: "0.18em" }}>
          {portfolio.name.toUpperCase()} ↓ scroll to begin
        </div>
      </Html>
      <Html center position={[0, 0.55, 1.8]} style={{ pointerEvents: "auto" }}>
        <button className="ui-btn primary" onClick={begin}>
          Enter the world →
        </button>
      </Html>
    </>
  );
}

// ============================================================================
// Avatar + controller — the only piece that touches Rapier internals.
// ============================================================================
function Avatar({ moveTargetRef, controlsEnabled }) {
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

    // A ride zone (coaster/racetrack) owns the camera + drives reveals itself.
    if (rideLock.active) return;

    // A ride just ended — snap back to solid ground.
    if (rideLock.teleportTo) {
      body.setNextKinematicTranslation(rideLock.teleportTo);
      rideLock.teleportTo = null;
      return;
    }

    if (!controlsEnabled) return;

    const speed = 6;
    const pos = body.translation();
    const k = keys.current;

    // Eiffel lift detection.
    const distToEiffel = Math.hypot(pos.x - EIFFEL_POS.x, pos.z - EIFFEL_POS.z);
    const vUp =
      (k.KeyW || k.ArrowUp ? 1 : 0) -
      (k.KeyS || k.ArrowDown ? 1 : 0) +
      (touchInput.y < -0.4 ? 1 : touchInput.y > 0.4 ? -1 : 0);
    const inLift = distToEiffel < LIFT_RADIUS && (vUp !== 0 || pos.y > GROUND_Y + 0.15);

    let next;
    if (inLift) {
      next = {
        x: THREE.MathUtils.lerp(pos.x, EIFFEL_POS.x, Math.min(1, dt * 5)),
        y: THREE.MathUtils.clamp(pos.y + vUp * LIFT_SPEED * dt, GROUND_Y, LIFT_TOP_Y),
        z: THREE.MathUtils.lerp(pos.z, EIFFEL_POS.z, Math.min(1, dt * 5)),
      };
      velocityY.current = 0;
    } else {
      const camForward = new THREE.Vector3();
      camera.getWorldDirection(camForward);
      camForward.y = 0;
      camForward.normalize();
      const camRight = new THREE.Vector3().crossVectors(camForward, new THREE.Vector3(0, 1, 0)).normalize();

      const input = new THREE.Vector3();
      let usingKeys = false;
      if (k.KeyW || k.ArrowUp) { input.add(camForward); usingKeys = true; }
      if (k.KeyS || k.ArrowDown) { input.sub(camForward); usingKeys = true; }
      if (k.KeyD || k.ArrowRight) { input.add(camRight); usingKeys = true; }
      if (k.KeyA || k.ArrowLeft) { input.sub(camRight); usingKeys = true; }
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
        const to = new THREE.Vector3(moveTargetRef.current.x - pos.x, 0, moveTargetRef.current.z - pos.z);
        const dist = to.length();
        if (dist < 0.3) moveTargetRef.current = null;
        else horiz.copy(to.normalize().multiplyScalar(Math.min(speed * dt, dist)));
      }

      velocityY.current -= 20 * dt;
      const desired = { x: horiz.x, y: velocityY.current * dt, z: horiz.z };
      controller.computeColliderMovement(collider, desired);
      const mv = controller.computedMovement();
      if (controller.computedGrounded()) velocityY.current = 0;
      next = { x: pos.x + mv.x, y: pos.y + mv.y, z: pos.z + mv.z };
    }

    body.setNextKinematicTranslation(next);
    setPlayerPos(next.x, next.y, next.z);
    setFocus(next.x, next.y + 1.2, next.z);

    const stepDist = Math.hypot(next.x - pos.x, next.z - pos.z);
    const speedPerSec = stepDist / dt;
    stateRef.current = inLift ? "idle" : speedPerSec < 0.4 ? "idle" : speedPerSec < 3.2 ? "walk" : "run";

    const moveX = next.x - pos.x;
    const moveZ = next.z - pos.z;
    if (meshRef.current && moveX * moveX + moveZ * moveZ > 1e-5) {
      const targetYaw = Math.atan2(moveX, moveZ);
      let diff = targetYaw - meshRef.current.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      meshRef.current.rotation.y += diff * Math.min(1, dt * 10);
    }

    const damp = 1 - Math.pow(0.0015, dt);
    camera.position.lerp(new THREE.Vector3(next.x, next.y + 9, next.z + 14), damp);
    camera.lookAt(next.x, next.y + 1.2, next.z);

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

    if (zone && zone.id === "eiffel") {
      const idx = THREE.MathUtils.clamp(Math.floor((next.y - GROUND_Y) / 2), 0, portfolio.projects.length - 1);
      if (idx !== lastFocused.current) {
        lastFocused.current = idx;
        setFocusedProject(idx);
      }
    }
  });

  return (
    <RigidBody ref={bodyRef} type="kinematicPosition" colliders={false} position={[0, GROUND_Y, 8]}>
      <CapsuleCollider args={[0.5, 0.4]} />
      <group ref={meshRef}>
        <Suspense fallback={<PlaceholderAvatar />}>
          <ModelBoundary fallback={<PlaceholderAvatar />}>
            <AvatarRPM stateRef={stateRef} />
          </ModelBoundary>
        </Suspense>
      </group>
    </RigidBody>
  );
}

// ============================================================================
// Static set-pieces (Ground, Plaza, Trophy, SkillsStreet, Academy, Portal,
// the world-map plaque) — unchanged in spirit from the prior Hub World.
// ============================================================================
function useGroundTexture() {
  return useMemo(() => {
    const s = 512;
    const cnv = document.createElement("canvas");
    cnv.width = cnv.height = s;
    const ctx = cnv.getContext("2d");
    const g = ctx.createRadialGradient(s / 2, s / 2, s * 0.04, s / 2, s / 2, s * 0.5);
    g.addColorStop(0, "#5a4148");
    g.addColorStop(0.45, "#33272f");
    g.addColorStop(1, "#1a141f");
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
      <CuboidCollider args={[80, 0.5, 80]} position={[0, -0.5, 0]} />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onPointerDown={(e) => {
          e.stopPropagation();
          moveTargetRef.current = e.point.clone();
        }}
      >
        <planeGeometry args={[180, 180]} />
        <meshStandardMaterial map={tex} roughness={0.9} metalness={0.05} />
      </mesh>
    </RigidBody>
  );
}

function SkillsStreet() {
  const C = "#06d6a0";
  const cats = Object.entries(portfolio.skills);
  return (
    <group position={[-14, 0, 28]}>
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
        const z = 6 - i * 2;
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
      <Inspectable id="skills" beat="skills" title="SKILLS · full stack + certs" range={6} offsetY={2.6}>
        <Marker position={[0, 3.4, 7.5]} color={C} size={0.6} near={10} far={22}>
          {"SKILLS STREET\nwalk through · press E to inspect"}
        </Marker>
      </Inspectable>
    </group>
  );
}

function Academy() {
  const C = "#ffd60a";
  const yaw = Math.atan2(-30, -14);
  return (
    <group position={[14, 0, 30]} rotation={[0, yaw, 0]}>
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

function Portal() {
  const C = "#06ffa5";
  const linkedin = portfolio.linkedin.replace(/^https?:\/\//, "");
  return (
    <group position={[0, 0, 40]}>
      <mesh position={[0, 2.5, 0]}>
        <torusGeometry args={[2, 0.25, 20, 48]} />
        <meshStandardMaterial color={C} emissive={C} emissiveIntensity={1} />
      </mesh>
      <mesh position={[0, 2.5, 0]}>
        <circleGeometry args={[1.8, 48]} />
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

function Plaza() {
  const C = "#00d4ff";
  return (
    <group>
      <mesh position={[0, 0.03, 4]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.6, 4, 48]} />
        <meshStandardMaterial color={C} emissive={C} emissiveIntensity={0.6} side={THREE.DoubleSide} />
      </mesh>
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

      {/* world-map plaque (Phase 2.3): all four zones at a glance */}
      <group position={[-4, 0, 0]}>
        <mesh position={[0, 1.4, 0]} rotation={[0, Math.PI / 7, 0]} castShadow>
          <boxGeometry args={[2.6, 0.1, 2.0]} />
          <meshStandardMaterial color="#0b1222" metalness={0.5} roughness={0.4} />
        </mesh>
        <Plaque
          position={[0, 1.5, 0]}
          rotation={[-Math.PI / 2.05, 0, Math.PI / 7]}
          width={2.4}
          height={1.8}
          color="#00d4ff"
          heading="World Map"
          headingSize={0.18}
          lines={["← Left: Eiffel Lift · Racetrack", "Right: Roller Coaster · Circus → ", "", "Street · Academy · Portal beyond"]}
          bodySize={0.13}
          near={5}
          far={12}
        />
      </group>
    </group>
  );
}

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
// Metaverse root
// ============================================================================
export default function Metaverse() {
  const moveTargetRef = useRef(null);
  const [introDone, setIntroDone] = useState(prefersReducedMotion);

  return (
    <>
      <color attach="background" args={["#241823"]} />
      <fog attach="fog" args={["#3a2a30", 28, 150]} />
      <Suspense fallback={null}>
        <ModelBoundary fallback={null}>
          <Environment files="/hdri/venice_sunset_1k.hdr" environmentIntensity={1.3} />
        </ModelBoundary>
      </Suspense>

      <hemisphereLight args={["#ffcf9e", "#241526", 0.6]} />
      <ambientLight intensity={0.12} color="#ffcaa0" />
      <directionalLight position={[-26, 16, -8]} intensity={0.9} color="#ff9a5a" />
      <pointLight position={[0, 8, 6]} intensity={130} distance={34} color="#ffb066" />
      <pointLight position={[0, 5, 40]} intensity={70} distance={24} color="#06ffa5" />
      <pointLight position={[EIFFEL_POS.x, 13, EIFFEL_POS.z]} intensity={80} distance={26} color="#ff8c42" />

      <Particles count={170} color="#d8c4a0" center={[0, 9, 0]} area={[140, 28, 140]} size={0.16} opacity={0.4} />

      {!introDone && <CloudIntro onDone={() => setIntroDone(true)} />}

      {/* The podium + the world glimpsed below the clouds — kept light so the
          very first commit is cheap and the intro's gesture listener attaches
          reliably. The four (procedurally heavier) zones mount only once the
          cloud-part finishes; they're far from the podium and not visible
          during the reveal anyway, so deferring them costs nothing visually. */}
      <Physics gravity={[0, -20, 0]}>
        <Ground moveTargetRef={moveTargetRef} />
        <Avatar moveTargetRef={moveTargetRef} controlsEnabled={introDone} />
        <Plaza />
        <PlazaPillars />
        <Trophy />
        {introDone && (
          <>
            <EiffelLift />
            <RollerCoaster />
            <CircusTent />
            <Racetrack />
            <SkillsStreet />
            <Academy />
            <Portal />
          </>
        )}
      </Physics>

      <Guide />
      {Object.entries(NPC_SPOTS).map(([beat, pos]) => (
        <StoryNPC key={beat} beat={beat} position={pos} />
      ))}

      <InspectTerminal />
    </>
  );
}
