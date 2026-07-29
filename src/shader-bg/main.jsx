import { createRoot } from 'react-dom/client';
import ShaderBackground from './ShaderBackground.jsx';

// Every page mounts the main page-background canvas (#shader-bg); some
// also mount a second, independent one for the site-menu drawer's own
// background (see .site-menu-shader-bg in index.html etc.) — both share
// this same [data-shader-mount] marker and are handled identically here,
// each getting its own React root/Canvas rather than trying to reuse one
// across two differently-sized, differently-positioned targets.
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isSmallViewport = window.matchMedia('(max-width: 640px)').matches;

document.querySelectorAll('[data-shader-mount]').forEach((mountPoint) => {
  const requestedVariant = mountPoint.dataset.shaderVariant || 'animated';
  // produit.html/panier.html's main background and the menu drawer's own
  // background already request "static"/"menu" outright, untouched by
  // any of this. For an "animated" request specifically (index.html's
  // main background):
  // - prefers-reduced-motion always wins outright (an explicit user
  //   preference, not a guess) — falls back to the still frame.
  // - on phones, we're testing whether the real ShaderGradient can just
  //   run there: "animated-light" keeps it genuinely animated but with
  //   the actually-expensive knobs turned down (pixelDensity, frameRate,
  //   geometry complexity — see ShaderBackground.jsx), rather than
  //   disabling animation outright as a precaution.
  let variant = requestedVariant;
  if (requestedVariant === 'animated' && prefersReducedMotion) {
    variant = 'static';
  } else if (requestedVariant === 'animated' && isSmallViewport) {
    variant = 'animated-light';
  }

  createRoot(mountPoint).render(<ShaderBackground variant={variant} />);
});
