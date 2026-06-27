import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { initStudioDev } from "./three/theatre.js";
import "./styles.css";

// Boot the Theatre.js Studio editor ONLY when a developer opts in with
// ?studio=1 (dev builds). Visitors never see editor/inspector chrome.
initStudioDev();

// NOTE: StrictMode is intentionally omitted — it double-invokes effects and
// remounts in dev, which fights R3F's single WebGL context. (Common in R3F.)
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
