// ============================================================================
// RollerCoaster — Metaverse zone (Phase 2.5): walk to the ticket counter, take
// a ticket, board → the camera locks to the cart on a spline at speed →
// EXPERIENCE flashes by trackside as you ride → eject back to free-roam.
// ============================================================================

import { useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { portfolio } from "../../data/portfolio.js";
import { setRideLock, requestTeleport } from "../rideLock.js";
import { Billboard, Marker, Inspectable } from "../Surfaces.jsx";

export const COASTER_POS = { x: 24, z: -22 };
const RIDE_SECONDS = 16;
const BOARD_SPOT = [COASTER_POS.x, 0.9, COASTER_POS.z + 7];

const COASTER_CURVE = new THREE.CatmullRomCurve3(
  [
    [0, 2, 6],
    [5, 5, 2],
    [2, 1.5, -4],
    [-4, 4, -6],
    [-6, 2, 0],
    [-2, 3, 5],
    [0, 2, 6],
  ].map(([x, y, z]) => new THREE.Vector3(x + COASTER_POS.x, y, z + COASTER_POS.z)),
  true
);

function CoasterCart({ ridingRef }) {
  const ref = useRef();
  const t = useRef(0);
  useFrame((_, dt) => {
    const speed = ridingRef.current ? 1 / RIDE_SECONDS : 0.07;
    t.current = (t.current + dt * speed) % 1;
    const p = COASTER_CURVE.getPointAt(t.current);
    const tan = COASTER_CURVE.getTangentAt(t.current);
    if (ref.current) {
      ref.current.position.copy(p);
      ref.current.position.y += 0.28;
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

// Drives the ride: while active, owns the camera (chase-behind the cart along
// the same curve) and ejects the player back to the boarding spot at lap end.
function RideDirector({ riding, setRiding }) {
  const { camera } = useThree();
  const t = useRef(0);

  useFrame((_, dt) => {
    if (!riding) return;
    t.current += dt / RIDE_SECONDS;
    if (t.current >= 1) {
      t.current = 0;
      setRiding(false);
      setRideLock(false);
      requestTeleport(BOARD_SPOT[0], BOARD_SPOT[1], BOARD_SPOT[2]);
      return;
    }
    const p = COASTER_CURVE.getPointAt(t.current % 1);
    const tan = COASTER_CURVE.getTangentAt(t.current % 1);
    const behind = p.clone().sub(tan.clone().multiplyScalar(3.2));
    behind.y += 1.6;
    camera.position.lerp(behind, 1 - Math.pow(0.0005, dt));
    camera.lookAt(p.x, p.y + 0.4, p.z);
  });
  return null;
}

export default function RollerCoaster() {
  const C = "#ff006e";
  const [riding, setRiding] = useState(false);
  const ridingRef = useRef(false);
  ridingRef.current = riding;

  const spots = [
    [6, 2.8, 3],
    [-6, 2.8, 2],
    [5, 2.8, -6],
    [-5, 2.8, -5],
  ];

  return (
    <group>
      <RideDirector riding={riding} setRiding={setRiding} />
      <group position={[COASTER_POS.x, 0, COASTER_POS.z]}>
        <mesh>
          <tubeGeometry args={[
            new THREE.CatmullRomCurve3(
              [
                [0, 2, 6], [5, 5, 2], [2, 1.5, -4], [-4, 4, -6], [-6, 2, 0], [-2, 3, 5], [0, 2, 6],
              ].map((p) => new THREE.Vector3(...p)),
              true
            ), 120, 0.18, 10, true,
          ]} />
          <meshStandardMaterial color="#ff006e" emissive="#ff006e" emissiveIntensity={0.4} metalness={0.5} roughness={0.4} />
        </mesh>
        {[-5, 0, 5].map((x, i) => (
          <mesh key={i} position={[x, 1, 0]} castShadow>
            <boxGeometry args={[0.3, 2, 0.3]} />
            <meshStandardMaterial color="#1a2332" />
          </mesh>
        ))}

        {portfolio.experience.map((e, i) => {
          const spot = spots[i % spots.length];
          const dates = !e.dates || /confirm/i.test(e.dates) ? "" : e.dates.replace(/\/\/.*$/, "").trim();
          return (
            <Billboard
              key={i}
              position={spot}
              width={3.8}
              height={2.1}
              color={C}
              heading={e.role}
              headingSize={0.34}
              lines={[e.org, dates, e.note || ""]}
              bodySize={0.22}
              near={7}
              far={16}
              faceCamera
            />
          );
        })}

        {/* ticket counter — the boarding interaction */}
        <group position={[0, 0, 7]}>
          <mesh position={[0, 0.6, 0]} castShadow>
            <boxGeometry args={[1.6, 1.2, 0.8]} />
            <meshStandardMaterial color="#1a2332" metalness={0.3} roughness={0.6} />
          </mesh>
          <mesh position={[0, 1.3, 0]}>
            <boxGeometry args={[1.7, 0.12, 0.9]} />
            <meshStandardMaterial color={C} emissive={C} emissiveIntensity={0.8} />
          </mesh>
          <Inspectable id="coaster-ticket" beat="experience" title="ROLLER COASTER · take a ticket" range={5} offsetY={1.9}>
            <Marker position={[0, 1.9, 0]} color={C} size={0.34} near={9} far={20}>
              {riding ? "ENJOY THE RIDE…" : "TICKET COUNTER\nclick to take a ticket & board"}
            </Marker>
          </Inspectable>
          {!riding && (
            <mesh
              position={[0, 1, 0.6]}
              visible={false}
              onClick={(e) => {
                e.stopPropagation();
                setRiding(true);
                setRideLock(true);
              }}
            >
              <boxGeometry args={[2, 2.4, 1.4]} />
            </mesh>
          )}
        </group>

        <CoasterCart ridingRef={ridingRef} />
        <Marker position={[0, 7, 0]} color={C} size={0.7} near={11} far={26}>
          EXPERIENCE
        </Marker>
      </group>
    </group>
  );
}
