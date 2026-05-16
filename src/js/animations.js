/* ImgDivider — GSAP animations */

(function () {
  if (typeof gsap === 'undefined') return;

  gsap.defaults({ ease: 'power2.out' });

  /* ─── Initial page load ──────────────────── */
  const uploadMark = document.querySelector('#stepUpload .step-mark');
  const uploadZone = document.querySelector('.upload-zone');
  const footer     = document.querySelector('.app-footer');

  const tl = gsap.timeline({ defaults: { duration: 0.35 } });
  tl.from('.app-header', { y: -12, opacity: 0, duration: 0.3 })
    .from(uploadMark,    { y: -8,  opacity: 0, duration: 0.28 }, '-=0.1')
    .from(uploadZone,    { y: 16,  opacity: 0, duration: 0.38, scale: 0.99 }, '-=0.18')
    .from(footer,        { opacity: 0, duration: 0.25 }, '-=0.2');

  /* ─── Step transitions (MutationObserver) ── */
  const steps = document.querySelectorAll('.step');

  function animateStepIn(step) {
    const mark  = step.querySelector('.step-mark');
    const inner = step.querySelector(
      '.upload-zone, .editor-layout, .download-layout'
    );

    gsap.set(step, { opacity: 0 });
    gsap.to(step, { opacity: 1, duration: 0.22 });

    if (mark)  gsap.fromTo(mark,  { y: -7, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3,  delay: 0.04 });
    if (inner) gsap.fromTo(inner, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.34, delay: 0.08 });
  }

  const stepObs = new MutationObserver(mutations => {
    mutations.forEach(m => {
      if (m.attributeName === 'class' && m.target.classList.contains('step--active')) {
        animateStepIn(m.target);
      }
    });
  });

  steps.forEach(s => stepObs.observe(s, { attributes: true }));

  /* ─── Part cards stagger ─────────────────── */
  const partsGrid = document.getElementById('partsGrid');
  if (partsGrid) {
    const gridObs = new MutationObserver(mutations => {
      const added = [];
      mutations.forEach(m => {
        m.addedNodes.forEach(n => {
          if (n.nodeType === 1 && n.classList.contains('part-card')) added.push(n);
        });
      });
      if (added.length) {
        gsap.fromTo(added,
          { opacity: 0, y: 14, scale: 0.97 },
          { opacity: 1, y: 0,  scale: 1, duration: 0.3, stagger: 0.025, ease: 'power3.out' }
        );
      }
    });
    gridObs.observe(partsGrid, { childList: true });
  }
})();
