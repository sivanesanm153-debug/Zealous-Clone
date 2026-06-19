/* 
   Vertex XR — Service Pages Scripts
   Handles interactive FAQ accordions, form pre-selection, and unique Three.js animations.
*/

document.addEventListener('DOMContentLoaded', () => {
  // Initialize general UI features
  initMobileMenu();
  initHeaderScroll();
  initFaqAccordion();
  initContactForm();

  // Initialize Three.js scene for Hero
  initThreeJS();
});

/* ─── Mobile Header Toggle ─── */
function initMobileMenu() {
  const burgerMenu = document.getElementById('burger-menu');
  const navMenu = document.getElementById('nav-menu');
  const navLinks = document.querySelectorAll('.nav-link');

  if (burgerMenu && navMenu) {
    burgerMenu.addEventListener('click', () => {
      burgerMenu.classList.toggle('active');
      navMenu.classList.toggle('active');
    });

    // Close menu when a link is clicked
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        burgerMenu.classList.remove('active');
        navMenu.classList.remove('active');
      });
    });
  }
}

/* ─── Transparent to Solid Header on Scroll ─── */
function initHeaderScroll() {
  const header = document.getElementById('main-header');
  if (header) {
    // Set initial state based on current scroll position
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    }

    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    });
  }
}

/* ─── FAQ Accordion Dropdowns ─── */
function initFaqAccordion() {
  const faqQuestions = document.querySelectorAll('.faq-question');
  
  faqQuestions.forEach(btn => {
    const parent = btn.parentElement;
    const answer = parent.querySelector('.faq-answer');

    btn.addEventListener('click', () => {
      const isActive = parent.classList.contains('active');
      
      // Close all items
      document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
        const ans = item.querySelector('.faq-answer');
        if (ans) ans.style.maxHeight = '0px';
      });

      // Toggle current item
      if (!isActive) {
        parent.classList.add('active');
        if (answer) answer.style.maxHeight = `${answer.scrollHeight}px`;
      }
    });
  });
}

/* ─── Subpage Form Submit Handler ─── */
function initContactForm() {
  const form = document.getElementById('contact-form');
  const serviceSelect = document.getElementById('service-select');
  
  if (form) {
    // Pre-select service dropdown based on body data-service attribute
    const currentService = document.body.getAttribute('data-service');
    if (serviceSelect && currentService) {
      serviceSelect.value = currentService;
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';

      const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        company: document.getElementById('company').value,
        service: serviceSelect ? serviceSelect.value : 'modeling',
        message: document.getElementById('message').value
      };

      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
          // Success
          const formCard = form.parentElement;
          formCard.innerHTML = `
            <div class="success-screen" style="text-align: center; padding: 48px 24px; background: rgba(34, 197, 94, 0.04); border: 1px solid var(--success-color); border-radius: 16px; min-height: 350px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
              <i class="fa-solid fa-circle-check" style="font-size: 4.5rem; color: var(--success-color); margin-bottom: 24px; display: inline-block;"></i>
              <h3 style="font-size: 1.8rem; margin-bottom: 12px; color: var(--text-primary);">Message Sent!</h3>
              <p style="color: var(--text-muted); margin-bottom: 32px; max-width: 320px; line-height: 1.6;">${data.message}</p>
              <button onclick="window.location.reload()" class="btn btn-secondary" style="width: 100%; max-width: 220px;">Send Another Message</button>
            </div>
          `;
        } else {
          throw new Error(data.errors ? data.errors.join(', ') : 'Failed to submit form.');
        }
      } catch (err) {
        alert('Error: ' + err.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }
}

/* ─── Three.js Canvas Scene Initialization ─── */
function initThreeJS() {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  const service = document.body.getAttribute('data-service') || 'modeling';

  // 1. Scene, Camera, Renderer
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.z = 5.2;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // 2. Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
  scene.add(ambientLight);

  const dirLight1 = new THREE.DirectionalLight(0x8b5cf6, 0.85); // purple
  dirLight1.position.set(5, 5, 5);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0x06b6d4, 0.65); // cyan
  dirLight2.position.set(-5, -5, 5);
  scene.add(dirLight2);

  // 3. Service Specific Mesh Setup
  let mainMesh;
  let wireframeMesh;
  const group = new THREE.Group();
  scene.add(group);

  if (service === 'modeling') {
    // 3D Modeling - High/low poly wireframe Torus
    const geometry = new THREE.TorusGeometry(1.5, 0.5, 16, 64);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x8b5cf6,
      wireframe: true,
      transparent: true,
      opacity: 0.75
    });
    mainMesh = new THREE.Mesh(geometry, material);
    group.add(mainMesh);
  } else if (service === 'rendering') {
    // 3D Rendering - Physical Shiny Sphere with Clearcoat
    const geometry = new THREE.SphereGeometry(1.6, 64, 64);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x06b6d4,
      metalness: 0.95,
      roughness: 0.12,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05
    });
    mainMesh = new THREE.Mesh(geometry, material);
    group.add(mainMesh);
  } else if (service === 'animation') {
    // 3D Animation - Rotating Torus Knot
    const geometry = new THREE.TorusKnotGeometry(1.1, 0.36, 120, 16);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xec4899, // Pink
      metalness: 0.7,
      roughness: 0.15,
      clearcoat: 0.8
    });
    mainMesh = new THREE.Mesh(geometry, material);
    group.add(mainMesh);
  } else if (service === 'ar') {
    // AR - Glass Cone + Floating rings
    const geometry = new THREE.ConeGeometry(1.3, 2.5, 32);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xf59e0b, // Amber
      transmission: 0.7,
      opacity: 1,
      transparent: true,
      roughness: 0.1,
      ior: 1.45
    });
    mainMesh = new THREE.Mesh(geometry, material);
    group.add(mainMesh);

    // Floating rings
    const ringGeo = new THREE.RingGeometry(1.6, 1.8, 48);
    const ringMat = new THREE.MeshBasicMaterial({ 
      color: 0xf59e0b, 
      side: THREE.DoubleSide, 
      transparent: true, 
      opacity: 0.35 
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2.2;
    group.add(ring);
  } else if (service === 'vr') {
    // VR - Box with wireframe frame
    const geometry = new THREE.BoxGeometry(1.7, 1.7, 1.7);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x3b82f6, // Blue
      roughness: 0.25,
      metalness: 0.85
    });
    mainMesh = new THREE.Mesh(geometry, material);
    group.add(mainMesh);

    const wireMat = new THREE.MeshBasicMaterial({ color: 0x60a5fa, wireframe: true });
    wireframeMesh = new THREE.Mesh(geometry, wireMat);
    wireframeMesh.scale.setScalar(1.02);
    group.add(wireframeMesh);
  } else if (service === 'digitaltwin') {
    // Digital Twin - Matrix Points
    const geometry = new THREE.IcosahedronGeometry(2.0, 3);
    const pointsMaterial = new THREE.PointsMaterial({
      size: 0.08,
      color: 0x10b981, // Green
      transparent: true,
      opacity: 0.85
    });
    mainMesh = new THREE.Points(geometry, pointsMaterial);
    group.add(mainMesh);
  } else if (service === 'showroom') {
    // Showroom - Shiny Octahedron
    const geometry = new THREE.OctahedronGeometry(1.6, 0);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xeab308, // Yellow
      roughness: 0.1,
      metalness: 0.6,
      clearcoat: 1.0
    });
    mainMesh = new THREE.Mesh(geometry, material);
    group.add(mainMesh);
  } else if (service === 'gaming') {
    // Gaming - Dodecahedron wireframe
    const geometry = new THREE.DodecahedronGeometry(1.5, 0);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xef4444, // Red
      wireframe: true,
      transparent: true,
      opacity: 0.8
    });
    mainMesh = new THREE.Mesh(geometry, material);
    group.add(mainMesh);
  }

  // 4. Mouse movement interaction
  let mouseX = 0, mouseY = 0;
  let targetX = 0, targetY = 0;
  let windowHalfX = container.clientWidth / 2;
  let windowHalfY = container.clientHeight / 2;

  container.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect();
    mouseX = (e.clientX - rect.left - windowHalfX) / windowHalfX;
    mouseY = (e.clientY - rect.top - windowHalfY) / windowHalfY;
  });

  // Handle Resize events
  window.addEventListener('resize', () => {
    if (!container.clientWidth || !container.clientHeight) return;
    windowHalfX = container.clientWidth / 2;
    windowHalfY = container.clientHeight / 2;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  // 5. Animation Loop
  let idleTime = 0;
  function animate() {
    requestAnimationFrame(animate);

    idleTime += 0.005;
    
    // Lerp towards target mouse values
    targetX += (mouseX * 0.6 - targetX) * 0.05;
    targetY += (mouseY * 0.6 - targetY) * 0.05;

    // Apply rotation transforms to group containing the shapes
    if (group) {
      group.rotation.y = idleTime + targetX;
      group.rotation.x = targetY;
    }

    if (service === 'ar' && group.children[1]) {
      group.children[1].rotation.z += 0.008; // slow rotation for ring
    }

    renderer.render(scene, camera);
  }

  animate();
}
