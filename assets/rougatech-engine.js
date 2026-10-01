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
  /* Hero — "intelligent digital core" (Three.js)                      */
  /* Layered, proprietary-feeling system: a nested wireframe core with */
  /* an additive glow sprite, independently-rotating orbital rings,    */
  /* foreground/background depth-separated particle fields, a static   */
  /* nearest-neighbor network plus core→node radial connectors, real   */
  /* depth parallax (group rotation + camera shift), and a multi-phase */
  /* scroll transformation (rotate → expand → orbital separation →     */
  /* fade) so the core visibly participates in the scroll, not just    */
  /* sits above the text.                                              */
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
      var fgCount = tier === 'light' ? 70 : 170;
      var bgCount = tier === 'light' ? 46 : 130;
      var linkDistance = tier === 'light' ? 1.1 : 1.3;
      var dpr = Math.min(window.devicePixelRatio || 1, tier === 'light' ? 1.5 : 2);

      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
      camera.position.set(0, 0, 6.4);

      var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: tier === 'full' });
      renderer.setPixelRatio(dpr);

      var group = new THREE.Group();
      scene.add(group);

      // soft additive glow (emulated bloom via a canvas-generated sprite — no postprocessing pass needed)
      function glowTexture(){
        var size = 256;
        var c = document.createElement('canvas');
        c.width = c.height = size;
        var ctx = c.getContext('2d');
        var g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
        g.addColorStop(0, 'rgba(165,235,255,0.85)');
        g.addColorStop(0.4, 'rgba(100,180,255,0.3)');
        g.addColorStop(1, 'rgba(60,100,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);
        return new THREE.CanvasTexture(c);
      }
      var glowMat = new THREE.SpriteMaterial({ map: glowTexture(), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
      var glow = new THREE.Sprite(glowMat);
      glow.scale.set(3.6, 3.6, 1);
      group.add(glow);

      // core — nested wireframe geometry (not a plain sphere/icosphere: two counter-rotating shells)
      var coreGeo = new THREE.IcosahedronGeometry(1.08, 1);
      var coreMat = new THREE.MeshBasicMaterial({ color: 0x9fe9ff, wireframe: true, transparent: true, opacity: 0.6 });
      var core = new THREE.Mesh(coreGeo, coreMat);
      group.add(core);

      var coreInnerMat = new THREE.MeshBasicMaterial({ color: 0x2f5cff, wireframe: true, transparent: true, opacity: 0.35 });
      var coreInner = new THREE.Mesh(new THREE.IcosahedronGeometry(0.72, 0), coreInnerMat);
      group.add(coreInner);

      // orbital ring layers — thin torus rings on independent axes/speeds, giving the "system" its depth
      var rings = [];
      var ringDefs = tier === 'light'
        ? [ {r:1.9, tube:0.006, tilt:[0.5,0.2,0], speed:0.09, color:0x7fe3ff, op:0.4},
            {r:2.5, tube:0.005, tilt:[-0.35,0.9,0.2], speed:-0.06, color:0x2f5cff, op:0.3} ]
        : [ {r:1.9, tube:0.006, tilt:[0.5,0.2,0], speed:0.09, color:0x7fe3ff, op:0.45},
            {r:2.45, tube:0.005, tilt:[-0.35,0.9,0.2], speed:-0.065, color:0x2f5cff, op:0.32},
            {r:3.05, tube:0.004, tilt:[0.15,-0.6,0.4], speed:0.045, color:0x9fe9ff, op:0.2} ];
      ringDefs.forEach(function(def){
        var geo = new THREE.TorusGeometry(def.r, def.tube, 8, 96);
        var mat = new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: def.op });
        var ring = new THREE.Mesh(geo, mat);
        ring.rotation.set(def.tilt[0], def.tilt[1], def.tilt[2]);
        ring.userData.speed = def.speed;
        group.add(ring);
        rings.push(ring);
      });

      // depth-layered particle fields — bright/close foreground, dim/far background
      function particleField(count, rMin, rMax, size, color, opacity){
        var positions = new Float32Array(count * 3);
        for(var i = 0; i < count; i++){
          var radius = rMin + Math.random() * (rMax - rMin);
          var theta = Math.random() * Math.PI * 2;
          var phi = Math.acos((Math.random() * 2) - 1);
          positions[i*3]   = radius * Math.sin(phi) * Math.cos(theta);
          positions[i*3+1] = radius * Math.sin(phi) * Math.sin(theta);
          positions[i*3+2] = radius * Math.cos(phi);
        }
        var geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        var mat = new THREE.PointsMaterial({ color: color, size: size, transparent: true, opacity: opacity, sizeAttenuation: true });
        return { points: new THREE.Points(geo, mat), positions: positions, mat: mat };
      }
      var fg = particleField(fgCount, 1.5, 2.6, 0.05, 0x9fe9ff, 0.9);
      var bg = particleField(bgCount, 3.0, 4.7, 0.026, 0x3a5fd9, 0.32);
      group.add(fg.points);
      group.add(bg.points);

      // connective network — nearest-neighbor links among foreground nodes (static, computed once)
      var linePositions = [];
      for(var a = 0; a < fgCount; a++){
        for(var b = a + 1; b < fgCount; b++){
          var dx = fg.positions[a*3]-fg.positions[b*3], dy = fg.positions[a*3+1]-fg.positions[b*3+1], dz = fg.positions[a*3+2]-fg.positions[b*3+2];
          var d = Math.sqrt(dx*dx+dy*dy+dz*dz);
          if(d < linkDistance){
            linePositions.push(fg.positions[a*3],fg.positions[a*3+1],fg.positions[a*3+2], fg.positions[b*3],fg.positions[b*3+1],fg.positions[b*3+2]);
          }
        }
      }
      var lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePositions), 3));
      var lineMat = new THREE.LineBasicMaterial({ color: 0x2f5cff, transparent: true, opacity: 0.16 });
      var lines = new THREE.LineSegments(lineGeo, lineMat);
      group.add(lines);

      // a handful of radial connectors from the core out to nearby foreground nodes
      var connectorPositions = [];
      var connectorCount = Math.min(tier === 'light' ? 8 : 14, fgCount);
      for(var c = 0; c < connectorCount; c++){
        var idx = Math.floor((c / connectorCount) * fgCount);
        connectorPositions.push(0,0,0, fg.positions[idx*3], fg.positions[idx*3+1], fg.positions[idx*3+2]);
      }
      var connGeo = new THREE.BufferGeometry();
      connGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(connectorPositions), 3));
      var connMat = new THREE.LineBasicMaterial({ color: 0x7fe3ff, transparent: true, opacity: 0.22 });
      var connectors = new THREE.LineSegments(connGeo, connMat);
      group.add(connectors);

      // ascending particles — a steady stream rising up through the core. Not a literal
      // chart (never that again): just a continuous upward current reading as momentum,
      // progress, a system that is actively growing rather than a static ambient scene.
      var ascendCount = tier === 'light' ? 26 : 46;
      var ascendRadius = 1.25;
      var ascendTop = 2.9, ascendBottom = -2.9;
      var ascendPositions = new Float32Array(ascendCount * 3);
      var ascendSpeeds = new Float32Array(ascendCount);
      function respawnAscend(i, atBottom){
        var ang = Math.random() * Math.PI * 2;
        var rad = Math.random() * ascendRadius;
        ascendPositions[i*3]   = Math.cos(ang) * rad;
        ascendPositions[i*3+1] = atBottom ? ascendBottom : (ascendBottom + Math.random() * (ascendTop - ascendBottom));
        ascendPositions[i*3+2] = Math.sin(ang) * rad;
      }
      for(var ai = 0; ai < ascendCount; ai++){
        respawnAscend(ai, false);
        ascendSpeeds[ai] = 0.14 + Math.random() * 0.24;
      }
      var ascendGeo = new THREE.BufferGeometry();
      var ascendAttr = new THREE.BufferAttribute(ascendPositions, 3);
      ascendGeo.setAttribute('position', ascendAttr);
      var ascendMat = new THREE.PointsMaterial({ color: 0xcdf5ff, size: 0.042, transparent: true, opacity: 0.8, sizeAttenuation: true, blending: THREE.AdditiveBlending, depthWrite: false });
      var ascendPoints = new THREE.Points(ascendGeo, ascendMat);
      group.add(ascendPoints);

      function resize(){
        var w = visual.clientWidth, h = visual.clientHeight;
        if(w === 0 || h === 0) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      resize();
      window.addEventListener('resize', resize);

      // mouse parallax — group rotation AND a subtle camera shift, so it reads as real depth, not a sticker
      var targetRX = 0, targetRY = 0, curRX = 0, curRY = 0;
      var targetCamX = 0, targetCamY = 0, curCamX = 0, curCamY = 0;
      if(finePointer){
        window.addEventListener('mousemove', function(e){
          var nx = (e.clientX / window.innerWidth) - 0.5;
          var ny = (e.clientY / window.innerHeight) - 0.5;
          targetRY = nx * 0.55;
          targetRX = ny * -0.38;
          targetCamX = nx * 0.5;
          targetCamY = ny * -0.3;
        }, {passive:true});
      }

      // scroll reactivity: a continuous multi-phase transformation, not a single expand
      //  phase 1 — slow autorotate (always running)
      //  phase 2 — the core + glow expand
      //  phase 3 — the orbital rings separate outward (each at its own rate)
      //  phase 4 — everything fades as the hero scrolls into the next section
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
        var dt = Math.min(clock.getDelta(), 0.1);
        var t = clock.elapsedTime;

        group.rotation.y = t * 0.065;
        core.rotation.x = t * 0.1;
        core.rotation.y = -t * 0.05;
        coreInner.rotation.y = -t * 0.09;
        coreInner.rotation.z = t * 0.04;
        rings.forEach(function(ring){ ring.rotation.z += ring.userData.speed * 0.016; });

        curRX += (targetRX - curRX) * 0.055;
        curRY += (targetRY - curRY) * 0.055;
        group.rotation.x = curRX;
        group.rotation.z = curRY * 0.22;
        curCamX += (targetCamX - curCamX) * 0.04;
        curCamY += (targetCamY - curCamY) * 0.04;
        camera.position.x = curCamX;
        camera.position.y = curCamY;
        camera.lookAt(0, 0, 0);

        // a slow, continuous "breathing" growth cycle — independent of scroll — so the
        // system reads as alive and evolving, not a static decoration
        var breathe = 1 + Math.sin(t * 0.26) * 0.035;

        // ascending particles — a steady upward current through the core
        for(var ai2 = 0; ai2 < ascendCount; ai2++){
          var yi = ai2 * 3 + 1;
          ascendPositions[yi] += ascendSpeeds[ai2] * dt;
          if(ascendPositions[yi] > ascendTop) respawnAscend(ai2, true);
        }
        ascendAttr.needsUpdate = true;

        var p = scrollProgress;
        var expand = (1 + p * 0.85) * breathe;
        fg.points.scale.setScalar(expand);
        bg.points.scale.setScalar(1 + p * 1.3);
        lines.scale.setScalar(expand);
        connectors.scale.setScalar(1 + p * 0.5);
        rings.forEach(function(ring, i){ ring.scale.setScalar((1 + p * (0.5 + i * 0.35)) * (1 + Math.sin(t * 0.22 + i * 1.7) * 0.025)); });
        core.scale.setScalar((1 + p * 0.18) * breathe);
        coreInner.scale.setScalar(breathe);
        glow.scale.setScalar(3.6 * (1 + p * 0.3) * breathe);

        fg.mat.opacity = 0.9 * (1 - p * 0.65);
        bg.mat.opacity = 0.32 * (1 - p * 0.8);
        lineMat.opacity = 0.16 * (1 - p * 0.75);
        connMat.opacity = 0.22 * (1 - p * 0.7);
        coreMat.opacity = 0.6 * (1 - p * 0.45);
        coreInnerMat.opacity = 0.35 * (1 - p * 0.45);
        glowMat.opacity = 0.55 * (1 - p * 0.5);
        ascendMat.opacity = 0.8 * (1 - p * 0.7);

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
    // initHero3D() intentionally not called: Amadou preferred the original
    // floating-orb/bubble hero visual (Visibilité+/Plus de vente/Plus de
    // client/Grandir) over the WebGL digital core. The core code is left in
    // place (easy to re-enable later) but the hero now always shows the CSS
    // fallback, which is the real, permanent design again, not a fallback.
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
