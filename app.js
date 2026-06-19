document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initThreeJs();
  initBeforeAfterSliders();
  initPortfolioFilters();
  initCalculator();
  initScrollAnimations();
  initStatsCounter();
  initTestimonialsCarousel();
  initFaqAccordions();
  initContactForm();
  initExitIntent();
});

/* =========================================================================
   1. NAVIGATION HEADER ACTIVE STATES & SCROLL
   ========================================================================= */
function initNavbar() {
  const header = document.getElementById('main-header');
  const burgerMenu = document.getElementById('burger-menu');
  const navMenu = document.getElementById('nav-menu');
  const navLinks = document.querySelectorAll('.nav-link');

  // Change style on scroll
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
    updateActiveLink();
  });

  // Mobile menu toggle
  burgerMenu.addEventListener('click', () => {
    burgerMenu.classList.toggle('active');
    navMenu.classList.toggle('active');
  });

  // Close mobile menu on nav link click
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      burgerMenu.classList.remove('active');
      navMenu.classList.remove('active');
    });
  });

  // Smooth scroll with 90px header offset for all anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const headerOffset = 90;
        const top = target.getBoundingClientRect().top + window.scrollY - headerOffset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  // Scroll active section detection
  function updateActiveLink() {
    let current = '';
    const sections = document.querySelectorAll('section');
    const scrollPos = window.scrollY + 120; // offset for navbar height

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  }
}

/* =========================================================================
   2. THREE.JS INTERACTIVE 3D VIEWER
   ========================================================================= */
function initThreeJs() {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  // Set up scene, camera, renderer
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.z = 8;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // Add lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0x06b6d4, 1.2); // cyan glow
  keyLight.position.set(5, 5, 5);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x8b5cf6, 1.0); // purple glow
  fillLight.position.set(-5, -3, 3);
  scene.add(fillLight);

  const pointLight = new THREE.PointLight(0xffffff, 0.8, 20);
  pointLight.position.set(0, 0, 4);
  scene.add(pointLight);

  // Create a futuristic geometric shape (Torus Knot)
  const geometry = new THREE.TorusKnotGeometry(1.5, 0.45, 120, 16, 2, 3);

  // High-fidelity physical wireframe and solid layers to look high-tech
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x6d28d9,
    metalness: 0.9,
    roughness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    wireframe: false,
    flatShading: false
  });

  const mesh = new THREE.Mesh(geometry, material);

  // Add a subtle wireframe outline helper layer
  const wireframeGeom = new THREE.TorusKnotGeometry(1.51, 0.46, 120, 16, 2, 3);
  const wireframeMat = new THREE.MeshBasicMaterial({
    color: 0x06b6d4,
    wireframe: true,
    transparent: true,
    opacity: 0.25
  });
  const wireframeMesh = new THREE.Mesh(wireframeGeom, wireframeMat);

  // FIX #1 #2: Use a parent group for idle rotation so mouse-lerp on the
  // mesh itself doesn't fight the idle spin accumulation.
  const meshGroup = new THREE.Group();
  meshGroup.add(mesh);
  meshGroup.add(wireframeMesh);
  scene.add(meshGroup);

  // Create a soft round particle texture dynamically
  const createCircleTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 16, 16);
    return new THREE.CanvasTexture(canvas);
  };

  // Add floating particles (stars/sparks) for dynamic deep space depth
  const particlesCount = 400;
  const particlesGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particlesCount * 3);

  for (let i = 0; i < particlesCount * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 12;
  }

  particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const particlesMaterial = new THREE.PointsMaterial({
    size: 0.12,
    alphaMap: createCircleTexture(),
    color: 0x06b6d4,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending
  });

  const particles = new THREE.Points(particlesGeometry, particlesMaterial);
  scene.add(particles);

  // FIX #3: Track mouse offset separately; update windowHalf on resize
  let mouseOffsetX = 0;
  let mouseOffsetY = 0;
  let targetOffsetX = 0;
  let targetOffsetY = 0;

  // Track cursor
  document.addEventListener('mousemove', (event) => {
    const halfX = window.innerWidth / 2;
    const halfY = window.innerHeight / 2;
    mouseOffsetX = (event.clientX - halfX) / 150;
    mouseOffsetY = (event.clientY - halfY) / 150;
  });

  // Track touch for mobile
  container.addEventListener('touchmove', (event) => {
    if (event.touches.length > 0) {
      const halfX = window.innerWidth / 2;
      const halfY = window.innerHeight / 2;
      mouseOffsetX = (event.touches[0].clientX - halfX) / 150;
      mouseOffsetY = (event.touches[0].clientY - halfY) / 150;
    }
  }, { passive: true });

  // Animation Loop
  function animate() {
    requestAnimationFrame(animate);

    // Idle rotation applied to the group (continuous, never resets)
    meshGroup.rotation.y += 0.005;
    meshGroup.rotation.x += 0.003;

    // Mouse parallax: smoothly lerp the MESH offset inside the group
    // (separate from the group's idle angle so they never fight)
    targetOffsetX = mouseOffsetX * 0.4;
    targetOffsetY = mouseOffsetY * 0.4;
    mesh.rotation.y += (targetOffsetX - mesh.rotation.y) * 0.06;
    mesh.rotation.x += (targetOffsetY - mesh.rotation.x) * 0.06;
    wireframeMesh.rotation.y = mesh.rotation.y;
    wireframeMesh.rotation.x = mesh.rotation.x;

    // Rotate particles gently
    particles.rotation.y -= 0.001;
    particles.rotation.x -= 0.0005;

    renderer.render(scene, camera);
  }

  animate();

  // Resize handler
  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });
}

/* =========================================================================
   3. BEFORE / AFTER IMAGE SLIDER
   ========================================================================= */
function initBeforeAfterSliders() {
  const cards = document.querySelectorAll('.portfolio-card');

  // FIX #4: Track dragging per-card but add global mouseup/touchend ONCE,
  // outside the forEach loop, to prevent N duplicate window listeners.
  const draggingState = new Map();

  // Global stop-drag listeners — added only once
  window.addEventListener('mouseup', () => {
    draggingState.forEach((_, key) => draggingState.set(key, false));
  });
  window.addEventListener('touchend', () => {
    draggingState.forEach((_, key) => draggingState.set(key, false));
  });

  cards.forEach((card, idx) => {
    const container = card.querySelector('.slider-container');
    const overlay = card.querySelector('.slider-overlay');
    const handle = card.querySelector('.slider-handle');

    if (!container || !overlay || !handle) return;

    draggingState.set(idx, false);

    // Calculate position and update width & handle position
    const updatePosition = (clientX) => {
      const rect = container.getBoundingClientRect();
      const x = clientX - rect.left;
      let percent = Math.min(100, Math.max(0, (x / rect.width) * 100));
      overlay.style.width = `${percent}%`;
      handle.style.left = `${percent}%`;
    };

    container.addEventListener('mousedown', (e) => {
      draggingState.set(idx, true);
      updatePosition(e.clientX);
    });

    container.addEventListener('mousemove', (e) => {
      if (!draggingState.get(idx)) return;
      updatePosition(e.clientX);
    });

    // Mobile touch support
    container.addEventListener('touchstart', (e) => {
      draggingState.set(idx, true);
      if (e.touches.length > 0) updatePosition(e.touches[0].clientX);
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
      if (!draggingState.get(idx)) return;
      if (e.touches.length > 0) updatePosition(e.touches[0].clientX);
    }, { passive: true });
  });
}

/* =========================================================================
   4. PORTFOLIO FILTERING
   ========================================================================= */
function initPortfolioFilters() {
  const buttons = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.portfolio-card');

  // FIX #9: Guard against race condition on rapid clicks by cancelling pending timers.
  let hideTimers = [];

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Cancel any pending hide timeouts before applying new filter
      hideTimers.forEach(clearTimeout);
      hideTimers = [];

      const filter = btn.getAttribute('data-filter');

      cards.forEach(card => {
        const category = card.getAttribute('data-category');
        if (filter === 'all' || category === filter) {
          // Abort any pending hide on this card
          card.style.display = 'flex';
          requestAnimationFrame(() => {
            card.style.opacity = '1';
            card.style.transform = 'scale(1)';
          });
        } else {
          card.style.opacity = '0';
          card.style.transform = 'scale(0.95)';
          const t = setTimeout(() => { card.style.display = 'none'; }, 320);
          hideTimers.push(t);
        }
      });
    });
  });
}

/* =========================================================================
   5. AI COST & TIMELINE ESTIMATOR CALCULATOR
   ========================================================================= */
function initCalculator() {
  const serviceGrid = document.getElementById('calc-service-grid');
  const complexityGrid = document.getElementById('calc-complexity-grid');
  const qtySlider = document.getElementById('calc-qty-slider');

  const priceVal = document.getElementById('calc-price-val');
  const timeVal = document.getElementById('calc-time-val');
  const unitVal = document.getElementById('calc-unit-val');
  const qtyBadge = document.getElementById('qty-badge');

  if (!serviceGrid || !complexityGrid || !qtySlider) return;

  const serviceBtns = serviceGrid.querySelectorAll('.calc-option-btn');
  const complexityBtns = complexityGrid.querySelectorAll('.calc-option-btn');

  // Handle active switches
  serviceBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      serviceBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      calculateQuote();
    });
  });

  complexityBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      complexityBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      calculateQuote();
    });
  });

  qtySlider.addEventListener('input', () => {
    const qty = parseInt(qtySlider.value);
    // FIX #13: textContent is preferred over innerText for performance
    qtyBadge.textContent = qty === 1 ? '1 Asset' : `${qty} Assets`;
    calculateQuote();
  });

  function calculateQuote() {
    const activeService = serviceGrid.querySelector('.calc-option-btn.active');
    const activeComplexity = complexityGrid.querySelector('.calc-option-btn.active');
    const qty = parseInt(qtySlider.value);

    if (!activeService || !activeComplexity) return;

    // Get math factors
    const basePrice = parseFloat(activeService.getAttribute('data-base'));
    const baseTime = parseFloat(activeService.getAttribute('data-time'));

    const complexityMult = parseFloat(activeComplexity.getAttribute('data-mult'));
    const complexityTimeAdd = parseFloat(activeComplexity.getAttribute('data-time-add'));

    // Compute base calculations
    let unitCost = Math.round(basePrice * complexityMult);

    // Apply progressive volume discount
    let totalDiscountMult = 1.0;
    if (qty > 3) totalDiscountMult = 0.95; // 5% off
    if (qty > 10) totalDiscountMult = 0.90; // 10% off
    if (qty > 25) totalDiscountMult = 0.82; // 18% off

    let totalPrice = Math.round(unitCost * qty * totalDiscountMult);

    // Non-linear timeline scale: time increases as quantity square root
    let estimatedTime = Math.round(baseTime + complexityTimeAdd + Math.sqrt(qty - 1) * 1.5);
    if (estimatedTime < 1) estimatedTime = 1;

    // Format output
    priceVal.textContent = totalPrice.toLocaleString();
    timeVal.textContent = estimatedTime === 1 ? '1 Day' : `${estimatedTime} Days`;
    unitVal.textContent = `$${Math.round(totalPrice / qty).toLocaleString()}`;
  }

  // Initial Calculation Run
  calculateQuote();
}

/* =========================================================================
   6. SCROLL ANIMATIONS (PROCESS TIMELINE & SERVICE CARDS)
   ========================================================================= */
function initScrollAnimations() {
  // 1. Timeline Step Animations
  const steps = document.querySelectorAll('.timeline-step');
  const stepObserverOptions = {
    root: null,
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  };

  const stepObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        const content = entry.target.querySelector('.timeline-content');
        const dot = entry.target.querySelector('.timeline-dot');
        if (content) {
          content.style.transform = 'translateY(0)';
          content.style.opacity = '1';
        }
        if (dot) {
          dot.style.transform = 'translateX(-50%) scale(1.1)';
        }
        stepObserver.unobserve(entry.target);
      }
    });
  }, stepObserverOptions);

  steps.forEach(step => {
    const content = step.querySelector('.timeline-content');
    if (content) {
      content.style.transform = 'translateY(40px)';
      content.style.opacity = '0';
      content.style.transition = 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
    }
    stepObserver.observe(step);
  });

  // 2. Sticky Services Showcase dynamic updates on scroll
  const scrollItems = document.querySelectorAll('.service-scroll-item');
  const showcaseGlow = document.getElementById('showcase-glow');
  const showcaseIcon = document.getElementById('showcase-icon');
  const showcaseTitle = document.getElementById('showcase-title');
  const showcaseDesc = document.getElementById('showcase-desc');
  const showcaseInnerMesh = document.getElementById('showcase-inner-mesh');
  const showcaseLearnMore = document.getElementById('showcase-learn-more');

  if (scrollItems.length > 0 && showcaseTitle) {
    const scrollObserverOptions = {
      root: null,
      threshold: 0.3,
      rootMargin: '-15% 0px -30% 0px'
    };

    const scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Remove active class from all scroll items
          scrollItems.forEach(item => item.classList.remove('active'));
          entry.target.classList.add('active');

          // Read data attributes of the active service item
          const title = entry.target.getAttribute('data-title');
          const desc = entry.target.getAttribute('data-desc');
          const icon = entry.target.getAttribute('data-icon');
          const mesh = entry.target.getAttribute('data-mesh');
          const color = entry.target.getAttribute('data-color');
          const link = entry.target.getAttribute('data-link');

          // Smoothly cross-fade content in the sticky card
          showcaseTitle.style.opacity = '0';
          showcaseDesc.style.opacity = '0';
          showcaseIcon.style.opacity = '0';
          showcaseInnerMesh.style.opacity = '0';

          showcaseTitle.style.transform = 'translateY(10px)';
          showcaseIcon.style.transform = 'scale(0.8) rotate(-10deg)';
          showcaseInnerMesh.style.transform = 'scale(0.8) rotate(-10deg)';

          setTimeout(() => {
            showcaseTitle.textContent = title;
            showcaseDesc.textContent = desc;

            // Update icons
            showcaseIcon.innerHTML = `<i class="fa-solid ${icon}"></i>`;
            showcaseInnerMesh.className = `fa-solid ${mesh}`;

            // Update background glow color
            showcaseGlow.style.background = color;

            if (showcaseLearnMore && link) {
              showcaseLearnMore.setAttribute('href', link);
            }

            // Fade back in with dynamic transform transitions
            showcaseTitle.style.opacity = '1';
            showcaseDesc.style.opacity = '1';
            showcaseIcon.style.opacity = '1';
            showcaseInnerMesh.style.opacity = '1';

            showcaseTitle.style.transform = 'translateY(0)';
            showcaseIcon.style.transform = 'scale(1) rotate(0deg)';
            showcaseInnerMesh.style.transform = 'scale(1) rotate(0deg)';
          }, 150);
        }
      });
    }, scrollObserverOptions);

    scrollItems.forEach(item => {
      scrollObserver.observe(item);
    });

    // Also update showcase when a service item is clicked directly
    scrollItems.forEach(item => {
      item.addEventListener('click', () => {
        scrollItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        const title = item.getAttribute('data-title');
        const desc = item.getAttribute('data-desc');
        const icon = item.getAttribute('data-icon');
        const mesh = item.getAttribute('data-mesh');
        const color = item.getAttribute('data-color');
        const link = item.getAttribute('data-link');

        showcaseTitle.style.opacity = '0';
        showcaseDesc.style.opacity = '0';
        showcaseIcon.style.opacity = '0';
        showcaseInnerMesh.style.opacity = '0';
        showcaseTitle.style.transform = 'translateY(10px)';
        showcaseIcon.style.transform = 'scale(0.8) rotate(-10deg)';
        showcaseInnerMesh.style.transform = 'scale(0.8) rotate(-10deg)';

        setTimeout(() => {
          showcaseTitle.textContent = title;
          showcaseDesc.textContent = desc;
          showcaseIcon.innerHTML = `<i class="fa-solid ${icon}"></i>`;
          showcaseInnerMesh.className = `fa-solid ${mesh}`;
          showcaseGlow.style.background = color;

          if (showcaseLearnMore && link) {
            showcaseLearnMore.setAttribute('href', link);
          }

          showcaseTitle.style.opacity = '1';
          showcaseDesc.style.opacity = '1';
          showcaseIcon.style.opacity = '1';
          showcaseInnerMesh.style.opacity = '1';
          showcaseTitle.style.transform = 'translateY(0)';
          showcaseIcon.style.transform = 'scale(1) rotate(0deg)';
          showcaseInnerMesh.style.transform = 'scale(1) rotate(0deg)';
        }, 150);
      });
    });
  }
}

/* =========================================================================
   7. STATS NUMERICAL COUNTERS ANIMATION
   ========================================================================= */
function initStatsCounter() {
  const statNumbers = document.querySelectorAll('.stat-num');

  const observerOptions = {
    root: null,
    threshold: 0.5
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  statNumbers.forEach(num => {
    observer.observe(num);
  });

  function animateCounter(element) {
    const target = parseInt(element.getAttribute('data-target'));
    // FIX #6: Use data-suffix attribute instead of hardcoded target checks
    const suffix = element.getAttribute('data-suffix') || '+';
    const duration = 2000;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Easing curve (easeOutQuad)
      const easeProgress = progress * (2 - progress);
      const currentVal = Math.floor(easeProgress * target);
      const display = target >= 1000 ? currentVal.toLocaleString() : currentVal;

      element.textContent = `${display}${suffix}`;

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        const finalDisplay = target >= 1000 ? target.toLocaleString() : target;
        element.textContent = `${finalDisplay}${suffix}`;
      }
    }

    requestAnimationFrame(update);
  }
}

/* =========================================================================
   8. TESTIMONIALS CAROUSEL
   ========================================================================= */
function initTestimonialsCarousel() {
  const track = document.getElementById('testimonials-track');
  const slides = document.querySelectorAll('.testimonial-slide');
  const prevBtn = document.getElementById('carousel-prev');
  const nextBtn = document.getElementById('carousel-next');
  const dotsContainer = document.getElementById('carousel-dots');

  if (!track || slides.length === 0) return;

  let activeIndex = 0;
  let autoplayTimer = null;

  // Create dot indicators
  slides.forEach((_, index) => {
    const dot = document.createElement('div');
    dot.classList.add('carousel-dot');
    if (index === 0) dot.classList.add('active');
    dot.addEventListener('click', () => {
      goToSlide(index);
      resetAutoplay();
    });
    dotsContainer.appendChild(dot);
  });

  const dots = dotsContainer.querySelectorAll('.carousel-dot');

  function updateCarousel() {
    track.style.transform = `translateX(-${activeIndex * 100}%)`;

    // Update dots state
    dots.forEach((dot, index) => {
      dot.classList.toggle('active', index === activeIndex);
    });
  }

  function goToSlide(index) {
    activeIndex = index;
    updateCarousel();
  }

  function nextSlide() {
    activeIndex = (activeIndex + 1) % slides.length;
    updateCarousel();
  }

  function prevSlide() {
    activeIndex = (activeIndex - 1 + slides.length) % slides.length;
    updateCarousel();
  }

  // Event Listeners
  prevBtn.addEventListener('click', () => {
    prevSlide();
    resetAutoplay();
  });

  nextBtn.addEventListener('click', () => {
    nextSlide();
    resetAutoplay();
  });

  // Autoplay Setup
  function startAutoplay() {
    autoplayTimer = setInterval(nextSlide, 7000); // switch slide every 7s
  }

  function resetAutoplay() {
    clearInterval(autoplayTimer);
    startAutoplay();
  }

  // FIX #11: Pause autoplay on hover to prevent unwanted slide changes
  const wrapper = document.querySelector('.testimonials-wrapper');
  if (wrapper) {
    wrapper.addEventListener('mouseenter', () => clearInterval(autoplayTimer));
    wrapper.addEventListener('mouseleave', () => startAutoplay());
  }

  startAutoplay();
}

/* =========================================================================
   9. FAQS ACCORDIONS (EXPAND / COLLAPSE)
   ========================================================================= */
function initFaqAccordions() {
  const items = document.querySelectorAll('.faq-item');

  items.forEach(item => {
    const btn = item.querySelector('.faq-question-btn');
    const answer = item.querySelector('.faq-answer');

    btn.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      // Close all other FAQs
      items.forEach(otherItem => {
        otherItem.classList.remove('active');
        otherItem.querySelector('.faq-answer').style.maxHeight = '0px';
      });

      if (!isActive) {
        item.classList.add('active');
        answer.style.maxHeight = `${answer.scrollHeight}px`;
      }
    });
  });
}

/* =========================================================================
   10. CONTACT FORM & DYNAMIC CONVERSION SUBMIT
   ========================================================================= */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const submitBtn = form.querySelector('button[type="submit"]');

  // FIX #5: Actually POST data to the backend API instead of just animating
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nameInput = document.getElementById('form-name').value.trim();
    const formCard = document.querySelector('.contact-form-card');

    // Show loading state on button
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Sending...';

    const payload = {
      name: nameInput,
      email: document.getElementById('form-email').value.trim(),
      company: document.getElementById('form-company').value.trim(),
      service: document.getElementById('form-service').value,
      message: document.getElementById('form-message').value.trim()
    };

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        // Show validation errors inline
        const errMsg = data.errors ? data.errors.join(' ') : (data.error || 'Something went wrong.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Get Free Consultation';
        showFormError(form, errMsg);
        return;
      }

      // Success — fade out form and show confirmation
      formCard.style.transition = 'opacity 0.3s ease';
      formCard.style.opacity = '0';
      setTimeout(() => {
        formCard.innerHTML = `
          <div class="success-screen" style="text-align: center; padding: 40px 0;">
            <div class="success-icon" style="font-size: 4rem; color: var(--success-color); margin-bottom: 24px; animation: float 3s ease-in-out infinite;">
              <i class="fa-solid fa-circle-check"></i>
            </div>
            <h3 style="font-size: 1.75rem; margin-bottom: 12px;">Thank you, ${nameInput}!</h3>
            <p style="color: var(--text-muted); max-width: 380px; margin: 0 auto 28px auto;">Your intake details have been logged in our pipeline. A dedicated technical lead will follow up with your initial design draft recommendations within 24 hours.</p>
            <button class="btn btn-secondary" onclick="window.location.reload();">Done</button>
          </div>
        `;
        formCard.style.opacity = '1';
      }, 300);

    } catch (networkErr) {
      // Network failure — still show success UI (graceful degradation)
      console.warn('Backend unreachable, showing graceful success.', networkErr);
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Get Free Consultation';
      showFormError(form, 'Network error — please check your connection and try again.');
    }
  });

  function showFormError(form, message) {
    let errEl = form.querySelector('.form-error-banner');
    if (!errEl) {
      errEl = document.createElement('p');
      errEl.className = 'form-error-banner';
      errEl.style.cssText = 'color:#ef4444;font-size:0.85rem;margin-bottom:12px;padding:10px 14px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);border-radius:8px;';
      form.prepend(errEl);
    }
    errEl.textContent = message;
    errEl.style.display = 'block';
    setTimeout(() => { errEl.style.display = 'none'; }, 6000);
  }
}

/* =========================================================================
   11. EXIT INTENT LEAD POPUP TRIGGER
   ========================================================================= */
function initExitIntent() {
  const popup = document.getElementById('exit-popup');
  const closeBtn = document.getElementById('exit-popup-close');
  const claimBtn = document.getElementById('claim-sample-btn');

  if (!popup) return;

  let shown = false;

  // Show popup when cursor leaves top boundary
  document.addEventListener('mouseleave', (e) => {
    if (e.clientY < 20 && !shown) {
      shown = true;
      popup.classList.add('show');
    }
  });

  closeBtn.addEventListener('click', () => {
    popup.classList.remove('show');
  });

  claimBtn.addEventListener('click', () => {
    popup.classList.remove('show');
    const contactSection = document.getElementById('contact');
    if (contactSection) {
      setTimeout(() => {
        const top = contactSection.getBoundingClientRect().top + window.scrollY - 90;
        window.scrollTo({ top, behavior: 'smooth' });
      }, 300);
    }
  });

  // Close popup clicking outer container overlay
  popup.addEventListener('click', (e) => {
    if (e.target === popup) {
      popup.classList.remove('show');
    }
  });
}
