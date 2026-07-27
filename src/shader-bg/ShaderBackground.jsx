import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react';

// Two exact settings exports from the shadergradient.co editor — kept
// as-is rather than re-tuned. Only the props listed below actually
// differ between them; everything else is shared.
// - "animated": the original moving background (index.html's hero/scroll).
// - "static": a still frame for produit.html/panier.html, so the shader
//   isn't competing for attention with the size/quantity controls or the
//   cart list on those pages.
const VARIANTS = {
  animated: {
    animate: 'on',
    color1: '#249cff',
    color2: '#1cb8db',
    color3: '#3b91e1',
    type: 'waterPlane',
    uStrength: 4.1,
  },
  static: {
    animate: 'off',
    color1: '#30c4ff',
    color2: '#1f73db',
    color3: '#2d6ce1',
    type: 'plane',
    uStrength: 4,
  },
};

export default function ShaderBackground({ variant = 'animated' }) {
  const settings = VARIANTS[variant] ?? VARIANTS.animated;

  return (
    <ShaderGradientCanvas pointerEvents="none" style={{ position: 'fixed', inset: 0 }}>
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
        frameRate={10}
        gizmoHelper="hide"
        grain="on"
        lightType="3d"
        pixelDensity={1}
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
        uFrequency={5.5}
        uSpeed={0.4}
        uStrength={settings.uStrength}
        uTime={0}
        wireframe={false}
      />
    </ShaderGradientCanvas>
  );
}
