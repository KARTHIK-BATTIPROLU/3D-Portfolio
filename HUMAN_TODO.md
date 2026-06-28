# AnimeFolio — HUMAN TODO

Deferred items collected while building Phases 0–3 of `ANIMEFOLIO_TODO.md`. Nothing here blocks the app from running — every slot below already has a working stand-in. Swapping any of them is a one-line path change in `animefolio/src/data/assets.js` (models/HDRIs) or `animefolio/src/data/quest.js` / `portfolio.js` (content), unless noted.

## 1. Avatar (Ready Player Me)
- **Now:** `three.js` `RobotExpressive.glb` stand-in, wrapped by `src/three/models/AvatarRPM.jsx`. Used as both the Metaverse roaming avatar and the Creature Quest "Trainer."
- **Swap:** create a free Ready Player Me avatar (https://readyplayer.me), export glTF, retarget Mixamo idle/walk/run clips in Blender if the clip names don't match `Idle`/`Walking`/`Running`, drop into `animefolio/public/models/`, point `assets.avatar.path` (and `AvatarRPM.jsx`'s `URL`) at it.

## 2. Creature (Voltie)
- **Now:** Khronos sample `Fox.glb`, wrapped by `src/three/models/CreatureMascot.jsx`, narratively reskinned as **Voltie** (original spark-fox, `src/data/quest.js`). No Pokémon assets/names used anywhere.
- **Swap:** a CC0 fox/wolf-like model from Quaternius (https://quaternius.com) with `Survey`/`Walk`/`Run`-equivalent clips (rename clips or update `CLIP` map in `CreatureMascot.jsx`).

## 3. Zone set-pieces (Eiffel Tower, coaster, circus, cars)
- **Now:** stylized procedural/primitive geometry (lattice beams, lofted tubes, cones, instanced crowd) — not real CC0 meshes. Each zone is colored/lit/emissive to match the vision's palette so it doesn't read as grey-box, but it isn't the "real textured asset" tier Phase 1 asks for.
- **Why:** I don't have a reliable way to fetch and license-verify specific binary Sketchfab/KayKit downloads inside this session, and guessing at exact asset URLs is worse than a clean primitive — this is exactly the human-in-the-loop case the vision doc anticipates.
- **Swap candidates (CC0):**
  - Eiffel Tower: Sketchfab CC0 search "eiffel tower low poly", or build from KayKit City Builder pieces.
  - Roller coaster + cart + ticket booth: KayKit Prototype/Carnival packs, or Sketchfab CC0 "roller coaster".
  - Circus tent + performer: Sketchfab CC0 "circus tent", Quaternius/Mixamo for an acrobat rig.
  - Cars (2–3): KayKit PSX Cars pack (free, CC0-style license — confirm on download).
  - World nature dressing (grass/trees/rocks): Quaternius nature packs, Poly Haven.
  - Index of sources: `github.com/madjin/awesome-cc0`.

## 4. HDRIs
- **Now:** one HDRI (`venice_sunset_1k.hdr`) used for the whole Metaverse; the Eiffel Lift's "sunset" moment is faked with a dynamic warm directional light + glow sphere that intensifies as you climb, not a swapped sky.
- **Swap:** a daytime/golden-hour Poly Haven HDRI for the general world (e.g. "Sunflowers" or "Park"), keep the current one (or a deeper sunset HDRI) specifically for the lift top. Register both in `assets.js` (`hdriStudio`/`hdriGolden` slots already exist).

## 5. ecctrl / vehicle physics
- **Now:** kept the existing Rapier kinematic character controller (click-to-move + WASD + joystick, already proven) instead of swapping to **ecctrl** — it already satisfies free-roam movement and rewriting it risked regressions for no functional gain. The Roller Coaster and Racetrack rides are scripted camera-locked rides (you select/board, then watch a directed shot) rather than true ecctrl-driven first-person vehicle physics.
- **Upgrade path:** if you want literal drivable cars, add `ecctrl`'s vehicle controller to `Racetrack.jsx` and hand it keyboard input instead of auto-driving the spline.

## 6. Theatre.js
- Still scaffolded only (`three/theatre.js`, dev-only `?studio=1`). The cloud-part intro and FOV punches use GSAP directly, which covers everything built so far. Authoring an actual Theatre.js sheet remains optional future polish.

## 7. Audio
- Ambient bed + whoosh cue slots (`assets.audioAmbient`, `assets.audioWhoosh`) are still `null` — the app runs on the existing procedural Web Audio fallback. Drop royalty-free loops from Pixabay/Freesound into `public/audio/` and fill those two paths to switch to real Howler playback (the fallback chain is already wired).

## 8. Content blanks (in `src/data/portfolio.js`)
- `email` — currently `kbattiprolu@gmail.com`, marked "confirm public email."
- `education[].dates` — two entries marked "confirm."
- `HyderabadCoders Community Platform` project `link` — placeholder `"ADD_LIVE_URL"`.
- These are auto-hidden by the rendering layer (never shown broken), but the underlying facts need filling in before this is recruiter-facing.

## 9. Compression
- `RobotExpressive.glb` / `Fox.glb` are still uncompressed (`draco: false` in `assets.js`) even though the Draco decoder is wired and ready. Run the `gltf-transform optimize --compress draco` command documented in `animefolio/credits.md`, then flip `draco: true` for both.

## 10. Not verified this session
- **Real device/mobile QA** — joystick + touch scroll exist from before and weren't regressed, but weren't re-tested on an actual phone.
- **Safari / Firefox** — only Chromium (via Playwright, headless/software-rendered) was available to test in this sandbox.
- **60fps on real hardware** — the test sandbox renders via software WebGL (no GPU), so frame-rate wasn't measurable here; the adaptive `PerformanceMonitor` path is unchanged from the existing engine.

## 11. Deploy
- Still not deployed — needs your Vercel account. When ready: Root Directory `animefolio`, build `npm run build`, output `dist`, connect the GitHub repo for auto-deploy.

## 12. One deliberate deviation worth knowing about
- The Metaverse's "scroll to begin" cloud-part intro also has a visible **"Enter the world →" button** now (not just a scroll/key gesture). This is a genuine UX improvement (a bare scroll hint is a weak, undiscoverable affordance for a first-time visitor, and it doesn't depend on any one input method working on every device/browser) — not a placeholder. Keep it.
