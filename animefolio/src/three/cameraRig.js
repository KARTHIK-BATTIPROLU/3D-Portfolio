// ============================================================================
// cameraRig — the shared camera craft layer (Phase 0).
//
//   focusTarget / setFocus  a world point the scenes update each frame so
//                           Depth-of-Field tracks the subject (cinematic focus).
//   dampFollow              a frame-rate-independent eased follow util — the
//                           reusable basis for both worlds' chase cameras and
//                           for hand-offs to/from authored (Theatre) moves.
// ============================================================================

import * as THREE from "three";

// Depth-of-field focus point (PostFx reads this as the DOF target).
export const focusTarget = new THREE.Vector3(0, 1.2, 0);
export function setFocus(x, y, z) {
  focusTarget.set(x, y, z);
}

// Eased follow: ease `camera` toward `pos` and aim it at `look`.
// `lambda` is the smoothing rate (higher = snappier); frame-rate independent.
const _p = new THREE.Vector3();
const _l = new THREE.Vector3();
export function dampFollow(camera, pos, look, dt, lambda = 3) {
  const a = 1 - Math.exp(-lambda * Math.min(dt, 0.05));
  camera.position.lerp(_p.set(pos[0], pos[1], pos[2]), a);
  camera.lookAt(_l.set(look[0], look[1], look[2]));
}
