(()=>{const G="012-snap-ring",BK="maeil-best-"+G,DUR=60;
const CREAM="#efe6d4",GOLD="#e8c87a",TEAL="#7ddec0",VOID="#2a2430",INK="#141311";
const cv=document.getElementById("game"),x=cv.getContext("2d");
const scEl=document.getElementById("score"),tmEl=document.getElementById("time"),bsEl=document.getElementById("best");
const stO=document.getElementById("start"),rsO=document.getElementById("results"),fn=document.getElementById("final-score");
const play=document.getElementById("btn-play"),again=document.getElementById("btn-again"),fav=document.getElementById("btn-fav"),nh=document.getElementById("new-high");
let W,H,dpr,run=0,score=0,best=+localStorage.getItem(BK)||0,tLeft=DUR,last=0;
let rings=[],parts=[],dust=[],combo=0,comboT=0,hint="",hintA=0,shake=0,flash=0,pulse=0,ended=0;
let cx=0,cy=0,targetR=0,spawnAcc=0,spawnGap=1.05,speedBase=78,judged=0,perfects=0,goods=0,misses=0;
bsEl.textContent=best;

function resize(){dpr=Math.min(devicePixelRatio||1,2);const r=cv.parentElement.getBoundingClientRect();W=r.width;H=r.height;cv.width=W*dpr;cv.height=H*dpr;cv.style.width=W+"px";cv.style.height=H+"px";x.setTransform(dpr,0,0,dpr,0,0);layout()}
function layout(){cx=W*.5;cy=H*.52;targetR=Math.min(W,H)*.168}
addEventListener("resize",resize);resize();

function rnd(a,b){return a+Math.random()*(b-a)}
function burst(px,py,c,n,spread){for(let i=0;i<n;i++)parts.push({x:px,y:py,vx:rnd(-spread,spread),vy:rnd(-spread*.9,-.4),life:1,c,r:rnd(1.4,3.6),g:rnd(10,22)})}
function ringBurst(r,c,n){for(let i=0;i<n;i++){const a=rnd(0,Math.PI*2),rr=r+rnd(-4,4);parts.push({x:cx+Math.cos(a)*rr,y:cy+Math.sin(a)*rr,vx:Math.cos(a)*rnd(.6,3.2),vy:Math.sin(a)*rnd(.6,3.2),life:1,c,r:rnd(1.2,3.2),g:rnd(8,18)})}}
function initDust(){dust=[];for(let i=0;i<42;i++)dust.push({x:rnd(0,W),y:rnd(0,H),r:rnd(.6,1.8),a:rnd(.08,.28),s:rnd(4,14),ph:rnd(0,6.28)})}

function mkRing(kind){
  const outer=Math.min(W,H)*.48+rnd(8,36);
  const speed=speedBase*(kind==="void"?rnd(.92,1.18):rnd(.88,1.22))*(1+Math.min(1.4,(DUR-tLeft)/DUR)*.55);
  return{r:outer,kind,speed,alive:1,w:kind==="void"?rnd(7,11):rnd(8,12),glow:kind==="void"?0:rnd(.55,.95),spin:rnd(-.4,.4),phase:rnd(0,6.28)};
}
function spawnRing(){
  // ~22% void rings — penalty if tapped; cream rings reward on align
  const kind=Math.random()<.22?"void":"cream";
  rings.push(mkRing(kind));
  // occasional double-wave for rhythm density late-game
  if(tLeft<35&&Math.random()<.28){
    const late=mkRing(Math.random()<.18?"void":"cream");
    late.r+=rnd(28,52);
    late.speed*=rnd(.85,1.05);
    rings.push(late);
  }
}
function nearestActive(){
  let best=null,bd=1e9;
  for(const r of rings){if(!r.alive)continue;const d=Math.abs(r.r-targetR);if(d<bd){bd=d;best=r}}
  return best?{ring:best,dist:bd}:null;
}
function judgeTap(){
  if(!run||ended)return;
  const hit=nearestActive();
  if(!hit){miss("빈 탭");return}
  const {ring,dist}=hit;
  const perfectBand=targetR*.055+4;
  const goodBand=targetR*.12+9;
  if(ring.kind==="void"){
    // tapping a dark void near the zone (or any void as nearest) = penalty
    ring.alive=0;
    combo=0;comboT=0;
    score=Math.max(0,score-60);
    scEl.textContent=score;
    misses++;
    shake=8;flash=-.55;
    hint="보이드!";hintA=1.2;
    ringBurst(ring.r,"rgba(90,70,110,.85)",18);
    burst(cx,cy,"#5a4870",10,3);
    return;
  }
  if(dist<=perfectBand){
    ring.alive=0;
    const mult=1+Math.floor(combo*.4);
    const pts=120*mult;
    score+=pts;combo++;comboT=1.6;perfects++;
    scEl.textContent=score;
    shake=3;flash=.7;
    hint=combo>1?("퍼펙트 ×"+mult):"퍼펙트!";hintA=1.1;
    ringBurst(targetR,GOLD,28);
    burst(cx,cy,CREAM,16,4.2);
    pulse=1;
  }else if(dist<=goodBand){
    ring.alive=0;
    const mult=1+Math.floor(combo*.25);
    const pts=70*mult;
    score+=pts;combo++;comboT=1.25;goods++;
    scEl.textContent=score;
    shake=2;flash=.4;
    hint=combo>1?("굿 ×"+mult):"굿!";hintA=1;
    ringBurst(targetR,TEAL,18);
    burst(cx,cy,CREAM,10,3);
    pulse=.7;
  }else{
    miss("타이밍 미스");
  }
}
function miss(msg){
  combo=0;comboT=0;misses++;
  score=Math.max(0,score-25);
  scEl.textContent=score;
  shake=5;flash=-.35;
  hint=msg;hintA=1;
  // expire nearest cream ring if far miss on it
  const hit=nearestActive();
  if(hit&&hit.ring.kind==="cream"&&hit.dist<targetR*.35){hit.ring.alive=0;ringBurst(hit.ring.r,"rgba(200,160,120,.5)",10)}
}

cv.addEventListener("pointerdown",e=>{
  e.preventDefault();
  if(!run||ended)return;
  try{cv.setPointerCapture(e.pointerId)}catch(_){}
  judgeTap();
});

function bg(t){
  const g=x.createRadialGradient(cx,cy-H*.08,8,cx,cy,Math.max(W,H)*.72);
  g.addColorStop(0,"#1c1a22");g.addColorStop(.45,"#12111a");g.addColorStop(1,"#0a090e");
  x.fillStyle=g;x.fillRect(0,0,W,H);
  // soft vignette rings silhouette
  for(let i=0;i<5;i++){
    const rr=targetR*(1.35+i*.42)+Math.sin(t*.0007+i)*.8;
    x.beginPath();x.arc(cx,cy,rr,0,7);
    x.strokeStyle=`rgba(239,230,212,${.025+i*.008})`;x.lineWidth=1;x.stroke();
  }
  for(const d of dust){
    const yy=(d.y+Math.sin(t*.001*d.s+d.ph)*6)%H;
    x.globalAlpha=d.a*(.6+.4*Math.sin(t*.002+d.ph));
    x.fillStyle=CREAM;x.beginPath();x.arc(d.x,yy,d.r,0,7);x.fill();
  }
  x.globalAlpha=1;
}
function drawTarget(t){
  const breathe=1+Math.sin(t*.004)*.018+pulse*.06;
  const R=targetR*breathe;
  // outer soft glow plate
  const glow=x.createRadialGradient(cx,cy,R*.55,cx,cy,R*1.55);
  glow.addColorStop(0,"rgba(232,200,122,.18)");glow.addColorStop(.55,"rgba(125,222,192,.06)");glow.addColorStop(1,"rgba(0,0,0,0)");
  x.fillStyle=glow;x.beginPath();x.arc(cx,cy,R*1.55,0,7);x.fill();
  // cream target ring with highlight
  x.save();
  x.shadowColor="rgba(232,200,122,.55)";x.shadowBlur=18;
  x.beginPath();x.arc(cx,cy,R,0,7);
  x.strokeStyle=CREAM;x.lineWidth=5.5;x.stroke();
  x.shadowBlur=0;
  x.beginPath();x.arc(cx,cy,R,0,7);
  x.strokeStyle="rgba(255,248,230,.55)";x.lineWidth=1.6;x.stroke();
  // inner dark plate
  const plate=x.createRadialGradient(cx-R*.2,cy-R*.25,2,cx,cy,R*.92);
  plate.addColorStop(0,"rgba(40,36,48,.55)");plate.addColorStop(1,"rgba(12,10,16,.35)");
  x.fillStyle=plate;x.beginPath();x.arc(cx,cy,R*.82,0,7);x.fill();
  // center gem silhouette
  const gem=R*.22*(1+pulse*.15);
  const gg=x.createLinearGradient(cx-gem,cy-gem,cx+gem,cy+gem);
  gg.addColorStop(0,"#fff6e0");gg.addColorStop(.45,GOLD);gg.addColorStop(1,"#8a6020");
  x.fillStyle=gg;
  x.beginPath();
  x.moveTo(cx,cy-gem);x.lineTo(cx+gem*.85,cy);x.lineTo(cx,cy+gem);x.lineTo(cx-gem*.85,cy);
  x.closePath();x.fill();
  x.fillStyle="rgba(255,255,255,.35)";x.beginPath();x.arc(cx-gem*.25,cy-gem*.3,gem*.22,0,7);x.fill();
  x.restore();
}
function drawRing(r,t){
  if(!r.alive)return;
  const a=Math.max(0,Math.min(1,1-(Math.abs(r.r-targetR)/(Math.min(W,H)*.5))));
  x.save();
  if(r.kind==="void"){
    x.shadowColor="rgba(80,50,110,.45)";x.shadowBlur=10;
    x.beginPath();x.arc(cx,cy,r.r,0,7);
    x.strokeStyle=`rgba(55,42,70,${.55+.25*a})`;x.lineWidth=r.w;x.stroke();
    // jagged void ticks
    for(let i=0;i<10;i++){
      const ang=r.phase+i*(Math.PI*2/10)+t*.001*r.spin;
      const x0=cx+Math.cos(ang)*(r.r-r.w*.6),y0=cy+Math.sin(ang)*(r.r-r.w*.6);
      const x1=cx+Math.cos(ang)*(r.r+r.w*.7),y1=cy+Math.sin(ang)*(r.r+r.w*.7);
      x.strokeStyle=`rgba(120,90,150,${.35+.3*a})`;x.lineWidth=2;
      x.beginPath();x.moveTo(x0,y0);x.lineTo(x1,y1);x.stroke();
    }
  }else{
    x.shadowColor=`rgba(232,200,122,${.35*r.glow})`;x.shadowBlur=14+10*a;
    const grad=x.createLinearGradient(cx-r.r,cy,cx+r.r,cy);
    grad.addColorStop(0,"#fff8ec");grad.addColorStop(.5,CREAM);grad.addColorStop(1,"#d4c4a0");
    x.beginPath();x.arc(cx,cy,r.r,0,7);
    x.strokeStyle=grad;x.lineWidth=r.w*(.85+.2*a);x.globalAlpha=.55+.45*a;x.stroke();
    x.globalAlpha=1;x.shadowBlur=0;
    // highlight arc
    x.beginPath();x.arc(cx,cy,r.r,-.9+r.phase*.1,.4+r.phase*.1);
    x.strokeStyle="rgba(255,255,255,.55)";x.lineWidth=2;x.stroke();
    // soft inner trail
    x.beginPath();x.arc(cx,cy,r.r-r.w*.55,0,7);
    x.strokeStyle=`rgba(125,222,192,${.12+.2*a})`;x.lineWidth=2;x.stroke();
  }
  x.restore();
}

function update(dt,t){
  if(!run)return;
  tLeft-=dt;if(tLeft<=0){tLeft=0;tmEl.textContent=0;end("time");return}
  tmEl.textContent=Math.ceil(tLeft);
  spawnAcc+=dt;
  // accelerate spawn as time drops
  spawnGap=Math.max(.55,1.15-(DUR-tLeft)/DUR*.55);
  while(spawnAcc>=spawnGap){spawnAcc-=spawnGap;spawnRing()}
  speedBase=78+Math.min(55,(DUR-tLeft)*1.1);
  for(const r of rings){
    if(!r.alive)continue;
    r.r-=r.speed*dt;
    r.phase+=r.spin*dt;
    // missed cream that shrinks past target without tap
    if(r.r<targetR*.42){
      r.alive=0;
      if(r.kind==="cream"){
        combo=0;comboT=0;misses++;
        score=Math.max(0,score-15);scEl.textContent=score;
        hint="놓침";hintA=.9;flash=-.2;
        ringBurst(r.r,"rgba(180,150,120,.4)",8);
      }
    }
  }
  rings=rings.filter(r=>r.alive||r.r>0);
  if(comboT>0){comboT-=dt;if(comboT<=0){combo=Math.max(0,combo-1);comboT=combo>0?.4:0}}
  if(hintA>0)hintA-=dt*1.4;
  if(shake>0)shake=Math.max(0,shake-dt*28);
  if(flash!==0)flash+=(flash>0?-1:1)*dt*2.2,flash=Math.abs(flash)<.02?0:flash;
  if(pulse>0)pulse=Math.max(0,pulse-dt*2.8);
  for(const p of parts){p.x+=p.vx;p.y+=p.vy;p.vy+=p.g*dt*.08;p.life-=dt*1.35;p.r*=.992}
  parts=parts.filter(p=>p.life>0);
}

function loop(now){
  if(!last)last=now;const dt=Math.min(.033,(now-last)/1000);last=now;
  update(dt,now);
  x.save();
  if(shake>.3)x.translate(rnd(-shake,shake),rnd(-shake,shake));
  bg(now);
  // playfield soft plate
  const plateR=Math.min(W,H)*.46;
  const plate=x.createRadialGradient(cx,cy,plateR*.2,cx,cy,plateR);
  plate.addColorStop(0,"rgba(28,26,34,.5)");plate.addColorStop(1,"rgba(10,9,14,.15)");
  x.fillStyle=plate;x.beginPath();x.arc(cx,cy,plateR,0,7);x.fill();
  x.strokeStyle="rgba(239,230,212,.07)";x.lineWidth=1;x.beginPath();x.arc(cx,cy,plateR,0,7);x.stroke();

  // draw rings back-to-front (larger first)
  const sorted=rings.slice().sort((a,b)=>b.r-a.r);
  for(const r of sorted)drawRing(r,now);
  drawTarget(now);
  for(const p of parts){x.globalAlpha=Math.max(0,p.life);x.fillStyle=p.c;x.beginPath();x.arc(p.x,p.y,p.r,0,7);x.fill()}
  x.globalAlpha=1;
  if(flash){x.fillStyle=flash>0?`rgba(232,200,122,${Math.abs(flash)*.22})`:`rgba(90,40,80,${Math.abs(flash)*.28})`;x.fillRect(0,0,W,H)}
  if(hintA>.02){x.globalAlpha=Math.min(1,hintA);x.fillStyle=CREAM;x.font="700 18px system-ui,sans-serif";x.textAlign="center";x.fillText(hint,W/2,cy-targetR-36);x.globalAlpha=1}
  if(combo>1){x.fillStyle="rgba(232,200,122,.92)";x.font="700 13px system-ui,sans-serif";x.textAlign="left";x.fillText("콤보 "+combo,16,H-16)}
  x.fillStyle="rgba(239,230,212,.45)";x.font="600 11px system-ui,sans-serif";x.textAlign="right";
  x.fillText("P "+perfects+" · G "+goods,W-16,H-16);
  x.restore();
  if(run||parts.length)requestAnimationFrame(loop);
}

function start(){
  run=1;ended=0;score=0;combo=0;comboT=0;tLeft=DUR;rings=[];parts=[];hint="";hintA=0;shake=0;flash=0;pulse=0;
  spawnAcc=0;spawnGap=1.05;speedBase=78;perfects=0;goods=0;misses=0;judged=0;
  scEl.textContent=0;tmEl.textContent=DUR;stO.hidden=1;rsO.hidden=1;nh&&(nh.hidden=1);
  layout();initDust();
  // lead-in rings
  spawnRing();
  const warm=mkRing("cream");warm.r=targetR+rnd(70,110);rings.push(warm);
  last=performance.now();requestAnimationFrame(loop);
}
function end(why){
  if(ended)return;ended=1;run=0;
  let neu=0;
  if(score>best){best=score;localStorage.setItem(BK,best);bsEl.textContent=best;neu=1}
  fn.textContent=score;nh&&(nh.hidden=!neu);rsO.hidden=0;
  try{fetch("/api/scores",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({gameId:G,score})})}catch(e){}
  try{window.MaeilGuest&&window.MaeilGuest.postScore&&window.MaeilGuest.postScore(G,score)}catch(e){}
}
play.onclick=start;again.onclick=start;
fav&&(fav.onclick=()=>{try{const k="maeil-favs",a=JSON.parse(localStorage.getItem(k)||"[]");a.includes(G)||a.push(G);localStorage.setItem(k,JSON.stringify(a));fav.textContent="★"}catch(e){}});
})();
