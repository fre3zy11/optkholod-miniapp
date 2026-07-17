export function initSnowCanvas() {
  const canvas = document.querySelector<HTMLCanvasElement>('#snowCanvas');
  if (!canvas) return;
  const context = canvas.getContext('2d');
  if (!context) return;
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const particles = Array.from({ length: 28 }, (_, index) => ({
    x: Math.random(), y: Math.random(), radius: .6 + Math.random() * 1.9,
    speed: .000035 + Math.random() * .000055, drift: (Math.random() - .5) * .00003,
    alpha: .12 + Math.random() * .4, phase: index * .7
  }));

  // Render the soft flake glow once. Reusing this bitmap avoids creating 28
  // radial gradients on every animation frame.
  const sprite = document.createElement('canvas');
  const spriteSize = 64;
  sprite.width = spriteSize;
  sprite.height = spriteSize;
  const spriteContext = sprite.getContext('2d');
  if (!spriteContext) return;
  const spriteGlow = spriteContext.createRadialGradient(32, 32, 0, 32, 32, 32);
  spriteGlow.addColorStop(0, 'rgba(225,248,255,1)');
  spriteGlow.addColorStop(.22, 'rgba(210,243,255,.82)');
  spriteGlow.addColorStop(1, 'rgba(111,206,244,0)');
  spriteContext.fillStyle = spriteGlow;
  spriteContext.fillRect(0, 0, spriteSize, spriteSize);

  let width = 0, height = 0, frame = 0, lastTime = performance.now();
  let active = !document.hidden && !motionPreference.matches;
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width; height = rect.height;
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };
  const draw = (time: number) => {
    if (!active) return;
    const delta = Math.min(time - lastTime, 40); lastTime = time;
    context.clearRect(0, 0, width, height);
    for (const particle of particles) {
      particle.y += particle.speed * delta;
      particle.x += (particle.drift + Math.sin(time * .00022 + particle.phase) * .000012) * delta;
      if (particle.y > 1.03) { particle.y = -.03; particle.x = Math.random(); }
      if (particle.x > 1.03) particle.x = -.03;
      if (particle.x < -.03) particle.x = 1.03;
      const size = particle.radius * 8;
      context.globalAlpha = particle.alpha;
      context.drawImage(sprite, particle.x * width - size / 2, particle.y * height - size / 2, size, size);
    }
    context.globalAlpha = 1;
    frame = requestAnimationFrame(draw);
  };
  const syncAnimation = () => {
    active = !document.hidden && !motionPreference.matches;
    canvas.hidden = motionPreference.matches;
    cancelAnimationFrame(frame);
    if (active) {
      lastTime = performance.now();
      frame = requestAnimationFrame(draw);
    } else {
      context.clearRect(0, 0, width, height);
    }
  };

  resize();
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', syncAnimation);
  motionPreference.addEventListener('change', syncAnimation);
  syncAnimation();
}
