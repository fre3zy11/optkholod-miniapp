import { gsap } from 'gsap';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let cardObserver: IntersectionObserver | null = null;
let pressedTarget: Element | null = null;
gsap.defaults({ ease: 'power3.out', duration: reduced ? .01 : .48 });

export function initMotion() {
  if (reduced) return;
  gsap.timeline({ defaults: { clearProps: 'transform,opacity' } })
    .from('.brand-logo', { y: -14, opacity: 0, scale: .94, duration: .72 })
    .from('.search-wrap', { y: 12, opacity: 0, duration: .5 }, '-=.38')
    .from('.country-chip', { y: 10, opacity: 0, stagger: .055, duration: .42 }, '-=.32')
    .from('.section-title', { y: 10, opacity: 0, duration: .42 }, '-=.2');
  gsap.to('.brand-halo', { scale: 1.08, opacity: .72, duration: 3.8, repeat: -1, yoyo: true, ease: 'sine.inOut' });
  document.addEventListener('pointerdown', event => {
    const target = (event.target as Element)?.closest('button, .country-chip, .catalog-item');
    if (target) {
      pressedTarget = target;
      gsap.to(target, { scale: .975, duration: .12, overwrite: true });
    }
  });
  const releasePressedTarget = () => {
    if (!pressedTarget) return;
    gsap.to(pressedTarget, { scale: 1, duration: .38, ease: 'elastic.out(1,.55)', overwrite: true });
    pressedTarget = null;
  };
  document.addEventListener('pointerup', releasePressedTarget);
  document.addEventListener('pointercancel', releasePressedTarget);
  window.addEventListener('blur', releasePressedTarget);
}

export function animateCards() {
  if (reduced) return;
  const allCards = gsap.utils.toArray<HTMLElement>('#products .card');
  const cards = allCards.slice(0, 12);
  cardObserver?.disconnect();
  gsap.killTweensOf(allCards);
  gsap.fromTo(cards, { y: 18, opacity: 0, scale: .985 }, { y: 0, opacity: 1, scale: 1, stagger: .035, duration: .5, clearProps: 'transform,opacity' });
  const deferred = allCards.slice(12);
  if (!deferred.length) return;
  if (!('IntersectionObserver' in window)) {
    gsap.set(deferred, { clearProps: 'transform,opacity' });
    return;
  }
  gsap.set(deferred, { y: 16, opacity: 0 });
  cardObserver = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      cardObserver?.unobserve(entry.target);
      gsap.to(entry.target, { y: 0, opacity: 1, duration: .46, clearProps: 'transform,opacity' });
    }
  }, { rootMargin: '40px 0px', threshold: .08 });
  deferred.forEach(card => cardObserver?.observe(card));
}

export function animateCatalog() {
  if (reduced) return;
  gsap.fromTo('#products .catalog-item', { x: 14, opacity: 0 }, { x: 0, opacity: 1, stagger: .055, duration: .45, clearProps: 'transform,opacity' });
}

export function animateDetail() {
  if (reduced) return;
  gsap.timeline({ defaults: { clearProps: 'transform,opacity' } })
    .from('.detail-image', { y: 18, opacity: 0, scale: .94, duration: .65 })
    .from('.detail-body > *', { y: 12, opacity: 0, stagger: .045, duration: .42 }, '-=.38');
}

export function animateCart() {
  if (reduced) return;
  gsap.fromTo('.cart-row', { x: 16, opacity: 0 }, { x: 0, opacity: 1, stagger: .04, duration: .4, clearProps: 'transform,opacity' });
  gsap.from('.cart-checkout', { y: 12, opacity: 0, duration: .45, clearProps: 'transform,opacity' });
}

export function pulseCart() {
  if (reduced) return;
  gsap.fromTo('[data-tab="cart"]', { scale: 1 }, { scale: 1.1, duration: .18, yoyo: true, repeat: 1, ease: 'power2.inOut', clearProps: 'transform' });
}

export function animateSuccessModal(modal: HTMLElement) {
  if (reduced) return;
  gsap.fromTo(modal, { opacity: 0 }, { opacity: 1, duration: .28 });
  gsap.fromTo(modal.querySelector('.order-modal-box'), { y: 28, opacity: 0, scale: .92 }, { y: 0, opacity: 1, scale: 1, duration: .65, ease: 'back.out(1.25)', clearProps: 'transform,opacity' });
}
