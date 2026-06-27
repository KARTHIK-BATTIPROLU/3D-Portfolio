// ============================================================================
// Particles — a reusable ambient particle system (Phase 0). Soft additive motes
// that drift slowly upward and wrap, giving both worlds atmosphere/depth. Cheap:
// one draw call, positions updated on the CPU. Count auto-drops on mobile.
// ============================================================================

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const isMobile =
  typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

export default function Particles({
  count = 180,
  size = 0.18,
  color = "#bcd4ff",
  area = [120, 26, 120], // x, y, z extent of the drifting volume
  center = [0, 8, 0],
  speed = 0.6,
  opacity = 0.5,
}) {
  const n = isMobile ? Math.floor(count / 2) : count;
  const ref = useRef();

  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(n * 3);
    const speeds = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      positions[i * 3] = center[0] + (Math.random() - 0.5) * area[0];
      positions[i * 3 + 1] = center[1] + (Math.random() - 0.5) * area[1];
      positions[i * 3 + 2] = center[2] + (Math.random() - 0.5) * area[2];
      speeds[i] = 0.3 + Math.random() * 0.7;
    }
    return { positions, speeds };
  }, [n, area[0], area[1], area[2], center[0], center[1], center[2]]);

  useFrame((_, rawDt) => {
    const g = ref.current;
    if (!g) return;
    const dt = Math.min(rawDt, 0.05);
    const arr = g.geometry.attributes.position.array;
    const top = center[1] + area[1] / 2;
    const bottom = center[1] - area[1] / 2;
    for (let i = 0; i < n; i++) {
      arr[i * 3 + 1] += speeds[i] * speed * dt;
      if (arr[i * 3 + 1] > top) arr[i * 3 + 1] = bottom;
    }
    g.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={n} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        color={color}
        transparent
        opacity={opacity}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
