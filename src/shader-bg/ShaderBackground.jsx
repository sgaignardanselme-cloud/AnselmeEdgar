import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react';

// Three settings presets. "animated" and "static" are the exact exports
// from the shadergradient.co editor — kept as-is rather than re-tuned.
// Only the props listed per variant below actually differ; everything
// else is shared.
// - "animated": the original moving background (index.html's hero/scroll,
//   desktop/tablet).
// - "animated-light": same look and still genuinely animated, but with
//   the actually-expensive knobs turned down for phones — lower
//   pixelDensity (fewer pixels shaded per frame), lower frameRate, a
//   simpler geometry (`type: 'plane'` instead of `'waterPlane'`), and
//   lower uStrength/uFrequency (less displacement detail to compute) —
//   before ever reaching for turning the animation off outright.
// - "static": a still frame for produit.html/panier.html, so the shader
//   isn't competing for attention with the size/quantity controls or the
//   cart list on those pages. Also what "animated" falls back to when
//   the OS-level prefers-reduced-motion is set, regardless of screen size.
const VARIANTS = {
  animated: {
    animate: 'on',
    color1: '#249cff',
    color2: '#1cb8db',
    color3: '#3b91e1',
    type: 'waterPlane',
    uStrength: 4.1,
    uFrequency: 5.5,
    pixelDensity: 1,
    frameRate: 10,
  },
  'animated-light': {
    animate: 'on',
    color1: '#249cff',
    color2: '#1cb8db',
    color3: '#3b91e1',
    type: 'plane',
    uStrength: 3,
    uFrequency: 4.5,
    pixelDensity: 0.75,
    frameRate: 8,
  },
  static: {
    animate: 'off',
    color1: '#30c4ff',
    color2: '#1f73db',
    color3: '#2d6ce1',
    type: 'plane',
    uStrength: 4,
    uFrequency: 5.5,
    pixelDensity: 1,
    frameRate: 10,
  },
};

export default function ShaderBackground({ variant = 'animated' }) {
  const settings = VARIANTS[variant] ?? VARIANTS.animated;

  return (
    // `position: absolute` here, not 'fixed': the actual fixed layer —
    // sized against the real dynamic viewport (vh → svh → dvh fallback
    // chain), not just `inset: 0`'s implicit `bottom: 0` — is
    // #shader-bg/.site-shader-bg in css/style.css, which this canvas
    // mounts inside. If this were fixed too, it would independently
    // measure itself against the browser viewport a second time, right
    // back into the same mobile address-bar white-gap bug the CSS fix is
    // solving; filling its (correctly sized) parent instead sidesteps
    // that entirely.
    <ShaderGradientCanvas pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
      <ShaderGradient
        animate={settings.animate}
        axesHelper="off"
        brightness={1.2}
        cAzimuthAngle={180}
        cDistance={3.6}
        cPolarAngle={90}
        cameraZoom={1}
        color1={settings.color1}
        color2={settings.color2}
        color3={settings.color3}
        destination="onCanvas"
        embedMode="off"
        envPreset="city"
        format="gif"
        fov={45}
        frameRate={settings.frameRate}
        gizmoHelper="hide"
        grain="on"
        lightType="3d"
        pixelDensity={settings.pixelDensity}
        positionX={-1.4}
        positionY={0}
        positionZ={0}
        range="disabled"
        rangeEnd={40}
        rangeStart={0}
        reflection={0.1}
        rotationX={0}
        rotationY={10}
        rotationZ={50}
        shader="defaults"
        type={settings.type}
        uAmplitude={1}
        uDensity={1.3}
        uFrequency={settings.uFrequency}
        uSpeed={0.4}
        uStrength={settings.uStrength}
        uTime={0}
        wireframe={false}
      />
    </ShaderGradientCanvas>
  );
}
