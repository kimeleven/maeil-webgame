(()=>{const G="013-nova-tap",BK="maeil-best-013",DUR=60;
const CREAM="#efe6d4",GOLD="#e8c87a",TEAL="#7ddec0",INK="#141311",VOID_CORE="#1a1228",VOID_EDGE="#5a3a78";
const cv=document.getElementById("game"),x=cv.getContext("2d");
const scEl=document.getElementById("score"),tmEl=document.getElementById("time"),bsEl=document.getElementById("best");
const stO=document.getElementById("start"),rsO=document.getElementById("results"),fn=document.getElementById("final-score");
const play=document.getElementById("btn-play"),again=document.getElementById("btn-again"),fav=document.getElementById("btn-fav"),nh=document.getElementById("new-high");
let W,H,dpr,run=0,score=0,best=+localStorage.getItem(BK)||0,tLeft=DUR,last=0;
let novas=[],parts=[],dust=[],sparks=[],combo=0,comboT=0,hint="",hintA=0,shake=0,flash=0,ended=0;
let spawnAcc=0,spawnGap=.95,hits=0,voidHits=0,misses=0,maxCombo=0;
bsEl.textContent=best;

function resize(){dpr=Math.min(devicePixelRatio||1,2);const r=cv.parentElement.getBoundingClientRect();W=r.width;H=r.height;cv.width=W*dpr;cv.height=H*dpr;cv.style.width=W+"px";cv.style.height=H+"px";x.setTransform(dpr,0,0,dpr,0,0)}
addEventListener("resize",resize);resize();

function rnd(a,b){return a+Math.random()*(b-a)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}

function burst(px,py,c,n,spread){
  for(let i=0;i<n;i++)parts.push({x:px,y:py,vx:rnd(-spread,spread),vy:rnd(-spread*.95,-.2),life:1,c,r:rnd(1.2,3.8),g:rnd(8,20)});
}
function novaSparks(n){
  for(let i=0;i<10;i++){
    const a=rnd(0,Math.PI*2),sp=rnd(40,110);
    sparks.push({x:n.x,y:n.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:1,c:n.kind==="void"?VOID_EDGE:GOLD,r:rnd(1,2.4)});
  }
}
function initDust(){
  dust=[];
  for(let i=0;i<48;i++)dust.push({x:rnd(0,W),y:rnd(0,H),r:rnd(.5,1.7),a:rnd(.06,.22),s:rnd(3,12),ph:rnd(0,6.28)});
}

function mkNova(kind){
  const pad=Math.min(W,H)*.14;
  const life=kind==="void"?rnd(.95,1.35):rnd(1.05,1.65);
  // late game: shorter life windows
  const lifeScale=1-Math.min(.35,(DUR-tLeft)/DUR*.4);
  return{
    x:rnd(pad,W-pad),y:rnd(pad*1.35,H-pad*.9),
    kind,alive:1,age:0,life:life*lifeScale,
    rMax:kind==="void"?rnd(28,42):rnd(32,52),
    spin:rnd(-1.2,1.2),phase:rnd(0,6.28),
    bloom:0,glow:kind==="void"?rnd(.4,.7):rnd(.7,1)
  };
}
function spawnNova(){
  // ~20% void novas — do NOT tap
  const kind=Math.random()<.2?"void":"cream";
  novas.push(mkNova(kind));
  if(tLeft<28&&Math.random()<.32){
    const extra=mkNova(Math.random()<.25?"void":"cream");
    // keep distance from last
    const lastN=novas[novas.length-2];
    if(lastN){
      let tries=0;
      while(tries++<6){
        const dx=extra.x-lastN.x,dy=extra.y-lastN.y;
        if(dx*dx+dy*dy>Math.pow(Math.min(W,H)*.22,2))break;
        const pad=Math.min(W,H)*.14;
        extra.x=rnd(pad,W-pad);extra.y=rnd(pad*1.35,H-pad*.9);
      }
    }
    novas.push(extra);
  }
}

function hitTest(px,py){
  // prefer closest alive nova whose core contains point
  let best=null,bd=1e9;
  for(const n of novas){
    if(!n.alive)continue;
    const progress=n.age/n.life;
    const r=n.rMax*(.35+.65*Math.sin(Math.min(1,progress)*Math.PI)); // bloom then fade
    const dx=px-n.x,dy=py-n.y,d=Math.hypot(dx,dy);
    // generous core hit: 72% of visual radius
    if(d<=r*.78&&d<bd){bd=d;best=n}
  }
  return best;
}

function judgeTap(px,py){
  if(!run||ended)return;
  const n=hitTest(px,py);
  if(!n){
    // empty tap near end of round is mild miss
    combo=0;comboT=0;misses++;
    score=Math.max(0,score-8);scEl.textContent=score;
    hint="빗나감";hintA=.85;shake=3;flash=-.2;
    burst(px,py,"rgba(200,180,140,.5)",6,2.2);
    return;
  }
  n.alive=0;
  novaSparks(n);
  if(n.kind==="void"){
    combo=0;comboT=0;voidHits++;
    score=Math.max(0,score-70);scEl.textContent=score;
    shake=9;flash=-.6;
    hint="보이드!";hintA=1.25;
    burst(n.x,n.y,"#6a4a88",22,4.5);
    burst(n.x,n.y,"#2a1838",12,2.8);
    return;
  }
  // cream hit — score scales with how bright (near peak bloom)
  const progress=n.age/n.life;
  const peak=1-Math.abs(progress-.48)*2; // 1 at mid bloom
  const quality=clamp(peak,.2,1);
  combo++;comboT=1.55;if(combo>maxCombo)maxCombo=combo;
  const mult=1+Math.floor((combo-1)*.35);
  const pts=Math.round((55+Math.round(quality*65))*mult);
  score+=pts;hits++;scEl.textContent=score;
  shake=2+quality*3;flash=.35+.4*quality;
  if(quality>.72){hint=combo>1?("노바! ×"+mult):"노바!";}
  else if(quality>.4){hint=combo>1?("굿 ×"+mult):"굿!";}
  else{hint=combo>1?("탭 ×"+mult):"탭!";}
  hintA=1.1;
  burst(n.x,n.y,GOLD,18+Math.floor(quality*14),3.8+quality);
  burst(n.x,n.y,CREAM,12,2.6);
  burst(n.x,n.y,TEAL,8,2);
}

cv.addEventListener("pointerdown",e=>{
  e.preventDefault();
  if(!run||ended)return;
  try{cv.setPointerCapture(e.pointerId)}catch(_){}
  const r=cv.getBoundingClientRect();
  const px=(e.clientX-r.left)*(W/r.width);
  const py=(e.clientY-r.top)*(H/r.height);
  judgeTap(px,py);
});

function bg(t){
  const g=x.createRadialGradient(W*.5,H*.42,12,W*.5,H*.5,Math.max(W,H)*.78);
  g.addColorStop(0,"#1a1820");g.addColorStop(.5,"#12110f");g.addColorStop(1,"#0a0908");
  x.fillStyle=g;x.fillRect(0,0,W,H);
  // soft constellation silhouette arcs
  for(let i=0;i<4;i++){
    const cx=W*(.25+i*.18),cy=H*(.28+((i%2)*.12)),rr=Math.min(W,H)*(.18+i*.04);
    x.beginPath();x.arc(cx,cy,rr+Math.sin(t*.0006+i)*3,0,7);
    x.strokeStyle=`rgba(239,230,212,${.02+i*.006})`;x.lineWidth=1;x.stroke();
  }
  for(const d of dust){
    const yy=(d.y+Math.sin(t*.001*d.s+d.ph)*5+H)%H;
    x.globalAlpha=d.a*(.55+.45*Math.sin(t*.002+d.ph));
    x.fillStyle=CREAM;x.beginPath();x.arc(d.x,yy,d.r,0,7);x.fill();
  }
  x.globalAlpha=1;
}

function drawNova(n,t){
  if(!n.alive)return;
  const progress=clamp(n.age/n.life,0,1);
  // bloom envelope: grow then shrink (fade)
  const env=Math.sin(progress*Math.PI);
  const r=n.rMax*(.28+.72*env);
  if(r<2)return;
  const alpha=env;
  x.save();
  if(n.kind==="void"){
    // dark ink/purple void nova — hollow silhouette with jagged rim
    const rg=x.createRadialGradient(n.x-r*.2,n.y-r*.25,1,n.x,n.y,r*1.35);
    rg.addColorStop(0,"rgba(70,40,100,"+(0.55*alpha)+")");
    rg.addColorStop(.45,"rgba(28,18,42,"+(0.75*alpha)+")");
    rg.addColorStop(1,"rgba(10,8,16,0)");
    x.fillStyle=rg;x.beginPath();x.arc(n.x,n.y,r*1.35,0,7);x.fill();
    // core void plate
    const core=x.createRadialGradient(n.x,n.y,0,n.x,n.y,r*.7);
    core.addColorStop(0,"#0c0a10");core.addColorStop(.7,"#1a1228");core.addColorStop(1,"rgba(40,28,60,"+(0.6*alpha)+")");
    x.fillStyle=core;x.beginPath();x.arc(n.x,n.y,r*.72,0,7);x.fill();
    // jagged rim ticks
    x.strokeStyle=`rgba(120,80,160,${.45*alpha})`;x.lineWidth=2;
    for(let i=0;i<12;i++){
      const ang=n.phase+i*(Math.PI*2/12)+t*.001*n.spin;
      x.beginPath();
      x.moveTo(n.x+Math.cos(ang)*r*.55,n.y+Math.sin(ang)*r*.55);
      x.lineTo(n.x+Math.cos(ang)*r*1.05,n.y+Math.sin(ang)*r*1.05);
      x.stroke();
    }
    x.beginPath();x.arc(n.x,n.y,r*.95,0,7);
    x.strokeStyle=`rgba(90,60,120,${.55*alpha})`;x.lineWidth=2.5;x.stroke();
  }else{
    // cream nova: radial bloom + bright core + spark highlights
    x.shadowColor=`rgba(232,200,122,${.45*n.glow*alpha})`;x.shadowBlur=18+14*env;
    const aura=x.createRadialGradient(n.x,n.y,r*.1,n.x,n.y,r*1.55);
    aura.addColorStop(0,`rgba(255,248,220,${.55*alpha})`);
    aura.addColorStop(.35,`rgba(232,200,122,${.35*alpha})`);
    aura.addColorStop(.7,`rgba(125,222,192,${.12*alpha})`);
    aura.addColorStop(1,"rgba(0,0,0,0)");
    x.fillStyle=aura;x.beginPath();x.arc(n.x,n.y,r*1.55,0,7);x.fill();
    x.shadowBlur=0;
    // body gradient
    const body=x.createRadialGradient(n.x-r*.28,n.y-r*.32,1,n.x,n.y,r);
    body.addColorStop(0,"#fffaf0");
    body.addColorStop(.35,CREAM);
    body.addColorStop(.75,GOLD);
    body.addColorStop(1,"#8a6028");
    x.globalAlpha=.55+.45*alpha;
    x.fillStyle=body;x.beginPath();x.arc(n.x,n.y,r,0,7);x.fill();
    x.globalAlpha=1;
    // bright core
    const coreR=r*(.22+.12*env);
    const core=x.createRadialGradient(n.x-coreR*.3,n.y-coreR*.35,0,n.x,n.y,coreR);
    core.addColorStop(0,"#ffffff");core.addColorStop(.5,"#fff0c8");core.addColorStop(1,"rgba(232,200,122,.3)");
    x.fillStyle=core;x.beginPath();x.arc(n.x,n.y,coreR,0,7);x.fill();
    // highlight crescent
    x.fillStyle=`rgba(255,255,255,${.35*alpha})`;
    x.beginPath();x.ellipse(n.x-r*.22,n.y-r*.28,r*.28,r*.16,-.5,0,7);x.fill();
    // orbiting spark dots (silhouette detail)
    for(let i=0;i<5;i++){
      const ang=n.phase+i*1.256+t*.0025*n.spin;
      const rr=r*(.75+i*.04);
      const sx=n.x+Math.cos(ang)*rr,sy=n.y+Math.sin(ang)*rr;
      x.fillStyle=`rgba(255,240,200,${(.4+.4*alpha)*(i%2?.7:1)})`;
      x.beginPath();x.arc(sx,sy,1.4+env*.8,0,7);x.fill();
    }
  }
  x.restore();
}

function update(dt,t){
  if(!run)return;
  tLeft-=dt;if(tLeft<=0){tLeft=0;tmEl.textContent=0;end("time");return}
  tmEl.textContent=Math.ceil(tLeft);
  spawnAcc+=dt;
  spawnGap=Math.max(.42,.98-(DUR-tLeft)/DUR*.5);
  while(spawnAcc>=spawnGap){spawnAcc-=spawnGap;spawnNova()}
  for(const n of novas){
    if(!n.alive)continue;
    n.age+=dt;n.phase+=n.spin*dt;
    if(n.age>=n.life){
      n.alive=0;
      if(n.kind==="cream"){
        combo=0;comboT=0;misses++;
        score=Math.max(0,score-12);scEl.textContent=score;
        hint="놓침";hintA=.85;flash=-.18;
        burst(n.x,n.y,"rgba(180,150,110,.45)",10,2.5);
      }
    }
  }
  novas=novas.filter(n=>n.alive);
  if(comboT>0){comboT-=dt;if(comboT<=0){combo=Math.max(0,combo-1);comboT=combo>0?.35:0}}
  if(hintA>0)hintA-=dt*1.35;
  if(shake>0)shake=Math.max(0,shake-dt*30);
  if(flash!==0){flash+=(flash>0?-1:1)*dt*2.4;if(Math.abs(flash)<.02)flash=0}
  for(const p of parts){p.x+=p.vx;p.y+=p.vy;p.vy+=p.g*dt*.08;p.life-=dt*1.4;p.r*=.99}
  parts=parts.filter(p=>p.life>0);
  for(const s of sparks){s.x+=s.vx*dt;s.y+=s.vy*dt;s.vx*=.96;s.vy*=.96;s.life-=dt*1.8}
  sparks=sparks.filter(s=>s.life>0);
}

function loop(now){
  if(!last)last=now;const dt=Math.min(.033,(now-last)/1000);last=now;
  update(dt,now);
  x.save();
  if(shake>.3)x.translate(rnd(-shake,shake),rnd(-shake,shake));
  bg(now);
  for(const n of novas)drawNova(n,now);
  for(const p of parts){x.globalAlpha=Math.max(0,p.life);x.fillStyle=p.c;x.beginPath();x.arc(p.x,p.y,p.r,0,7);x.fill()}
  for(const s of sparks){x.globalAlpha=Math.max(0,s.life);x.fillStyle=s.c;x.beginPath();x.arc(s.x,s.y,s.r,0,7);x.fill()}
  x.globalAlpha=1;
  if(flash){x.fillStyle=flash>0?`rgba(232,200,122,${Math.abs(flash)*.2})`:`rgba(70,30,90,${Math.abs(flash)*.3})`;x.fillRect(0,0,W,H)}
  if(hintA>.02){x.globalAlpha=Math.min(1,hintA);x.fillStyle=CREAM;x.font="700 18px system-ui,sans-serif";x.textAlign="center";x.fillText(hint,W/2,H*.14);x.globalAlpha=1}
  if(combo>1){x.fillStyle="rgba(232,200,122,.92)";x.font="700 13px system-ui,sans-serif";x.textAlign="left";x.fillText("콤보 "+combo,16,H-16)}
  x.fillStyle="rgba(239,230,212,.45)";x.font="600 11px system-ui,sans-serif";x.textAlign="right";
  x.fillText("HIT "+hits+" · VOID "+voidHits,W-16,H-16);
  x.restore();
  if(run||parts.length||sparks.length)requestAnimationFrame(loop);
}

function start(){
  run=1;ended=0;score=0;combo=0;comboT=0;tLeft=DUR;novas=[];parts=[];sparks=[];hint="";hintA=0;shake=0;flash=0;
  spawnAcc=0;spawnGap=.95;hits=0;voidHits=0;misses=0;maxCombo=0;
  scEl.textContent=0;tmEl.textContent=DUR;stO.hidden=1;rsO.hidden=1;nh&&(nh.hidden=1);
  initDust();
  spawnNova();
  const warm=mkNova("cream");warm.x=W*.5;warm.y=H*.48;novas.push(warm);
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
