// ============================================================================
// EnergyMaterial — the custom-GLSL scaffold (Phase 0). A reusable additive
// shaderMaterial: a fresnel rim + a flowing scanline, the basis for the
// signature FX moments later (neon trails, dissolves, portals, sky).
//
// Usage:  <mesh><sphereGeometry/><EnergyMat color="#00d4ff" intensity={1}/></mesh>
// ============================================================================

import { useMemo, useRef } from "react";
import { shaderMaterial } from "@react-three/drei";
import { extend, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const EnergyShaderMaterial = shaderMaterial(
  { uTime: 0, uColor: new THREE.Color("#00d4ff"), uIntensity: 1, uSpeed: 2.0 },
  /* glsl vertex */ `
    varying vec3 vNormal;
    varying vec3 vView;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vView = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }
  `,
  /* glsl fragment */ `
    uniform float uTime;
    uniform float uIntensity;
    uniform float uSpeed;
    uniform vec3  uColor;
    varying vec3 vNormal;
    varying vec3 vView;
    varying vec2 vUv;
    void main() {
      float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.0);
      float flow = 0.5 + 0.5 * sin(vUv.y * 9.0 - uTime * uSpeed);
      float a = clamp(fres * 1.25 + flow * 0.22, 0.0, 1.0) * uIntensity;
      gl_FragColor = vec4(uColor * (0.6 + 0.6 * fres), a);
    }
  `
);

extend({ EnergyShaderMaterial });

export function EnergyMat({ color = "#00d4ff", intensity = 1, speed = 2.0, ...props }) {
  const ref = useRef();
  const col = useMemo(() => new THREE.Color(color), [color]);
  useFrame((_, dt) => {
    if (ref.current) ref.current.uTime += dt;
  });
  return (
    <energyShaderMaterial
      ref={ref}
      uColor={col}
      uIntensity={intensity}
      uSpeed={speed}
      transparent
      depthWrite={false}
      blending={THREE.AdditiveBlending}
      side={THREE.DoubleSide}
      toneMapped={false}
      {...props}
    />
  );
}
