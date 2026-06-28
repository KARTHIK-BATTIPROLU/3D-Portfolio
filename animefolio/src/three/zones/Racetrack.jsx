// ============================================================================
// Racetrack — Metaverse zone (Phase 2.7, new): select a car → a real race
// around the loop → achievements/projects appear as milestones you pass →
// finish → exit. Camera-locked automated drive (same rideLock pattern as the
// coaster) — an achievable stand-in for full ecctrl vehicle physics; see
// HUMAN_TODO.md for the upgrade path.
// ============================================================================

import { useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { portfolio } from "../../data/portfolio.js";
import { setPlayerPos } from "../player.js";
import { setRideLock, requestTeleport } from "../rideLock.js";
import { Billboard, Marker, Inspectable } from "../Surfaces.jsx";

export const RACETRACK_POS = { x: -30, z: 18 };
const RACE_SECONDS = 18;
const PIT_SPOT = [RACETRACK_POS.x, 0.9, RACETRACK_POS.z + 11];

const TRACK_CURVE = new THREE.CatmullRomCurve3(
  [
    [0, 0.3, 9],
    [8, 0.3, 5],
    [9, 0.3, -4],
    [4, 0.3, -9],
    [-4, 0.3, -9],
    [-9, 0.3, -4],
    [-8, 0.3, 5],
    [0, 0.3, 9],
  ].map(([x, y, z]) => new THREE.Vector3(x + RACETRACK_POS.x, y, z + RACETRACK_POS.z)),
  true
);

const CAR_COLORS = ["#06ffa5", "#00d4ff", "#ff5d8f"];

// achievements/projects as trackside milestones
const MILESTONES = [
  ...portfolio.certifications.map((c) => ({ heading: "🏆 Achievement", lines: [c] })),
  ...portfolio.projects
    .filter((p) => p.flagship)
    .map((p) => ({ heading: `★ ${p.name}`, lines: [p.status] })),
];

function Car({ color, t, active }) {
  const ref = useRef();
  useFrame(() => {
    if (!active || !ref.current) return;
    const p = TRACK_CURVE.getPointAt(t.current % 1);
    const tan = TRACK_CURVE.getTangentAt(t.current % 1);
    ref.current.position.set(p.x, p.y + 0.25, p.z);
    ref.current.rotation.y = Math.atan2(tan.x, tan.z);
  });
  return (
    <group ref={ref} position={[RACETRACK_POS.x, 0.9, RACETRACK_POS.z + 9]}>
      <mesh castShadow>
        <boxGeometry args={[1, 0.4, 2]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.32, -0.2]}>
        <boxGeometry args={[0.7, 0.3, 0.9]} />
        <meshStandardMaterial color="#0a0e16" metalness={0.4} roughness={0.5} />
      </mesh>
    </group>
  );
}

function RaceDirector({ racing, setRacing, t }) {
  const { camera } = useThree();
  useFrame((_, dt) => {
    if (!racing) return;
    t.current += dt / RACE_SECONDS;
    if (t.current >= 1) {
      t.current = 0;
      setRacing(false);
      setRideLock(false);
      requestTeleport(PIT_SPOT[0], PIT_SPOT[1], PIT_SPOT[2]);
      return;
    }
    const p = TRACK_CURVE.getPointAt(t.current % 1);
    const tan = TRACK_CURVE.getTangentAt(t.current % 1);
    setPlayerPos(p.x, p.y, p.z); // drive reveal-by-proximity for the milestones
    const behind = p.clone().sub(tan.clone().multiplyScalar(4));
    behind.y += 2;
    camera.position.lerp(behind, 1 - Math.pow(0.0006, dt));
    camera.lookAt(p.x, p.y + 0.5, p.z);
  });
  return null;
}

export default function Racetrack() {
  const [racing, setRacing] = useState(false);
  const [carColor, setCarColor] = useState(null);
  const t = useRef(0);

  const trackPts = TRACK_CURVE.getPoints(80);

  return (
    <group>
      <RaceDirector racing={racing} setRacing={setRacing} t={t} />

      {/* track ribbon */}
      {trackPts.slice(0, -1).map((a, i) => {
        const b = trackPts[i + 1];
        const dir = new THREE.Vector3().subVectors(b, a);
        const mid = a.clone().add(b).multiplyScalar(0.5);
        return (
          <mesh key={i} position={[mid.x, 0.04, mid.z]} rotation={[-Math.PI / 2, 0, Math.atan2(dir.x, dir.z)]} receiveShadow>
            <planeGeometry args={[4.5, a.distanceTo(b) + 0.1]} />
            <meshStandardMaterial color="#161616" roughness={0.95} />
          </mesh>
        );
      })}

      {MILESTONES.map((m, i) => {
        const p = TRACK_CURVE.getPointAt((i + 0.5) / MILESTONES.length);
        return (
          <Billboard
            key={i}
            position={[p.x, p.y + 2, p.z]}
            width={3.2}
            height={1.8}
            color="#06ffa5"
            heading={m.heading}
            headingSize={0.26}
            lines={m.lines}
            bodySize={0.18}
            near={6}
            far={14}
            faceCamera
          />
        );
      })}

      {/* pit / car-select kiosk */}
      <group position={PIT_SPOT}>
        <mesh position={[0, -0.4, 0]} castShadow>
          <boxGeometry args={[2.4, 0.4, 1.6]} />
          <meshStandardMaterial color="#1a2332" metalness={0.4} roughness={0.5} />
        </mesh>
        <Inspectable id="racetrack-pit" beat="projects" title="RACETRACK · select a car" range={6} offsetY={2.2}>
          <Marker position={[0, 1.6, 0]} color="#06ffa5" size={0.32} near={10} far={22}>
            {racing ? "RACING…" : "PIT LANE\nclick a car to race"}
          </Marker>
        </Inspectable>
        {!racing &&
          CAR_COLORS.map((c, i) => (
            <mesh
              key={c}
              position={[(i - 1) * 1.4, 0.3, 1.8]}
              onClick={(e) => {
                e.stopPropagation();
                setCarColor(c);
                setRacing(true);
                setRideLock(true);
              }}
              castShadow
            >
              <boxGeometry args={[0.8, 0.4, 1.2]} />
              <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.5} />
            </mesh>
          ))}
      </group>

      <Car color={carColor || CAR_COLORS[0]} t={t} active={racing} />

      <Marker position={[RACETRACK_POS.x, 4, RACETRACK_POS.z]} color="#06ffa5" size={0.66} near={16} far={34}>
        RACETRACK
      </Marker>
    </group>
  );
}
