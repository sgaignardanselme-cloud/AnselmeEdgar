// CMS content loader. Fetches the two files scripts/build-content.js
// compiles from the Decap CMS source files (content/settings/*.json,
// content/products/*.json) and:
//   1. fills in every [data-cms]/[data-cms-lines]/[data-cms-img] element
//      with the matching value from data/settings.json,
//   2. renders the product grids ([data-cms-products]) and, on
//      produit.html, the whole product page (name/price/description/
//      materials/image/size buttons) from data/products.json.
// If either fetch fails — no build has run yet, or this is opened via
// file:// where fetch can't read local files — every page just keeps its
// hardcoded placeholder copy. Nothing here is required for the site to
// render; it's a progressive layer on top of the static HTML, the same
// way the rest of script.js treats JS as an enhancement, not a
// requirement.
(async () => {
  async function fetchJson(path) {
    try {
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  function resolve(path, source) {
    return path.split(".").reduce((value, key) => (value == null ? value : value[key]), source);
  }

  function escapeHtml(value) {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return String(value).replace(/[&<>"']/g, (ch) => map[ch]);
  }

  function applySettings(settings) {
    // Plain text only — safe by construction, no HTML is ever parsed here.
    document.querySelectorAll("[data-cms]").forEach((el) => {
      const value = resolve(el.dataset.cms, settings);
      if (typeof value === "string" && value) el.textContent = value;
    });

    // The one field (hero headline) that supports an explicit line break.
    // Still no HTML injection: the string is split and re-inserted as
    // plain text nodes with real <br> elements between them, never parsed
    // as markup.
    document.querySelectorAll("[data-cms-lines]").forEach((el) => {
      const value = resolve(el.dataset.cmsLines, settings);
      if (typeof value !== "string" || !value) return;
      el.textContent = "";
      value.split("\n").forEach((line, index) => {
        if (index > 0) el.appendChild(document.createElement("br"));
        el.appendChild(document.createTextNode(line));
      });
    });

    // Images: only swapped in if a real one was uploaded in the CMS —
    // otherwise the existing "[PLACEHOLDER — ...]" box stays exactly as
    // it is, which is the point of it being a placeholder.
    document.querySelectorAll("[data-cms-img]").forEach((el) => {
      const value = resolve(el.dataset.cmsImg, settings);
      if (typeof value !== "string" || !value) return;
      if (el.tagName === "IMG") {
        el.src = value;
      } else {
        el.style.backgroundImage = `url("${value}")`;
        el.style.backgroundSize = "cover";
        el.style.backgroundPosition = "center";
        el.textContent = "";
      }
    });

    // Social links (menu, footer, Contact section) — only swapped in
    // once a real URL is set; the placeholder "#" stays otherwise so the
    // link doesn't just go dead.
    document.querySelectorAll("[data-cms-href]").forEach((el) => {
      const value = resolve(el.dataset.cmsHref, settings);
      if (typeof value === "string" && value) el.href = value;
    });

    // Safe even though script.js's flip-countdown IIFE already ran by the
    // time this fetch resolves: it re-reads this attribute every tick
    // rather than caching it once (see the comment there).
    const countdown = document.querySelector("[data-cms-countdown]");
    const releaseDate = resolve("drop.release_date", settings);
    if (countdown && releaseDate) {
      countdown.dataset.countdownTarget = releaseDate;
    }

    // Same reasoning as the countdown above: script.js's count-up only
    // reads data-count-to when the element actually scrolls into view
    // (not at page-load time), so updating it here — well before that —
    // is safe.
    document.querySelectorAll("[data-cms-count]").forEach((el) => {
      const value = resolve(el.dataset.cmsCount, settings);
      if (typeof value === "number") el.dataset.countTo = String(value);
    });

    // <title> mixes a fixed bracket placeholder with per-page text
    // ("[NOM DE LA MARQUE] — Streetwear premium", "Panier — [NOM DE LA
    // MARQUE]"...) — simplest to just patch that one substring rather
    // than route it through the generic [data-cms] textContent mechanism.
    const brandName = resolve("general.brand_name", settings);
    if (brandName) {
      document.title = document.title.replace("[NOM DE LA MARQUE]", brandName);
    }
  }

  // Size guide table (produit.html): rows come straight from
  // settings.size_guide.rows (see admin/config.yml) — no per-product
  // logic, one shared table for the whole site for now. The modal's own
  // open/close behaviour has no CMS data to wait on, so it lives in
  // script.js instead (same split as everywhere else in this file).
  function renderSizeGuide(settings) {
    const body = document.querySelector("[data-size-guide-body]");
    if (!body) return;
    const rows = settings?.size_guide?.rows;
    if (!Array.isArray(rows) || !rows.length) return;
    body.innerHTML = rows
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(row.size || "—")}</td>
            <td>${escapeHtml(row.chest || "—")}</td>
            <td>${escapeHtml(row.length || "—")}</td>
            <td>${escapeHtml(row.shoulders || "—")}</td>
          </tr>
        `
      )
      .join("");
  }

  function productImageHtml(product) {
    // The gallery grids only ever show one thumbnail — the Devant view
    // doubles as it when no dedicated "miniature" image is set, so
    // editors don't have to upload the same front-facing shot twice.
    const thumb = product.image || product.image_front;
    if (thumb) {
      return `<div class="gallery-item-photo" style="background-image:url('${escapeHtml(thumb)}');background-size:cover;background-position:center;"></div>`;
    }
    return `<div class="gallery-item-photo">[Photo]</div>`;
  }

  function productCardHtml(product) {
    return `
      <a href="produit.html?p=${encodeURIComponent(product.slug)}" class="gallery-item">
        <div class="gallery-item-visual curtain">
          ${productImageHtml(product)}
          <span class="curtain-veil"></span>
        </div>
        <p class="gallery-item-label">${escapeHtml(product.name)}</p>
      </a>
    `;
  }

  function renderProductGrids(products, currentSlug) {
    document.querySelectorAll("[data-cms-products]").forEach((grid) => {
      const scope = grid.dataset.cmsProducts; // "all" | "related"
      const list = scope === "related" ? products.filter((p) => p.slug !== currentSlug) : products;
      // No products published yet — leave the static placeholder cards
      // already in the markup rather than blanking the section out.
      if (!list.length) return;
      grid.innerHTML = list.map(productCardHtml).join("");

      // script.js's IntersectionObserver (see the "Scroll reveals" block)
      // already ran and finished observing the *original* static cards
      // by the time this fetch resolves — it has no idea these brand new
      // .curtain elements exist, so without this they'd never get
      // `.is-visible` and the opaque .curtain-veil (background: var(--ink),
      // a dark navy blue) would stay covering the photo forever, reading
      // as a plain dark blue card. Marking them revealed immediately
      // sidesteps that rather than re-wiring a second observer for
      // content that's already loaded, not something scrolling "into
      // view" for the first time in the same sense.
      grid.querySelectorAll(".curtain").forEach((el) => el.classList.add("is-visible"));
    });
  }

  // Devant/Dos/Profil carousel: each view is a .garment-photo stacked in
  // the same box (see .garment-photo-stack in style.css); switching swaps
  // which one carries .is-active/.is-leaving, and CSS transitions do the
  // rotateY + blur "turn" — this just orchestrates the class changes and
  // clears the outgoing view's classes once its own transition ends,
  // rather than assuming a fixed duration. Triggered by a swipe/drag on
  // the image itself, the always-visible prev/next buttons below it (see
  // .carousel-nav-btn in style.css — click and tap alike, no hover
  // dependency), or the dot indicators — all funnel through the same
  // switchTo(), so every trigger gets the identical transition and dot/
  // aria-current update.
  function setupViewSwitcher(page) {
    const stack = page.querySelector("[data-photo-carousel]");
    const photos = Array.from(page.querySelectorAll("[data-view-photo]"));
    const dots = Array.from(page.querySelectorAll("[data-carousel-dots] .carousel-dot"));
    const prevBtn = page.querySelector("[data-carousel-prev]");
    const nextBtn = page.querySelector("[data-carousel-next]");
    if (!stack || !photos.length) return;

    // DOM order (front, back, profile) doubles as the carousel order —
    // neighbor() cycles through it with wraparound, so swiping past the
    // last view loops back to the first rather than dead-ending.
    const order = photos.map((p) => p.dataset.viewPhoto);
    let current = photos.find((p) => p.classList.contains("is-active"))?.dataset.viewPhoto || order[0];

    function neighbor(offset) {
      const index = order.indexOf(current);
      return order[(index + offset + order.length) % order.length];
    }

    function switchTo(view) {
      if (view === current) return;
      const nextPhoto = photos.find((p) => p.dataset.viewPhoto === view);
      const currentPhoto = photos.find((p) => p.dataset.viewPhoto === current);
      if (!nextPhoto || !currentPhoto) return;

      currentPhoto.classList.remove("is-active");
      currentPhoto.classList.add("is-leaving");
      currentPhoto.addEventListener(
        "transitionend",
        () => currentPhoto.classList.remove("is-leaving"),
        { once: true }
      );

      nextPhoto.classList.remove("is-leaving");
      nextPhoto.classList.add("is-active");

      dots.forEach((dot) => {
        const isCurrent = dot.dataset.view === view;
        dot.classList.toggle("is-active", isCurrent);
        dot.setAttribute("aria-current", String(isCurrent));
      });

      current = view;
    }

    dots.forEach((dot) => {
      dot.addEventListener("click", () => switchTo(dot.dataset.view));
    });

    if (prevBtn) prevBtn.addEventListener("click", () => switchTo(neighbor(-1)));
    if (nextBtn) nextBtn.addEventListener("click", () => switchTo(neighbor(1)));

    // ---- Swipe: Pointer Events cover mouse-drag and touch with one
    // implementation (same approach as the progress rail in script.js).
    // touch-action:pan-y on the stack (see style.css) leaves native
    // vertical page scroll alone and only claims the horizontal gesture.
    // Only acts past a minimum distance, and only when the gesture is
    // more horizontal than vertical — an imprecise/mostly-vertical drag
    // (someone just scrolling the page with a thumb that happened to
    // land on the image) doesn't misfire a view change. ----
    const SWIPE_THRESHOLD = 40;
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;

    stack.addEventListener("pointerdown", (event) => {
      dragging = true;
      startX = lastX = event.clientX;
      startY = lastY = event.clientY;
      stack.setPointerCapture(event.pointerId);
    });

    stack.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      lastX = event.clientX;
      lastY = event.clientY;
    });

    function endSwipe(event) {
      if (!dragging) return;
      dragging = false;
      if (stack.hasPointerCapture(event.pointerId)) {
        stack.releasePointerCapture(event.pointerId);
      }
      const deltaX = lastX - startX;
      const deltaY = lastY - startY;
      if (Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY)) {
        switchTo(neighbor(deltaX < 0 ? 1 : -1));
      }
    }

    stack.addEventListener("pointerup", endSwipe);
    stack.addEventListener("pointercancel", endSwipe);
  }

  // Everything below only runs on produit.html ([data-product-page] is
  // only present there) — size selection, the quantity stepper and
  // "Ajouter au panier" all need the CMS's per-product data (which sizes
  // exist, the real price) before they can be built at all, so this
  // replaces what used to be a static-markup-driven block in script.js.
  function renderProductPage(products) {
    const page = document.querySelector("[data-product-page]");
    if (!page || !products.length) return;

    const params = new URLSearchParams(window.location.search);
    const requestedSlug = params.get("p");
    const product = products.find((p) => p.slug === requestedSlug) || products[0];

    const nameEl = page.querySelector("[data-product-name]");
    if (nameEl) nameEl.textContent = product.name;

    const unitPriceEl = page.querySelector("[data-unit-price]");
    if (unitPriceEl) {
      unitPriceEl.textContent = `${product.price} €`;
      unitPriceEl.dataset.unitPrice = String(product.price);
    }

    const descriptionEl = page.querySelector("[data-product-description-short]");
    if (descriptionEl && product.short_description) descriptionEl.textContent = product.short_description;

    const materialsEl = page.querySelector("[data-product-description]");
    if (materialsEl && product.materials) materialsEl.textContent = product.materials;

    // Devant/Dos/Profil photos. "front" also falls back to the legacy
    // single `image` field, so a product that only has that set (not yet
    // re-photographed for the 3 views) still shows *something* instead
    // of a bare placeholder.
    const viewSources = {
      front: product.image_front || product.image,
      back: product.image_back,
      profile: product.image_side,
    };
    page.querySelectorAll("[data-view-photo]").forEach((el) => {
      const src = viewSources[el.dataset.viewPhoto];
      if (!src) return;
      el.style.backgroundImage = `url("${escapeHtml(src)}")`;
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
      el.textContent = "";
    });

    setupViewSwitcher(page);

    document.title = document.title.replace("[Nom de la pièce]", product.name);

    renderProductGrids(products, product.slug);

    // ---- Size selector, built from product.sizes (not hardcoded S/M/L/XL) ----
    const sizeSelector = page.querySelector("[data-size-selector]");
    const sizes = Array.isArray(product.sizes) && product.sizes.length ? product.sizes : ["S", "M", "L", "XL"];
    let selectedSize = null;
    let options = [];

    if (sizeSelector) {
      sizeSelector.innerHTML = sizes
        .map((size) => `<button type="button" class="size-option" data-size="${escapeHtml(size)}" aria-pressed="false">${escapeHtml(size)}</button>`)
        .join("");
      options = Array.from(sizeSelector.querySelectorAll(".size-option"));
    }

    const note = page.querySelector("[data-size-note]");

    options.forEach((option) => {
      option.addEventListener("click", () => {
        options.forEach((o) => {
          o.classList.remove("is-selected");
          o.setAttribute("aria-pressed", "false");
        });
        option.classList.add("is-selected");
        option.setAttribute("aria-pressed", "true");
        selectedSize = option.dataset.size;
        if (note) note.hidden = true;
      });
    });

    // ---- Quantity stepper (min 1, max 10 — same bounds as before) ----
    const MIN_QUANTITY = 1;
    const MAX_QUANTITY = 10;
    let quantity = MIN_QUANTITY;

    const decreaseBtn = page.querySelector("[data-quantity-decrease]");
    const increaseBtn = page.querySelector("[data-quantity-increase]");
    const quantityValueEl = page.querySelector("[data-quantity-value]");
    const quantityEchoEls = page.querySelectorAll("[data-quantity-echo]");
    const quantityPluralEls = page.querySelectorAll("[data-quantity-plural]");
    const totalPriceEl = page.querySelector("[data-total-price]");

    function updateQuantityUI() {
      if (quantityValueEl) quantityValueEl.textContent = quantity;
      if (decreaseBtn) decreaseBtn.disabled = quantity <= MIN_QUANTITY;
      if (increaseBtn) increaseBtn.disabled = quantity >= MAX_QUANTITY;
      quantityEchoEls.forEach((el) => {
        el.textContent = quantity;
      });
      quantityPluralEls.forEach((el) => {
        el.hidden = quantity <= 1;
      });
      if (totalPriceEl) totalPriceEl.textContent = product.price * quantity;
    }

    if (decreaseBtn && increaseBtn) {
      decreaseBtn.addEventListener("click", () => {
        quantity = Math.max(MIN_QUANTITY, quantity - 1);
        updateQuantityUI();
      });
      increaseBtn.addEventListener("click", () => {
        quantity = Math.min(MAX_QUANTITY, quantity + 1);
        updateQuantityUI();
      });
    }
    updateQuantityUI();

    // ---- "Ajouter au panier" (same Cart/showToast globals as before, see script.js) ----
    const addToCartBtn = page.querySelector("[data-add-to-cart-btn]");
    if (addToCartBtn) {
      addToCartBtn.addEventListener("click", () => {
        if (!selectedSize) {
          if (note) note.hidden = false;
          return;
        }

        Cart.add({
          name: product.name,
          size: selectedSize,
          quantity,
          unitPrice: product.price,
          // Same source as the product page's default "Devant" view (see
          // viewSources above) — the cart line reuses it as a reminder
          // thumbnail rather than re-fetching/duplicating anything.
          image: product.image_front || product.image || "",
        });

        showToast("Ajouté au panier");
      });
    }
  }

  const [settings, products] = await Promise.all([
    fetchJson("data/settings.json"),
    fetchJson("data/products.json"),
  ]);

  if (settings) {
    applySettings(settings);
    renderSizeGuide(settings);
  }

  if (products) {
    const params = new URLSearchParams(window.location.search);
    if (document.querySelector("[data-product-page]")) {
      renderProductPage(products);
    } else {
      renderProductGrids(products, params.get("p"));
    }
  }

})();
