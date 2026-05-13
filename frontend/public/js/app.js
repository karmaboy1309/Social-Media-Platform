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

  // ═══════════ Auth Logic ═══════════
  const API_BASE = 'http://localhost:5000/api';

  // If already logged in, redirect 'Log In' button to profile
  if (localStorage.getItem('token')) {
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
      loginBtn.textContent = 'Go to Profile';
      loginBtn.href = 'profile.html';
      loginBtn.id = ''; // remove id to bypass modal logic
    }
  }

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

  const loginModal = document.getElementById('loginModal');
  const signupModal = document.getElementById('signupModal');
  
  // Modals Toggle
  const openModal = (modal) => {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };
  const closeModal = (modal) => {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    modal.querySelector('form').reset();
    modal.querySelector('.form-message').textContent = '';
  };

  document.getElementById('loginBtn')?.addEventListener('click', (e) => { e.preventDefault(); openModal(loginModal); });
  document.getElementById('signupBtn')?.addEventListener('click', (e) => { e.preventDefault(); openModal(signupModal); });
  document.getElementById('heroSignup')?.addEventListener('click', (e) => { e.preventDefault(); openModal(signupModal); });

  document.getElementById('closeLogin')?.addEventListener('click', () => closeModal(loginModal));
  document.getElementById('closeSignup')?.addEventListener('click', () => closeModal(signupModal));

  loginModal?.addEventListener('click', (e) => { if (e.target === loginModal) closeModal(loginModal); });
  signupModal?.addEventListener('click', (e) => { if (e.target === signupModal) closeModal(signupModal); });

  document.getElementById('switchToSignup')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal(loginModal);
    openModal(signupModal);
  });
  document.getElementById('switchToLogin')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal(signupModal);
    openModal(loginModal);
  });

  // Form Submissions
  const showMessage = (elementId, text, type = '') => {
    const msg = document.getElementById(elementId);
    msg.textContent = text;
    msg.className = `form-message ${type}`;
  };

  document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('loginSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Logging in...';

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Login failed');

      localStorage.setItem('token', data.token);
      msgEl.className = 'form-message success';
      msgEl.textContent = 'Login successful! Redirecting...';
      if (window.showToast) window.showToast('Login successful!', 'success');
      setTimeout(() => {
        window.location.href = 'feed.html';
      }, 1000);
    } catch (error) {
      msgEl.className = 'form-message error';
      msgEl.textContent = error.message;
      if (window.showToast) window.showToast(error.message, 'error');
    } finally {
      btn.textContent = 'Log In';
      btn.disabled = false;
    }
  });

  document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('signupSubmitBtn');
    const msgEl = document.getElementById('signupMessage');
    btn.disabled = true;
    btn.textContent = 'Creating account...';

    const username = document.getElementById('signupUsername').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Registration failed');

      localStorage.setItem('token', data.token);
      msgEl.className = 'form-message success';
      msgEl.textContent = 'Account created successfully! Redirecting...';
      if (window.showToast) window.showToast('Account created successfully!', 'success');
      setTimeout(() => {
        window.location.href = 'feed.html';
      }, 1000);
    } catch (error) {
      msgEl.className = 'form-message error';
      msgEl.textContent = error.message;
      if (window.showToast) window.showToast(error.message, 'error');
    } finally {
      btn.textContent = 'Sign Up';
      btn.disabled = false;
    }
  });

});
