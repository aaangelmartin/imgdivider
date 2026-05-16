/* ImgDivider — GSAP entrance animations */

(function () {
  if (typeof gsap === 'undefined') return;

  gsap.defaults({ ease: 'power2.out' });

  // Page load: header + upload zone
  const tl = gsap.timeline();
  tl.from('.app-header', { y: -16, opacity: 0, duration: 0.35 })
    .from('.upload-zone', { y: 20, opacity: 0, duration: 0.4, scale: 0.98 }, '-=0.15')
    .from('.app-footer', { opacity: 0, duration: 0.3 }, '-=0.2');

  // Animate part cards when they appear (stagger via MutationObserver)
  const partsGrid = document.getElementById('partsGrid');
  if (partsGrid) {
    const observer = new MutationObserver((mutations) => {
      const newCards = [];
      mutations.forEach(m => {
        m.addedNodes.forEach(n => {
          if (n.classList && n.classList.contains('part-card')) newCards.push(n);
        });
      });
      if (newCards.length > 0) {
        gsap.fromTo(newCards,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.22, stagger: 0.03, ease: 'power2.out' }
        );
      }
    });
    observer.observe(partsGrid, { childList: true });
  }
})();
