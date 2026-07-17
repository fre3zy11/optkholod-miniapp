import { Alignment, Fit, Layout, Rive } from '@rive-app/canvas';

export function initRiveLogo() {
  const canvas = document.querySelector<HTMLCanvasElement>('#brandRive');
  if (!canvas) return;
  const source = canvas.dataset.src;
  if (!source) return;
  const rive = new Rive({ src: source, canvas, autoplay: true, stateMachines: 'Brand', layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }), onLoad: () => rive.resizeDrawingSurfaceToCanvas() });
  window.addEventListener('resize', () => rive.resizeDrawingSurfaceToCanvas(), { passive: true });
}
