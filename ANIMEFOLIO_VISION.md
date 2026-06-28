# ANIMEFOLIO — VISION (File 1 of 2)

> The complete idea. Read this first to understand *what* we're building and *why*. The companion file `ANIMEFOLIO_TODO.md` is the step-by-step *how*. Everything here builds on the existing `animefolio/` R3F app — we extend the base, we don't restart.

---

## 1 · The soul
AnimeFolio is a **metaverse portfolio**: the same résumé content (Karthik Battiprolu's projects, skills, experience, education, contact) is experienced through **two completely different, randomly-served interactive 3D worlds**. You learn who Karthik is by *moving through* and *playing* — never by reading a card. Every detail is **diegetic** (lives in the world or is spoken by a guide). On each visit one of the two stories is picked at random; a Shuffle button swaps live.

Two worlds, one résumé underneath:
- **Story One — THE METAVERSE:** a big, roamable grassland world you explore freely; four landmark zones each have a real mini-experience that reveals your work.
- **Story Two — CREATURE QUEST:** a monster-battler adventure where an original creature journeys, befriends, and battles — your projects are the moves, your skill domains are the opponents.

---

## 2 · The existing base (what we build on)
**Repo:** `3D-Portfolio/` → the live app is in **`animefolio/`** (React + R3F). The repo root is the retired vanilla v1 (Neon Path / Car Ride) — keep it as reference only.

**KEEP & EXTEND (this architecture is good):**
- `src/data/portfolio.js` — single source of truth for content.
- `src/data/beats.js` — the 7 ordered beats every storyline presents (`intro → about → skills → experience → projects → education → contact`).
- `src/store/useStore.js` — zustand store (active storyline, beat, scroll progress, muted, discovered…).
- `src/storylines/registry.js` + `StorylineManager.js` — random pick, `?story=` override, avoid-last, lazy-mount, **Shuffle** swap, clean dispose.
- `src/components/`: `ContentOverlay.jsx` (+ hidden `.sr-only` SEO layer), `Preloader.jsx` (real `useProgress` + Enter gate), `AudioController.jsx`, `TouchControls.jsx` (mobile joystick), `ActiveStoryline.jsx` (keyed lazy mount), `ScrollDriver.jsx`, `Experience.jsx` (Canvas + post-FX).
- `src/three/ModelBoundary.jsx` (graceful model fallback), `models/*`, `audio.js`, `input.js`.

**UPGRADE:** real lighting/atmosphere (HDRI), real assets (replace grey-box), directed camera, stronger post-FX, sound — and **rebuild the two storylines** into the new stories below.

**REMOVE:** any Spline editor/viewer chrome (use glTF export only); the floating content cards (go fully diegetic); the placeholder grey-box look.

**Map old → new:**
- `storylines/HubWorld.jsx` → **`storylines/Metaverse.jsx`** (Story One).
- `storylines/CreatureRun.jsx` → **`storylines/CreatureQuest.jsx`** (Story Two).
- `three/models/RobotAvatar.jsx` → **`AvatarRPM.jsx`** (Ready Player Me avatar).
- `three/models/FoxCreature.jsx` → **`CreatureMascot.jsx`** (original creature).
- New: `data/assets.js` (manifest), `three/CameraRig.jsx` (Theatre/GSAP), `three/PostFX.jsx`, `three/BattleScene.jsx`, zone components (`EiffelLift`, `RollerCoaster`, `CircusTent`, `Racetrack`).

---

## 3 · Quality bar & art direction
**Reference tier** (top Awwwards / cinematic 3D). "Premium" = real textured assets + HDRI lighting + fog + color grade + directed camera + buttery eased motion + tasteful post-FX (bloom/DOF/vignette/grain) + sound. Reject flat grey-box looks.

**Story One — The Metaverse:** natural grasslands (Decentraland-inspired), warm and alive. Palette: **sky blue → golden-hour gold**, grass greens, stone podium, neon-cyan accents for interactables. Sunset is the signature mood (the tower lift).

**Story Two — Creature Quest:** vibrant, game-y, dusk/biome palette. Palette: **electric yellow + teal + magenta** on deep indigo; battle UI in dark neon panels.

---

## 4 · The free / open-source toolkit (everything is free & publishable)
- **3D models (CC0):** Quaternius (creatures, nature, vehicles, characters), Kenney, KayKit / Kay Lousberg (City Builder, Platformer, PSX cars), Poly Haven (models + textures + **HDRIs**), Poly Pizza, ambientCG (PBR materials), Sketchfab CC0. Index: `github.com/madjin/awesome-cc0`.
- **Avatar + animation (free):** Ready Player Me (selfie → glTF avatar = "the Trainer"/your avatar), Mixamo (free rig + idle/walk/run/jump/wave/attack clips), `gltfjsx` (glb → React component), Blender (convert/retarget).
- **Beauty features (already in stack):** `@react-three/drei` — `<Environment>` (HDRI lighting), `<Sky>` (sunset), `<Cloud>`/`<Stars>`/`<Sparkles>`, `<Lightformer>`, SDF `<Text>` (diegetic signs). `@react-three/postprocessing` — `<EffectComposer>` with `<Bloom>` + `<DepthOfField>` + `<Noise>` + `<Vignette>`.
- **Controls + the car game:** **ecctrl** (MIT, R3F + Rapier) — free-roam character controller, **torque-driven cars**, mobile joystick, runtime animation states. Drives both the avatar roaming *and* the racetrack mini-game.
- **Motion / camera / sound:** Lenis (smooth scroll), GSAP + Theatre.js (cinematic camera timelines), Howler.js + Freesound/Pixabay (ambient + cues).

---

## 5 · STORY ONE — THE METAVERSE (free-roam open world)
A big, atmospheric, walkable grassland world. The avatar roams freely (ecctrl: click-to-move + WASD + mobile joystick; damped follow camera). **Proximity matters** — zones glow/activate as you approach, signs reveal as you near them. A guide mascot ("Pixel", original) leads between zones. Content is diegetic; **projects are the primary content revealed at every zone**, with the other beats placed around the world.

**Flow:**
1. **First contact** — your 3D avatar rotates on a **podium** under a soft sky; clouds drift; prompt: *"scroll to begin."*
2. **The clouds part** — clouds sweep aside, camera descends through them, revealing the whole grassland world below (Theatre/GSAP camera + drei `<Cloud>`/`<Sky>`).
3. **The world** — you land near the **central podium**; beside it a **world-map plaque** (the full map). Four zones around it: **Right — Roller Coaster + Circus Tent; Left — Eiffel Tower + Racetrack.** Intro + About are diegetic at the podium. Free roam; click a zone to enter.
4. **Eiffel Tower → PROJECTS** — *click to enter* → the **lift rises** while a **sunset** opens behind you → your projects reveal **one by one** (drei `<Text>` fading/dropping in the atmosphere) → at the top you see the **entire landscape** below → exit.
5. **Roller Coaster → EXPERIENCE/PROJECTS** — walk to the **ticket counter**, *take a ticket*, board → the camera rides the cart on the spline at speed → content flashes by **trackside** as you ride → exit. (Smooth, you feel like you're *in* it.)
6. **Circus Tent → PROJECTS** — step inside, you're **in the crowd**; a performer (acrobat/animal) performs under spotlights → **each act reveals one project** → exit.
7. **Racetrack → PROJECTS/ACHIEVEMENTS** — *select a car* → a real **race** (ecctrl car) → projects/achievements appear as **milestones** you pass → finish → exit.
8. **Remaining beats** — Skills, Education, Achievements, Contact placed as world features (signboards/structures/portal), revealed by proximity.

---

## 6 · STORY TWO — CREATURE QUEST (monster-battler, ORIGINAL IP)
A creature-collector / monster-battler adventure (the *genre* of Pokémon, built with **your own original creature, trainer, and move/element names** — no Nintendo/Pokémon names, designs, or assets, so it's legally yours to publish).

**Flow:**
1. **Partners** — your **original electric creature** dashes in and **hops onto the Trainer's shoulder**; the journey begins.
2. **The route** — scroll travels them through biomes (Lenis); they meet **friendly creatures**; the Trainer **reveals a project** through each encounter (e.g. "This one? Farm India.").
3. **Wild encounter → battle** — a **wild creature = a skill domain** appears (e.g. "AI & Automation"). Turn-based battle UI (diegetic). You pick a **move = one of your projects** (original names: "Farm India Strike", "MERN Combo", "Flutter Dash", "Python Bolt", "Graph Surge"). Land the hit → win.
4. **Victory / progression** — domain mastered; XP bar fills; creature levels up; next chapter opens.
5. **Boss battles = flagship projects** — **Farm India** as the major boss (its ML model + State award = its "powers"), then the other projects. Defeat → badge.
6. **Chapters = EXPERIENCE; Academy = EDUCATION; Send-off = CONTACT** — the journey ends with the invitation to connect.

**Battle system (minimal, achievable):** turn-based; player chooses a move (project) vs an opponent (domain); simple effectiveness logic + animation/FX; HP/XP bars; win → advance. Original "elements" if typing is needed (e.g. Code / Build / Logic) — no Pokémon type names.

---

## 7 · Shared systems
- **Two-story rotation:** random pick on load (`?story=` override, avoid-last), **Shuffle** swaps live, "N / 2 discovered" tracker. (Already in `StorylineManager`.)
- **Diegetic content + guide:** all info on in-world signs/screens/objects or spoken by **Pixel** (original guide mascot). Signs **face the camera**, **never overlap**, **reveal by proximity**. Pixel's dialogue is anchored to Pixel and never covers a sign.
- **Always readable for recruiters:** keep the hidden `.sr-only` DOM content (SEO + screen readers) **and** a quiet **"📄 Read as résumé"** reader mode (also the `prefers-reduced-motion` fallback).
- **Mobile + performance:** ecctrl joystick + touch; drei `PerformanceMonitor` adaptive quality; capped DPR; **code-split each storyline**; idle-preload the other; low-power path.

---

## 8 · Content — `animefolio/src/data/portfolio.js`
```js
export const portfolio = {
  name: "Karthik Battiprolu",
  headline: "Co-founder @ HyderabadCoders · AI & Data Science @ CBIT · Aspiring Metaverse Developer",
  email: "kbattiprolu@gmail.com",            // confirm
  linkedin: "linkedin.com/in/karthikbattiprolu-3b9694300",
  location: "Hyderabad, India",
  about: "Full-stack problem solver who's built across Android, MERN web, and agentic-AI automations. " +
         "Identify the real problem, pick the stack that fits, ship it. Currently deep into agentic AI " +
         "(LangChain, n8n, CrewAI) and immersive 3D web experiences.",
  skills: {
    languages:["JavaScript","Python","Java","Dart"], frontend:["React","Three.js","HTML5","CSS3","Bootstrap"],
    backend:["Node.js","Express","REST APIs"], databases:["MongoDB","Graph databases","Firebase"],
    mobile:["Android (Java)","Flutter"], ai_automation:["LangChain","n8n","CrewAI","ML integration","Agentic AI"],
    other:["Blockchain (fundamentals)","System design","Git"],
  },
  experience: [
    { role:"Co-Founder", org:"HyderabadCoders", dates:"Nov 2025 – Present", note:"Building a developer community in Hyderabad." },
    { role:"Junior Coordinator", org:"Toastmasters International (CBIT)", dates:"Aug 2025 – Present" },
    { role:"Google Campus Ambassador", org:"Google", dates:"Oct 2025 – Dec 2025" },
    { role:"Science Club Organizer", org:"SGMGPT, Abdullapurmet", dates:"Sep 2023 – Apr 2024", note:"Founded a student club for knowledge-sharing." },
  ],
  education: [
    { school:"Chaitanya Bharathi Institute of Technology (CBIT)", degree:"B.Tech — Artificial Intelligence & Data Science", dates:"confirm" },
    { school:"Sanjay Gandhi Memorial Govt. Polytechnic (SGMGPT)", degree:"Diploma — Computer Science Engineering", dates:"2022 – 2025 // confirm" },
    { school:"Temries, Choutuppal", degree:"High School", note:"9.5 GPA", dates:"confirm" },
  ],
  projects: [
    { name:"Farm India", flagship:true,
      blurb:"A full-scale Android platform connecting farmers, agricultural vendors, and consumers — farmers sell produce, vendors sell pesticides/fertilizers, and an integrated ML model identifies crop diseases from images. One backend + database serving the whole ecosystem.",
      tech:["Android (Java)","Machine Learning","REST backend","Database"], status:"Built · 5th place, State level (Srujana TechFest)", link:null },
    { name:"Student Resource Sharing App", blurb:"A Flutter app where students upload and access exam resources (PDFs, PPTs) by subject/branch.", tech:["Flutter","Dart"], status:"In progress (~50%)", link:null },
    { name:"HyderabadCoders Community Platform", blurb:"A live website with authentication where students join and download resources — previous-year papers, EAMCET/ECET results, and branch cutoffs.", tech:["Web","Authentication"], status:"Live", link:"ADD_LIVE_URL" },
    { name:"Certificate Generator", blurb:"An email-gated certificate portal — admin uploads a template, users log in via a 15-minute JWT window, enter their name, and download a personalized certificate rendered dynamically.", tech:["JWT auth","Firebase","Python (image/PDF rendering)"], status:"Built · Demo", link:null },
  ],
  certifications: ["Srujana TechFest — District Winner & 5th at State level","Mastering Python, Pandas, NumPy","Foundations of Web Development: CSS, Bootstrap, JS, React"],
};
```
**Blanks to fill before building:** confirm email · real education dates · HyderabadCoders live URL.

---

## 9 · Definition of done (the whole vision)
Two **complete, coherent** stories, each in an **immersive atmospheric world**, picked at random with a working Shuffle. **Story One:** roam the grassland, enter all four zones, ride the coaster (ticket→ride), take the Eiffel lift through the sunset, race a car, watch the circus — each revealing your work diegetically. **Story Two:** the creature hops on, journeys biomes, and turn-based battles reveal your projects (moves) and domains (opponents), bosses = flagship projects. Real CC0 assets + HDRI lighting + grade + post-FX + directed camera + sound throughout. No floating cards, no Spline/editor chrome, original creature IP. 60fps desktop; graceful mobile; reader mode + SEO + reduced-motion. `npm run build` passes; deployable to Vercel.
