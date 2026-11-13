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
      toggle.classList.toggle('active', open);
      document.body.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', open);
    });
    nav.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){
        nav.classList.remove('open');
        toggle.classList.remove('active');
        document.body.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', false);
      });
    });
  }


  // menu mobile : bouton « changer de langue », ordre d'apparition et bouton principal
  (function(){
    var nav=document.getElementById('main-nav'); if(!nav) return;
    var cta=nav.querySelector('a[href="/contact/"]');
    var lang=document.createElement('button'); lang.type='button'; lang.className='m-lang';
    lang.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg><span class="fr" lang="fr">English</span><span class="en" lang="en">Français</span>';
    lang.addEventListener('click',function(){ var cur=document.body.getAttribute('data-lang')||'fr'; var b=document.querySelector('[data-lang-btn="'+(cur==='fr'?'en':'fr')+'"]'); if(b) b.click(); });
    if(cta){ cta.classList.add('m-cta'); nav.insertBefore(lang,cta); } else nav.appendChild(lang);
    var k=0; [].forEach.call(nav.children,function(el){ var t=el.classList.contains('nav-item')?el.querySelector(':scope > a'):el; if(t) t.style.setProperty('--k',k++); });
  })();

  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){ if(e.isIntersecting) e.target.classList.add('in'); });
  }, {threshold:.05, rootMargin:"0px 0px -10% 0px"});
  document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });

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

    // bulle « Besoin d'aide ? » : apparaît toutes les 30 s puis repart (le panneau ne s'ouvre plus tout seul)
    var nudge=document.createElement('button'); nudge.type='button'; nudge.className='ai-nudge'; nudge.setAttribute('aria-hidden','true'); nudge.tabIndex=-1;
    nudge.innerHTML='<span class="fr" lang="fr">Besoin d\'aide ? 👋</span><span class="en" lang="en">Need help? 👋</span>';
    widget.appendChild(nudge);
    nudge.addEventListener('click', function(e){ e.stopPropagation(); nudge.classList.remove('show'); openWidget(); });
    setInterval(function(){
      if(document.hidden || widget.classList.contains('open')) return;
      nudge.classList.add('show');
      setTimeout(function(){ nudge.classList.remove('show'); }, 5000);
    }, 30000);
  }

  // article share — copy link button
  var copyBtn = document.querySelector('[data-copy-link]');
  if(copyBtn){
    copyBtn.addEventListener('click', function(){
      var url = window.location.href;
      function done(){
        var original = copyBtn.innerHTML;
        copyBtn.setAttribute('aria-label', 'Link copied');
        copyBtn.classList.add('copied');
        setTimeout(function(){ copyBtn.classList.remove('copied'); }, 1800);
      }
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(url).then(done).catch(function(){});
      } else {
        try{
          var tmp = document.createElement('textarea');
          tmp.value = url; document.body.appendChild(tmp); tmp.select();
          document.execCommand('copy'); document.body.removeChild(tmp);
          done();
        }catch(e){}
      }
    });
  }
})();
