# ANIMEFOLIO — TODO / IMPLEMENTATION (File 2 of 2)

> The actual step-by-step build, on top of the existing `animefolio/` R3F app. Read `ANIMEFOLIO_VISION.md` first. Work **top to bottom**; commit + `npm run build` at each ✅ checkpoint; **don't deploy** until Phase 4. Every task has a *Done when*.

**Global rules (apply to every task):** keep ALL content from `src/data/portfolio.js` / `story.js`; reuse the existing engine (store, registry, StorylineManager, ContentOverlay, Preloader, AudioController, TouchControls); diegetic content only (no floating cards); signs face camera + reveal by proximity; original creature/trainer/move names (no Pokémon IP/assets); no Spline editor on the page.

---

## ☐ PHASE 0 — Cleanup + foundation upgrade (work inside `animefolio/`)
- [ ] **Remove Spline editor/runtime.** Delete any `<iframe>` to `app.spline.design`, `@splinetool/react-spline`, or editor build. If using Spline geometry, **export glTF/GLB** and load via `useGLTF` only. No editor/inspector UI may render.
- [ ] **One build.** Retire the stray dev server/port; `animefolio/` is the single source of truth.
- [ ] **Install/confirm deps:** `@react-three/fiber @react-three/drei @react-three/rapier ecctrl @react-three/postprocessing @theatre/core @theatre/r3f lenis gsap howler three` + `gltfjsx` (dev) + Draco loader.
- [ ] **Asset manifest:** create `src/data/assets.js` (each asset: `path`, `credit`, `license`) + a `credits.md`. Add Draco/meshopt loader config.
- [ ] **Global render upgrade** in `Experience.jsx`: ACESFilmic tone mapping, drei `<Environment>` with a Poly Haven HDRI, fog, soft shadows, a color grade, and an `<EffectComposer>` with `<Bloom>` + `<DepthOfField>` + `<Vignette>` + `<Noise>` (adjustable). 
- [ ] **Reusable systems:** `three/CameraRig.jsx` (Theatre.js/GSAP camera timelines + DOF focus), `three/PostFX.jsx`, and an `AudioController` bus (Howler) wired to `store.muted`.
- [ ] **Keep/verify intact:** `portfolio.js`, `beats.js`, `useStore.js`, `registry.js`, `StorylineManager.js`, `ContentOverlay.jsx` (+ `.sr-only` SEO layer), `Preloader.jsx`, `TouchControls.jsx`, "Read as résumé" reader, `prefers-reduced-motion`.
- [ ] **Fill content blanks** in `portfolio.js`: email, education dates, `ADD_LIVE_URL`.

**Done when:** the *existing* Hub World + Creature Run already look dramatically richer (HDRI light, fog, grade, smooth camera, post-FX) with **no editor chrome** and one build; `npm run build` passes.

---

## ☐ PHASE 1 — Asset pipeline & art sourcing (replace grey-box)
- [ ] **Source CC0 models** into `public/models` and register in `assets.js`:
  - World/nature (grass, trees, rocks, props) — Quaternius / KayKit / Poly Haven.
  - Eiffel Tower, roller coaster + cart + ticket booth, circus tent + performer, **2–3 cars** — Sketchfab CC0 / KayKit (PSX cars) / Quaternius.
  - **Creatures** — Quaternius animals, re-skinned into your **original mascot** + wild creatures.
- [ ] **HDRIs/textures** — Poly Haven (a daytime/golden-hour sky for the world + a **sunset** HDRI for the lift) + ambientCG materials.
- [ ] **Avatar + animations** — Ready Player Me avatar (= the Trainer / your avatar); Mixamo clips (idle/walk/run/jump/wave/attack); retarget in Blender if needed.
- [ ] **Wrap + optimize** — `npx gltfjsx model.glb -T`; Draco/meshopt compress; `useGLTF.preload`; replace **all** grey-box placeholders in both worlds.

**Done when:** both worlds render with real textured assets + the new avatar/creature; load times reasonable; `assets.js` + `credits.md` complete.

---

## ☐ PHASE 2 — STORY ONE: THE METAVERSE (refactor `HubWorld.jsx` → `Metaverse.jsx`)
- [ ] **2.1 Entry sequence:** podium + **rotating avatar** under `<Sky>`, drifting drei `<Cloud>`, prompt "scroll to begin."
- [ ] **2.2 Cloud-part reveal:** clouds sweep aside + camera descends through them into the world (Theatre/GSAP timeline). Signature moment.
- [ ] **2.3 World + free-roam:** integrate **ecctrl** (click-to-move + WASD + joystick, damped follow cam) on the real grassland; place the **central podium** + **world-map plaque**; place the 4 zones (Right: coaster + circus; Left: tower + racetrack); **intro/about** diegetic at the podium; **proximity activation** (zones glow / signs reveal as you near).
- [ ] **2.4 Eiffel Tower zone (`EiffelLift.jsx`):** click-to-enter → lift rises → **sunset** (sunset HDRI/`<Sky>`) → **projects reveal one-by-one** via drei `<Text>` (fade/drop) → top: full landscape view → exit.
- [ ] **2.5 Roller Coaster zone (`RollerCoaster.jsx`):** ticket-counter interaction ("take ticket") → board → camera locks to cart on a Catmull-Rom spline → content flashes **trackside** as you ride → eject to world.
- [ ] **2.6 Circus Tent zone (`CircusTent.jsx`):** interior + crowd + spotlit performer → **each act reveals one project** → exit.
- [ ] **2.7 Racetrack zone (`Racetrack.jsx`):** car-select → **ecctrl car** race → projects/achievements as **milestones** → finish → exit.
- [ ] **2.8 Remaining beats diegetic:** Skills, Education, Achievements, Contact as world features (signboards/structures/portal), revealed by proximity.
- [ ] **2.9 Polish:** camera acts (CameraRig), sound cues (Howler), post-FX tuning for this world.

**Done when:** the full open-world story is playable — roam, enter all four zones, each mini-experience works and reveals content diegetically; atmospheric; 60fps desktop; shuffle still works.

---

## ☐ PHASE 3 — STORY TWO: CREATURE QUEST (refactor `CreatureRun.jsx` → `CreatureQuest.jsx`)
- [ ] **3.1 Partners:** `CreatureMascot.jsx` (original) + `AvatarRPM.jsx` (Trainer); creature **hops onto the shoulder**; journey starts.
- [ ] **3.2 Route/biomes:** Lenis scroll drives the creature forward through biomes; **friendly encounters** + the Trainer **reveals a project** at each (diegetic dialogue via Pixel/Trainer).
- [ ] **3.3 Battle system (`BattleScene.jsx`):** wild encounter (= skill **domain**) triggers a **turn-based** battle UI (diegetic styling); player picks a **move = project** (original names) → effectiveness + animation/FX → HP/win → **XP/level**.
- [ ] **3.4 Boss battles:** each **project = boss** (Farm India = major boss, its ML model + State award as "powers"); defeat → **badge**.
- [ ] **3.5 Beats:** Chapters = experience; an academy zone = education; the send-off = contact.
- [ ] **3.6 Polish:** chase-cam + DOF, battle FX, sound, biome grading.

**Done when:** the full battler story is playable — creature hops on, journeys, turn-based battles reveal projects (moves) + domains (opponents), bosses = flagship projects; original IP; matches Story One's polish.

---

## ☐ PHASE 4 — Shared polish, mobile & ship
- [ ] **Rotation:** random pick + `?story=` + avoid-last + **Shuffle** verified across **both new** stories; "N/2 discovered" tracker updates.
- [ ] **Diegetic QA:** every sign faces the camera, never overlaps, reveals by proximity; **Pixel** narration anchored + never covers a sign.
- [ ] **Accessibility/SEO:** hidden `.sr-only` content complete + crawlable; **"📄 Read as résumé"** reader works; `prefers-reduced-motion` path; meta + OG + favicon; title "Karthik Battiprolu — AnimeFolio".
- [ ] **Performance:** drei `PerformanceMonitor` adaptive DPR/post-FX; DPR cap; **code-split each storyline** (load only chosen); **idle-preload** the other; low-power path.
- [ ] **Mobile:** ecctrl joystick + touch scroll; test on a real phone.
- [ ] **QA:** Chrome / Safari / Firefox + phone; `npm run build` passes.
- [ ] **Deploy (only now):** Vercel — Root Directory `animefolio`, build `npm run build`, output `dist`; connect GitHub for auto-deploy; custom domain if available.

**Done when:** both stories smooth on desktop + mid-range phone, fast (code-split + compressed), accessible/crawlable, reader mode works, **live on a public Vercel URL**.

---

## File map (old → new, building on the base)
| Existing (`animefolio/src/`) | Action |
|---|---|
| `data/portfolio.js`, `data/beats.js` | keep (fill blanks) |
| `store/useStore.js`, `storylines/registry.js`, `StorylineManager.js` | keep / extend |
| `components/ContentOverlay.jsx` (+SEO), `Preloader.jsx`, `AudioController.jsx`, `TouchControls.jsx`, `ActiveStoryline.jsx`, `Experience.jsx` | keep / upgrade |
| `storylines/HubWorld.jsx` | **→ `Metaverse.jsx`** (Phase 2) |
| `storylines/CreatureRun.jsx` | **→ `CreatureQuest.jsx`** (Phase 3) |
| `three/models/RobotAvatar.jsx` | **→ `AvatarRPM.jsx`** |
| `three/models/FoxCreature.jsx` | **→ `CreatureMascot.jsx`** |
| — | **new:** `data/assets.js`, `three/CameraRig.jsx`, `three/PostFX.jsx`, `three/BattleScene.jsx`, zone files `EiffelLift/RollerCoaster/CircusTent/Racetrack.jsx` |

---

## Acceptance checklist (tick before calling it done)
- [ ] No Spline/editor chrome anywhere; one build; `npm run build` passes.
- [ ] Real CC0 assets + HDRI lighting + grade + Bloom/DOF/Vignette + sound in both worlds.
- [ ] Story One: roam + all 4 zones enterable, each mini-experience works, content diegetic.
- [ ] Story Two: hop-on + journey + turn-based battles (moves=projects, opponents=domains, bosses=flagship projects), original IP.
- [ ] Random pick + Shuffle + discovered tracker work across both.
- [ ] Reader mode + SEO layer + reduced-motion + mobile joystick all work.
- [ ] 60fps desktop, graceful mobile; deployed to Vercel.
