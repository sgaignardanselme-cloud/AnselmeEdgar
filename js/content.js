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

  // Avis clients (index.html only — [data-reviews-section] is only
  // present there): an arc carousel adapted from a React/Framer Motion
  // reference the marque supplied. Reproduced here as plain CSS custom
  // properties (--rx/--ry/--rs/--ro/--rz, see .review-card in style.css)
  // driven by this controller instead of Framer's spring animation —
  // CSS transitions on those same properties give the "cards glide into
  // their new arc position" effect for free.
  function reviewCardHtml(review, index) {
    const rating = Math.max(0, Math.min(5, Math.round(Number(review.rating)) || 0));
    const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
    const name = review.name || "Client·e";
    return `
      <button type="button" class="review-card" data-review-card data-index="${index}" aria-label="${escapeHtml(name)} — ${rating} sur 5 étoiles">
        <span class="review-stars" aria-hidden="true">${stars}</span>
        <p class="review-text">${escapeHtml(review.text || "")}</p>
        <p class="review-name">${escapeHtml(name)}</p>
      </button>
    `;
  }

  // Runs the actual arc/autoplay/nav mechanics against whatever
  // .review-card buttons currently exist in the stage — called once for
  // the static placeholder markup (so the carousel works immediately,
  // even if the settings.json fetch below is slow or fails) and again
  // whenever renderReviews() swaps in real CMS content, since that
  // innerHTML replacement invalidates the old button references.
  function setupReviewsCarousel(container) {
    const stage = container.querySelector("[data-reviews-stage]");
    const dotsContainer = container.querySelector("[data-reviews-dots]");
    const prevBtn = container.querySelector("[data-reviews-prev]");
    const nextBtn = container.querySelector("[data-reviews-next]");
    if (!stage) return;

    const cards = Array.from(stage.querySelectorAll("[data-review-card]"));
    const total = cards.length;
    if (!total) return;

    // 5 visible at once (the active card plus 2 either side) — matches
    // the reference component's VISIBLE_COUNT, used both for the sin/cos
    // spacing below and for which cards get hidden outside that window.
    const VISIBLE_HALF = 2;
    let active = 0;
    let autoplayId = null;
    let pausedByUser = false;

    if (dotsContainer) {
      dotsContainer.innerHTML = cards
        .map((_, i) => `<button type="button" class="reviews-dot" data-dot-index="${i}" role="tab" aria-label="Avis ${i + 1} sur ${total}"></button>`)
        .join("");
    }
    const dots = dotsContainer ? Array.from(dotsContainer.querySelectorAll("[data-dot-index]")) : [];

    function radii() {
      const computed = getComputedStyle(container);
      return {
        x: parseFloat(computed.getPropertyValue("--reviews-radius-x")) || 220,
        y: parseFloat(computed.getPropertyValue("--reviews-radius-y")) || 100,
      };
    }

    function update() {
      const { x: radiusX, y: radiusY } = radii();
      cards.forEach((card, i) => {
        let offset = i - active;
        if (offset > total / 2) offset -= total;
        if (offset < -total / 2) offset += total;

        const isVisible = Math.abs(offset) <= VISIBLE_HALF;
        card.classList.toggle("is-visible", isVisible);
        card.classList.toggle("is-active", offset === 0);
        card.tabIndex = isVisible ? 0 : -1;

        if (!isVisible) {
          card.style.setProperty("--ro", "0");
          card.style.setProperty("--rz", "0");
          return;
        }

        const angle = (offset / 5) * Math.PI;
        const distance = Math.abs(offset);
        const maxDistance = VISIBLE_HALF + 1;

        card.style.setProperty("--rx", `${Math.sin(angle) * radiusX}px`);
        card.style.setProperty("--ry", `${-Math.cos(angle) * radiusY}px`);
        card.style.setProperty("--rs", String(Math.max(0, 1 - (distance / maxDistance) * 0.3)));
        card.style.setProperty("--ro", String(Math.max(0.3, 1 - (distance / maxDistance) * 0.7)));
        card.style.setProperty("--rz", String(VISIBLE_HALF + 3 - distance));
      });

      dots.forEach((dot, i) => dot.classList.toggle("is-active", i === active));
    }

    function goTo(index) {
      active = ((index % total) + total) % total;
      update();
    }

    function next() {
      goTo(active + 1);
    }

    function prev() {
      goTo(active - 1);
    }

    function stopAutoplay() {
      if (autoplayId) {
        window.clearInterval(autoplayId);
        autoplayId = null;
      }
    }

    function startAutoplay() {
      stopAutoplay();
      if (pausedByUser) return;
      autoplayId = window.setInterval(next, 4000);
    }

    // Hover and focus both pause it — a keyboard user tabbing through the
    // dots/cards shouldn't have the carousel jump to a new position out
    // from under them mid-navigation, same reasoning as the mouse case.
    container.addEventListener("mouseenter", () => {
      pausedByUser = true;
      stopAutoplay();
    });
    container.addEventListener("mouseleave", () => {
      pausedByUser = false;
      startAutoplay();
    });
    container.addEventListener("focusin", () => {
      pausedByUser = true;
      stopAutoplay();
    });
    container.addEventListener("focusout", (event) => {
      if (container.contains(event.relatedTarget)) return;
      pausedByUser = false;
      startAutoplay();
    });

    cards.forEach((card, i) => card.addEventListener("click", () => goTo(i)));
    dots.forEach((dot, i) => dot.addEventListener("click", () => goTo(i)));
    if (prevBtn) prevBtn.addEventListener("click", prev);
    if (nextBtn) nextBtn.addEventListener("click", next);

    // --reviews-radius-x/-y (see style.css) change at the 640px media
    // query breakpoint — re-reading them on resize (rather than only at
    // setup time) keeps the arc correctly scaled across an orientation
    // change or a resized window, not just at initial load.
    let resizePending = false;
    window.addEventListener("resize", () => {
      if (resizePending) return;
      resizePending = true;
      window.requestAnimationFrame(() => {
        resizePending = false;
        update();
      });
    });

    container.classList.add("is-enhanced");
    update();
    startAutoplay();
  }

  function renderReviews(settings) {
    const container = document.querySelector("[data-reviews-section]");
    if (!container) return;

    const items = settings?.reviews?.items;
    if (Array.isArray(items) && items.length) {
      const stage = container.querySelector("[data-reviews-stage]");
      if (stage) stage.innerHTML = items.map(reviewCardHtml).join("");
    }

    setupReviewsCarousel(container);
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
      worn: product.image_worn,
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

    // ---- Size selector, built from product.sizes. Each entry now carries
    // its own stock ({size, stock}, see admin/config.yml) rather than just
    // being a plain checkable label — a size at stock 0 still renders (so
    // shoppers see it exists) but struck-through/disabled (.is-unavailable,
    // see style.css) instead of clickable. A legacy plain-string entry
    // (pre-stock content) falls back to unlimited stock rather than being
    // treated as sold out.
    //
    // A product can also skip sizes entirely (product.unique_size, e.g.
    // bags/accessories) — that's handled below, after this block builds
    // the shared quantity-stepper machinery both modes rely on. ----
    const sizeSelectorGroup = page.querySelector("[data-size-selector-group]");
    const sizeSelector = page.querySelector("[data-size-selector]");
    const rawSizes = Array.isArray(product.sizes) && product.sizes.length ? product.sizes : ["S", "M", "L", "XL"];
    const sizes = rawSizes.map((entry) =>
      typeof entry === "string" ? { size: entry, stock: Infinity } : { size: entry.size, stock: Number(entry.stock) }
    );
    let selectedSize = null;
    let selectedStock = null;

    const note = page.querySelector("[data-size-note]");

    // ---- Quantity stepper (min 1, capped at 10 or at the selected size's
    // stock, whichever is lower — no size selected yet just caps at 10, same
    // as before the size was known). ----
    const MIN_QUANTITY = 1;
    const ABSOLUTE_MAX_QUANTITY = 10;
    let quantity = MIN_QUANTITY;

    const decreaseBtn = page.querySelector("[data-quantity-decrease]");
    const increaseBtn = page.querySelector("[data-quantity-increase]");
    const quantityValueEl = page.querySelector("[data-quantity-value]");
    const quantityEchoEls = page.querySelectorAll("[data-quantity-echo]");
    const quantityPluralEls = page.querySelectorAll("[data-quantity-plural]");
    const totalPriceEl = page.querySelector("[data-total-price]");
    const addToCartBtn = page.querySelector("[data-add-to-cart-btn]");

    function currentMaxQuantity() {
      return Math.min(ABSOLUTE_MAX_QUANTITY, selectedStock ?? ABSOLUTE_MAX_QUANTITY);
    }

    function updateQuantityUI() {
      if (quantityValueEl) quantityValueEl.textContent = quantity;
      if (decreaseBtn) decreaseBtn.disabled = quantity <= MIN_QUANTITY;
      if (increaseBtn) increaseBtn.disabled = quantity >= currentMaxQuantity();
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
        quantity = Math.min(currentMaxQuantity(), quantity + 1);
        updateQuantityUI();
      });
    }

    if (product.unique_size) {
      // No S/M/L/XL at all — the size-selector-group is replaced by a
      // plain "Taille unique" label (not just hidden, so shoppers still
      // see this was deliberate rather than a missing/broken selector),
      // and the size is implicitly "selected" against the single stock
      // count. Sold out (stock 0) disables the quantity stepper (via
      // currentMaxQuantity() returning 0) and the "Ajouter au panier"
      // button itself, with its label swapped to make the reason obvious.
      if (sizeSelectorGroup) {
        sizeSelectorGroup.innerHTML = '<p class="unique-size-label">Taille unique</p>';
      }
      if (note) note.hidden = true;
      selectedSize = "Taille unique";
      selectedStock = Number(product.unique_size_stock) || 0;
      quantity = Math.min(quantity, currentMaxQuantity());

      if (addToCartBtn && selectedStock <= 0) {
        addToCartBtn.disabled = true;
        addToCartBtn.textContent = "Épuisé";
      }
    } else if (sizeSelector) {
      sizeSelector.innerHTML = sizes
        .map(({ size, stock }) => {
          const outOfStock = stock <= 0;
          const stockAttr = Number.isFinite(stock) ? stock : "";
          return `<button type="button" class="size-option${outOfStock ? " is-unavailable" : ""}" data-size="${escapeHtml(size)}" data-stock="${stockAttr}" aria-pressed="false"${outOfStock ? ` disabled aria-disabled="true" aria-label="${escapeHtml(size)} — épuisé"` : ""}>${escapeHtml(size)}</button>`;
        })
        .join("");

      const options = Array.from(sizeSelector.querySelectorAll(".size-option:not(:disabled)"));

      options.forEach((option) => {
        option.addEventListener("click", () => {
          sizeSelector.querySelectorAll(".size-option").forEach((o) => {
            o.classList.remove("is-selected");
            o.setAttribute("aria-pressed", "false");
          });
          option.classList.add("is-selected");
          option.setAttribute("aria-pressed", "true");
          selectedSize = option.dataset.size;
          selectedStock = option.dataset.stock === "" ? Infinity : Number(option.dataset.stock);
          if (note) note.hidden = true;
          quantity = Math.min(quantity, currentMaxQuantity());
          updateQuantityUI();
        });
      });
    }

    updateQuantityUI();

    // ---- "Ajouter au panier" (same Cart/showToast globals as before, see script.js) ----
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

  // Unconditional (not gated behind `if (settings)`) — the carousel's
  // arc/autoplay/nav mechanics are independent of the CMS fetch actually
  // succeeding. If it failed, renderReviews still enhances the 10
  // hardcoded placeholder cards already in index.html's markup; it just
  // has no real review text to swap in over them.
  renderReviews(settings || {});

})();
