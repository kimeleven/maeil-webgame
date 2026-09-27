(()=>{const G="011-orb-link",BK="maeil-best-"+G,DUR=60,COLS=6,ROWS=8,COLORS=5;
const PAL=[
  {g:["#fff8f0","#7ddec0","#2a8a72"],glow:"rgba(125,222,192,.55)",name:"teal"},
  {g:["#fff0f8","#e05aa8","#8a2a68"],glow:"rgba(224,90,168,.55)",name:"magenta"},
  {g:["#fffaf0","#e8c87a","#a07830"],glow:"rgba(232,200,122,.55)",name:"gold"},
  {g:["#f0f8ff","#6ab0f0","#2a6088"],glow:"rgba(106,176,240,.55)",name:"sky"},
  {g:["#f8fff0","#a8e070","#4a8030"],glow:"rgba(168,224,112,.5)",name:"lime"}
];
const cv=document.getElementById("game"),x=cv.getContext("2d");
const scEl=document.getElementById("score"),tmEl=document.getElementById("time"),bsEl=document.getElementById("best");
const stO=document.getElementById("start"),rsO=document.getElementById("results"),fn=document.getElementById("final-score");
const play=document.getElementById("btn-play"),again=document.getElementById("btn-again"),fav=document.getElementById("btn-fav"),nh=document.getElementById("new-high");
let W,H,dpr,run=0,score=0,best=+localStorage.getItem(BK)||0,tLeft=DUR,last=0;
let grid=[],parts=[],dust=[],chain=[],dragging=0,combo=0,comboT=0,hint="",hintA=0,shake=0,pad=0,cell=0,ox=0,oy=0,pulse=0,ended=0,falling=0;
bsEl.textContent=best;

function resize(){dpr=Math.min(devicePixelRatio||1,2);const r=cv.parentElement.getBoundingClientRect();W=r.width;H=r.height;cv.width=W*dpr;cv.height=H*dpr;cv.style.width=W+"px";cv.style.height=H+"px";x.setTransform(dpr,0,0,dpr,0,0);layout()}
function layout(){const top=52,bot=18;pad=Math.min(W,H)*.018;const aw=W-pad*2,ah=H-top-bot;cell=Math.min(aw/COLS,ah/ROWS);ox=(W-cell*COLS)/2;oy=top+(ah-cell*ROWS)/2}
addEventListener("resize",resize);resize();
function rnd(a,b){return a+Math.random()*(b-a)}
function burst(px,py,c,n){for(let i=0;i<n;i++)parts.push({x:px,y:py,vx:rnd(-4.2,4.2),vy:rnd(-6.2,-.6),life:1,c,r:rnd(1.6,3.8),g:rnd(12,26)})}
function cellCenter(c,r){return{x:ox+(c+.5)*cell,y:oy+(r+.5)*cell}}
function hitCell(px,py){const c=Math.floor((px-ox)/cell),r=Math.floor((py-oy)/cell);if(c<0||r<0||c>=COLS||r>=ROWS)return null;return{c,r}}
function adj(a,b){return Math.abs(a.c-b.c)+Math.abs(a.r-b.r)===1}
function inChain(c,r){return chain.some(p=>p.c===c&&p.r===r)}
function randColor(){return Math.floor(Math.random()*COLORS)}
function mkOrb(color){return{color,drop:0,scale:1,pop:0,locked:0}}

function fillGrid(){
  grid=[];
  for(let r=0;r<ROWS;r++){const row=[];for(let c=0;c<COLS;c++)row.push(mkOrb(randColor()));grid.push(row)}
  // light anti-deadboard: ensure at least one matchable trio exists loosely
  for(let tries=0;tries<8;tries++){if(hasAnyPath())break;for(let i=0;i<6;i++){const c=Math.floor(Math.random()*COLS),r=Math.floor(Math.random()*ROWS);grid[r][c].color=randColor()}}
}
function hasAnyPath(){
  const seen=new Set();
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const k=r*COLS+c;if(seen.has(k))continue;
    const col=grid[r][c].color,stack=[{c,r}],vis=new Set([k]);
    while(stack.length){
      const p=stack.pop();
      for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nc=p.c+dc,nr=p.r+dr;if(nc<0||nr<0||nc>=COLS||nr>=ROWS)continue;
        const nk=nr*COLS+nc;if(vis.has(nk))continue;
        if(grid[nr][nc].color!==col)continue;
        vis.add(nk);seen.add(nk);stack.push({c:nc,r:nr});
      }
    }
    if(vis.size>=3)return 1;
  }
  return 0;
}

function pointerPos(e){const r=cv.getBoundingClientRect();return{x:(e.clientX-r.left)*(W/r.width),y:(e.clientY-r.top)*(H/r.height)}}
cv.addEventListener("pointerdown",e=>{
  if(!run||falling)return;
  const p=pointerPos(e),h=hitCell(p.x,p.y);
  if(!h||!grid[h.r][h.c])return;
  dragging=1;chain=[{c:h.c,r:h.r}];
  try{cv.setPointerCapture(e.pointerId)}catch(_){}
});
cv.addEventListener("pointermove",e=>{
  if(!run||!dragging||falling)return;
  const p=pointerPos(e),h=hitCell(p.x,p.y);
  if(!h)return;
  const last=chain[chain.length-1];
  if(last.c===h.c&&last.r===h.r)return;
  // allow undo one step
  if(chain.length>=2){const prev=chain[chain.length-2];if(prev.c===h.c&&prev.r===h.r){chain.pop();return}}
  if(inChain(h.c,h.r))return;
  if(!adj(last,h))return;
  if(grid[h.r][h.c].color!==grid[chain[0].r][chain[0].c].color)return;
  chain.push({c:h.c,r:h.r});
});
cv.addEventListener("pointerup",()=>{if(dragging){finishChain();dragging=0}});
cv.addEventListener("pointercancel",()=>{dragging=0;chain=[]});

function finishChain(){
  if(chain.length<3){chain=[];return}
  const n=chain.length,mult=1+Math.floor(combo*.35);
  const pts=n*(n-1)*10*mult;
  score+=pts;scEl.textContent=score;
  combo++;comboT=2.2;
  hint="+"+pts+(n>=5?" 대연쇄!":"")+(combo>1?" ×"+combo:"");hintA=1;
  for(const p of chain){
    const o=grid[p.r][p.c],ctr=cellCenter(p.c,p.r),pal=PAL[o.color];
    burst(ctr.x,ctr.y,pal.g[1],14);burst(ctr.x,ctr.y,"#efe6d4",8);burst(ctr.x,ctr.y,pal.g[0],6);
    grid[p.r][p.c]=null;
  }
  chain=[];shake=8;applyGravity();
}

function applyGravity(){
  falling=1;
  for(let c=0;c<COLS;c++){
    let write=ROWS-1;
    for(let r=ROWS-1;r>=0;r--){
      if(grid[r][c]){
        if(r!==write){
          grid[write][c]=grid[r][c];
          grid[write][c].drop+=(write-r)*cell;
          grid[r][c]=null;
        }
        write--;
      }
    }
    for(let r=write;r>=0;r--){
      grid[r][c]=mkOrb(randColor());
      grid[r][c].drop=(write+1)*cell+rnd(0,cell*.4);
      grid[r][c].scale=.2;
    }
  }
}

function bg(t){
  const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,"#1a1820");g.addColorStop(.5,"#121018");g.addColorStop(1,"#0a090e");
  x.fillStyle=g;x.fillRect(0,0,W,H);
  const rg=x.createRadialGradient(W*.5,H*.4,10,W*.5,H*.45,Math.min(W,H)*.75);
  rg.addColorStop(0,"rgba(106,176,240,.08)");rg.addColorStop(.45,"rgba(224,90,168,.04)");rg.addColorStop(1,"rgba(0,0,0,0)");
  x.fillStyle=rg;x.fillRect(0,0,W,H);
  for(const d of dust){
    x.globalAlpha=d.a*(.35+.65*Math.sin(t*d.sp+d.ph));
    x.fillStyle="#efe6d4";x.beginPath();x.arc(d.x,d.y,d.r,0,7);x.fill();
  }
  x.globalAlpha=1;
  // vignette
  const vg=x.createRadialGradient(W/2,H/2,Math.min(W,H)*.28,W/2,H/2,Math.max(W,H)*.72);
  vg.addColorStop(0,"rgba(0,0,0,0)");vg.addColorStop(1,"rgba(0,0,0,.45)");
  x.fillStyle=vg;x.fillRect(0,0,W,H);
}

function drawOrb(c,r,o,t){
  if(!o)return;
  const ctr=cellCenter(c,r);let px=ctr.x,py=ctr.y-o.drop;
  const R=cell*.36*o.scale,pal=PAL[o.color];
  const selected=inChain(c,r);
  // soft glow
  x.save();
  if(selected||o.pop){
    x.shadowColor=pal.glow;x.shadowBlur=18;
  }
  const glow=x.createRadialGradient(px,py,R*.2,px,py,R*1.55);
  glow.addColorStop(0,pal.glow);glow.addColorStop(1,"rgba(0,0,0,0)");
  x.globalAlpha=selected?.55:.22;x.fillStyle=glow;x.beginPath();x.arc(px,py,R*1.55,0,7);x.fill();
  x.globalAlpha=1;x.shadowBlur=0;
  // body
  const body=x.createRadialGradient(px-R*.35,py-R*.4,R*.08,px,py,R);
  body.addColorStop(0,pal.g[0]);body.addColorStop(.45,pal.g[1]);body.addColorStop(1,pal.g[2]);
  x.fillStyle=body;x.beginPath();x.arc(px,py,R,0,7);x.fill();
  // rim
  x.strokeStyle="rgba(239,230,212,.22)";x.lineWidth=1.2;x.stroke();
  // specular
  x.fillStyle="rgba(255,255,255,.42)";x.beginPath();x.ellipse(px-R*.28,py-R*.32,R*.28,R*.16,-.5,0,7);x.fill();
  x.fillStyle="rgba(255,255,255,.12)";x.beginPath();x.arc(px+R*.2,py+R*.25,R*.18,0,7);x.fill();
  // subtle orbit ring
  x.strokeStyle="rgba(239,230,212,.08)";x.lineWidth=.8;
  x.beginPath();x.ellipse(px,py,R*1.15,R*.55,t*.4+c*.3,0,7);x.stroke();
  x.restore();
}

function drawChainLine(){
  if(chain.length<1)return;
  const col=grid[chain[0].r][chain[0].c];if(!col)return;
  const pal=PAL[col.color];
  x.save();
  x.strokeStyle=pal.g[1];x.lineWidth=Math.max(3,cell*.12);x.lineCap="round";x.lineJoin="round";
  x.shadowColor=pal.glow;x.shadowBlur=12;x.globalAlpha=.85;
  x.beginPath();
  for(let i=0;i<chain.length;i++){
    const o=grid[chain[i].r][chain[i].c],ctr=cellCenter(chain[i].c,chain[i].r);
    const px=ctr.x,py=ctr.y-(o?o.drop:0);
    if(i===0)x.moveTo(px,py);else x.lineTo(px,py);
  }
  x.stroke();
  x.restore();
}

function initDust(){
  dust=[];
  for(let i=0;i<36;i++)dust.push({x:rnd(0,W),y:rnd(0,H),r:rnd(.6,1.8),a:rnd(.04,.14),sp:rnd(.4,1.2),ph:rnd(0,6.28),vx:rnd(-6,6),vy:rnd(-10,-2)});
}

function loop(now){
  if(!run)return;
  const dt=Math.min(40,now-last)/1e3;last=now;const t=now/1000;
  tLeft-=dt;if(tLeft<=0){tLeft=0;end("time");return}
  tmEl.textContent=Math.ceil(tLeft);
  pulse+=dt;
  if(comboT>0){comboT-=dt;if(comboT<=0)combo=0}
  if(hintA>0)hintA=Math.max(0,hintA-dt*.85);
  if(shake>0)shake*=.8;

  // animate drops
  let still=0;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const o=grid[r][c];if(!o)continue;
    if(o.drop>0){o.drop=Math.max(0,o.drop-cell*10*dt);still=1}
    if(o.scale<1){o.scale=Math.min(1,o.scale+4*dt);still=1}
  }
  falling=still?1:0;
  if(!falling&&!hasAnyPath()){
    // reshuffle a few tiles
    for(let i=0;i<8;i++){const c=Math.floor(Math.random()*COLS),r=Math.floor(Math.random()*ROWS);grid[r][c].color=randColor()}
  }

  for(const d of dust){d.x+=d.vx*dt;d.y+=d.vy*dt;if(d.y<-4){d.y=H+4;d.x=rnd(0,W)}if(d.x<0)d.x=W;if(d.x>W)d.x=0}
  parts=parts.filter(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=p.g*dt;p.life-=dt*1.6;return p.life>0});

  x.save();
  if(shake>.3)x.translate(rnd(-shake,shake),rnd(-shake,shake));
  bg(t);
  // board soft plate
  const bx=ox-pad*.4,by=oy-pad*.4,bw=cell*COLS+pad*.8,bh=cell*ROWS+pad*.8;
  const plate=x.createLinearGradient(bx,by,bx,by+bh);
  plate.addColorStop(0,"rgba(30,28,36,.55)");plate.addColorStop(1,"rgba(12,10,16,.7)");
  x.fillStyle=plate;
  roundRect(bx,by,bw,bh,14);x.fill();
  x.strokeStyle="rgba(239,230,212,.08)";x.lineWidth=1;roundRect(bx,by,bw,bh,14);x.stroke();

  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)drawOrb(c,r,grid[r][c],t);
  drawChainLine();
  for(const p of parts){x.globalAlpha=Math.max(0,p.life);x.fillStyle=p.c;x.beginPath();x.arc(p.x,p.y,p.r,0,7);x.fill()}
  x.globalAlpha=1;
  if(hintA>.02){x.globalAlpha=Math.min(1,hintA);x.fillStyle="#efe6d4";x.font="700 16px system-ui,sans-serif";x.textAlign="center";x.fillText(hint,W/2,oy-14);x.globalAlpha=1}
  if(combo>1){x.fillStyle="rgba(232,200,122,.92)";x.font="700 13px system-ui,sans-serif";x.textAlign="left";x.fillText("콤보 "+combo,16,H-16)}
  if(chain.length>=2){x.fillStyle="rgba(239,230,212,.7)";x.font="600 12px system-ui,sans-serif";x.textAlign="right";x.fillText(chain.length+" 연결",W-16,H-16)}
  x.restore();
  requestAnimationFrame(loop);
}
function roundRect(a,b,w,h,r){x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath()}

function start(){
  run=1;ended=0;score=0;combo=0;comboT=0;tLeft=DUR;chain=[];dragging=0;parts=[];hint="";hintA=0;shake=0;falling=0;
  scEl.textContent=0;tmEl.textContent=DUR;stO.hidden=1;rsO.hidden=1;nh&&(nh.hidden=1);
  layout();fillGrid();initDust();last=performance.now();requestAnimationFrame(loop);
}
function end(why){
  if(ended)return;ended=1;run=0;dragging=0;chain=[];
  let neu=0;
  if(score>best){best=score;localStorage.setItem(BK,best);bsEl.textContent=best;neu=1}
  fn.textContent=score;nh&&(nh.hidden=!neu);rsO.hidden=0;
  try{fetch("/api/scores",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({gameId:G,score})})}catch(e){}
  try{window.MaeilGuest&&window.MaeilGuest.postScore&&window.MaeilGuest.postScore(G,score)}catch(e){}
}
play.onclick=start;again.onclick=start;
fav&&(fav.onclick=()=>{try{const k="maeil-favs",a=JSON.parse(localStorage.getItem(k)||"[]");a.includes(G)||a.push(G);localStorage.setItem(k,JSON.stringify(a));fav.textContent="★"}catch(e){}});
})();
