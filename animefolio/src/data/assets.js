// ============================================================================
// ASSET MANIFEST — the single source of truth for every external asset (models,
// HDRIs, audio, LUTs). Components NEVER hardcode a path: they import from here,
// so swapping a stand-in for a final asset is a one-line change in this file.
//
// Each entry: { path, type, credit, license, draco? }. `path` is under /public.
// See credits.md for the source → compress (Draco/ktx2) → register flow.
// ============================================================================

// Self-hosted Draco decoder (used by useGLTF for compressed glTF). three.js, Apache-2.0.
export const DRACO_PATH = "/draco/gltf/";

export const assets = {
  // --- in use (stand-ins for now) ------------------------------------------
  hdriSunset: {
    path: "/hdri/venice_sunset_1k.hdr",
    type: "hdri",
    credit: "Poly Haven — “Venice Sunset”",
    license: "CC0",
  },
  modelRobot: {
    path: "/models/RobotExpressive.glb",
    type: "model",
    credit: "three.js examples — RobotExpressive (Tomás Laulhé, mod. Don McCurdy)",
    license: "CC0",
    draco: false, // not yet Draco-compressed
  },
  modelFox: {
    path: "/models/Fox.glb",
    type: "model",
    credit: "Khronos glTF-Sample-Models — Fox (PixelMannen / @tomkranis)",
    license: "CC0 (mesh) · CC-BY 4.0 (rig)",
    draco: false,
  },

  // --- slots to fill with final assets (Phase A) ----------------------------
  // Drop the file in /public, then point these at it — nothing else changes.
  avatar:        { path: null, type: "model", credit: "", license: "" }, // A1 hero avatar (rigged glTF)
  envKit:        { path: null, type: "model", credit: "", license: "" }, // A3 environment kit
  hdriStudio:    { path: null, type: "hdri",  credit: "", license: "" }, // A1 soft studio light
  hdriGolden:    { path: null, type: "hdri",  credit: "", license: "" }, // A5 golden-hour sky
  lutGrade:      { path: null, type: "lut",   credit: "", license: "" }, // .cube color grade
  audioAmbient:  { path: null, type: "audio", credit: "", license: "" }, // ambient bed (loops)
  audioWhoosh:   { path: null, type: "audio", credit: "", license: "" }, // transition cue
};

export const getAsset = (id) => assets[id] || null;

// Resolve a model path + whether to route it through the Draco decoder.
export function modelSource(id) {
  const a = assets[id];
  if (!a || !a.path) return null;
  return { path: a.path, draco: a.draco ? DRACO_PATH : false };
}
