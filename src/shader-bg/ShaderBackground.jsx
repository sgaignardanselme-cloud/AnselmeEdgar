import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react';

// One shared config, used identically everywhere this mounts — index.html's
// main background, the site-menu drawer's own background, and produit/
// panier/confirmation's main background all render the exact same still
// gradient now (see main.jsx). animate is "off", so there's no more
// per-page "animated vs static" or prefers-reduced-motion branching to do:
// every mount is already a still frame. pixelDensity is the one knob that
// still varies by caller — see main.jsx's mobile/desktop split — because
// at the requested value (2.5) it's the single most expensive part of this
// shader to render on a phone.
export default function ShaderBackground({ pixelDensity = 2.5 }) {
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
        animate="off"
        axesHelper="off"
        brightness={1.2}
        cAzimuthAngle={180}
        cDistance={3.6}
        cPolarAngle={90}
        cameraZoom={1}
        color1="#1751ff"
        color2="#3598db"
        color3="#07a0e1"
        destination="onCanvas"
        embedMode="off"
        envPreset="city"
        format="gif"
        fov={45}
        frameRate={10}
        gizmoHelper="hide"
        grain="on"
        lightType="3d"
        pixelDensity={pixelDensity}
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
        type="plane"
        uAmplitude={1}
        uDensity={1.3}
        uFrequency={5.5}
        uSpeed={0.4}
        uStrength={4}
        uTime={0}
        wireframe={false}
      />
    </ShaderGradientCanvas>
  );
}
