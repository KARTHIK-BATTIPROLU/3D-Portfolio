// ============================================================================
// Surfaces — reusable IN-WORLD content surfaces (Step 8). These replace the
// floating overlay cards: every portfolio detail now lives on a believable 3D
// object and reveals as the character approaches.
//
//   <Billboard>  large lit sign/screen   — heading + a few lines (+ optional chips)
//   <Plaque>     engraved wall/plinth panel — a block of text
//   <Marker>     small camera-facing label  — a place/project name
//   <Inspectable> wraps a surface so dense content opens a diegetic terminal
//   <InspectTerminal> the in-world holo-terminal itself (one per world)
//
// All text is drei <Text> (real 3D geometry, not DOM). It uses troika's default
// font (fetched at runtime, like the app's HDRI + Google font) and fades in via
// fillOpacity — applied as a shader uniform each render, so NO re-sync per frame.
// Distance is measured from the CHARACTER (playerPos), not the camera.
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text, Html } from "@react-three/drei";
import * as THREE from "three";

import { playerPos } from "./player.js";
import { useStore } from "../store/useStore.js";
import BeatContent from "../components/BeatContent.jsx";

const _wp = new THREE.Vector3();
const _baseMat = new WeakMap(); // material → its authored {opacity, emissive}

// 1 when the player is at/within `near`, 0 at/beyond `far`.
function revealFactor(object, near, far) {
  object.getWorldPosition(_wp);
  const d = playerPos.distanceTo(_wp);
  return THREE.MathUtils.clamp((far - d) / (far - near), 0, 1);
}

// ----------------------------------------------------------------------------
// Reveal — wraps a group and fades its text/glow in by player distance.
// ----------------------------------------------------------------------------
export function Reveal({ near = 8, far = 20, children, ...props }) {
  const ref = useRef();
  const cur = useRef(0);

  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const target = revealFactor(g, near, far);
    cur.current += (target - cur.current) * 0.12;
    const r = cur.current;
    g.visible = r > 0.02;
    if (!g.visible) return;

    g.traverse((o) => {
      if (o.isMesh && typeof o.fillOpacity === "number") {
        // troika text mesh
        o.fillOpacity = r;
        o.outlineOpacity = r;
      } else if (o.isMesh && o.userData.__glow && o.material) {
        let b = _baseMat.get(o.material);
        if (!b) {
          b = { o: o.material.opacity, e: o.material.emissiveIntensity || 0 };
          _baseMat.set(o.material, b);
          o.material.transparent = true;
        }
        // keep a faint glow when far (so the sign is discoverable), full when near
        o.material.opacity = b.o * (0.25 + 0.75 * r);
        if (b.e) o.material.emissiveIntensity = b.e * (0.2 + 0.8 * r);
      }
    });
  });

  return (
    <group ref={ref} {...props}>
      {children}
    </group>
  );
}

// ----------------------------------------------------------------------------
// Facing — yaw-rotates so its children face the camera (for markers + terminal).
// Subtracts the parent's world yaw, so a sign placed inside a ROTATED group
// (e.g. the Academy) still faces the camera instead of rendering backwards.
// Yaw-only (no negative-scale flips) — text always reads the right way round.
// ----------------------------------------------------------------------------
const _fp = new THREE.Vector3();
const _fq = new THREE.Quaternion();
const _fe = new THREE.Euler();
export function Facing({ children, ...props }) {
  const ref = useRef();
  const { camera } = useThree();
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    g.getWorldPosition(_fp);
    const desired = Math.atan2(camera.position.x - _fp.x, camera.position.z - _fp.z);
    let parentYaw = 0;
    if (g.parent) {
      g.parent.getWorldQuaternion(_fq);
      _fe.setFromQuaternion(_fq, "YXZ");
      parentYaw = _fe.y;
    }
    g.rotation.set(0, desired - parentYaw, 0);
  });
  return (
    <group ref={ref} {...props}>
      {children}
    </group>
  );
}

// ----------------------------------------------------------------------------
// Chips3D — a row of small glowing tech chips (tower rooms / project shrines).
// ----------------------------------------------------------------------------
function Chips3D({ items = [], color = "#00d4ff", size = 0.17, gap = 0.14 }) {
  const widths = items.map((t) => Math.max(0.55, t.length * size * 0.62 + 0.28));
  const total = widths.reduce((a, b) => a + b, 0) + gap * Math.max(0, items.length - 1);
  let x = -total / 2;
  return (
    <>
      {items.map((t, i) => {
        const w = widths[i];
        const cx = x + w / 2;
        x += w + gap;
        return (
          <group key={t} position={[cx, 0, 0]}>
            <mesh userData={{ __glow: true }}>
              <planeGeometry args={[w, size * 2]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} transparent opacity={0.16} />
            </mesh>
            <Text
              position={[0, 0, 0.012]}
              fontSize={size}
              anchorX="center"
              anchorY="middle"
              color="#eaf6ff"
              outlineWidth={0.004}
              outlineColor={color}
              fillOpacity={0}
              outlineOpacity={0}
            >
              {t}
            </Text>
          </group>
        );
      })}
    </>
  );
}

// ----------------------------------------------------------------------------
// Billboard — large lit sign: heading + a few lines (+ optional chips).
// ----------------------------------------------------------------------------
export function Billboard({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 4.4,
  height = 2.6,
  color = "#00d4ff",
  heading,
  headingSize = 0.5,
  lines = [],
  bodySize = 0.3,
  chips = null,
  near = 9,
  far = 22,
  faceCamera = false,
}) {
  const body = Array.isArray(lines) ? lines.filter(Boolean).join("\n") : lines;
  const content = (
    <>
      <mesh castShadow>
        <boxGeometry args={[width, height, 0.18]} />
        <meshStandardMaterial color="#0b1222" metalness={0.4} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0, 0.1]} userData={{ __glow: true }}>
        <planeGeometry args={[width - 0.24, height - 0.24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} transparent opacity={0.1} />
      </mesh>
      <mesh position={[0, height / 2 - 0.12, 0.1]} userData={{ __glow: true }}>
        <planeGeometry args={[width - 0.24, 0.06]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.1} transparent opacity={0.9} />
      </mesh>
      <Text
        position={[0, height / 2 - 0.4, 0.12]}
        fontSize={headingSize}
        maxWidth={width - 0.7}
        anchorX="center"
        anchorY="top"
        textAlign="center"
        color="#ffffff"
        outlineWidth={0.012}
        outlineColor={color}
        fillOpacity={0}
        outlineOpacity={0}
      >
        {heading}
      </Text>
      {body && (
        <Text
          position={[0, height / 2 - 0.55 - headingSize, 0.12]}
          fontSize={bodySize}
          maxWidth={width - 0.8}
          anchorX="center"
          anchorY="top"
          textAlign="center"
          lineHeight={1.35}
          color="#cfe6ff"
          fillOpacity={0}
        >
          {body}
        </Text>
      )}
      {chips?.length ? (
        <group position={[0, -height / 2 + 0.4, 0.12]}>
          <Chips3D items={chips} color={color} />
        </group>
      ) : null}
    </>
  );

  return (
    <Reveal position={position} rotation={rotation} near={near} far={far}>
      {faceCamera ? <Facing>{content}</Facing> : content}
    </Reveal>
  );
}

// ----------------------------------------------------------------------------
// Plaque — engraved panel for a block of text on a wall/plinth.
// ----------------------------------------------------------------------------
export function Plaque({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 3,
  height = 2,
  color = "#9d4edd",
  heading,
  lines = [],
  headingSize = 0.3,
  bodySize = 0.21,
  near = 7,
  far = 16,
  faceCamera = false,
}) {
  const body = Array.isArray(lines) ? lines.filter(Boolean).join("\n") : lines;
  const pad = 0.26;
  const panel = (
    <>
      <mesh castShadow>
        <boxGeometry args={[width, height, 0.14]} />
        <meshStandardMaterial color="#15131d" metalness={0.55} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.072]} userData={{ __glow: true }}>
        <planeGeometry args={[width - 0.16, height - 0.16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} transparent opacity={0.07} />
      </mesh>
      {heading && (
        <Text
          position={[-width / 2 + pad, height / 2 - pad, 0.09]}
          fontSize={headingSize}
          maxWidth={width - pad * 2}
          anchorX="left"
          anchorY="top"
          color="#ffffff"
          outlineWidth={0.006}
          outlineColor={color}
          fillOpacity={0}
          outlineOpacity={0}
        >
          {heading}
        </Text>
      )}
      {body && (
        <Text
          position={[-width / 2 + pad, height / 2 - pad - (heading ? headingSize + 0.2 : 0), 0.09]}
          fontSize={bodySize}
          maxWidth={width - pad * 2}
          anchorX="left"
          anchorY="top"
          lineHeight={1.42}
          color="#d7d2e6"
          fillOpacity={0}
        >
          {body}
        </Text>
      )}
    </>
  );
  return (
    <Reveal position={position} rotation={rotation} near={near} far={far}>
      {faceCamera ? <Facing>{panel}</Facing> : panel}
    </Reveal>
  );
}

// ----------------------------------------------------------------------------
// Marker — small camera-facing label (place name / project title).
// ----------------------------------------------------------------------------
export function Marker({ position = [0, 0, 0], color = "#9bd0ff", children, size = 0.5, near = 12, far = 30 }) {
  return (
    <Reveal position={position} near={near} far={far}>
      <Facing>
        <Text
          fontSize={size}
          anchorX="center"
          anchorY="middle"
          maxWidth={7}
          textAlign="center"
          color="#ffffff"
          outlineWidth={0.02}
          outlineColor={color}
          fillOpacity={0}
          outlineOpacity={0}
        >
          {children}
        </Text>
      </Facing>
    </Reveal>
  );
}

// ----------------------------------------------------------------------------
// Inspectable — registers proximity, shows a clickable "⊕ Inspect (E)" chip,
// and opens the diegetic terminal for dense content. Wrap any surface(s).
// ----------------------------------------------------------------------------
const _ip = new THREE.Vector3();

function openInspect(obj, beat, title, offsetY) {
  if (!obj) return;
  obj.getWorldPosition(_wp);
  useStore.getState().setInspectTarget({ beat, title, anchor: [_wp.x, _wp.y + offsetY, _wp.z] });
}

export function Inspectable({ id, beat, title, range = 7, offsetY = 2.4, children }) {
  const ref = useRef();
  const wasNear = useRef(false);
  const [showChip, setShowChip] = useState(false);

  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    g.getWorldPosition(_ip);
    const now = playerPos.distanceTo(_ip) < range;
    if (now === wasNear.current) return;
    wasNear.current = now;
    setShowChip(now);
    const st = useStore.getState();
    if (now) st.setNearInspect({ id, beat, title, anchor: [_ip.x, _ip.y + offsetY, _ip.z] });
    else if (st.nearInspect?.id === id) st.setNearInspect(null);
  });

  useEffect(() => {
    // clear our registration if we unmount while in range (storyline switch)
    return () => {
      const st = useStore.getState();
      if (st.nearInspect?.id === id) st.setNearInspect(null);
    };
  }, [id]);

  return (
    <group ref={ref}>
      {children}
      {showChip && (
        <Html position={[0, offsetY, 0]} center distanceFactor={11} style={{ pointerEvents: "auto" }} zIndexRange={[18, 0]}>
          <button
            className="inspect-chip"
            onClick={(e) => {
              e.stopPropagation();
              openInspect(ref.current, beat, title, offsetY);
            }}
          >
            ⊕ Inspect <kbd>E</kbd>
          </button>
        </Html>
      )}
    </group>
  );
}

// ----------------------------------------------------------------------------
// InspectTerminal — the diegetic holo-terminal. One per world (place at root).
// Opens from the nearest Inspectable (E key) or a chip click; Esc/✕/E closes.
// ----------------------------------------------------------------------------
export function InspectTerminal() {
  const target = useStore((s) => s.inspectTarget);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "e" || e.key === "E") {
        const st = useStore.getState();
        if (st.inspectTarget) st.setInspectTarget(null);
        else if (st.nearInspect) {
          const { beat, title, anchor } = st.nearInspect;
          st.setInspectTarget({ beat, title, anchor });
        }
      } else if (e.key === "Escape") {
        useStore.getState().setInspectTarget(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!target) return null;

  return (
    <Facing position={target.anchor}>
      <Html transform distanceFactor={6} style={{ pointerEvents: "auto" }} zIndexRange={[20, 0]}>
        <div className="inspect-terminal" key={`${target.beat}-${target.title}`}>
          <div className="term-bar">
            <span className="term-dot" />
            <span className="term-dot" />
            <span className="term-dot" />
            <span className="term-title">{target.title}</span>
            <button className="term-close" onClick={() => useStore.getState().setInspectTarget(null)} aria-label="Close">
              ✕
            </button>
          </div>
          <div className="term-body">
            <BeatContent beatId={target.beat} />
          </div>
          <div className="term-foot">press E or ✕ to close</div>
        </div>
      </Html>
    </Facing>
  );
}
