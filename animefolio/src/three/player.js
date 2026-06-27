// ============================================================================
// playerPos — the character's current world position, shared across the engine.
// Each storyline's controller writes it every frame (Hub avatar, Creature
// runner). In-world content surfaces read it to drive distance-based reveal and
// "inspect" proximity — so thresholds are measured from the CHARACTER, not the
// camera (which sits far behind/above and differs per world).
// ============================================================================

import * as THREE from "three";

export const playerPos = new THREE.Vector3(0, 0, 0);

export function setPlayerPos(x, y, z) {
  playerPos.set(x, y, z);
}
