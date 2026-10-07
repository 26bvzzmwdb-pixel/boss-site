// premium pass 2026-10-07: scroll progress, nav shadow, reveal-on-scroll, live leaderboard, build log + proof strip
(function(){
var $=function(i){return document.getElementById(i)};
var esc=function(v){return String(v==null?"":v).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})};
var nav=$("nav"),prog=$("prog"),raf=0;
function onScroll(){raf=0;var h=document.documentElement,max=h.scrollHeight-h.clientHeight;prog.style.transform="scaleX("+(max>0?h.scrollTop/max:0)+")";nav.classList.toggle("scrolled",h.scrollTop>8);}
addEventListener("scroll",function(){if(!raf)raf=requestAnimationFrame(onScroll)},{passive:true});onScroll();
// reveal
var rm=matchMedia("(prefers-reduced-motion: reduce)").matches;
var els=[].slice.call(document.querySelectorAll("main .sh, main .card, .rv, .comm a, .trust div, .faq details, .steps div"));
if(!rm&&"IntersectionObserver" in window){els.forEach(function(e){e.classList.add("rv")});
  var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){x.target.classList.add("in");io.unobserve(x.target)}})},{rootMargin:"0px 0px -8% 0px",threshold:.08});
  els.forEach(function(e){io.observe(e)});}
else els.forEach(function(e){e.classList.add("in")});
// time helpers
var ET={timeZone:"America/New_York"};
function ago(t){var m=Math.round((Date.now()-new Date(t))/60000);if(m<60)return Math.max(1,m)+"m ago";var h=Math.round(m/60);if(h<24)return h+"h ago";var d=Math.round(h/24);return d+"d ago";}
function day(t){return new Date(t).toLocaleDateString("en-US",Object.assign({month:"short",day:"numeric"},ET));}
// build log: live from GitHub (public), fall back to buildlog.json snapshot
function renderLog(list,meta){
  $("blog").innerHTML=list.slice(0,40).map(function(c){return '<li><time datetime="'+esc(c.t)+'">'+esc(day(c.t))+'</time><span class="m">'+esc(c.s)+' <a class="h" href="https://github.com/26bvzzmwdb-pixel/boss-site/commit/'+esc(c.full||c.h)+'" target="_blank" rel="noopener">'+esc(c.h)+'</a></span></li>'}).join("");
  if(list.length){$("pf-last").textContent=ago(list[0].t);$("live-chip-t").textContent="Built in public · last update "+ago(list[0].t);}
  if(meta){$("pf-commits").textContent=meta.total;$("pf-days").textContent=meta.active_days;$("bl-meta").textContent="· "+meta.total+" public updates since "+day(meta.first);}
}
fetch("buildlog.json",{cache:"no-cache"}).then(function(r){return r.ok?r.json():null}).then(function(j){if(!j)return;renderLog(j.commits,j);
}).catch(function(){});
// live leaderboard: try the game server; fall back to the snapshot published with the site
function renderLB(j,src){var L=(j&&j.leaderboard)||[];var box=$("lb");
  if(!L.length){box.innerHTML='<div class="empty">No ranked scores yet this round. Be the first on the board.</div>';}
  else box.innerHTML='<table><thead><tr><th>#</th><th>PLAYER</th><th style="text-align:right">SCORE</th></tr></thead><tbody>'+L.slice(0,10).map(function(e,i){
    return '<tr><td class="r">'+(i+1)+'</td><td>'+esc(e.name||"player")+(e.holder?" 👑":"")+(e.verified?'<span class="vf" title="Server-replayed run">✓ verified</span>':"")+'</td><td class="s">'+Number(e.score||0).toLocaleString("en-US")+'</td></tr>'}).join("")+'</tbody></table>';
  $("lb-src").textContent=(j&&j.round?"Round "+j.round+" · ":"")+src;}
// the game server's /api/leaderboard has no CORS header yet, so the site shows the snapshot published with each deploy
fetch("leaderboard.json",{cache:"no-cache"}).then(function(r){return r.ok?r.json():null}).then(function(j){if(!j){$("lb").innerHTML='<div class="empty">Board unavailable right now. Open the live leaderboard below.</div>';return;}
  renderLB(j,"snapshot from "+ago(j.generated)+" · open the live board for up-to-the-second standings");}).catch(function(){});
})();
