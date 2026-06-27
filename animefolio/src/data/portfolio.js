// ============================================================================
// SINGLE SOURCE OF TRUTH
// Every storyline renders THIS data. No component hardcodes portfolio text.
// ============================================================================

export const portfolio = {
  name: "Karthik Battiprolu",
  headline: "Co-founder @ HyderabadCoders · AI & Data Science @ CBIT · Aspiring Metaverse Developer",
  email: "kbattiprolu@gmail.com",            // confirm public email
  linkedin: "linkedin.com/in/karthikbattiprolu-3b9694300",
  location: "Hyderabad, India",

  about:
    "Full-stack problem solver who's built across Android, MERN web, and agentic-AI automations. " +
    "My approach: identify the real problem, pick the stack that fits, ship it. Currently deep into " +
    "agentic AI (LangChain, n8n, CrewAI) and immersive 3D web experiences.",

  skills: {
    languages:     ["JavaScript", "Python", "Java", "Dart"],
    frontend:      ["React", "Three.js", "HTML5", "CSS3", "Bootstrap"],
    backend:       ["Node.js", "Express", "REST APIs"],
    databases:     ["MongoDB", "Graph databases", "Firebase"],
    mobile:        ["Android (Java)", "Flutter"],
    ai_automation: ["LangChain", "n8n", "CrewAI", "ML integration", "Agentic AI"],
    other:         ["Blockchain (fundamentals)", "System design", "Git"],
  },

  experience: [
    { role: "Co-Founder", org: "HyderabadCoders", dates: "Nov 2025 – Present",
      note: "Building a developer community in Hyderabad." },
    { role: "Junior Coordinator", org: "Toastmasters International (CBIT)", dates: "Aug 2025 – Present" },
    { role: "Google Campus Ambassador", org: "Google", dates: "Oct 2025 – Dec 2025" },
    { role: "Science Club Organizer", org: "SGMGPT, Abdullapurmet", dates: "Sep 2023 – Apr 2024",
      note: "Founded a student club for knowledge-sharing and communication skills." },
  ],

  education: [
    { school: "Chaitanya Bharathi Institute of Technology (CBIT)",
      degree: "B.Tech — Artificial Intelligence & Data Science", dates: "confirm dates" },
    { school: "Sanjay Gandhi Memorial Govt. Polytechnic (SGMGPT)",
      degree: "Diploma — Computer Science Engineering", dates: "2022 – 2025 // confirm" },
    { school: "Temries, Choutuppal", degree: "High School", note: "9.5 GPA", dates: "confirm" },
  ],

  projects: [
    { name: "Farm India", flagship: true,
      blurb: "A full-scale Android platform connecting farmers, agricultural vendors, and consumers — " +
             "farmers sell produce, vendors sell pesticides/fertilizers, and an integrated ML model " +
             "identifies crop diseases from images. One backend + database serving the whole ecosystem.",
      tech: ["Android (Java)", "Machine Learning", "REST backend", "Database"],
      status: "Built · 5th place, State level (Srujana TechFest)", link: null },

    { name: "Student Resource Sharing App",
      blurb: "A Flutter app where students upload and access exam resources (PDFs, PPTs) by subject/branch.",
      tech: ["Flutter", "Dart"], status: "In progress (~50%)", link: null },

    { name: "HyderabadCoders Community Platform",
      blurb: "A live website with authentication where students join and download resources — " +
             "previous-year papers, EAMCET/ECET results, and branch cutoffs.",
      tech: ["Web", "Authentication"], status: "Live", link: "ADD_LIVE_URL" },

    { name: "Certificate Generator",
      blurb: "An email-gated certificate portal — admin uploads a template, users log in via a 15-minute " +
             "JWT window, enter their name, and download a personalized certificate rendered dynamically.",
      tech: ["JWT auth", "Firebase", "Python (image/PDF rendering)"], status: "Built · Demo", link: null },
  ],

  certifications: [
    "Srujana TechFest — District Winner & 5th at State level",
    "Mastering Python, Pandas, NumPy",
    "Foundations of Web Development: CSS, Bootstrap, JS, React",
  ],
};
