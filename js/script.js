// Always start at the top of the page on load/reload — deliberately no
// smarter logic than this one unconditional call (no restoring "where
// you were", no distinguishing a genuine reload from a fresh visit with
// a #section already in the URL). history.scrollRestoration is already
// set to "manual" inline in <head> (before the browser would otherwise
// apply its own remembered position); this is the second half — it runs
// here, after the whole page has been parsed, which is also after the
// browser's native jump-to-#anchor would already have happened if the
// URL had a hash, so this call is what actually wins and leaves the
// page at the very top regardless of either of those.
window.scrollTo(0, 0);

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
  const backdrop = document.querySelector("[data-menu-backdrop]");
  const closeBtn = document.querySelector("[data-menu-close]");

  if (!toggle || !menu) return;

  function closeMenu() {
    menu.classList.remove("is-open");
    if (backdrop) backdrop.classList.remove("is-open");
    toggle.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
  }

  function openMenu() {
    menu.classList.add("is-open");
    if (backdrop) backdrop.classList.add("is-open");
    toggle.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    // Hides the cart icon (see body.menu-open in style.css) — it's the
    // one other .floating-nav control the hamburger's own .is-open fade
    // doesn't already cover, since it isn't the hamburger itself.
    document.body.classList.add("menu-open");
  }

  // Only the hamburger opens (single entry point); several things can
  // close it now that it's a drawer instead of a full-screen overlay —
  // its own close button, tapping the dimmed backdrop, picking a nav
  // link, Escape, or the hamburger itself again.
  toggle.addEventListener("click", () => {
    if (menu.classList.contains("is-open")) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  if (closeBtn) closeBtn.addEventListener("click", closeMenu);
  if (backdrop) backdrop.addEventListener("click", closeMenu);

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

// Global cart: localStorage-backed (not a plain in-memory variable, and
// not sessionStorage) — the site is multi-page, so a variable would
// reset on every navigation between index.html/produit.html/archives.html,
// defeating "accessible from any page"; localStorage additionally
// survives closing the tab or an accidental reload, which sessionStorage
// wouldn't (it's cleared the moment the tab closes). Still needs no
// backend. Declared at the top level (not inside an IIFE) so both the
// header badge below and produit.html's "Ajouter au panier" handler
// further down the file can call it.
const Cart = (() => {
  const STORAGE_KEY = "cart";

  function read() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  // Shared by add/remove/setQuantity: writes the array back, then
  // refreshes the header badge either way — even if storage failed
  // (unavailable/full), the in-memory change for this render still
  // applies, it just won't survive a navigation.
  function persist(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      // Ignored — see comment above.
    }
    renderBadge();
  }

  // A brief, more noticeable confirmation than the toast alone — the
  // cart icon itself bounces. Only on an actual add (not remove/quantity
  // changes elsewhere, which also go through persist() above), so it's
  // called explicitly here rather than folded into persist()/renderBadge().
  function bumpIcon() {
    const btn = document.querySelector("[data-cart-btn]");
    if (!btn) return;
    btn.classList.remove("is-bumped");
    void btn.offsetWidth; // restart the animation on repeated adds
    btn.classList.add("is-bumped");
  }

  function add(item) {
    const items = read();
    items.push(item);
    persist(items);
    bumpIcon();
  }

  function remove(index) {
    const items = read();
    items.splice(index, 1);
    persist(items);
  }

  // Empties the cart outright — used once an order is actually placed
  // (see the checkout handler below), since those items aren't "in the
  // cart" any more once they're on a confirmed order.
  function clear() {
    persist([]);
  }

  // No "total" field is kept in storage — every reader recomputes
  // unitPrice * quantity itself, so there's nothing to fall out of sync
  // when the quantity changes here.
  function setQuantity(index, quantity) {
    const items = read();
    if (!items[index]) return;
    items[index].quantity = quantity;
    persist(items);
  }

  function count() {
    return read().reduce((total, item) => total + (item.quantity || 1), 0);
  }

  function renderBadge() {
    const badge = document.querySelector("[data-cart-badge]");
    if (!badge) return;
    const total = count();
    badge.textContent = total;
    badge.hidden = total === 0;
  }

  return { read, add, remove, setQuantity, clear, count, renderBadge };
})();

Cart.renderBadge();

// Footer copyright year: computed, not hardcoded, so it doesn't need a
// manual edit every January 1st.
document.querySelectorAll("[data-current-year]").forEach((el) => {
  el.textContent = new Date().getFullYear();
});

// Toast: a small, self-dismissing notification (e.g. "Ajouté au
// panier"), built and appended on demand rather than living in every
// page's markup, since only pages that actually call this need it.
function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  toast.textContent = message;
  document.body.appendChild(toast);

  window.requestAnimationFrame(() => toast.classList.add("is-visible"));

  window.setTimeout(() => {
    toast.classList.remove("is-visible");
    window.setTimeout(() => toast.remove(), 300);
  }, 2200);
}

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

  if (Number.isNaN(new Date(countdown.dataset.countdownTarget).getTime())) return;

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
    // Re-read the attribute on every tick instead of caching a single
    // Date at setup — content.js may update data-countdown-target
    // asynchronously (once the CMS's release date has loaded), after
    // this IIFE has already run. Re-parsing a short string every second
    // is free; caching it once would mean the countdown silently keeps
    // counting down to the stale placeholder date forever.
    const targetDate = new Date(countdown.dataset.countdownTarget);
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

// Product page (size selector, quantity stepper, "Ajouter au panier") has
// moved to js/content.js — it now needs the CMS-driven product data
// (which sizes actually exist for THIS product, its real price) before it
// can build the size buttons or know what to add to the cart, so it's
// wired up there once that data has loaded rather than against static
// markup here.

// Cart page: renders every line item from the global Cart, lets each be
// adjusted (quantity, min 1 / max 10 — same bounds as the product page's
// own stepper) or removed, and recomputes the grand total on every
// change. Shows the empty state instead of a blank list when there's
// nothing in it. "Payer" here is the real checkout action (as opposed to
// produit.html's "Ajouter au panier") but is still just a placeholder —
// no Shopify integration yet. Only present on panier.html.
(() => {
  const list = document.querySelector("[data-cart-list]");
  if (!list) return;

  const emptyEl = document.querySelector("[data-cart-empty]");
  const contentEl = document.querySelector("[data-cart-content]");
  const grandTotalEl = document.querySelector("[data-cart-grand-total]");
  const checkoutBtn = document.querySelector("[data-cart-checkout-btn]");

  const MIN_QUANTITY = 1;
  const MAX_QUANTITY = 10;

  function escapeHtml(value) {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return String(value).replace(/[&<>"']/g, (ch) => map[ch]);
  }

  function lineTotal(item) {
    return Number.isFinite(item.unitPrice) ? item.unitPrice * item.quantity : null;
  }

  function render() {
    const items = Cart.read();

    if (emptyEl) emptyEl.hidden = items.length > 0;
    if (contentEl) contentEl.hidden = items.length === 0;

    list.innerHTML = "";
    let grandTotal = 0;
    let hasUnknownPrice = false;

    items.forEach((item, index) => {
      const total = lineTotal(item);
      if (total === null) {
        hasUnknownPrice = true;
      } else {
        grandTotal += total;
      }

      const row = document.createElement("div");
      row.className = "cart-item";
      // item.image is only set on items added after this thumbnail was
      // introduced — older carts already sitting in localStorage won't
      // have it, so fall back to an empty tinted box rather than a broken
      // image icon.
      const thumb = item.image
        ? `<img src="${escapeHtml(item.image)}" alt="" loading="lazy" />`
        : "";
      row.innerHTML = `
        <div class="cart-item-thumb">${thumb}</div>
        <div class="cart-item-info">
          <p class="cart-item-name">${escapeHtml(item.name)}</p>
          <p class="cart-item-size">Taille ${escapeHtml(item.size)}</p>
        </div>
        <div class="quantity-selector" role="group" aria-label="Modifier la quantité">
          <button type="button" class="quantity-btn" data-action="decrease" aria-label="Diminuer la quantité" ${item.quantity <= MIN_QUANTITY ? "disabled" : ""}>&minus;</button>
          <span class="quantity-value">${item.quantity}</span>
          <button type="button" class="quantity-btn" data-action="increase" aria-label="Augmenter la quantité" ${item.quantity >= MAX_QUANTITY ? "disabled" : ""}>+</button>
        </div>
        <p class="cart-item-price">${Number.isFinite(item.unitPrice) ? `${item.unitPrice} €` : "—"}</p>
        <p class="cart-item-total">${total !== null ? `${total} €` : "—"}</p>
        <button type="button" class="cart-item-remove" data-action="remove" aria-label="Retirer cet article">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 7h16" />
            <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
          </svg>
        </button>
      `;

      row.querySelector('[data-action="decrease"]').addEventListener("click", () => {
        Cart.setQuantity(index, Math.max(MIN_QUANTITY, item.quantity - 1));
        render();
      });
      row.querySelector('[data-action="increase"]').addEventListener("click", () => {
        Cart.setQuantity(index, Math.min(MAX_QUANTITY, item.quantity + 1));
        render();
      });
      row.querySelector('[data-action="remove"]').addEventListener("click", () => {
        Cart.remove(index);
        render();
      });

      list.appendChild(row);
    });

    if (grandTotalEl) {
      grandTotalEl.textContent = hasUnknownPrice ? `${grandTotal}+` : grandTotal;
    }
  }

  render();

  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", () => {
      // [PLACEHOLDER] Pas de vraie transaction pour l'instant — à relier
      // à Shopify plus tard. In the meantime this still behaves like a
      // real checkout from the user's point of view: an order number is
      // generated, the cart is emptied, and confirmation.html shows a
      // proper summary instead of a bare alert().
      const items = Cart.read();
      if (!items.length) return;

      const orderNumber = `CMD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const total = items.reduce(
        (sum, item) => (Number.isFinite(item.unitPrice) ? sum + item.unitPrice * item.quantity : sum),
        0
      );
      const hasUnknownPrice = items.some((item) => !Number.isFinite(item.unitPrice));

      // sessionStorage, not localStorage: this is a one-time handoff to
      // the very next page load, not something that should persist
      // across visits the way the cart itself needs to (see Cart above).
      try {
        sessionStorage.setItem(
          "lastOrder",
          JSON.stringify({ orderNumber, items, total, hasUnknownPrice })
        );
      } catch (error) {
        // Ignored — confirmation.html falls back to its empty state.
      }

      Cart.clear();
      window.location.href = "confirmation.html";
    });
  }
})();

// Order confirmation page (confirmation.html only — [data-order-summary]
// is only present there): reads the handoff sessionStorage.setItem
// above wrote, renders the summary, and falls back to an empty state if
// opened without it (direct nav, refresh after the tab's session data is
// gone, etc.) rather than showing a broken/blank page.
(() => {
  const summaryEl = document.querySelector("[data-order-summary]");
  if (!summaryEl) return;

  const numberEl = document.querySelector("[data-order-number]");
  const totalEl = document.querySelector("[data-order-total]");
  const emptyEl = document.querySelector("[data-order-empty]");
  const contentEl = document.querySelector("[data-order-content]");

  function escapeHtml(value) {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return String(value).replace(/[&<>"']/g, (ch) => map[ch]);
  }

  let order = null;
  try {
    order = JSON.parse(sessionStorage.getItem("lastOrder"));
  } catch (error) {
    order = null;
  }

  if (!order || !Array.isArray(order.items) || !order.items.length) {
    if (emptyEl) emptyEl.hidden = false;
    if (contentEl) contentEl.hidden = true;
    return;
  }

  if (contentEl) contentEl.hidden = false;
  if (emptyEl) emptyEl.hidden = true;
  if (numberEl) numberEl.textContent = order.orderNumber;
  if (totalEl) totalEl.textContent = order.hasUnknownPrice ? `${order.total}+` : order.total;

  summaryEl.innerHTML = order.items
    .map((item) => {
      const thumb = item.image ? `<img src="${escapeHtml(item.image)}" alt="" loading="lazy" />` : "";
      const lineTotal = Number.isFinite(item.unitPrice) ? `${item.unitPrice * item.quantity} €` : "—";
      return `
        <div class="order-item">
          <div class="order-item-thumb">${thumb}</div>
          <div class="order-item-info">
            <p class="order-item-name">${escapeHtml(item.name)}</p>
            <p class="order-item-size">Taille ${escapeHtml(item.size)} · Qté ${item.quantity}</p>
          </div>
          <p class="order-item-price">${lineTotal}</p>
        </div>
      `;
    })
    .join("");
})();

// Size guide modal (produit.html only — [data-size-guide-modal] is only
// present there). Same open/close/backdrop/Escape pattern as the
// hamburger .site-menu above; the table's own content is filled in by
// content.js once the CMS data (settings.size_guide.rows) has loaded —
// this only owns showing/hiding the panel.
document.addEventListener("DOMContentLoaded", () => {
  const openBtn = document.querySelector("[data-size-guide-open]");
  const modal = document.querySelector("[data-size-guide-modal]");
  if (!openBtn || !modal) return;

  const closeTriggers = modal.querySelectorAll("[data-size-guide-close]");

  function open() {
    modal.hidden = false;
    document.body.classList.add("modal-open");
  }

  function close() {
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    openBtn.focus();
  }

  openBtn.addEventListener("click", open);
  closeTriggers.forEach((el) => el.addEventListener("click", close));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) close();
  });
});
