# AnimeFolio — Technical Specification

*Generated from a direct audit of the codebase at `animefolio/` on 2026-06-17. The repository root also contains a superseded vanilla-JS prototype (`index.html`, `main.js`, `style.css`, `package.json` — currently staged as deleted in git) that has been fully replaced by the React Three Fiber application described below. The root `README.md` still documents that old prototype's architecture and is stale; this document describes what is actually implemented in `animefolio/`.*

## 1. Problem Statement

A conventional resume or static portfolio page does not differentiate a candidate in a crowded field of self-taught and early-career developers. AnimeFolio reframes the personal portfolio as an explorable 3D experience: instead of scrolling past text blocks, a visitor walks or rides through a small world where each "place" reveals one section of the candidate's resume (skills, experience, projects, education, contact). The explicit goals are (1) memorability — a recruiter who spent two minutes in a 3D hub world remembers the candidate; (2) signal — building the experience itself demonstrates competence with 3D graphics, React, and physics, which is directly relevant to the candidate's stated ambition of becoming a "Metaverse Developer"; (3) replayability — content is decoupled from presentation, so the same résumé data can be re-experienced through a second, completely different "storyline" on a repeat visit. A strict accessibility/SEO fallback (the same content as flat, crawlable HTML) is treated as a hard requirement, not an afterthought, since 3D-only content is invisible to search engines, screen readers, and reduced-motion users.

## 2. Users

There are two real user populations and one operator:

- **Recruiters / hiring managers** — the primary audience. Likely first-time visitors, on desktop or mobile, who will give the experience well under a minute before deciding whether to continue. They need the headline facts (name, role, flagship project) within seconds and a low-friction way to skip straight to a conventional résumé if the 3D experience doesn't load or isn't to their taste.
- **Peers / community members** (from HyderabadCoders, CBIT, Toastmasters, Google Campus Ambassador network) — more likely to explore the full experience, replay it for the second storyline, and share the link.
- **Karthik Battiprolu (site owner/operator)** — the sole content maintainer. All résumé content is centralized in one file (`src/data/portfolio.js`) specifically so he can update his job/project history without touching any rendering code.

There is no multi-tenant concept, no accounts, and no persisted user data beyond a same-browser `localStorage` flag that remembers which storyline was last shown.

## 3. Business Context

This is a personal portfolio/marketing site, not a commercial product. There is no monetization, no backend service contract, and no SLA. The "business" goal is entirely reputational: convert a portfolio visit into an interview, collaboration, or community signup (HyderabadCoders is mentioned in the contact/experience content). The project also functions as its own proof-of-work — the README explicitly frames it as evidence of 3D-web and "metaverse" engineering ability, so engineering polish (smooth animation, graceful degradation, no console errors) is itself part of the value proposition, not just a quality bar.

## 4. Tech Stack

The application is a 100% client-side single-page app with no backend, no database, and no server-rendered routes. Versions below are the actually-installed versions read from `node_modules`, not the semver ranges in `package.json`.

| Layer | Technology | Installed version |
|---|---|---|
| Build tool / dev server | Vite | 5.4.21 |
| Vite React plugin | @vitejs/plugin-react | 4.7.0 |
| UI framework | React / react-dom | 18.3.1 |
| 3D engine | three.js | 0.169.0 |
| React renderer for three.js | @react-three/fiber | 8.18.0 |
| 3D helper library | @react-three/drei | 9.122.0 |
| Post-processing | @react-three/postprocessing | 2.19.1 |
| Physics / character controller | @react-three/rapier (+ @dimforge/rapier3d-compat) | 1.5.0 |
| Authored camera animation (scaffold only) | @theatre/core, @theatre/studio, @theatre/r3f | 0.7.2 |
| Global state | zustand | 4.5.7 |
| Scroll physics | lenis | 1.3.23 |
| UI/camera tweening | gsap | 3.15.0 |
| Audio | howler (installed, unused — see §13) + native Web Audio API (actually used) | 2.2.4 |
| Language | JavaScript (JSX), no TypeScript | — |
| glTF compression | Draco decoder (self-hosted, three.js-provided) | bundled in `public/draco/gltf/` |

No CSS framework is used — `src/styles.css` (524 lines) is hand-written. No testing framework, linter config, or CI pipeline is present in the repository.

## 5. System Architecture

There is no server tier. The entire system is a static bundle served to the browser; "architecture" here means the in-browser component graph and data flow.

```
index.html
 └─ main.jsx          → boots Theatre.js Studio only if ?studio=1 in dev, then renders <App/>
     └─ App.jsx        → top-level composition, runs once per page load:
         ├─ chooses one storyline at random (URL ?story= override, avoids last-shown via localStorage)
         ├─ preloads the other storyline's JS chunk on browser idle (desktop only)
         ├─ <Experience/>       — the <Canvas>: lighting rig, tone mapping, post-processing stack
         │    └─ <ActiveStoryline/> — React.lazy-mounted 3D world, keyed by storyline id
         │         ├─ HubWorld.jsx     (free-roam storyline)
         │         └─ CreatureRun.jsx  (scroll storyline)
         ├─ <ScrollDriver/>     — owns Lenis smooth-scroll OR locks page scroll, depending on storyline navMode
         ├─ <ContentOverlay/>   — visually-hidden DOM mirror of every beat (SEO + screen readers)
         ├─ <UI/>               — HUD: story badge, discovered counter, mute, "Shuffle storyline"
         ├─ <ResumeReader/>     — modal: full flat-text fallback of all content, also the reduced-motion path
         ├─ <StoryDirector/>    — plays the guide/NPC dialogue script per beat, once per visit
         ├─ <AudioController/>  — bridges store state to the procedural Web Audio engine
         ├─ <TouchControls/>    — virtual joystick, mounted only on touch devices in free-roam mode
         └─ <Preloader/>        — real asset-load progress gate; "Enter" click unlocks audio (autoplay policy)
```

State flows through a single Zustand store (`src/store/useStore.js`) — there is no React context tree and no prop-drilling of app state; any component reads only the slices it needs. The "single source of truth" for content is `src/data/portfolio.js`; every renderer (3D billboards, the hidden SEO DOM, the résumé modal, the diegetic inspect terminal) reads from the same `<BeatContent>` component so there is exactly one place that knows how to render a beat's HTML. A second data file, `src/data/story.js`, derives short dialogue lines from the same `portfolio.js` facts so the narrative layer can never drift out of sync with the résumé content. Storylines are decoupled from content via a fixed contract: a storyline receives the ordered list of "beats" (`src/data/beats.js`: intro → about → skills → experience → projects → education → contact) and must present all of them, but is free to choose order-presentation mechanics (free-roam proximity vs. scroll-position mapping). Adding a storyline is a one-file-plus-one-registry-line operation by design (`src/storylines/registry.js`).

Mutable per-frame state that does not need React re-renders (player world position, touch joystick vector, camera depth-of-field focus target) is kept in plain module-level objects (`src/three/player.js`, `src/three/input.js`, `src/three/cameraRig.js`) rather than the Zustand store, avoiding React render thrash inside the 60fps R3F render loop.

## 6. Database Schema

**There is no database.** The application has no backend, no persistence service, and no network API calls of any kind at runtime. The closest analog to a schema is the static content model in `src/data/portfolio.js`, an in-memory/in-bundle JavaScript object with the following shape:

```
portfolio = {
  name, headline, email, linkedin, location: string
  about: string
  skills: { languages, frontend, backend, databases, mobile, ai_automation, other: string[] }
  experience: [{ role, org, dates, note? }]
  education:  [{ school, degree, dates, note? }]
  projects:   [{ name, flagship?: bool, blurb, tech: string[], status, link }]
  certifications: string[]
}
```

The only persisted state outside the JS bundle is a single `localStorage` key, `animefolio:lastStory`, storing the id of the last-shown storyline so re-rolls tend to surprise the visitor. There is no user-generated content, no write path, and no PII collection.

## 7. Implemented Features and Status

| Feature | Status |
|---|---|
| Multi-storyline engine with random selection + `?story=` override + shuffle button | Done |
| Storyline 1 — **Hub World** (free-roam, Rapier kinematic character controller, click-to-move + WASD, lift mechanic into a "Tower" of project rooms) | Done |
| Storyline 2 — **Creature Run** (scroll-driven path traversal, Lenis-mapped progress, particle trail) | Done |
| In-world content surfaces (Billboard / Plaque / Marker components using drei `<Text>`, distance-based fade reveal keyed off player position, not camera) | Done |
| Diegetic "inspect" terminal — dense content (skills, projects, contact) opens an in-world holo-terminal on proximity + E key | Done |
| Story/dialogue layer — a guide companion ("Pixel") + a unique NPC per beat, typewriter dialogue, click/Enter to advance, Esc/skip to dismiss, plays once per visit per beat | Done |
| Hidden SEO/a11y DOM mirror of all beats (`<ContentOverlay>`) | Done |
| "Read as résumé" flat-text modal, also the `prefers-reduced-motion` fallback | Done |
| Procedural ambient audio (Web Audio oscillator pad, per-storyline pitch, beat-change cue blip), mute toggle | Done |
| Howler-based real-audio path with graceful fallback to the procedural engine | Scaffolded, unused — no audio asset files registered (`assets.audioAmbient.path` is `null`) |
| Touch joystick for free-roam on touch devices | Done |
| Preloader with real asset-load progress (`useProgress`) + user-gesture gate to unlock audio autoplay | Done |
| Post-processing craft layer: ACES tone mapping, Bloom, depth-of-field tracking the player, hue/saturation + brightness/contrast grade, vignette, film grain — all tunable per storyline via a `post` config block | Done |
| Adaptive performance: `PerformanceMonitor` drops DPR and disables post-FX on decline; mobile detection pre-disables AA/shadows/some effects | Done |
| Theatre.js authored-camera scaffold (dev-only Studio editor behind `?studio=1`, never ships to prod) | Scaffolded, not used by any storyline yet — no sheets/tracks authored |
| Asset manifest (`src/data/assets.js`) with credit/license tracking and Draco-decode routing | Done; only 2 of 9 manifest slots are filled (placeholder avatar + creature models) |
| Custom GLSL shader scaffold (`EnergyMaterial` — fresnel + scanline, used once on the Hub World "Portal") | Done (single use case) |
| Content placeholders in `portfolio.js` (dates marked "confirm", a project link marked `ADD_LIVE_URL`) | Outstanding — these are auto-hidden by `cleanDate()`/link-check logic rather than fixed |
| Production build pipeline (Vite) | Done — a `dist/` build exists and is verified working |
| Automated tests | Not implemented |
| Deployment / hosting | Not configured — no `vercel.json`, `netlify.toml`, CI workflow, or hosting account wired up |

## 8. API Endpoints

None. There is no backend process, no REST or GraphQL surface, and no serverless functions. All "API-shaped" calls in the code are browser Web APIs only: `localStorage`, `Web Audio API`, `IntersectionObserver`-free proximity checks done manually each frame, `requestIdleCallback`, and the Pointer Events API for the touch joystick. The root README's "Future Enhancements" section mentions a hypothetical GraphQL backend for dynamic content — this does not exist in the current codebase and is aspirational only.

## 9. Frontend Details

The frontend is the entire application. Routing does not exist — it is a single root route rendering one `<App/>`. View composition is React-driven, but the dominant rendering surface is an R3F `<Canvas>` (`src/components/Experience.jsx`) running a single persistent WebGL context for the whole session; switching storylines unmounts and remounts the active storyline's component tree (keyed by id) so R3F's automatic GPU resource disposal (geometries, materials, textures) prevents leaks across switches — there is no manual `dispose()` bookkeeping required of storyline authors.

Each storyline owns its own physics/movement model: Hub World uses a Rapier kinematic character controller with autostep, snap-to-ground, slope limits, and a custom lift volume that reinterprets vertical W/S input as an elevator ride when near the project Tower; Creature Run has no physics body at all — it is a pure parametric `CatmullRomCurve3` position lookup driven by `scrollProgress` (smoothed, not 1:1, to avoid jitter). Both storylines write the active character's position into a shared module-level vector (`playerPos`) every frame so all "reveal by proximity" and "inspect" logic measures distance from the character (not the camera, which sits at a different offset per world).

Camera behavior is hand-rolled per storyline (damped lerp + lookAt) rather than using drei's `CameraControls`, because each storyline needs different framing rules (third-person chase behind-and-above for Hub World, side-and-behind chase for Creature Run) plus a shared depth-of-field focus target. A small global craft layer (`gsap`-driven FOV "punch" on every beat change) and a per-storyline post-processing recipe (bloom/DOF/grade tuned in the registry) are applied uniformly through `<Experience>` regardless of which storyline is mounted.

Accessibility and SEO are treated as first-class, not bolted on: every beat's real content exists three times in parallel — as 3D world geometry (drei `<Text>` meshes), as a visually-hidden but DOM-present `<section data-beat>` block crawlers and screen readers can read, and as the "Read as résumé" modal which is also the automatic experience for anyone with `prefers-reduced-motion: reduce` set, since the only renderer for that content is the shared `<BeatContent>` component.

## 10. Backend Details

There is no backend. No server process, no process manager, no environment variables beyond what Vite injects (`import.meta.env.DEV`), and no `.env` file is present in the repository.

## 11. Security Approach

The attack surface is minimal because there is no backend, no authentication, no user input that is persisted or executed, and no third-party API keys embedded in the client. The few security-relevant patterns present:

- All external links (`target="_blank"`) consistently use `rel="noopener"` to prevent reverse-tabnabbing (`BeatContent.jsx`, `ResumeReader.jsx`, Hub World "Portal" content).
- No `dangerouslySetInnerHTML`, `eval`, or dynamic script injection anywhere in the codebase — all content rendering goes through JSX text interpolation, which React escapes by default.
- The only persisted client storage (`localStorage.animefolio:lastStory`) is wrapped in try/catch to fail closed in private-browsing modes that block storage, rather than throwing.
- Audio is correctly gated behind an explicit user gesture (the "Enter" button) to comply with browser autoplay policies — this is a UX/compliance concern more than a security one, but it's implemented correctly.
- There is no CSP, no Subresource Integrity, and no dependency-vulnerability scanning configured; given the project is a static personal site with no user data, this is a reasonable risk acceptance rather than an oversight, but it would need to be addressed if any backend/contact-form functionality is added later (the contact section currently only emits a `mailto:` link — no form submission exists to be a CSRF/injection vector).

## 12. Deployment Setup

There is currently no deployment configuration in the repository — no `vercel.json`, `netlify.toml`, GitHub Actions workflow, Dockerfile, or hosting credentials are present. The project has a working local build pipeline only:

- `npm run dev` — Vite dev server bound to `0.0.0.0` with `allowedHosts: true` (already configured to be tunneled, e.g. via `ngrok http 5173`, per the root README's instructions)
- `npm run dev:host` — same, explicit host flag
- `npm run build` — produces a verified `dist/` output (already built once in the working tree, confirming the production bundle compiles cleanly)
- `npm run preview` — serves the built `dist/` locally

`vite.config.js` raises `chunkSizeWarningLimit` to 1600 KB because Rapier's WASM physics engine and each storyline are already split into their own lazy-loaded chunks and are expected to be large. Since this is a fully static SPA with no server-side requirements, it is deployable as-is to any static host (Vercel, Netlify, GitHub Pages, Cloudflare Pages) by pointing the build command at `animefolio/` and serving `animefolio/dist/`; no environment variables or backend provisioning are required.

## 13. Current Completion Status

The core engine — storyline selection/switching, both 3D worlds, the content-surface system, the diegetic inspect terminal, the dialogue/story layer, the SEO/a11y fallback chain, post-processing, and adaptive performance — is functionally complete and the build compiles and runs. What remains unfinished falls into three buckets:

1. **Content data gaps**: several fields in `portfolio.js` are explicit placeholders the author hasn't confirmed yet — `education[].dates` ("confirm dates" / "2022 – 2025 // confirm"), one project's `link` (`"ADD_LIVE_URL"` for the HyderabadCoders Community Platform), and the comment `// confirm public email` next to the contact email. The rendering layer defensively strips these (`cleanDate()` filters anything matching `/confirm/i`; `BeatContent` checks `link !== "ADD_LIVE_URL"` before rendering a "Visit site" link), so the UI never shows a broken placeholder, but the underlying facts are still unverified.
2. **Asset slots**: the asset manifest (`src/data/assets.js`) defines 9 slots for "Phase A" production assets (a real rigged hero avatar, an environment kit, a studio HDRI, a golden-hour HDRI, a color-grade LUT, ambient audio, a whoosh SFX), of which only 2 are filled — both with CC0 stand-ins from three.js/Khronos sample libraries (RobotExpressive and the Khronos Fox), not original/final art.
3. **Unactivated scaffolding**: Howler (real audio playback) and Theatre.js (authored cinematic camera moves) are both fully wired with working fallback paths, but neither has real content registered yet — audio falls through to a procedural Web Audio synth pad, and no storyline uses a Theatre sheet, so the Studio editor (`?studio=1`) has nothing to author beyond an empty project.

No deployment has been performed; the project exists only as a local working tree with no remote hosting, and `animefolio/` itself is entirely untracked in git (the `git status` for this session shows it as a new, uncommitted directory alongside deletions of the old root-level prototype).

## 14. Technical Debt

- **Stale root README.** It documents a vanilla-JS/Three.js architecture (`index.html`, `main.js`, `StorylineManager.js` as a plain class system) that was the project's first iteration. The actual code has fully moved to React + R3F + Rapier + Zustand with a different storyline contract; nothing in the current README's "Project Structure" or "Add a new storyline" sections matches the live `animefolio/` source. This will mislead anyone (including future-you) who reads it before the code.
- **Uncommitted application.** The entire current implementation lives in an untracked `animefolio/` directory while the old prototype's files sit staged as deletions at the repo root. No commit captures "we replaced the prototype with the R3F rewrite" — that history doesn't exist yet.
- **No automated tests** of any kind — no unit tests for the content-rendering logic (`BeatContent`, `cleanDate`, `badgeText`), no integration test for storyline switching/state reset (`useSwitchStoryline` resets seven separate pieces of store state by hand, which is easy to forget one of as more state gets added), and no visual regression testing for the 3D scenes.
- **No linter or formatter configuration** committed (no ESLint/Prettier config found), despite `eslint-disable-next-line` comments appearing in source (`ModelBoundary.jsx`), implying linting was used ad hoc during development but isn't enforced.
- **Unverified content facts** sitting in production data (see §13.1) — low severity since they're cosmetically suppressed, but they're real gaps a recruiter-facing résumé shouldn't have indefinitely.
- **Dead/partial dependencies**: Howler and Theatre.js/Studio/r3f are full dependencies that add to install size and (for Theatre, dev-only) bundle complexity, while contributing zero current end-user value — they're well-isolated scaffolding, but represent unrealized investment.
- **No deployment pipeline** — getting this in front of a recruiter today requires a manual local build and a manual upload to some static host; there is no `git push` → live-site path.

## 15. Performance Metrics

No formal profiling, Lighthouse run, or real-user-monitoring has been performed against this build, so the figures below are derived from a static read of the configuration rather than measured runtime numbers. The application is engineered for adaptive performance rather than a fixed target:

- **Device-pixel-ratio**: starts at 1.5 on desktop / 1 on mobile, and `PerformanceMonitor` (drei) automatically drops to 1 and disables the post-processing stack on a detected FPS decline, restoring 1.5 on desktop only when performance recovers.
- **Shadows**: soft shadow maps (2048×2048) on desktop, disabled entirely on mobile.
- **Anti-aliasing**: enabled on desktop, disabled on mobile.
- **Depth of field**: disabled outright on mobile and under `prefers-reduced-motion`, since it's one of the more expensive post-effects.
- **Particle counts**: ambient atmosphere particles are halved on mobile (`Particles.jsx`'s `isMobile` check), capped at 150–180 per scene, animated by direct CPU buffer writes (one draw call via `points`/`bufferGeometry`), not per-particle objects.
- **Code-splitting**: each storyline is its own `React.lazy()` chunk; only the chosen storyline's JS (and its physics dependency, for Hub World) is downloaded on first load. The non-active storyline is preloaded on `requestIdleCallback` (desktop only) so the "Shuffle storyline" button feels instant on a second visit-session.
- **Asset weight**: the two glTF models are small (Fox.glb 160 KB, RobotExpressive.glb 456 KB) and not yet Draco-compressed (`draco: false` in the manifest) despite the decoder being wired up and ready; the HDRI is a modest 1.4 MB at 1k resolution. Total binary asset payload is light (~2 MB) for a 3D site, which is favorable, but represents headroom not yet used (no KTX2 textures, no Draco compression applied even though the pipeline supports it).
- **Build size**: `chunkSizeWarningLimit` was deliberately raised to 1600 KB in `vite.config.js`, an acknowledgment that the Rapier physics WASM chunk is large; no bundle-analyzer output exists in the repo to quantify the actual final chunk sizes.

## 16. Limitations

- No backend means no contact-form submission, no analytics pipeline, and no way to know how many recruiters actually complete a visit — engagement is entirely unmeasured.
- Only two storylines exist; the "discovered storylines" UI counter and the replay hook ("Experience another story") are built for an N-storyline future that currently has N=2, which somewhat undersells the "many experiences" framing in the README.
- The avatar and creature are licensed stand-in assets, not original character art — acceptable for a personal project but a known gap versus a "polished" final state.
- Theatre.js-authored cinematic camera sequences (the project's own stated next creative step, per code comments referencing "A2 cloud-dive," "A3 establishing sweep," "A5 sunset lift") do not exist yet; camera motion today is limited to hand-coded damped-follow logic.
- No internationalization — all copy is hardcoded English.
- No automated accessibility audit has been run against the hidden-DOM/reduced-motion fallback paths to confirm they actually satisfy WCAG in practice, only that they exist in code.
- Mobile/touch support exists (joystick, reduced FX) but has not been verified against a real device matrix in this audit — only inferred from the `isMobile`/`isTouch` feature-detection branches in the source.

## 17. Optimization Roadmap

In rough priority order, informed by what the codebase itself flags as incomplete (comments referencing "Phase A," "A-steps," asset manifest TODOs):

1. **Lock down content correctness** — resolve every "confirm" placeholder in `portfolio.js` (education dates, the live project URL, the public email) so the SEO/résumé fallback never silently omits a fact a recruiter expected to see.
2. **Compress the existing glTF assets** through the already-documented Draco pipeline (`credits.md` describes the exact `gltf-transform optimize --compress draco` command) — the decoder is already shipped and wired, so this is a low-effort, immediate payload reduction.
3. **Wire up a deployment target** (Vercel/Netlify/Cloudflare Pages are all zero-config-friendly for a Vite SPA) so the project is reachable by a URL rather than a local `npm run preview` — this currently blocks the entire stated business goal (§3) of being shown to recruiters.
4. **Commit the `animefolio/` rewrite** and retire or rewrite the stale root README so the repository's documented architecture matches its actual one.
5. **Fill the remaining asset-manifest slots** (final rigged avatar, environment kit, golden-hour HDRI, color-grade LUT, ambient audio bed, whoosh SFX) — Howler and the audio-bus fallback chain are ready to receive these with no code changes beyond setting a `path`.
6. **Author the first Theatre.js camera sequence** to validate the existing scaffold end-to-end before investing in more authored moments.
7. **Add minimal automated coverage** for the content-rendering pure functions (`cleanDate`, `badgeText`, `buildSteps`) and for `useSwitchStoryline`'s state-reset completeness, since that reset list is the most likely place a future contributor introduces a state-leak bug across storyline switches.
8. **Instrument basic analytics** (even a privacy-respecting, no-cookie pageview/event counter) to replace the current zero-visibility into recruiter engagement.

## 18. Next Priorities

Given the project's stated purpose (get this in front of recruiters) and current state (functionally complete engine, unreachable to anyone outside the local machine), the next priorities are, in order: (1) resolve the outstanding content placeholders, since shipping unverified "confirm" data to a recruiter is the most visible possible defect; (2) deploy to a static host so the project actually serves its business purpose; (3) commit the working tree properly so the project's git history reflects reality. Everything else in the roadmap (asset polish, Theatre.js camera authoring, a third storyline) is creative/technical investment that should follow only once the experience is actually live and confirmed working for an outside visitor.
