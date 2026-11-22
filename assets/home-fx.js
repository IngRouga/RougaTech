/* ROUGATECH — couche haut de gamme (GSAP + ScrollTrigger, fichiers locaux) */
(function(){
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var desktop = window.matchMedia('(min-width:901px)').matches;
  function pad(n){ return (n<10?'0':'')+n; }

  /* hauteur de l'en-tête : le héros sombre passe dessous */
  var header = document.getElementById('site-header');
  function setHdr(){ if(header) document.documentElement.style.setProperty('--hdr-h', header.offsetHeight+'px'); }
  setHdr(); window.addEventListener('resize', setHdr);

  /* en-tête et bulle d'aide adaptés tant qu'on est sur le héros sombre */
  var heroEl = document.querySelector('.hero-x');
  if(heroEl){
    var onHero = function(){ var b = heroEl.getBoundingClientRect().bottom; document.body.classList.toggle('on-hero', b > (header ? header.offsetHeight : 80) + 10); };
    window.addEventListener('scroll', onHero, {passive:true}); window.addEventListener('resize', onHero); onHero();
  }

  /* mur de réalisations du héros (vraies captures des sites clients) */
  var wall = document.getElementById('hx-wall');
  if(wall){
    var imgs = [].slice.call(document.querySelectorAll('#work .proj-img img')).map(function(i){ return i.getAttribute('src'); });
    if(!imgs.length) imgs = ['work-gcap11.jpg','work-marina.jpg','work-ipstg.jpg','work-iphec.jpg','work-hgc.jpg','work-digitalcampus.jpg','work-scolpay.jpg'];
    var cols = [[],[],[]];
    /* chaque projet une seule fois ; GCAP11 (très coloré) une seule fois, les autres complètent */
    var gc = imgs.filter(function(x){ return /gcap/i.test(x); }), others = imgs.filter(function(x){ return !/gcap/i.test(x); });
    var order = [others[0], others[1], others[2], others[3], gc[0]||others[4], others[4], others[5], others[0], others[1]].filter(Boolean);
    order.forEach(function(src,k){ cols[k%3].push('<div class="hx-tile"><i><b></b><b></b><b></b></i><img src="'+src+'" alt=""></div>'); });
    wall.innerHTML = cols.map(function(c){ var h=c.join(''); return '<div class="hx-col">'+h+h+'</div>'; }).join('');
  }

  /* numéros des réalisations */
  var track = document.getElementById('work-track');
  var panels = track ? [].slice.call(track.querySelectorAll(':scope > .proj')) : [];
  panels.forEach(function(p,i){ var t=p.querySelector('.proj-txt'); if(t) t.setAttribute('data-n', pad(i+1)); });
  var tot = document.getElementById('work-tot'); if(tot) tot.textContent = pad(panels.length);

  /* comparatif mobile : cartes empilées, la carte recouverte recule */
  var rows = [].slice.call(document.querySelectorAll('.cmp tbody tr'));
  rows.forEach(function(r,i){ r.style.setProperty('--i', i); });
  if(rows.length && !reduce){
    var stackTick = false;
    var stack = function(){ stackTick = false; if(window.innerWidth > 720){ rows.forEach(function(r){ r.classList.remove('under'); }); return; }
      for(var i=0;i<rows.length-1;i++){ var a=rows[i].getBoundingClientRect(), b=rows[i+1].getBoundingClientRect(); rows[i].classList.toggle('under', b.top - a.top < 60); } };
    window.addEventListener('scroll', function(){ if(!stackTick){ stackTick = true; requestAnimationFrame(stack); } }, {passive:true});
    window.addEventListener('resize', stack); stack();
  }

  if(reduce || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  document.documentElement.classList.add('fx2');

  /* héros : le mur apparaît, profondeur au défilement */
  gsap.from('.hx-wall', {opacity:0, scale:1.12, duration:2.2, ease:'expo.out'});
  gsap.to('.hx-wall', {yPercent:10, ease:'none', scrollTrigger:{trigger:'.hero-x', start:'top top', end:'bottom top', scrub:true}});
  gsap.to('.hero-x .hero-text', {yPercent:-14, opacity:.15, ease:'none', scrollTrigger:{trigger:'.hero-x', start:'top top', end:'bottom top', scrub:true}});

  /* réalisations : défilement horizontal épinglé sur ordinateur */
  if(track && panels.length && desktop){
    var cnt = document.getElementById('work-cnt'), bar = document.getElementById('work-bar');
    var dist = function(){ return Math.max(0, track.scrollWidth - window.innerWidth); };
    var tween = gsap.to(track, {x:function(){ return -dist(); }, ease:'none', scrollTrigger:{
      trigger:'#work-pin', start:'center center', end:function(){ return '+='+dist(); }, pin:true, scrub:1, invalidateOnRefresh:true, anticipatePin:1,
      onUpdate:function(self){ if(bar) bar.style.width=(self.progress*100)+'%'; if(cnt) cnt.textContent=pad(Math.min(panels.length, Math.round(self.progress*(panels.length-1))+1)); }
    }});
    panels.forEach(function(p){
      var im = p.querySelector('.proj-img img'); if(!im) return;
      gsap.fromTo(im, {scale:1.25}, {scale:1.02, ease:'none', scrollTrigger:{trigger:p, containerAnimation:tween, start:'left right', end:'right left', scrub:true}});
    });
  } else {
    panels.forEach(function(p){ gsap.from(p, {y:60, opacity:0, duration:.9, ease:'power3.out', scrollTrigger:{trigger:p, start:'top 92%'}}); });
  }

  /* fondateur : la photo s'ouvre */
  var lp = document.querySelector('.letter-photo');
  if(lp){
    gsap.to(lp, {clipPath:'inset(0% 0% 0% 0% round 32px)', ease:'none', scrollTrigger:{trigger:lp, start:'top 90%', end:'top 35%', scrub:true}});
    var li = lp.querySelector('img'); if(li) gsap.fromTo(li, {scale:1.18}, {scale:1, ease:'none', scrollTrigger:{trigger:lp, start:'top bottom', end:'bottom top', scrub:true}});
  }

  window.addEventListener('load', function(){ setHdr(); ScrollTrigger.refresh(); });
  document.querySelectorAll('[data-lang-btn]').forEach(function(b){ b.addEventListener('click', function(){ setTimeout(function(){ ScrollTrigger.refresh(); }, 60); }); });
})();
