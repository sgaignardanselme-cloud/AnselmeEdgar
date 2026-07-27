import { createRoot } from 'react-dom/client';
import ShaderBackground from './ShaderBackground.jsx';

const mountPoint = document.getElementById('shader-bg');
if (mountPoint) {
  const variant = mountPoint.dataset.shaderVariant || 'animated';
  createRoot(mountPoint).render(<ShaderBackground variant={variant} />);
}
