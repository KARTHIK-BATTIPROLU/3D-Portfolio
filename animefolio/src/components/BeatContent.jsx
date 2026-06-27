// ============================================================================
// BeatContent — renders one content beat's HTML from portfolio.js. Used both
// by the visible overlay card and the hidden SEO/screen-reader layer, so all
// content has a single rendering path.
// ============================================================================

import { portfolio as p } from "../data/portfolio.js";

const SKILL_LABELS = {
  languages: "Languages",
  frontend: "Frontend",
  backend: "Backend",
  databases: "Databases",
  mobile: "Mobile",
  ai_automation: "AI & Automation",
  other: "Other",
};

export const prettyLabel = (key) =>
  SKILL_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// Hide placeholder values ("confirm dates", "… // confirm") so they never show.
function cleanDate(value) {
  if (!value) return null;
  const stripped = String(value).replace(/\/\/.*$/, "").trim();
  if (/confirm/i.test(stripped)) return null;
  return stripped || null;
}

function badgeText(status = "") {
  if (/live/i.test(status)) return "Live";
  if (/progress/i.test(status)) return "In progress";
  if (/5th|award|winner|🏆/i.test(status)) return "🏆 Award";
  return "Built";
}

const Chips = ({ items }) => (
  <div className="chips">
    {items.map((t) => (
      <span key={t}>{t}</span>
    ))}
  </div>
);

export default function BeatContent({ beatId, focusedProject = null }) {
  switch (beatId) {
    case "intro":
      return (
        <>
          <h1>{p.name}</h1>
          <p className="tagline">{p.headline}</p>
          <p className="meta">📍 {p.location}</p>
        </>
      );

    case "about":
      return (
        <>
          <h2>About</h2>
          <p className="body-text">{p.about}</p>
        </>
      );

    case "skills":
      return (
        <>
          <h2>Skills</h2>
          <div className="skill-groups">
            {Object.entries(p.skills).map(([key, arr]) => (
              <div className="skill-group" key={key}>
                <h4>{prettyLabel(key)}</h4>
                <Chips items={arr} />
              </div>
            ))}
          </div>
          {p.certifications?.length > 0 && (
            <div className="certs">
              <h3>Achievements &amp; Certifications</h3>
              <ul>
                {p.certifications.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      );

    case "experience":
      return (
        <>
          <h2>Experience</h2>
          {p.experience.map((e, i) => {
            const dates = cleanDate(e.dates);
            return (
              <div className="item" key={i}>
                <h3>{e.role}</h3>
                <p className="sub">{e.org}</p>
                {dates && <p className="dates">{dates}</p>}
                {e.note && <p className="note">{e.note}</p>}
              </div>
            );
          })}
        </>
      );

    case "projects": {
      const showOne = typeof focusedProject === "number";
      const list = showOne ? [p.projects[focusedProject]].filter(Boolean) : p.projects;
      return (
        <>
          <h2>Projects{showOne ? ` · ${focusedProject + 1} / ${p.projects.length}` : ""}</h2>
          <div className="projects">
            {list.map((proj) => {
              const hasLink = proj.link && proj.link !== "ADD_LIVE_URL";
              return (
                <article className={`project ${proj.flagship ? "flagship" : ""}`} key={proj.name}>
                  <div className="project-head">
                    <h3>{proj.name}</h3>
                    <span className="badge">{badgeText(proj.status)}</span>
                  </div>
                  <p className="note">{proj.blurb}</p>
                  <Chips items={proj.tech} />
                  <p className="status">
                    {proj.status}
                    {hasLink && (
                      <>
                        {" · "}
                        <a href={proj.link} target="_blank" rel="noopener">
                          Visit site →
                        </a>
                      </>
                    )}
                  </p>
                </article>
              );
            })}
          </div>
        </>
      );
    }

    case "education":
      return (
        <>
          <h2>Education</h2>
          {p.education.map((ed, i) => {
            const dates = cleanDate(ed.dates);
            return (
              <div className="item" key={i}>
                <h3>{ed.school}</h3>
                <p className="sub">{ed.degree}</p>
                {ed.note && <p className="note">{ed.note}</p>}
                {dates && <p className="dates">{dates}</p>}
              </div>
            );
          })}
        </>
      );

    case "contact": {
      const linkedinUrl = p.linkedin.startsWith("http") ? p.linkedin : `https://${p.linkedin}`;
      return (
        <>
          <h2>Let's Connect</h2>
          <div className="contact">
            <p>
              📧 <a href={`mailto:${p.email}`}>{p.email}</a>
            </p>
            <p>
              💼{" "}
              <a href={linkedinUrl} target="_blank" rel="noopener">
                LinkedIn Profile
              </a>
            </p>
            <p>📍 {p.location}</p>
          </div>
          <p className="cta">{p.headline}</p>
        </>
      );
    }

    default:
      return null;
  }
}
