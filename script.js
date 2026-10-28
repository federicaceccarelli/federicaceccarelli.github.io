(() => {
  const root = document.documentElement;
  root.classList.add("js");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Header: switch to paper once the hero is behind it
  const header = document.querySelector("[data-header]");
  const hero = document.getElementById("top");
  const updateHeader = () => {
    const threshold = hero.offsetHeight - header.offsetHeight;
    header.classList.toggle("is-scrolled", window.scrollY > threshold);
  };

  // Mobile menu
  const toggle = document.querySelector("[data-menu-toggle]");
  const nav = document.querySelector("[data-nav]");
  const setMenu = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
    document.body.style.overflow = open ? "hidden" : "";
    document.getElementById("main").inert = open;
  };
  toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("is-open")) { setMenu(false); toggle.focus(); }
  });

  // Current section in the nav
  const links = [...document.querySelectorAll(".site-nav ul a")];
  const sections = links.map((a) => document.querySelector(a.getAttribute("href")));
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((a) => {
        if (a.getAttribute("href") === `#${entry.target.id}`) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  sections.forEach((s) => s && sectionObserver.observe(s));

  // CTR bars grow when seen
  const bars = document.querySelector(".ctr-bars");
  if (bars) {
    const barObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { bars.classList.add("is-in"); barObserver.disconnect(); }
    }, { threshold: 0.6 });
    barObserver.observe(bars);
  }

  // Growth line: a stepped path through each role, drawn once when it comes into view
  const steps = document.querySelector("[data-steps]");
  const svg = document.querySelector("[data-growth-svg]");
  const track = document.querySelector("[data-growth-track]");
  const path = document.querySelector("[data-growth-path]");
  const stepEls = [...document.querySelectorAll("[data-step]")];
  const compact = () => window.matchMedia("(max-width: 960px)").matches;
  let drawn = reduceMotion;

  const lengthOf = (d) => {
    const probe = document.createElementNS("http://www.w3.org/2000/svg", "path");
    probe.setAttribute("d", d);
    svg.appendChild(probe);
    const l = probe.getTotalLength();
    probe.remove();
    return l;
  };

  const buildPath = () => {
    const box = steps.getBoundingClientRect();
    svg.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
    const pts = stepEls.map((step) => {
      const r = step.querySelector("[data-node]").getBoundingClientRect();
      return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 };
    });
    const last = pts[pts.length - 1];
    let d = `M${-box.left} ${pts[0].y} H${pts[0].x}`;
    const nodeAt = [lengthOf(d)];
    for (let i = 1; i < pts.length; i++) {
      d += ` V${pts[i].y} H${pts[i].x}`;
      nodeAt.push(lengthOf(d));
    }
    d += compact() ? ` V${box.height}` : ` H${box.width + 24} V${last.y - 48}`;
    track.setAttribute("d", d);
    path.setAttribute("d", d);

    const length = path.getTotalLength();
    const duration = Math.min(2.2, Math.max(1.4, length / 1100));
    path.style.transition = "none";
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = drawn ? "0" : `${length}`;
    // Each node lights up as the line reaches it (inverse of an ease-out cubic)
    stepEls.forEach((step, i) => {
      const node = step.querySelector("[data-node]");
      const t = (1 - Math.cbrt(1 - nodeAt[i] / length)) * duration;
      node.style.transitionDelay = drawn ? "0s" : `${t.toFixed(2)}s`;
    });
    path.dataset.duration = duration;
  };

  const draw = () => {
    drawn = true;
    path.getBoundingClientRect();
    path.style.transition = `stroke-dashoffset ${path.dataset.duration}s cubic-bezier(0.22, 1, 0.36, 1)`;
    path.style.strokeDashoffset = "0";
    stepEls.forEach((step) => step.classList.add("is-reached"));
  };

  buildPath();
  if (drawn) {
    stepEls.forEach((step) => step.classList.add("is-reached"));
  } else {
    const lineObserver = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      lineObserver.disconnect();
      draw();
    }, { rootMargin: "0px 0px -30% 0px" });
    lineObserver.observe(stepEls[0].querySelector("[data-node]"));
  }

  // Logo strip: colour rises as a logo nears the middle and fades as it leaves,
  // overlapping with the next one (smoothstep over a ~one-logo radius)
  const marquee = document.querySelector(".logo-marquee");
  if (marquee && !reduceMotion) {
    const logos = [...marquee.querySelectorAll("li")];
    const lit = new Map();
    let frame = 0;
    const light = () => {
      const box = marquee.getBoundingClientRect();
      const mid = box.left + box.width / 2;
      const radius = Math.min(240, box.width / 3);
      logos.forEach((li) => {
        const r = li.getBoundingClientRect();
        const t = Math.max(0, 1 - Math.abs(r.left + r.width / 2 - mid) / radius);
        const v = Math.round(t * t * (3 - 2 * t) * 100) / 100;
        if (lit.get(li) !== v) { lit.set(li, v); li.style.setProperty("--lit", v); }
      });
      frame = requestAnimationFrame(light);
    };
    new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(frame);
      if (entry.isIntersecting) frame = requestAnimationFrame(light);
    }).observe(marquee);
  }

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { updateHeader(); ticking = false; });
  }, { passive: true });
  window.addEventListener("resize", () => {
    if (!compact() && nav.classList.contains("is-open")) setMenu(false);
    updateHeader();
    buildPath();
  });
  document.fonts.ready.then(buildPath);
  updateHeader();

  const year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
})();
