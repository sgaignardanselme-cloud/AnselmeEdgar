// Page transition: the entry fade is a pure CSS animation (see `body`
// in css/style.css) that runs on its own without waiting on any script.
// This just handles the exit fade before following an internal link.
// Falls back to a normal, instant navigation with no JS (see the
// `html.js` scoping in css/style.css).
(() => {
  const EXIT_DURATION = 150;

  function isInternalNavigableLink(link) {
    if (!link || link.target === "_blank" || link.hasAttribute("download")) {
      return false;
    }
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      return false;
    }
    try {
      const url = new URL(link.href, window.location.href);
      return url.origin === window.location.origin;
    } catch (error) {
      return false;
    }
  }

  document.querySelectorAll("a[href]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      ) {
        return;
      }
      if (!isInternalNavigableLink(link)) return;
      if (link.href === window.location.href) return;

      event.preventDefault();
      document.body.classList.add("is-leaving");
      window.setTimeout(() => {
        window.location.href = link.href;
      }, EXIT_DURATION);
    });
  });

  // A page restored from the back/forward cache could be frozen mid-exit
  // (is-leaving still applied) — clear it so the page is visible again.
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      document.body.classList.remove("is-leaving");
    }
  });
})();

document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".hamburger-btn");
  const menu = document.querySelector(".site-menu");

  if (!toggle || !menu) return;

  function closeMenu() {
    menu.classList.remove("is-open");
    toggle.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }

  toggle.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("is-open");
    toggle.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu.classList.contains("is-open")) {
      closeMenu();
      toggle.focus();
    }
  });
});

// Scroll reveals: sections fade up (.reveal) and product/drop images
// slide their curtain away (.curtain) the first time they enter the
// viewport. Runs once per element, then stops observing it. (The
// opening signature has its own plain CSS animation — see .signature-reveal
// in css/style.css — since it's always visible at load and doesn't need
// scroll-triggering.)
(() => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const targets = document.querySelectorAll(".reveal, .curtain");
  if (!targets.length) return;

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
  );

  targets.forEach((el) => observer.observe(el));
})();

// Parallax on the big hero/poster visuals: a scroll-driven vertical drift
// (all `.parallax` elements) plus, for the hero's visual specifically, a
// mouse-driven offset. Both write to the same element's `transform`, so
// they're tracked as separate state per element and combined in one
// `render()` call rather than each independently overwriting the style
// (which would make them fight over the property).
(() => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const targets = document.querySelectorAll(".parallax");
  if (!targets.length) return;

  const state = new Map();
  targets.forEach((el) => state.set(el, { scrollY: 0, mouseX: 0, mouseY: 0 }));

  function render(el) {
    const s = state.get(el);
    el.style.transform = `translate(${s.mouseX}px, ${s.scrollY + s.mouseY}px)`;
  }

  // Scroll drift: a small, clamped amount opposite the scroll direction
  // as each visual crosses the viewport, so it reads as slightly
  // slower/deeper than the rest of the page rather than pinned flat to it.
  let scrollTicking = false;

  function updateScroll() {
    const viewportCenter = window.innerHeight / 2;
    targets.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const elementCenter = rect.top + rect.height / 2;
      const distance = elementCenter - viewportCenter;
      state.get(el).scrollY = Math.max(-24, Math.min(24, distance * -0.08));
      render(el);
    });
    scrollTicking = false;
  }

  function onScroll() {
    if (!scrollTicking) {
      window.requestAnimationFrame(updateScroll);
      scrollTicking = true;
    }
  }

  updateScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  // Mouse drift: hero only. The visual eases toward a target offset that
  // moves opposite the cursor (like a window shifting to reveal what's
  // "behind" it as your viewpoint moves), instead of tracking the mouse
  // directly — the easing is what keeps it feeling fluid/damped rather
  // than a raw, instant follow.
  const hero = document.querySelector(".hero");
  const heroVisual = document.querySelector(".hero-visual-frame");

  if (hero && heroVisual && state.has(heroVisual)) {
    const MAX_OFFSET = 10; // px — subtle, not an exaggerated tilt
    const EASE = 0.08; // lower = softer/laggier follow
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    hero.addEventListener("mousemove", (event) => {
      const rect = hero.getBoundingClientRect();
      const relX = (event.clientX - rect.left) / rect.width - 0.5;
      const relY = (event.clientY - rect.top) / rect.height - 0.5;
      targetX = -relX * MAX_OFFSET * 2;
      targetY = -relY * MAX_OFFSET * 2;
    });

    hero.addEventListener("mouseleave", () => {
      targetX = 0;
      targetY = 0;
    });

    (function tick() {
      currentX += (targetX - currentX) * EASE;
      currentY += (targetY - currentY) * EASE;
      const s = state.get(heroVisual);
      s.mouseX = currentX;
      s.mouseY = currentY;
      render(heroVisual);
      window.requestAnimationFrame(tick);
    })();
  }
})();

// Custom "Voir" cursor over clickable image cards (.cursor-reveal-target).
// Skipped entirely on touch/coarse-pointer devices, where a hover cursor
// makes no sense.
(() => {
  const supportsFineHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const targets = document.querySelectorAll(".cursor-reveal-target");
  if (!supportsFineHover || !targets.length) return;

  const cursor = document.createElement("div");
  cursor.className = "custom-cursor";
  cursor.innerHTML = "<span>Voir</span>";
  cursor.setAttribute("aria-hidden", "true");
  document.body.appendChild(cursor);

  window.addEventListener("mousemove", (event) => {
    cursor.style.left = `${event.clientX}px`;
    cursor.style.top = `${event.clientY}px`;
  });

  targets.forEach((target) => {
    target.addEventListener("mouseenter", () => cursor.classList.add("is-active"));
    target.addEventListener("mouseleave", () => cursor.classList.remove("is-active"));
  });
})();

// Count-up stat: any ".count-up" span counts from 0 to its data-count-to
// value the first time it scrolls into view, instead of appearing flat.
(() => {
  const counters = document.querySelectorAll(".count-up");
  if (!counters.length) return;

  function animateCounter(el) {
    const target = parseInt(el.dataset.countTo, 10);
    if (!Number.isFinite(target)) return;
    const duration = 1200;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased);
      if (progress < 1) {
        window.requestAnimationFrame(tick);
      } else {
        el.textContent = target;
      }
    }
    window.requestAnimationFrame(tick);
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
    counters.forEach((el) => {
      el.textContent = el.dataset.countTo;
    });
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.4 }
  );

  counters.forEach((el) => observer.observe(el));
})();

// Flip-clock countdown to the drop's release date. Only the units whose
// displayed value actually changes get the flip animation, so — like a
// real station clock — the seconds card flips constantly while days
// rarely moves.
(() => {
  const countdown = document.querySelector(".flip-countdown");
  if (!countdown) return;

  const targetDate = new Date(countdown.dataset.countdownTarget);
  if (Number.isNaN(targetDate.getTime())) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const units = {
    days: countdown.querySelector('[data-unit="days"] .flip-value'),
    hours: countdown.querySelector('[data-unit="hours"] .flip-value'),
    minutes: countdown.querySelector('[data-unit="minutes"] .flip-value'),
    seconds: countdown.querySelector('[data-unit="seconds"] .flip-value'),
  };

  function setValue(node, value) {
    if (!node) return;
    const padded = String(Math.max(0, value)).padStart(2, "0");
    if (node.textContent === padded) return;

    if (reduceMotion) {
      node.textContent = padded;
      return;
    }

    node.classList.remove("is-flipping");
    void node.offsetWidth; // restart the animation on repeated changes
    node.classList.add("is-flipping");
    window.setTimeout(() => {
      node.textContent = padded;
    }, 250);
  }

  function tick() {
    const diffMs = Math.max(0, targetDate.getTime() - Date.now());
    const totalSeconds = Math.floor(diffMs / 1000);

    setValue(units.days, Math.floor(totalSeconds / 86400));
    setValue(units.hours, Math.floor((totalSeconds % 86400) / 3600));
    setValue(units.minutes, Math.floor((totalSeconds % 3600) / 60));
    setValue(units.seconds, totalSeconds % 60);
  }

  tick();
  window.setInterval(tick, 1000);
})();

// Scrollspy: keeps the dot nav and the top nav's "current section"
// highlight in sync with whichever major section is centred in the
// viewport.
(() => {
  const sections = document.querySelectorAll(".scroll-section");
  const dots = document.querySelectorAll(".dot-nav-item");
  if (!sections.length || !dots.length || !("IntersectionObserver" in window)) return;

  const navLinks = document.querySelectorAll('.site-menu-nav a[href^="#"]');

  function setActive(id) {
    dots.forEach((dot) => dot.classList.toggle("is-active", dot.dataset.dot === id));
    navLinks.forEach((link) => link.classList.toggle("is-active", link.getAttribute("href") === `#${id}`));
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    },
    { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
  );

  sections.forEach((section) => observer.observe(section));
})();

// Progress rail: slides the marker down the fixed vertical line in step
// with how far through the document the user has scrolled (0% at the
// very top, 100% at the very bottom). Not gated behind
// prefers-reduced-motion — like the adaptive text colour, this tracks
// scroll position directly rather than playing an independent animation.
(() => {
  const marker = document.querySelector(".progress-rail-marker");
  if (!marker) return;

  let ticking = false;

  function update() {
    const doc = document.documentElement;
    const maxScroll = doc.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 0;
    marker.style.top = `${progress * 100}%`;
    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(update);
      ticking = true;
    }
  }

  update();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
})();
