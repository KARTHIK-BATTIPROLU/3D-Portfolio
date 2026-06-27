# Karthik Battiprolu — AnimeFolio

**AnimeFolio** is a scroll-driven 3D portfolio experience built with Three.js, GSAP, and Vite.

## Features

- 🔀 Multiple randomly-selected 3D storylines (Neon Path, Car Ride, …) — same content, a different world each visit
- 🎮 Interactive 3D environment with winding path
- 🚶 Character that moves as you scroll
- 🌃 Neon/cyber environment with glowing structures and particles
- 📱 Responsive design
- ✨ Smooth animations and transitions
- 🏷️ Floating 3D text labels at each checkpoint
- 💼 Projects showcase with status badges
- 📊 Resume content revealed at checkpoints

## Tech Stack

- **Vite** - Fast development server and build tool
- **Three.js** - 3D graphics, scene management, and post-processing (bloom)
- **GSAP** - UI / transition animations
- **Vanilla JavaScript** - Core logic and interactions

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open your browser to the URL shown in the terminal (usually `http://localhost:5173`)

To expose the app for ngrok sharing, run:

```bash
npm run dev:host
```

Then in a second terminal:

```bash
ngrok http 5173
```

Share the public forwarding URL that ngrok prints.

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## How It Works

1. **Scroll to Move**: Scroll down to move the character forward along the winding path
2. **Content Reveals**: Resume sections fade in as you reach each checkpoint
3. **3D Labels**: Floating 3D text markers show section names
4. **Camera Follow**: Third-person camera smoothly follows the character

## Project Structure

```
├── index.html              # Shell: loading, canvas, controls, SEO/OG tags
├── main.js                 # Bootstrap: render content + start the engine
├── style.css               # Styling, themes, animations
├── public/                 # Static assets (favicon.svg, og-image.svg)
├── src/
│   ├── data/portfolio.js       # SINGLE SOURCE OF TRUTH for all content
│   ├── content/beats.js        # Ordered beats every storyline presents
│   ├── dom/renderContent.js    # Renders portfolio → DOM (SEO/a11y truth)
│   ├── three/textLabel.js      # Shared canvas-texture text labels
│   ├── StorylineManager.js     # Picks/mounts/disposes storylines, loop, scroll
│   └── storylines/
│       ├── Storyline.js        # Base class / shared interface
│       ├── NeonPath.js         # Storyline 1 — neon path walk (bloom)
│       └── CarRide.js          # Storyline 2 — dusk highway drive
├── package.json
└── README.md
```

## Sections

1. **Intro** - Introduction and tech stack
2. **Skills** - Top skills and certifications
3. **Experience** - Work experience and roles
4. **Education** - Academic background
5. **Projects** - Featured projects with tech tags and status
6. **Contact** - Contact information and links

## Architecture — Multi-Storyline Engine

One portfolio, many experiences. Content is defined **once** in
`src/data/portfolio.js` and rendered into the DOM (the source of truth for SEO
and screen readers). Each **storyline** is an interchangeable 3D "skin" that
presents that same content in its own world. On load the `StorylineManager`
picks one at random (avoiding the last-shown), and the "Experience another
story 🔀" button swaps storylines live — no page reload. Only the chosen
storyline's code is lazy-loaded (its own bundle chunk).

- **Force a storyline:** append `?story=neon-path` or `?story=car-ride` to the URL.
- **Content beats** (the ordered sections every storyline must present):
  `intro → about → skills → experience → projects → education → contact`.

### Add a new storyline (one file + one line)

1. Create `src/storylines/MyStory.js`, default-exporting a class that extends
   `Storyline` and implements the interface:

   ```js
   import { Storyline } from "./Storyline.js";

   export default class MyStory extends Storyline {
     static id = "my-story";
     static name = "My Story";
     static theme = { colors: {}, mood: "" };

     init(scene, camera, renderer, data) {
       super.init(scene, camera, renderer, data);
       // build the world from `data`
     }
     update(progress, dt) { /* move things by scroll progress (0–1), then render */ }
     onBeat(beatId) { /* reveal a content beat in 3D */ }
     dispose() { super.dispose(); /* + dispose any composer */ }
   }
   ```

2. Register it with **one line** in `src/StorylineManager.js`:

   ```js
   { id: "my-story", name: "My Story", load: () => import("./storylines/MyStory.js") },
   ```

It's then lazy-loaded and enters the random rotation. Room to grow: space
journey, underwater dive, train ride, treasure-hunt map, cyberpunk street.

## Future Enhancements

- GraphQL backend for dynamic content
- Real avatar model (glTF) replacing the primitive character
- Voice narration
- More interactive elements
- Live demo links for all projects

## Contact

**Karthik Battiprolu**
- Email: kbattiprolu@gmail.com
- LinkedIn: [linkedin.com/in/karthikbattiprolu-3b9694300](https://www.linkedin.com/in/karthikbattiprolu-3b9694300)
- Location: Hyderabad, Telangana, India

---

*Building tech to solve real problems | Aspiring Metaverse Developer*
