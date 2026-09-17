const views = {
  voice: {
    kicker: "LISTEN, THEN REVIEW",
    title: "Let the spoken reference find its place.",
    description: "Voice-assisted recognition can help identify a Scripture reference while you stay focused on the service. Review the match, then choose when it goes live.",
    step: "Recognise a reference · Check the passage · Present with intention",
  },
  stage: {
    kicker: "PREPARE WITH CONFIDENCE",
    title: "See it in Preview before it reaches the room.",
    description: "Keep a passage in Preview while the current slide remains on the live output. Move to the next passage when you are ready.",
    step: "Select the passage · Review the wording · Send it live",
  },
  library: {
    kicker: "YOUR SCRIPTURE LIBRARY",
    title: "Find a book, chapter, and verse in a few steps.",
    description: "Browse the translations included in your library and navigate directly to the passage you want to present.",
    step: "Choose a translation · Navigate the passage · Add it to your flow",
  },
};

const tabs = [...document.querySelectorAll(".demo-tab")];
const panel = document.querySelector("#demo-panel");
const visualViews = {
  voice: document.querySelector(".voice-demo"),
  stage: document.querySelector(".stage-demo"),
  library: document.querySelector(".library-demo"),
};

function selectView(name) {
  const view = views[name];
  if (!view) return;
  tabs.forEach((tab) => {
    const active = tab.dataset.view === name;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  Object.entries(visualViews).forEach(([key, element]) => {
    element.hidden = key !== name;
  });
  panel.dataset.current = name;
  document.querySelector("#demo-kicker").textContent = view.kicker;
  document.querySelector("#demo-title").textContent = view.title;
  document.querySelector("#demo-description").textContent = view.description;
  document.querySelector("#demo-step-text").textContent = view.step;
}

tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectView(tab.dataset.view));
  tab.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
    tabs[nextIndex].focus();
    selectView(tabs[nextIndex].dataset.view);
  });
});

const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector(".site-nav");
menuButton.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  nav.classList.toggle("open", open);
});
nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Open menu");
  nav.classList.remove("open");
}));

selectView("voice");
document.querySelector("#year").textContent = new Date().getFullYear();
fetch("/api/v1/projectorpro/downloads/stats")
  .then((response) => response.ok ? response.json() : null)
  .then((stats) => {
    if (stats && Number.isFinite(stats.downloadsStarted)) {
      document.querySelector("#downloads-started").textContent = Number(stats.downloadsStarted).toLocaleString();
    }
  })
  .catch(() => undefined);
