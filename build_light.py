import re
SP='/tmp/claude-0/-home-claude/3bd42a42-9e90-56ca-9e23-7db058f7838c/scratchpad/'
s=open('_dark_backup/index.html',encoding='utf-8').read()
head_end=s.index('</head>'); body_start=s.index('<body>')
head=s[:head_end]; body=s[body_start:]
# ---- head: keep meta, favicons, lang script, font faces; replace all other CSS
fonts=''.join(re.findall(r'@font-face\{[^}]*\}\n?',head))
head_top=head[:head.index('<style>')]
head_new=head_top+'<style>\n'+open(SP+'fonts-inline.css').read()+'\n</style>\n<style>\n'+open(SP+'light.css',encoding='utf-8').read()+'</style>\n</head>\n'
def rep(old,new,n=1):
    global body
    c=body.count(old); assert c==n,(old[:80],c); body=body.replace(old,new)

# ---- hero: copy block kept verbatim, video moves into an opt-in film player
m=re.search(r'<section class="hero">(.*?)</section>',body,re.S); hero=m.group(1)
copy=re.search(r'<div class="hero-copy">(.*?)</div></div>',hero,re.S).group(1)
video=re.search(r'<video.*?</video>',hero,re.S).group(0)
video=video.replace('<video autoplay muted loop playsinline preload="auto"','<video id="filmVideo" muted loop playsinline preload="none" controls')
cue=re.search(r'<span class="scrollcue".*?</span>',hero,re.S).group(0)
new_hero=f'''<section class="hero">
  <div class="hero-grid">
    <div class="hero-copy">{copy}</div>
    <figure class="housing" id="housing">
      <div class="screen">
        <video id="heroVideo" autoplay muted loop playsinline preload="auto" poster="/volty-hero-loop-poster.webp" aria-label="Volty U1, walkaround in the warehouse">
          <source src="/volty-hero-loop.webm" type="video/webm">
          <source src="/volty-hero-loop.mp4" type="video/mp4">
        </video>
        <img class="poster" src="/volty-hero-loop-poster.webp" alt="Volty U1 in the warehouse" loading="lazy">
      </div>
      <figcaption class="hstrip">
        <b>Volty U1</b>
        <span data-en="Walkaround" data-vi="Góc nhìn quanh xe">Walkaround</span>
        <i class="grille" aria-hidden="true"></i>
        <button type="button" class="vtoggle" id="vidToggle" aria-label="Pause video"><span class="ic-pause" aria-hidden="true"><i></i><i></i></span><span class="ic-play" aria-hidden="true"></span></button>
      </figcaption>
    </figure>
  </div>
  {cue}
</section>'''
body=body[:m.start()]+new_hero+body[m.end():]

# ---- section grounds
c=body.count('<section class="pad">'); assert c==2,c
body=body.replace('<section class="pad">','<section class="pad machine">',1).replace('<section class="pad">','<section class="pad audience">',1)
rep('<section class="specs">','<div class="specband"><section class="specs">')
i=body.index('<section class="specs">'); j=body.index('</section>',i)+len('</section>'); body=body[:j]+'</div>'+body[j:]
# ---- spec strip: a dial on each tile
dial='<svg class="dial" viewBox="0 0 78 78" aria-hidden="true"><circle cx="39" cy="39" r="37" fill="#fff"/>'+''.join(
  f'<line x1="39" y1="6" x2="39" y2="{12 if i%3==0 else 9}" stroke="#151514" stroke-width="{1.6 if i%3==0 else 1}" transform="rotate({-120+i*20} 39 39)"/>' for i in range(13))+\
  '<line x1="39" y1="39" x2="39" y2="14" stroke="#E2231A" stroke-width="2.4" stroke-linecap="round" transform="rotate({A} 39 39)"/><circle cx="39" cy="39" r="4" fill="#151514"/></svg>'
for i,a in enumerate([70,95,-60]):
    pass
parts=body.split('<div class="spec">'); assert len(parts)==4
angles=[72,100,-64]
body=parts[0]+''.join('<div class="spec">'+dial.replace('{A}',str(angles[i]))+parts[i+1] for i in range(3))

# ---- economics: the calculator object
rep('<div style="border:1px solid var(--line);border-left:3px solid var(--red);background:var(--bg1);padding:clamp(26px,3vw,38px)">',
    '<div class="calc rv d1"><div class="calc-display" aria-hidden="true"><span data-en="Cost per working day" data-vi="Chi phí mỗi ngày làm việc">Cost per working day</span><b>&#8363;</b></div>')
rep('<h3 style="font-size:23px;margin-bottom:12px" data-en="Run it','<h3 data-en="Run it')
rep('<p style="color:var(--muted)" data-en="Cost per working day is','<p data-en="Cost per working day is')
rep('</a>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n</section>',
    '</a>\n          </div>\n          <div class="keys" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>\n        </div>\n      </div>\n    </div>\n  </div>\n</section>')
rep('<div class="routes rv d1 rv d1">','<div class="routes">')
rep('<div class="aud rv d1 rv d1">','<div class="aud rv d1">')
rep('<div class="cgrid rv d1 rv d1">','<div class="cgrid rv d1">')
# ---- contact heading size moves to CSS
rep('<h2 style="font-size:clamp(40px,7vw,88px);margin-top:14px" data-en="Let\'s build the fleet"','<h2 class="h-big" data-en="Let\'s build the fleet"')
# footer logo keeps the red mark; its inner chevron was paper-white, keep it white on red
# ---- film player script
film_js='''<script>
/* Hero video pause control. Autoplaying motion longer than five seconds needs a
   way to stop it (WCAG 2.2.2). The clip is a flash-free cut of the orbit shot. */
(function(){
  var h=document.getElementById('housing'),v=document.getElementById('heroVideo'),b=document.getElementById('vidToggle');
  if(!h||!v||!b)return;
  function set(p){h.classList.toggle('paused',p);b.setAttribute('aria-label',p?'Play video':'Pause video')}
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){v.removeAttribute('autoplay');v.pause();set(true)}
  b.addEventListener('click',function(){if(v.paused){v.play();set(false)}else{v.pause();set(true)}});
  v.addEventListener('error',function(){set(true)});
})();
</script>
</body>'''
rep('</body>',film_js)
out=head_new+body
out=out.replace('<title>','<title>',1)
open('index.html','w',encoding='utf-8').write(out)
print('written',len(out))
