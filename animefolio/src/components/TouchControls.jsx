// ============================================================================
// TouchControls — an on-screen virtual joystick for free-roam on touch devices.
// Writes a normalized vector into the shared touchInput; the Avatar consumes it.
// ============================================================================

import { useRef } from "react";
import { touchInput } from "../three/input.js";

const RADIUS = 48; // px the knob can travel

export default function TouchControls() {
  const baseRef = useRef();
  const knobRef = useRef();
  const active = useRef(false);

  const setVec = (x, y) => {
    touchInput.x = x;
    touchInput.y = y;
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${x * RADIUS}px, ${y * RADIUS}px)`;
    }
  };

  const move = (e) => {
    if (!active.current || !baseRef.current) return;
    const r = baseRef.current.getBoundingClientRect();
    let dx = (e.clientX - (r.left + r.width / 2)) / RADIUS;
    let dy = (e.clientY - (r.top + r.height / 2)) / RADIUS;
    const m = Math.hypot(dx, dy);
    if (m > 1) {
      dx /= m;
      dy /= m;
    }
    setVec(dx, dy);
  };

  const start = (e) => {
    active.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    move(e);
  };
  const end = () => {
    active.current = false;
    setVec(0, 0);
  };

  return (
    <div
      className="touch-joystick"
      ref={baseRef}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div className="touch-knob" ref={knobRef} />
    </div>
  );
}
