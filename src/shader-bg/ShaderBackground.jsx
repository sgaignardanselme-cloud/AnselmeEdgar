import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react';

// Exact settings exported from the shadergradient.co editor (user-picked
// blues/camera/noise values) — kept as-is rather than re-tuned.
export default function ShaderBackground() {
  return (
    <ShaderGradientCanvas pointerEvents="none" style={{ position: 'fixed', inset: 0 }}>
      <ShaderGradient
        animate="on"
        axesHelper="off"
        brightness={1.2}
        cAzimuthAngle={180}
        cDistance={3.6}
        cPolarAngle={90}
        cameraZoom={1}
        color1="#249cff"
        color2="#1cb8db"
        color3="#3b91e1"
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
        type="waterPlane"
        uAmplitude={1}
        uDensity={1.3}
        uFrequency={5.5}
        uSpeed={0.4}
        uStrength={4.1}
        uTime={0}
        wireframe={false}
      />
    </ShaderGradientCanvas>
  );
}
