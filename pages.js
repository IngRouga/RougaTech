// ROUGATECH — shared behavior for deep-dive pages (header scroll, mobile nav, lang toggle, reveal, AI widget)
(function(){
  var header = document.getElementById('site-header');
  function onScroll(){
    if(header) header.classList.toggle('scrolled', window.scrollY > 40);
  }
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();

  var toggle = document.getElementById('menu-toggle');
  var nav = document.getElementById('main-nav');
  if(toggle && nav){
    toggle.addEventListener('click', function(){
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open);
    });
    nav.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', false);
      });
    });
  }

  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){ if(e.isIntersecting) e.target.classList.add('in'); });
  }, {threshold:.05, rootMargin:"0px 0px -10% 0px"});
  document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });

  document.querySelectorAll('.btn-primary').forEach(function(btn){
    btn.addEventListener('mousemove', function(e){
      var r = btn.getBoundingClientRect();
      var x = e.clientX - r.left - r.width/2;
      var y = e.clientY - r.top - r.height/2;
      btn.style.transform = 'translate(' + (x*0.12) + 'px, ' + (y*0.28) + 'px)';
    });
    btn.addEventListener('mouseleave', function(){ btn.style.transform = 'translate(0,0)'; });
  });

  // language switch (same storage key as homepage, so the choice persists across pages)
  var langButtons = document.querySelectorAll('[data-lang-btn]');
  function setLang(lang){
    document.body.setAttribute('data-lang', lang);
    document.documentElement.setAttribute('lang', lang);
    langButtons.forEach(function(b){ b.classList.toggle('active', b.dataset.langBtn === lang); });
    try{ localStorage.setItem('rougatech-lang', lang); }catch(e){}
  }
  langButtons.forEach(function(b){ b.addEventListener('click', function(){ setLang(b.dataset.langBtn); }); });
  try{
    var saved = localStorage.getItem('rougatech-lang');
    if(saved) setLang(saved);
  }catch(e){}

  // AI welcome widget
  var widget = document.getElementById('ai-widget');
  var fab = document.getElementById('ai-fab');
  if(widget && fab){
    function openWidget(){ widget.classList.add('open'); fab.setAttribute('aria-expanded','true'); }
    function closeWidget(){
      widget.classList.remove('open');
      fab.setAttribute('aria-expanded','false');
      try{ sessionStorage.setItem('rougatech-ai-dismissed','1'); }catch(e){}
    }
    fab.addEventListener('click', function(){
      widget.classList.contains('open') ? closeWidget() : openWidget();
    });
    document.addEventListener('click', function(e){
      if(widget.classList.contains('open') && !widget.contains(e.target)) closeWidget();
    });
    widget.querySelectorAll('.ai-action').forEach(function(a){ a.addEventListener('click', closeWidget); });
    var alreadyDismissed = false;
    try{ alreadyDismissed = sessionStorage.getItem('rougatech-ai-dismissed') === '1'; }catch(e){}
    if(!alreadyDismissed){ setTimeout(openWidget, 3500); }
  }
})();
