import { createRoot } from 'react-dom/client';
import ShaderBackground from './ShaderBackground.jsx';

const mountPoint = document.getElementById('shader-bg');
if (mountPoint) {
  createRoot(mountPoint).render(<ShaderBackground />);
}
