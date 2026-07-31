import { createRoot } from 'react-dom/client';
import ShaderBackground from './ShaderBackground.jsx';

// Every page mounts the main page-background canvas (#shader-bg); some
// also mount a second, independent one for the site-menu drawer's own
// background (see .site-menu-shader-bg in index.html etc.) — both share
// this same [data-shader-mount] marker and now render the exact same
// gradient (see ShaderBackground.jsx), so there's nothing left to branch
// on per mount point.
//
// pixelDensity is the one setting that still varies: the requested
// desktop value (2.5) is expensive to render — at that supersampling
// level a phone GPU pays a real cost even for a still (animate: "off")
// frame — so small viewports get a lower value instead. Everything else
// (colors, geometry, grain) stays identical across every mount and every
// device.
const isSmallViewport = window.matchMedia('(max-width: 640px)').matches;
const pixelDensity = isSmallViewport ? 1.5 : 2.5;

document.querySelectorAll('[data-shader-mount]').forEach((mountPoint) => {
  createRoot(mountPoint).render(<ShaderBackground pixelDensity={pixelDensity} />);
});
