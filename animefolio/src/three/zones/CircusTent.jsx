// ============================================================================
// CircusTent — Metaverse zone (Phase 2.6, new): step inside, you're in the
// crowd; a performer works under a spotlight; each act reveals one project.
// Acts auto-advance on a timer while the avatar is inside the tent.
// ============================================================================

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Instances, Instance } from "@react-three/drei";
import * as THREE from "three";

import { portfolio } from "../../data/portfolio.js";
import { playerPos } from "../player.js";
import { Inspectable, Marker } from "../Surfaces.jsx";

export const CIRCUS_POS = { x: 30, z: 14 };
const ACT_SECONDS = 6;

// A text/glow panel whose fade is driven by `active` (an act index match),
// not by camera/player distance — the show advances on its own clock.
function ActPanel({ active, color, heading, lines, tech }) {
  const ref = useRef();
  const cur = useRef(0);
  useFrame(() => {
    const target = active ? 1 : 0;
    cur.current += (target - cur.current) * 0.1;
    const r = cur.current;
    const g = ref.current;
    if (!g) return;
    g.visible = r > 0.02;
    g.traverse((o) => {
      if (o.isMesh && typeof o.fillOpacity === "number") {
        o.fillOpacity = r;
        o.outlineOpacity = r;
      }
    });
  });
  const body = [...lines.filter(Boolean), tech?.length ? tech.join(" · ") : ""].filter(Boolean).join("\n");
  return (
    <group ref={ref}>
      <Text
        position={[0, 2.6, 0]}
        fontSize={0.46}
        anchorX="center"
        anchorY="middle"
        maxWidth={6.5}
        textAlign="center"
        color="#ffffff"
        outlineWidth={0.012}
        outlineColor={color}
        fillOpacity={0}
        outlineOpacity={0}
      >
        {heading}
      </Text>
      <Text
        position={[0, 1.9, 0]}
        fontSize={0.2}
        anchorX="center"
        anchorY="top"
        maxWidth={6}
        textAlign="center"
        lineHeight={1.4}
        color="#f0e6ff"
        fillOpacity={0}
      >
        {body}
      </Text>
    </group>
  );
}

function Performer({ actIndex }) {
  const ref = useRef();
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    if (ref.current) {
      ref.current.position.y = 0.9 + Math.abs(Math.sin(t.current * 2.4)) * 0.5;
      ref.current.rotation.y += dt * (1.6 + actIndex * 0.15);
    }
  });
  return (
    <group ref={ref} position={[0, 0.9, 0]}>
      <mesh castShadow>
        <capsuleGeometry args={[0.28, 0.6, 8, 16]} />
        <meshStandardMaterial color="#ff5d8f" emissive="#ff5d8f" emissiveIntensity={0.5} metalness={0.4} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color="#ffe6f0" />
      </mesh>
    </group>
  );
}

// A ring of crowd silhouettes (single instanced draw call).
function Crowd() {
  const seats = new Array(20).fill(0).map((_, i) => {
    const a = (i / 20) * Math.PI * 2;
    return [Math.cos(a) * 6.4, 0.5, Math.sin(a) * 6.4];
  });
  return (
    <Instances limit={seats.length}>
      <capsuleGeometry args={[0.26, 0.6, 4, 8]} />
      <meshStandardMaterial color="#241830" roughness={0.9} />
      {seats.map((p, i) => (
        <Instance key={i} position={p} rotation={[0, Math.random() * Math.PI * 2, 0]} />
      ))}
    </Instances>
  );
}

export default function CircusTent() {
  const [actIndex, setActIndex] = useState(0);
  const timer = useRef(0);
  const projects = portfolio.projects;

  useFrame((_, dt) => {
    const inside = Math.hypot(playerPos.x - CIRCUS_POS.x, playerPos.z - CIRCUS_POS.z) < 9;
    if (!inside) return;
    timer.current += dt;
    if (timer.current > ACT_SECONDS) {
      timer.current = 0;
      setActIndex((i) => (i + 1) % projects.length);
    }
  });

  return (
    <group position={[CIRCUS_POS.x, 0, CIRCUS_POS.z]}>
      {/* big top */}
      <mesh position={[0, 5.2, 0]} castShadow>
        <coneGeometry args={[8.5, 6.5, 16]} />
        <meshStandardMaterial color="#3a1f4d" emissive="#3a1f4d" emissiveIntensity={0.2} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 1.6, 0]}>
        <cylinderGeometry args={[8.5, 8.5, 3.2, 16, 1, true]} />
        <meshStandardMaterial color="#2a1538" side={THREE.DoubleSide} roughness={0.9} />
      </mesh>
      <mesh position={[0, 8.5, 0]}>
        <sphereGeometry args={[0.3, 12, 12]} />
        <meshStandardMaterial color="#ffd166" emissive="#ffd166" emissiveIntensity={1.6} />
      </mesh>

      {/* ring + spotlight */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[5.6, 40]} />
        <meshStandardMaterial color="#1a0f24" roughness={0.85} />
      </mesh>
      <spotLight
        position={[0, 7, 0]}
        angle={0.5}
        penumbra={0.6}
        intensity={120}
        distance={16}
        color="#ffe9b0"
        castShadow
      />
      <pointLight position={[0, 2, 0]} intensity={20} distance={10} color="#ff5d8f" />

      <Crowd />
      <Performer actIndex={actIndex} />

      {projects.map((p, i) => (
        <ActPanel
          key={p.name}
          active={i === actIndex}
          color={p.flagship ? "#ff5d8f" : "#9d4edd"}
          heading={`Act ${i + 1} · ${p.name}${p.flagship ? " ★" : ""}`}
          lines={[p.blurb.length > 130 ? p.blurb.slice(0, 127) + "…" : p.blurb, p.status]}
          tech={p.tech}
        />
      ))}

      <Inspectable id="circus" beat="projects" title="CIRCUS TENT · the show" range={9} offsetY={9}>
        <Marker position={[0, 9, 0]} color="#ff5d8f" size={0.6} near={14} far={30}>
          {"CIRCUS TENT\nstep inside — the acts reveal the work"}
        </Marker>
      </Inspectable>
    </group>
  );
}
