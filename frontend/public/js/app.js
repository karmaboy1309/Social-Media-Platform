// ══════════════════════════════════════════
// Vibe — Landing Page JavaScript
// ══════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

  // ── Navbar scroll effect ──
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  });

  // ── Mobile menu toggle ──
  const mobileToggle = document.getElementById('mobileToggle');
  const navLinks = document.getElementById('navLinks');
  mobileToggle.addEventListener('click', () => {
    navbar.classList.toggle('menu-open');
    navLinks.classList.toggle('active');
    document.querySelector('.nav-actions').classList.toggle('active');
  });

  // ── Animated stat counters ──
  const counters = document.querySelectorAll('.stat-number');
  const animateCounters = () => {
    counters.forEach(counter => {
      const target = +counter.dataset.target;
      const duration = 2000;
      const start = performance.now();
      const step = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        counter.textContent = Math.floor(eased * target).toLocaleString();
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  };

  // Trigger counters when hero is visible
  const heroObs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { animateCounters(); heroObs.disconnect(); } });
  }, { threshold: 0.3 });
  const heroSection = document.getElementById('hero');
  if (heroSection) heroObs.observe(heroSection);

  // ── Scroll-reveal for feature cards ──
  const featureCards = document.querySelectorAll('.feature-card');
  const cardObs = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => e.target.classList.add('visible'), i * 100);
        cardObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  featureCards.forEach(card => cardObs.observe(card));

  // ── Smooth scroll for anchor links ──
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (href === '#') return;
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Close mobile menu if open
        navbar.classList.remove('menu-open');
        navLinks.classList.remove('active');
        document.querySelector('.nav-actions').classList.remove('active');
      }
    });
  });

});
