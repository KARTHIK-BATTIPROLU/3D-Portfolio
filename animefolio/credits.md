# AnimeFolio — Asset Credits & Pipeline

All external assets are registered in [`src/data/assets.js`](src/data/assets.js).
Components import from that manifest — **never hardcode a path in a component.**

## Source → compress → register

1. **Source** a quality CC0 / properly-licensed asset
   (Poly Haven · Quaternius · Poly Pizza · Kenney · KitBash3D · Sketchfab CC0).
2. **Compress**
   - glTF meshes → **Draco**: `npx gltf-transform optimize in.glb out.glb --compress draco`
     (or `gltfpack`). Textures → **KTX2/basis** where possible.
   - HDRIs → 1–2k `.hdr` for web (don't ship 4k+).
   - Audio → `.webm`/`.mp3`, loudness-normalised, loops trimmed.
3. **Place** the file under `animefolio/public/…`.
4. **Register** it in `src/data/assets.js` (set `path`, `credit`, `license`, and
   `draco: true` if Draco-compressed). Done — the app picks it up.

The self-hosted Draco decoder lives in `public/draco/gltf/` (from three.js,
Apache-2.0) and is wired through `useGLTF(url, DRACO_PATH)`.

## Current assets (stand-ins)

| Asset | Source | License |
|---|---|---|
| `hdriSunset` — Venice Sunset 1k | Poly Haven | CC0 |
| `modelRobot` — RobotExpressive | three.js examples (Tomás Laulhé, mod. Don McCurdy) | CC0 |
| `modelFox` — Fox | Khronos glTF-Sample-Models (PixelMannen / @tomkranis) | CC0 mesh · CC-BY 4.0 rig |
| Draco decoder | three.js | Apache-2.0 |

## To source for Phase A (slots already in the manifest)

`avatar` (rigged hero glTF), `envKit` (environment kit), `hdriStudio`,
`hdriGolden` (golden-hour sky), `lutGrade` (`.cube`), `audioAmbient`, `audioWhoosh`.
Fill the matching entry in `assets.js` once the file is in `/public`.
