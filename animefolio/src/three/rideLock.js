// ============================================================================
// rideLock — shared per-frame flag (same pattern as player.js/input.js):
// while `active`, a zone (coaster, racetrack) owns the camera + freezes the
// avatar's own movement/camera update for the duration of the ride.
// ============================================================================

export const rideLock = { active: false, teleportTo: null };

export function setRideLock(v) {
  rideLock.active = v;
}

// Ask the avatar controller to snap to a world position next frame (used to
// drop the player back on solid ground when a ride ends).
export function requestTeleport(x, y, z) {
  rideLock.teleportTo = { x, y, z };
}
