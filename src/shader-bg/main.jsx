import { createRoot } from 'react-dom/client';
import ShaderBackground from './ShaderBackground.jsx';

const mountPoint = document.getElementById('shader-bg');
if (mountPoint) {
  const requestedVariant = mountPoint.dataset.shaderVariant || 'animated';
  // produit.html/panier.html already request "static" outright, untouched
  // by any of this. For index.html's "animated" request specifically:
  // - prefers-reduced-motion always wins outright (an explicit user
  //   preference, not a guess) — falls back to the still frame.
  // - on phones, we're testing whether the real ShaderGradient can just
  //   run there: "animated-light" keeps it genuinely animated but with
  //   the actually-expensive knobs turned down (pixelDensity, frameRate,
  //   geometry complexity — see ShaderBackground.jsx), rather than
  //   disabling animation outright as a precaution.
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isSmallViewport = window.matchMedia('(max-width: 640px)').matches;

  let variant = requestedVariant;
  if (requestedVariant === 'animated' && prefersReducedMotion) {
    variant = 'static';
  } else if (requestedVariant === 'animated' && isSmallViewport) {
    variant = 'animated-light';
  }

  createRoot(mountPoint).render(<ShaderBackground variant={variant} />);
}
