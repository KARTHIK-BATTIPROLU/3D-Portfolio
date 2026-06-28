// ============================================================================
// EiffelLift — Metaverse zone (Phase 2.4): click-to-enter, the lift rises
// while a sunset opens behind you, projects reveal one-by-one as you climb,
// and the top looks out over the whole landscape. Lattice tower geometry +
// lift mechanics live here; Metaverse's Avatar reads EIFFEL_POS/LIFT_RADIUS
// to know when W/S should drive the lift instead of horizontal movement.
// ============================================================================

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { portfolio } from "../../data/portfolio.js";
import { playerPos } from "../player.js";
import { Billboard, Inspectable, Marker } from "../Surfaces.jsx";

export const EIFFEL_POS = { x: -24, z: -22 };
export const LIFT_RADIUS = 3;
export const GROUND_Y = 0.9;
export const LIFT_TOP_Y = GROUND_Y + 8;
export const LIFT_SPEED = 4;

// A steel beam (cylinder) oriented between two points — builds lattice towers.
function Beam({ from, to, radius = 0.08, color = "#d98a4f" }) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const dir = b.clone().sub(a);
  const len = dir.length();
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return (
    <mesh position={[mid.x, mid.y, mid.z]} quaternion={quat} castShadow>
      <cylinderGeometry args={[radius, radius, len, 8]} />
      <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} />
    </mesh>
  );
}

// Sunset rig: a sky-colour wash + warm key light that intensifies the closer/
// higher the avatar climbs the tower — "the lift rises while a sunset opens
// behind you." Self-contained so Metaverse doesn't need to know lift state.
function SunsetRig() {
  const light = useRef();
  const glow = useRef();
  useFrame(() => {
    const dx = playerPos.x - EIFFEL_POS.x;
    const dz = playerPos.z - EIFFEL_POS.z;
    const dist = Math.hypot(dx, dz);
    const climb = THREE.MathUtils.clamp((playerPos.y - GROUND_Y) / (LIFT_TOP_Y - GROUND_Y), 0, 1);
    const near = THREE.MathUtils.clamp(1 - dist / 30, 0, 1);
    const strength = near * (0.35 + 0.65 * climb);
    if (light.current) {
      light.current.intensity = 1.4 + strength * 3.2;
      light.current.color.setHSL(0.06 - climb * 0.015, 0.85, 0.55 + climb * 0.12);
    }
    if (glow.current) glow.current.material.opacity = 0.15 + strength * 0.5;
  });
  return (
    <>
      <directionalLight ref={light} position={[EIFFEL_POS.x + 30, 14, EIFFEL_POS.z - 10]} intensity={1.4} color="#ff9a5a" />
      <mesh ref={glow} position={[EIFFEL_POS.x + 22, 16, EIFFEL_POS.z - 18]}>
        <sphereGeometry args={[9, 24, 24]} />
        <meshBasicMaterial color="#ffb066" transparent opacity={0.2} depthWrite={false} />
      </mesh>
    </>
  );
}

export default function EiffelLift() {
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
    <group position={[EIFFEL_POS.x, 0, EIFFEL_POS.z]}>
      <SunsetRig />
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

      {/* per-project rooms — title + blurb + tech, revealed one-by-one as the lift rises */}
      {portfolio.projects.map((p, i) => {
        const y = GROUND_Y + i * 2;
        return (
          <group key={p.name} position={[0, y, 0]}>
            <mesh position={[2.4, -0.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.4, 2.2, 32]} />
              <meshStandardMaterial color="#ff8c42" emissive="#ff8c42" emissiveIntensity={0.3} transparent opacity={0.25} side={THREE.DoubleSide} />
            </mesh>
            <Inspectable id={`eiffel-proj-${i}`} beat="projects" title={`PROJECT · ${p.name}`} range={4} offsetY={1.7}>
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
        {"EIFFEL LIFT · PROJECTS\nride the lift (W/S) — sunset at the top"}
      </Marker>
    </group>
  );
}
