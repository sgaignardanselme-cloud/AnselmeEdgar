import { createRoot } from 'react-dom/client';
import ShaderBackground from './ShaderBackground.jsx';

const mountPoint = document.getElementById('shader-bg');
if (mountPoint) {
  const requestedVariant = mountPoint.dataset.shaderVariant || 'animated';
  // produit.html/panier.html already request "static" outright. For
  // index.html's "animated" request specifically, fall back to the
  // still frame instead: a continuously-rendering WebGL canvas is real
  // GPU/battery load, worth avoiding on phones (where perf headroom is
  // lowest) and whenever the user has asked for less motion.
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isSmallViewport = window.matchMedia('(max-width: 640px)').matches;
  const variant = requestedVariant === 'animated' && (prefersReducedMotion || isSmallViewport)
    ? 'static'
    : requestedVariant;
  createRoot(mountPoint).render(<ShaderBackground variant={variant} />);
}
