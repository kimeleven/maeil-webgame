(()=>{const G="009-ripple-pop",BK="maeil-best-"+G,DUR=60;
const cv=document.getElementById("game"),x=cv.getContext("2d");
const scEl=document.getElementById("score"),tmEl=document.getElementById("time"),bsEl=document.getElementById("best");
const stO=document.getElementById("start"),rsO=document.getElementById("results"),fn=document.getElementById("final-score");
const play=document.getElementById("btn-play"),again=document.getElementById("btn-again"),fav=document.getElementById("btn-fav"),nh=document.getElementById("new-high");
let W,H,dpr,run=0,score=0,best=+localStorage.getItem(BK)||0,tLeft=DUR,last=0;
let ripples=[],bubbles=[],voids=[],parts=[],combo=0,spawnT=0,voidSpawn=0,shake=0,hint="",hintA=0,diff=1,pulse=0;
bsEl.textContent=best;

function resize(){dpr=Math.min(devicePixelRatio||1,2);const r=cv.parentElement.getBoundingClientRect();W=r.width;H=r.height;cv.width=W*dpr;cv.height=H*dpr;cv.style.width=W+"px";cv.style.height=H+"px";x.setTransform(dpr,0,0,dpr,0,0)}
addEventListener("resize",resize);resize();
function rnd(a,b){return a+Math.random()*(b-a)}
function burst(px,py,c,n){for(let i=0;i<n;i++)parts.push({x:px,y:py,vx:rnd(-3.6,3.6),vy:rnd(-5.2,-.6),life:1,c,r:rnd(1.5,3.6),g:rnd(8,18)})}

function spawnBubble(){
  const r=rnd(14,26)*(.9+diff*.05);
  bubbles.push({x:rnd(r+8,W-r-8),y:rnd(H*.22,H*.88),r,vx:rnd(-28,28)*diff,vy:rnd(-22,22)*diff,wob:rnd(0,6.28),alive:1});
}
function spawnVoid(){
  const r=rnd(16,28)*(.95+diff*.04);
  voids.push({x:rnd(r+10,W-r-10),y:rnd(H*.25,H*.86),r,vx:rnd(-20,20)*diff,vy:rnd(-16,16)*diff,wob:rnd(0,6.28),alive:1});
}

cv.addEventListener("pointerdown",e=>{
  if(!run)return;
  const r=cv.getBoundingClientRect();
  const mx=(e.clientX-r.left)*(W/r.width),my=(e.clientY-r.top)*(H/r.height);
  ripples.push({x:mx,y:my,rad:6,max:Math.min(W,H)*.42,life:1,w:3.2});
  burst(mx,my,"#7ddec0",6);
});

function hitRing(b,rp){
  const dx=b.x-rp.x,dy=b.y-rp.y,d=Math.hypot(dx,dy);
  return Math.abs(d-rp.rad)<b.r+rp.w*1.6;
}

function bg(t){
  const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,"#1a1c1a");g.addColorStop(.5,"#121412");g.addColorStop(1,"#0a0c0a");
  x.fillStyle=g;x.fillRect(0,0,W,H);
  for(let i=0;i<36;i++){
    const px=(i*89+31+Math.sin(t*.3+i)*12)%W,py=(i*53+19+Math.cos(t*.25+i)*.8*8)%H;
    x.globalAlpha=.045+(i%4)*.015;x.fillStyle="#efe6d4";x.beginPath();x.arc(px,py,1+(i%3)*.35,0,7);x.fill();
  }
  x.globalAlpha=1;
  const rg=x.createRadialGradient(W/2,H*.45,10,W/2,H*.45,Math.min(W,H)*.62);
  rg.addColorStop(0,"rgba(125,222,192,.08)");rg.addColorStop(.55,"rgba(232,200,122,.03)");rg.addColorStop(1,"rgba(0,0,0,0)");
  x.fillStyle=rg;x.fillRect(0,0,W,H);
}

function drawBubble(b,t){
  const wob=Math.sin(t*2.4+b.wob)*.06;
  const R=b.r*(1+wob);
  x.save();x.translate(b.x,b.y);
  x.fillStyle="rgba(0,0,0,.35)";x.beginPath();x.ellipse(0,R*.7,R*.9,R*.28,0,0,7);x.fill();
  const g=x.createRadialGradient(-R*.35,-R*.4,1,0,0,R);
  g.addColorStop(0,"#fff8e8");g.addColorStop(.35,"#efe6d4");g.addColorStop(.75,"#c9bda6");g.addColorStop(1,"#8a7e68");
  x.fillStyle=g;x.beginPath();x.arc(0,0,R,0,7);x.fill();
  x.strokeStyle="rgba(239,230,212,.45)";x.lineWidth=1.4;x.stroke();
  x.fillStyle="rgba(255,255,255,.4)";x.beginPath();x.ellipse(-R*.32,-R*.35,R*.28,R*.16,-.5,0,7);x.fill();
  // soft crest silhouette
  x.strokeStyle="rgba(232,200,122,.22)";x.lineWidth=1.2;x.beginPath();
  x.arc(0,0,R*1.12, -.4, 1.1);x.stroke();
  x.restore();
}

function drawVoid(v,t){
  const wob=Math.sin(t*1.8+v.wob)*.05;
  const R=v.r*(1+wob);
  x.save();x.translate(v.x,v.y);
  x.fillStyle="rgba(0,0,0,.45)";x.beginPath();x.ellipse(0,R*.75,R*1.05,R*.32,0,0,7);x.fill();
  const og=x.createRadialGradient(0,0,R*.15,0,0,R*1.55);
  og.addColorStop(0,"rgba(90,40,70,.35)");og.addColorStop(.5,"rgba(60,20,40,.15)");og.addColorStop(1,"rgba(0,0,0,0)");
  x.fillStyle=og;x.beginPath();x.arc(0,0,R*1.55,0,7);x.fill();
  // void body — dark ink petal
  const g=x.createRadialGradient(-R*.2,-R*.25,2,0,0,R);
  g.addColorStop(0,"#3a2a32");g.addColorStop(.4,"#1a1218");g.addColorStop(1,"#0a080a");
  x.fillStyle=g;x.beginPath();
  const R2=R;
  x.moveTo(0,-R2);
  for(let i=0;i<6;i++){
    const a=(-Math.PI/2)+i*(Math.PI/3),a2=a+Math.PI/6;
    x.quadraticCurveTo(Math.cos(a2)*R2*1.15,Math.sin(a2)*R2*1.15,Math.cos(a+Math.PI/3)*R2,Math.sin(a+Math.PI/3)*R2);
  }
  x.closePath();x.fill();
  x.strokeStyle="rgba(180,80,100,.35)";x.lineWidth=1.5;x.stroke();
  x.fillStyle="rgba(239,230,212,.06)";x.beginPath();x.ellipse(-R*.25,-R*.2,R*.2,R*.12,-.4,0,7);x.fill();
  x.restore();
}

function drawRipple(rp){
  const a=Math.max(0,rp.life);
  x.save();
  x.strokeStyle=`rgba(125,222,192,${.55*a})`;x.lineWidth=rp.w*(.6+a*.8);
  x.beginPath();x.arc(rp.x,rp.y,rp.rad,0,7);x.stroke();
  x.strokeStyle=`rgba(239,230,212,${.22*a})`;x.lineWidth=1.2;
  x.beginPath();x.arc(rp.x,rp.y,rp.rad*.72,0,7);x.stroke();
  const rg=x.createRadialGradient(rp.x,rp.y,rp.rad*.4,rp.x,rp.y,rp.rad);
  rg.addColorStop(0,"rgba(125,222,192,0)");rg.addColorStop(.7,`rgba(125,222,192,${.08*a})`);rg.addColorStop(1,"rgba(0,0,0,0)");
  x.fillStyle=rg;x.beginPath();x.arc(rp.x,rp.y,rp.rad,0,7);x.fill();
  x.restore();
}

function loop(now){
  if(!run)return;
  const dt=Math.min(40,now-last)/1e3;last=now;const t=now/1000;
  tLeft-=dt;if(tLeft<=0){tLeft=0;end();return}
  tmEl.textContent=Math.ceil(tLeft);
  diff=1+(DUR-tLeft)/DUR*1.6;
  pulse+=dt;

  spawnT-=dt;voidSpawn-=dt;
  const bubRate=Math.max(.28,1.05-diff*.28);
  const voidRate=Math.max(.9,2.4-diff*.5);
  if(spawnT<=0){spawnBubble();if(diff>1.4&&Math.random()<.35)spawnBubble();spawnT=bubRate}
  if(voidSpawn<=0){spawnVoid();voidSpawn=voidRate}

  // move bubbles
  for(const b of bubbles){
    b.wob+=dt*2;b.x+=b.vx*dt;b.y+=b.vy*dt;
    if(b.x<b.r||b.x>W-b.r)b.vx*=-1;
    if(b.y<H*.18||b.y>H-b.r)b.vy*=-1;
  }
  for(const v of voids){
    v.wob+=dt*1.6;v.x+=v.vx*dt;v.y+=v.vy*dt;
    if(v.x<v.r||v.x>W-v.r)v.vx*=-1;
    if(v.y<H*.2||v.y>H-v.r)v.vy*=-1;
  }

  // expand ripples + collisions
  for(const rp of ripples){
    rp.rad+=180*dt*(.85+diff*.15);
    rp.life=1-rp.rad/rp.max;
    for(const b of bubbles){
      if(!b.alive)continue;
      if(hitRing(b,rp)){
        b.alive=0;combo++;
        const pts=12+combo*3+Math.floor(diff*4);
        score+=pts;scEl.textContent=score;
        burst(b.x,b.y,"#efe6d4",14);burst(b.x,b.y,"#e8c87a",8);burst(b.x,b.y,"#7ddec0",6);
        hint="+"+pts+(combo>1?" ×"+combo:"");hintA=1;
      }
    }
    for(const v of voids){
      if(!v.alive)continue;
      if(hitRing(v,rp)){
        v.alive=0;combo=0;
        score=Math.max(0,score-18);scEl.textContent=score;
        shake=10;burst(v.x,v.y,"#e23b2e",16);burst(v.x,v.y,"#6b2a4a",10);
        hint="보이드!";hintA=1;
      }
    }
  }
  ripples=ripples.filter(rp=>rp.life>0&&rp.rad<rp.max);
  bubbles=bubbles.filter(b=>b.alive);
  voids=voids.filter(v=>v.alive);
  if(hintA>0)hintA=Math.max(0,hintA-dt*.9);
  if(shake>0)shake*=.82;
  parts=parts.filter(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=p.g*dt;p.life-=dt*1.55;return p.life>0});

  x.save();
  if(shake>.35)x.translate(rnd(-shake,shake),rnd(-shake,shake));
  bg(t);
  // ambient soft rings
  x.globalAlpha=.06+.04*Math.sin(pulse*1.4);
  x.strokeStyle="#7ddec0";x.lineWidth=1;
  x.beginPath();x.arc(W*.5,H*.48,40+12*Math.sin(pulse),0,7);x.stroke();
  x.globalAlpha=1;
  for(const b of bubbles)drawBubble(b,t);
  for(const v of voids)drawVoid(v,t);
  for(const rp of ripples)drawRipple(rp);
  for(const p of parts){x.globalAlpha=Math.max(0,p.life);x.fillStyle=p.c;x.beginPath();x.arc(p.x,p.y,p.r,0,7);x.fill()}
  x.globalAlpha=1;
  if(hintA>.02){x.globalAlpha=Math.min(1,hintA);x.fillStyle="#efe6d4";x.font="700 16px system-ui,sans-serif";x.textAlign="center";x.fillText(hint,W/2,H*.16);x.globalAlpha=1}
  // combo pip
  if(combo>1){x.fillStyle="rgba(232,200,122,.9)";x.font="700 13px system-ui,sans-serif";x.textAlign="left";x.fillText("콤보 "+combo,16,H-18)}
  x.restore();
  requestAnimationFrame(loop);
}

function start(){
  run=1;score=0;combo=0;tLeft=DUR;diff=1;ripples=[];bubbles=[];voids=[];parts=[];spawnT=.2;voidSpawn=1.6;shake=0;hint="";hintA=0;
  scEl.textContent=0;tmEl.textContent=DUR;stO.hidden=1;rsO.hidden=1;nh&&(nh.hidden=1);
  last=performance.now();requestAnimationFrame(loop);
}
function end(){
  run=0;let neu=0;
  if(score>best){best=score;localStorage.setItem(BK,best);bsEl.textContent=best;neu=1}
  fn.textContent=score;nh&&(nh.hidden=!neu);rsO.hidden=0;
  try{fetch("/api/scores",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({gameId:G,score})})}catch(e){}
  try{window.MaeilGuest&&window.MaeilGuest.postScore&&window.MaeilGuest.postScore(G,score)}catch(e){}
}
play.onclick=start;again.onclick=start;
fav&&(fav.onclick=()=>{try{const k="maeil-favs",a=JSON.parse(localStorage.getItem(k)||"[]");a.includes(G)||a.push(G);localStorage.setItem(k,JSON.stringify(a));fav.textContent="★"}catch(e){}});
})();
