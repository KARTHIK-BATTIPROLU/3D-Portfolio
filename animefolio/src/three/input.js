// ============================================================================
// Shared mutable input (no React re-renders). The on-screen TouchControls
// joystick writes here each frame; Metaverse's Avatar reads it like WASD.
//   x: -1 (left) … +1 (right)   y: -1 (up/forward) … +1 (down/back)
// ============================================================================

export const touchInput = { x: 0, y: 0 };
