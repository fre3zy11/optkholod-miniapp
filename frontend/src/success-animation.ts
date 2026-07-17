import { DotLottie } from '@lottiefiles/dotlottie-web';

export function mountSuccessAnimation(container: Element | null) {
  if (!container) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'success-lottie';
  container.replaceChildren(canvas);
  try {
    new DotLottie({ autoplay: true, loop: false, canvas, src: 'assets/order-success.json' });
  } catch {
    container.textContent = '✓';
  }
}
