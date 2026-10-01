/* ROUGATECH — motion/3D engine
   Vendored, no-build-step: Three.js (hero digital core), GSAP/ScrollTrigger
   (scroll-driven motion) and Lenis (smooth scroll) are all loaded as plain
   <script> tags before this module runs; this file wires them together.
   Every effect here is additive — it never removes the working CSS/JS
   fallbacks already in the page (floating-bubble hero, IntersectionObserver
   reveals), so the site stays fully usable if WebGL or a library fails.
*/
(function(){
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  var smallScreen = window.innerWidth < 760;
  var lowPower = false;
  try{
    if(navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) lowPower = true;
    if(navigator.deviceMemory && navigator.deviceMemory <= 4) lowPower = true;
  }catch(e){}

  function hasWebGL(){
    try{
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    }catch(e){ return false; }
  }

  /* ---------------------------------------------------------------- */
  /* Custom cursor (desktop, fine-pointer only)                        */
  /* ---------------------------------------------------------------- */
  function initCursor(){
    if(!finePointer || reducedMotion) return;
    var dot = document.getElementById('cursor-dot');
    var ring = document.getElementById('cursor-ring');
    if(!dot || !ring) return;
    document.documentElement.classList.add('cursor-ready', 'cursor-active');

    var mx = window.innerWidth/2, my = window.innerHeight/2;
    var rx = mx, ry = my;
    document.addEventListener('mousemove', function(e){
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + 'px'; dot.style.top = my + 'px';
      document.documentElement.classList.add('cursor-moved');
    }, {passive:true});
    document.addEventListener('mouseleave', function(){ document.documentElement.classList.add('cursor-hide'); });
    document.addEventListener('mouseenter', function(){ document.documentElement.classList.remove('cursor-hide'); });

    (function raf(){
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
      requestAnimationFrame(raf);
    })();

    function setState(el){
      ring.classList.remove('is-hover','is-label');
      ring.removeAttribute('data-cursor-label');
      if(!el) return;
      if(el.matches('.work-win, .work-win *')){ ring.classList.add('is-label'); ring.setAttribute('data-cursor-label','Voir'); }
      else if(el.matches('a, button, .svc-node, [role="button"]')){ ring.classList.add('is-hover'); }
    }
    document.addEventListener('mouseover', function(e){ setState(e.target.closest('a, button, .svc-node, [role="button"], .work-win')); });
    document.addEventListener('mouseout', function(e){ if(!e.relatedTarget || !e.relatedTarget.closest) setState(null); });
  }

  /* ---------------------------------------------------------------- */
  /* Smooth scroll (Lenis) + GSAP ScrollTrigger plumbing               */
  /* ---------------------------------------------------------------- */
  var lenisInstance = null;
  function initSmoothScroll(){
    if(typeof gsap === 'undefined') return;
    if(typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);

    if(!reducedMotion && typeof Lenis !== 'undefined'){
      lenisInstance = new Lenis({ duration: 1.05, smoothWheel: true, smoothTouch: false });
      lenisInstance.on('scroll', function(){ if(typeof ScrollTrigger !== 'undefined') ScrollTrigger.update(); });
      gsap.ticker.add(function(time){ lenisInstance.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);

      // keep in-page anchor nav (header links, CTAs) smooth through Lenis
      document.querySelectorAll('a[href^="#"]').forEach(function(a){
        a.addEventListener('click', function(e){
          var id = a.getAttribute('href');
          if(id.length < 2) return;
          var target = document.querySelector(id);
          if(!target) return;
          e.preventDefault();
          lenisInstance.scrollTo(target, { offset: -70, duration: 1.2 });
        });
      });
    }

    return lenisInstance;
  }

  /* ---------------------------------------------------------------- */
  /* Selected Work — floating browser-window tilt (desktop only)       */
  /* ---------------------------------------------------------------- */
  function initWorkTilt(){
    if(!finePointer || reducedMotion) return;
    document.querySelectorAll('.work-win').forEach(function(card){
      var inner = card.querySelector('.work-win-inner');
      if(!inner) return;
      card.addEventListener('mousemove', function(e){
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        inner.style.transform = 'rotateY(' + (px*7) + 'deg) rotateX(' + (py*-7) + 'deg) translateZ(10px)';
      });
      card.addEventListener('mouseleave', function(){
        inner.style.transform = 'rotateY(0) rotateX(0) translateZ(0)';
      });
    });

    if(typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined'){
      document.querySelectorAll('.work-win .work-media img').forEach(function(img){
        gsap.fromTo(img, {y:-18}, {
          y:18, ease:'none',
          scrollTrigger:{ trigger: img.closest('.work-win'), start:'top bottom', end:'bottom top', scrub:true }
        });
      });
    }
  }

  /* ---------------------------------------------------------------- */
  /* Hero — abstract 3D digital core (Three.js)                        */
  /* ---------------------------------------------------------------- */
  function initHero3D(){
    var visual = document.getElementById('hero-visual');
    var canvas = document.getElementById('hero-canvas');
    if(!visual || !canvas) return;
    if(reducedMotion || !hasWebGL()){
      return; // keep the orb/bubble CSS fallback already in the page
    }

    import('./vendor/three.module.min.js').then(function(THREE){
      var tier = (smallScreen || lowPower) ? 'light' : 'full';
      var particleCount = tier === 'light' ? 90 : 240;
      var linkDistance = tier === 'light' ? 1.15 : 1.35;
      var dpr = Math.min(window.devicePixelRatio || 1, tier === 'light' ? 1.5 : 2);

      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
      camera.position.z = 6.2;

      var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: tier === 'full' });
      renderer.setPixelRatio(dpr);

      var group = new THREE.Group();
      scene.add(group);

      // core — low-poly wireframe icosahedron
      var coreGeo = new THREE.IcosahedronGeometry(1.5, 1);
      var coreMat = new THREE.MeshBasicMaterial({ color: 0x7fe3ff, wireframe: true, transparent: true, opacity: 0.55 });
      var core = new THREE.Mesh(coreGeo, coreMat);
      group.add(core);

      var coreInnerMat = new THREE.MeshBasicMaterial({ color: 0x2f5cff, wireframe: true, transparent: true, opacity: 0.3 });
      var coreInner = new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 0), coreInnerMat);
      group.add(coreInner);

      // particle field — scattered around the core
      var positions = new Float32Array(particleCount * 3);
      for(var i = 0; i < particleCount; i++){
        var radius = 2.0 + Math.random() * 2.3;
        var theta = Math.random() * Math.PI * 2;
        var phi = Math.acos((Math.random() * 2) - 1);
        positions[i*3]   = radius * Math.sin(phi) * Math.cos(theta);
        positions[i*3+1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i*3+2] = radius * Math.cos(phi);
      }
      var particleGeo = new THREE.BufferGeometry();
      particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      var particleMat = new THREE.PointsMaterial({ color: 0x7fe3ff, size: 0.045, transparent: true, opacity: 0.85, sizeAttenuation: true });
      var particles = new THREE.Points(particleGeo, particleMat);
      group.add(particles);

      // connecting lines between nearby particles — static network, computed once
      var linePositions = [];
      for(var a = 0; a < particleCount; a++){
        for(var b = a + 1; b < particleCount; b++){
          var dx = positions[a*3]-positions[b*3], dy = positions[a*3+1]-positions[b*3+1], dz = positions[a*3+2]-positions[b*3+2];
          var d = Math.sqrt(dx*dx+dy*dy+dz*dz);
          if(d < linkDistance){
            linePositions.push(positions[a*3],positions[a*3+1],positions[a*3+2], positions[b*3],positions[b*3+1],positions[b*3+2]);
          }
        }
      }
      var lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePositions), 3));
      var lineMat = new THREE.LineBasicMaterial({ color: 0x2f5cff, transparent: true, opacity: 0.18 });
      var lines = new THREE.LineSegments(lineGeo, lineMat);
      group.add(lines);

      function resize(){
        var w = visual.clientWidth, h = visual.clientHeight;
        if(w === 0 || h === 0) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      resize();
      window.addEventListener('resize', resize);

      // mouse parallax (desktop only)
      var targetRX = 0, targetRY = 0, curRX = 0, curRY = 0;
      if(finePointer){
        window.addEventListener('mousemove', function(e){
          targetRY = ((e.clientX / window.innerWidth) - 0.5) * 0.5;
          targetRX = ((e.clientY / window.innerHeight) - 0.5) * -0.35;
        }, {passive:true});
      }

      // scroll reactivity: as the hero scrolls out, the core "expands" — nodes separate
      var scrollProgress = 0;
      function onScroll(){
        var heroEl = document.getElementById('hero');
        if(!heroEl) return;
        var r = heroEl.getBoundingClientRect();
        var p = 1 - Math.min(Math.max(r.bottom / (r.height + window.innerHeight), 0), 1);
        scrollProgress = Math.min(Math.max(p, 0), 1);
      }
      window.addEventListener('scroll', onScroll, {passive:true});
      onScroll();

      var running = true;
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(e){ running = e.isIntersecting; });
      }, {threshold:0});
      io.observe(visual);

      var clock = new THREE.Clock();
      function animate(){
        requestAnimationFrame(animate);
        if(!running) return;
        var t = clock.getElapsedTime();
        group.rotation.y = t * 0.08;
        core.rotation.x = t * 0.12;
        coreInner.rotation.y = -t * 0.1;

        curRX += (targetRX - curRX) * 0.06;
        curRY += (targetRY - curRY) * 0.06;
        group.rotation.x = curRX;
        group.rotation.z = curRY * 0.3;

        var expand = 1 + scrollProgress * 0.9;
        particles.scale.setScalar(expand);
        lines.scale.setScalar(expand);
        particleMat.opacity = 0.85 * (1 - scrollProgress * 0.6);
        lineMat.opacity = 0.18 * (1 - scrollProgress * 0.7);
        coreMat.opacity = 0.55 * (1 - scrollProgress * 0.5);

        renderer.render(scene, camera);
      }
      animate();
      visual.classList.add('webgl-active');
    }).catch(function(){ /* leave the CSS fallback visible */ });
  }

  /* ---------------------------------------------------------------- */
  function boot(){
    initCursor();
    initSmoothScroll();
    initWorkTilt();
    initHero3D();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
