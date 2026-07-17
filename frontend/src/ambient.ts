export function initSnowCanvas() {
  const canvas = document.querySelector<HTMLCanvasElement>('#snowCanvas');
  if (!canvas) return;
  const context = canvas.getContext('2d');
  if (!context) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const particles = Array.from({ length: reduceMotion ? 10 : 28 }, (_, index) => ({
    x: Math.random(), y: Math.random(), radius: .6 + Math.random() * 1.9,
    speed: .000035 + Math.random() * .000055, drift: (Math.random() - .5) * .00003,
    alpha: .12 + Math.random() * .4, phase: index * .7
  }));
  let width = 0, height = 0, frame = 0, lastTime = performance.now(), active = true;
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
      const glow = context.createRadialGradient(particle.x * width, particle.y * height, 0, particle.x * width, particle.y * height, particle.radius * 4);
      glow.addColorStop(0, `rgba(225,248,255,${particle.alpha})`);
      glow.addColorStop(1, 'rgba(111,206,244,0)');
      context.fillStyle = glow;
      context.beginPath(); context.arc(particle.x * width, particle.y * height, particle.radius * 4, 0, Math.PI * 2); context.fill();
    }
    frame = requestAnimationFrame(draw);
  };
  const onVisibility = () => { active = !document.hidden; cancelAnimationFrame(frame); if (active) { lastTime = performance.now(); frame = requestAnimationFrame(draw); } };
  resize(); window.addEventListener('resize', resize, { passive: true }); document.addEventListener('visibilitychange', onVisibility); frame = requestAnimationFrame(draw);
}
