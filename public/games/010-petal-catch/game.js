(()=>{const G="010-petal-catch",BK="maeil-best-"+G,DUR=60;
const cv=document.getElementById("game"),x=cv.getContext("2d");
const scEl=document.getElementById("score"),tmEl=document.getElementById("time"),bsEl=document.getElementById("best");
const stO=document.getElementById("start"),rsO=document.getElementById("results"),fn=document.getElementById("final-score");
const play=document.getElementById("btn-play"),again=document.getElementById("btn-again"),fav=document.getElementById("btn-fav"),nh=document.getElementById("new-high");
let W,H,dpr,run=0,score=0,best=+localStorage.getItem(BK)||0,tLeft=DUR,last=0;
let basketX=.5,drag=0,items=[],parts=[],combo=0,spawnT=0,shake=0,hint="",hintA=0,diff=1,pulse=0,ended=0;
bsEl.textContent=best;

function resize(){dpr=Math.min(devicePixelRatio||1,2);const r=cv.parentElement.getBoundingClientRect();W=r.width;H=r.height;cv.width=W*dpr;cv.height=H*dpr;cv.style.width=W+"px";cv.style.height=H+"px";x.setTransform(dpr,0,0,dpr,0,0)}
addEventListener("resize",resize);resize();
function rnd(a,b){return a+Math.random()*(b-a)}
function burst(px,py,c,n){for(let i=0;i<n;i++)parts.push({x:px,y:py,vx:rnd(-3.4,3.4),vy:rnd(-5.5,-.8),life:1,c,r:rnd(1.4,3.4),g:rnd(10,22)})}

function spawn(){
  const bad=Math.random()<(.22+diff*.12);
  const kind=bad?(Math.random()<.55?"thorn":"pod"):"petal";
  const r=kind==="petal"?rnd(11,17):kind==="thorn"?rnd(10,15):rnd(12,18);
  items.push({kind,x:rnd(r+10,W-r-10),y:-r-8,r,vy:rnd(110,165)*( .85+diff*.35),vx:rnd(-28,28)*diff*.4,rot:rnd(0,6.28),spin:rnd(-2.2,2.2),alive:1,wob:rnd(0,6.28)});
}

function pointerPos(e){const r=cv.getBoundingClientRect();return{x:(e.clientX-r.left)*(W/r.width),y:(e.clientY-r.top)*(H/r.height)}}
cv.addEventListener("pointerdown",e=>{
  if(!run)return;
  const p=pointerPos(e);drag=1;
  if(e.pointerType==="touch"||e.pointerType==="pen"){basketX=Math.min(.94,Math.max(.06,p.x/W))}
  else{basketX=p.x/W<.5?Math.max(.06,basketX-.12):Math.min(.94,basketX+.12)}
  try{cv.setPointerCapture(e.pointerId)}catch(_){}
});
cv.addEventListener("pointermove",e=>{
  if(!run||!drag)return;
  const p=pointerPos(e);basketX=Math.min(.94,Math.max(.06,p.x/W));
});
cv.addEventListener("pointerup",()=>{drag=0});
cv.addEventListener("pointercancel",()=>{drag=0});
addEventListener("keydown",e=>{
  if(!run)return;
  if(e.key==="ArrowLeft"||e.key==="a"||e.key==="A")basketX=Math.max(.06,basketX-.08);
  if(e.key==="ArrowRight"||e.key==="d"||e.key==="D")basketX=Math.min(.94,basketX+.08);
});

function bg(t){
  const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,"#1c1a18");g.addColorStop(.45,"#12110f");g.addColorStop(1,"#0a0908");
  x.fillStyle=g;x.fillRect(0,0,W,H);
  for(let i=0;i<42;i++){
    const px=(i*97+41+Math.sin(t*.28+i)*18)%W,py=(i*61+23+Math.cos(t*.22+i)*14)%H;
    x.globalAlpha=.04+(i%5)*.012;x.fillStyle="#efe6d4";x.beginPath();x.arc(px,py,1+(i%3)*.4,0,7);x.fill();
  }
  x.globalAlpha=1;
  const rg=x.createRadialGradient(W/2,H*.35,8,W/2,H*.4,Math.min(W,H)*.7);
  rg.addColorStop(0,"rgba(232,200,122,.07)");rg.addColorStop(.5,"rgba(125,222,192,.03)");rg.addColorStop(1,"rgba(0,0,0,0)");
  x.fillStyle=rg;x.fillRect(0,0,W,H);
  // soft ground glow
  const floor=x.createLinearGradient(0,H*.82,0,H);
  floor.addColorStop(0,"rgba(0,0,0,0)");floor.addColorStop(1,"rgba(20,16,12,.55)");
  x.fillStyle=floor;x.fillRect(0,H*.82,W,H*.18);
}

function drawPetal(it,t){
  const R=it.r,wob=Math.sin(t*3+it.wob)*.08;
  x.save();x.translate(it.x,it.y);x.rotate(it.rot+wob);
  x.fillStyle="rgba(0,0,0,.28)";x.beginPath();x.ellipse(0,R*.85,R*.95,R*.28,0,0,7);x.fill();
  for(let i=0;i<5;i++){
    const a=i*(Math.PI*2/5);
    x.save();x.rotate(a);
    const g=x.createRadialGradient(0,-R*.35,1,0,-R*.2,R*.85);
    g.addColorStop(0,"#fff8ec");g.addColorStop(.4,"#efe6d4");g.addColorStop(.85,"#c9b48a");g.addColorStop(1,"#8a7a58");
    x.fillStyle=g;x.beginPath();
    x.moveTo(0,0);x.quadraticCurveTo(R*.55,-R*.15,0,-R*1.05);x.quadraticCurveTo(-R*.55,-R*.15,0,0);
    x.fill();
    x.strokeStyle="rgba(255,255,255,.18)";x.lineWidth=.8;x.stroke();
    x.restore();
  }
  const cg=x.createRadialGradient(0,0,1,0,0,R*.35);
  cg.addColorStop(0,"#e8c87a");cg.addColorStop(1,"#b8924a");
  x.fillStyle=cg;x.beginPath();x.arc(0,0,R*.28,0,7);x.fill();
  x.fillStyle="rgba(255,255,255,.35)";x.beginPath();x.ellipse(-R*.08,-R*.1,R*.1,R*.06,-.4,0,7);x.fill();
  x.restore();
}

function drawThorn(it,t){
  const R=it.r,wob=Math.sin(t*2.2+it.wob)*.05;
  x.save();x.translate(it.x,it.y);x.rotate(it.rot+wob);
  x.fillStyle="rgba(0,0,0,.4)";x.beginPath();x.ellipse(0,R*.9,R*.8,R*.22,0,0,7);x.fill();
  const g=x.createLinearGradient(0,-R*1.2,0,R*.6);
  g.addColorStop(0,"#4a3540");g.addColorStop(.4,"#1a1216");g.addColorStop(1,"#0a080a");
  x.fillStyle=g;x.beginPath();
  x.moveTo(0,-R*1.35);
  x.quadraticCurveTo(R*.55,-R*.2,R*.35,R*.7);
  x.quadraticCurveTo(0,R*.35,-R*.35,R*.7);
  x.quadraticCurveTo(-R*.55,-R*.2,0,-R*1.35);
  x.closePath();x.fill();
  x.strokeStyle="rgba(180,70,90,.4)";x.lineWidth=1.3;x.stroke();
  // side spikes
  for(const s of [-1,1]){
    x.beginPath();x.moveTo(0,-R*.2);x.lineTo(s*R*1.05,R*.1);x.lineTo(s*R*.15,R*.25);x.closePath();
    x.fillStyle="#2a1a22";x.fill();
  }
  x.fillStyle="rgba(239,230,212,.08)";x.beginPath();x.ellipse(-R*.12,-R*.55,R*.12,R*.22,0,0,7);x.fill();
  x.restore();
}

function drawPod(it,t){
  const R=it.r,wob=Math.sin(t*1.8+it.wob)*.06;
  x.save();x.translate(it.x,it.y);x.rotate(it.rot*.4+wob);
  x.fillStyle="rgba(0,0,0,.38)";x.beginPath();x.ellipse(0,R*.75,R*1.1,R*.3,0,0,7);x.fill();
  const g=x.createRadialGradient(-R*.25,-R*.2,2,0,0,R*1.2);
  g.addColorStop(0,"#3a2e28");g.addColorStop(.45,"#1a1410");g.addColorStop(1,"#0a0806");
  x.fillStyle=g;x.beginPath();x.ellipse(0,0,R*1.15,R*.78,0,0,7);x.fill();
  x.strokeStyle="rgba(140,90,60,.35)";x.lineWidth=1.4;x.stroke();
  // seed bumps
  for(let i=0;i<4;i++){
    const a=-.6+i*.4,px=Math.cos(a)*R*.55,py=Math.sin(a)*R*.35;
    x.fillStyle="rgba(80,50,40,.7)";x.beginPath();x.ellipse(px,py,R*.22,R*.16,a,0,7);x.fill();
  }
  x.fillStyle="rgba(239,230,212,.07)";x.beginPath();x.ellipse(-R*.35,-R*.25,R*.28,R*.16,-.5,0,7);x.fill();
  x.restore();
}

function drawBasket(t){
  const bx=basketX*W,by=H-36,bw=56,bh=18;
  x.save();
  // soft catch aura
  const ag=x.createRadialGradient(bx,by,4,bx,by,bw*1.4);
  ag.addColorStop(0,"rgba(125,222,192,.12)");ag.addColorStop(1,"rgba(0,0,0,0)");
  x.fillStyle=ag;x.beginPath();x.arc(bx,by,bw*1.4,0,7);x.fill();
  // shadow
  x.fillStyle="rgba(0,0,0,.4)";x.beginPath();x.ellipse(bx,by+bh*.9,bw*.95,bh*.45,0,0,7);x.fill();
  // cradle body
  const g=x.createLinearGradient(bx-bw,by-bh,bx+bw,by+bh);
  g.addColorStop(0,"#fff8ec");g.addColorStop(.35,"#efe6d4");g.addColorStop(.75,"#c9bda6");g.addColorStop(1,"#8a7e68");
  x.fillStyle=g;x.beginPath();
  x.moveTo(bx-bw,by-bh*.3);
  x.quadraticCurveTo(bx-bw*1.05,by+bh*.2,bx-bw*.7,by+bh);
  x.quadraticCurveTo(bx,by+bh*1.35,bx+bw*.7,by+bh);
  x.quadraticCurveTo(bx+bw*1.05,by+bh*.2,bx+bw,by-bh*.3);
  x.quadraticCurveTo(bx,by+bh*.15,bx-bw,by-bh*.3);
  x.closePath();x.fill();
  x.strokeStyle="rgba(232,200,122,.45)";x.lineWidth=1.6;x.stroke();
  // inner hollow
  const ig=x.createRadialGradient(bx,by-2,2,bx,by,bw*.7);
  ig.addColorStop(0,"#1a1814");ig.addColorStop(1,"#2a2620");
  x.fillStyle=ig;x.beginPath();x.ellipse(bx,by-2,bw*.62,bh*.55,0,0,7);x.fill();
  // petal rim accents
  for(let i=-2;i<=2;i++){
    const px=bx+i*12,py=by-bh*.45+Math.abs(i)*1.5;
    x.fillStyle="rgba(239,230,212,.55)";x.beginPath();
    x.moveTo(px,py-6);x.quadraticCurveTo(px+5,py,px,py+5);x.quadraticCurveTo(px-5,py,px,py-6);x.fill();
  }
  x.fillStyle="rgba(255,255,255,.28)";x.beginPath();x.ellipse(bx-bw*.35,by-bh*.15,bw*.18,bh*.2,-.4,0,7);x.fill();
  x.restore();
}

function loop(now){
  if(!run)return;
  const dt=Math.min(40,now-last)/1e3;last=now;const t=now/1000;
  tLeft-=dt;if(tLeft<=0){tLeft=0;end("time");return}
  tmEl.textContent=Math.ceil(tLeft);
  diff=1+(DUR-tLeft)/DUR*1.85;
  pulse+=dt;
  spawnT-=dt;
  const rate=Math.max(.22,.78-diff*.18);
  if(spawnT<=0){spawn();if(diff>1.5&&Math.random()<.4)spawn();spawnT=rate}

  const bx=basketX*W,by=H-36;
  for(const it of items){
    if(!it.alive)continue;
    it.y+=it.vy*dt;it.x+=it.vx*dt;it.rot+=it.spin*dt;
    it.vx+=Math.sin(t*2+it.wob)*8*dt;
    if(it.x<it.r){it.x=it.r;it.vx=Math.abs(it.vx)}
    if(it.x>W-it.r){it.x=W-it.r;it.vx=-Math.abs(it.vx)}
    const dx=it.x-bx,dy=it.y-by,hitR=it.r+32;
    if(dy> -8 && dy<22 && Math.abs(dx)<hitR){
      it.alive=0;
      if(it.kind==="petal"){
        combo++;const pts=10+combo*4+Math.floor(diff*3);
        score+=pts;scEl.textContent=score;
        burst(it.x,it.y,"#efe6d4",12);burst(it.x,it.y,"#e8c87a",8);burst(it.x,it.y,"#7ddec0",5);
        hint="+"+pts+(combo>1?" ×"+combo:"");hintA=1;
      }else{
        combo=0;shake=14;
        burst(it.x,it.y,"#e23b2e",18);burst(it.x,it.y,"#6b2a4a",10);
        if(it.kind==="thorn"){hint="가시!";hintA=1;end("hit");return}
        score=Math.max(0,score-25);scEl.textContent=score;hint="씨앗 -25";hintA=1;
      }
    }
    if(it.y>H+40){it.alive=0;if(it.kind==="petal"){combo=0}}
  }
  items=items.filter(it=>it.alive);
  if(hintA>0)hintA=Math.max(0,hintA-dt*.9);
  if(shake>0)shake*=.82;
  parts=parts.filter(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=p.g*dt;p.life-=dt*1.55;return p.life>0});

  x.save();
  if(shake>.35)x.translate(rnd(-shake,shake),rnd(-shake,shake));
  bg(t);
  // floating ambient petals
  x.globalAlpha=.08+.04*Math.sin(pulse*1.2);
  for(let i=0;i<5;i++){
    const ax=(i*137+Math.sin(pulse+i)*40)%W,ay=(H*.15+i*H*.12+Math.cos(pulse*.7+i)*20)%(H*.7);
    x.fillStyle="#efe6d4";x.beginPath();x.ellipse(ax,ay,6,3,pulse+i,0,7);x.fill();
  }
  x.globalAlpha=1;
  for(const it of items){
    if(it.kind==="petal")drawPetal(it,t);
    else if(it.kind==="thorn")drawThorn(it,t);
    else drawPod(it,t);
  }
  drawBasket(t);
  for(const p of parts){x.globalAlpha=Math.max(0,p.life);x.fillStyle=p.c;x.beginPath();x.arc(p.x,p.y,p.r,0,7);x.fill()}
  x.globalAlpha=1;
  if(hintA>.02){x.globalAlpha=Math.min(1,hintA);x.fillStyle="#efe6d4";x.font="700 16px system-ui,sans-serif";x.textAlign="center";x.fillText(hint,W/2,H*.16);x.globalAlpha=1}
  if(combo>1){x.fillStyle="rgba(232,200,122,.9)";x.font="700 13px system-ui,sans-serif";x.textAlign="left";x.fillText("콤보 "+combo,16,H-18)}
  x.restore();
  requestAnimationFrame(loop);
}

function start(){
  run=1;ended=0;score=0;combo=0;tLeft=DUR;diff=1;items=[];parts=[];spawnT=.15;shake=0;hint="";hintA=0;basketX=.5;drag=0;
  scEl.textContent=0;tmEl.textContent=DUR;stO.hidden=1;rsO.hidden=1;nh&&(nh.hidden=1);
  last=performance.now();requestAnimationFrame(loop);
}
function end(why){
  if(ended)return;ended=1;run=0;let neu=0;
  if(score>best){best=score;localStorage.setItem(BK,best);bsEl.textContent=best;neu=1}
  fn.textContent=score;nh&&(nh.hidden=!neu);rsO.hidden=0;
  try{fetch("/api/scores",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({gameId:G,score})})}catch(e){}
  try{window.MaeilGuest&&window.MaeilGuest.postScore&&window.MaeilGuest.postScore(G,score)}catch(e){}
}
play.onclick=start;again.onclick=start;
fav&&(fav.onclick=()=>{try{const k="maeil-favs",a=JSON.parse(localStorage.getItem(k)||"[]");a.includes(G)||a.push(G);localStorage.setItem(k,JSON.stringify(a));fav.textContent="★"}catch(e){}});
})();
