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
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".main-nav");

  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      toggle.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
});

// Scroll reveals: sections fade up (.reveal) and product/drop images
// slide their curtain away (.curtain) the first time they enter the
// viewport. Runs once per element, then stops observing it.
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

// Subtle parallax on the big hero/poster visuals: they drift a small,
// clamped amount opposite the scroll direction as they cross the
// viewport, so they read as slightly slower/deeper than the rest of the
// page rather than pinned flat to it.
(() => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const targets = document.querySelectorAll(".parallax");
  if (!targets.length) return;

  let ticking = false;

  function update() {
    const viewportCenter = window.innerHeight / 2;
    targets.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const elementCenter = rect.top + rect.height / 2;
      const distance = elementCenter - viewportCenter;
      const offset = Math.max(-24, Math.min(24, distance * -0.08));
      el.style.transform = `translateY(${offset}px)`;
    });
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
