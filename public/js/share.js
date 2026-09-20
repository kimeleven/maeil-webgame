!function(w){
  var BASE="https://www.playtoday.cloud";
  var FONT="system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";
  function buildText(o){
    var title=String(o&&o.title||"매일웹겜").trim();
    var score=0|Number(o&&o.score||0);
    var gameId=String(o&&o.gameId||"").trim();
    var nick=String(o&&o.nickname||"").trim();
    var head=nick
      ?("나를 이겨봐! "+nick+" "+score+"점 · "+title)
      :("나를 이겨봐! "+score+"점이야 · "+title);
    return head+"\n한 판만 해봐 🔥\n"+BASE+"/games/"+gameId+"/";
  }
  function copyText(t){
    if(w.navigator.clipboard&&navigator.clipboard.writeText)
      return navigator.clipboard.writeText(t).catch(function(){return legacyCopy(t)});
    return Promise.resolve(legacyCopy(t));
  }
  function legacyCopy(t){
    try{
      var a=document.createElement("textarea");
      a.value=t;a.setAttribute("readonly","");a.style.cssText="position:fixed;left:-9999px";
      document.body.appendChild(a);a.select();document.execCommand("copy");a.remove();
      return !0;
    }catch(e){return !1}
  }
  function tweetFallback(t){
    var url="https://twitter.com/intent/tweet?text="+encodeURIComponent(t);
    try{w.open(url,"_blank","noopener,noreferrer")}catch(e){}
    return copyText(t);
  }
  function downloadFile(file){
    try{
      var url=URL.createObjectURL(file);
      var a=document.createElement("a");
      a.href=url;a.download=file.name||"maeil-score.png";
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(function(){try{URL.revokeObjectURL(url)}catch(e){}},2500);
    }catch(e){}
  }
  function makeCard(o){
    return new Promise(function(resolve,reject){
      try{
        var title=String(o&&o.title||"매일웹겜").trim();
        var score=0|Number(o&&o.score||0);
        var nick=String(o&&o.nickname||"").trim();
        var W=1080,H=1350;
        var c=document.createElement("canvas");
        c.width=W;c.height=H;
        var ctx=c.getContext("2d");
        if(!ctx)return reject(new Error("no-ctx"));
        ctx.fillStyle="#0b0f14";
        ctx.fillRect(0,0,W,H);
        var g=ctx.createRadialGradient(W/2,180,40,W/2,280,520);
        g.addColorStop(0,"rgba(232,200,122,0.22)");
        g.addColorStop(1,"rgba(11,15,20,0)");
        ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
        ctx.strokeStyle="rgba(239,230,212,0.14)";
        ctx.lineWidth=4;
        ctx.strokeRect(48,48,W-96,H-96);
        ctx.textAlign="center";ctx.textBaseline="middle";
        ctx.fillStyle="#e8c87a";
        ctx.font="700 34px "+FONT;
        ctx.letterSpacing="0.28em";
        ctx.fillText("매일웹겜",W/2,170);
        ctx.letterSpacing="0";
        ctx.fillStyle="#efe6d4";
        ctx.font="700 56px "+FONT;
        ctx.fillText(title.slice(0,18),W/2,300);
        ctx.fillStyle="#e8c87a";
        ctx.font="800 160px "+FONT;
        ctx.fillText(String(score),W/2,520);
        ctx.fillStyle="#c9bda6";
        ctx.font="600 42px "+FONT;
        ctx.fillText("점",W/2,640);
        ctx.fillStyle="#efe6d4";
        ctx.font="800 64px "+FONT;
        ctx.fillText("나를 이겨봐!",W/2,780);
        if(nick){
          ctx.fillStyle="#7fe0c0";
          ctx.font="600 40px "+FONT;
          ctx.fillText(nick.slice(0,20),W/2,880);
        }
        ctx.fillStyle="#9aa3b2";
        ctx.font="500 32px "+FONT;
        ctx.fillText("playtoday.cloud",W/2,H-140);
        if(!c.toBlob)return reject(new Error("no-blob"));
        c.toBlob(function(blob){
          if(!blob)return reject(new Error("empty-blob"));
          resolve(new File([blob],"maeil-score.png",{type:"image/png"}));
        },"image/png");
      }catch(e){reject(e)}
    });
  }
  function shareTextOnly(o,text,title,url){
    if(w.navigator.share){
      return navigator.share({title:title,text:text,url:url}).catch(function(){
        return tweetFallback(text);
      });
    }
    return tweetFallback(text);
  }
  function share(o){
    o=o||{};
    var text=buildText(o);
    var title=String(o.title||"매일웹겜").trim();
    var url=BASE+"/games/"+String(o.gameId||"").trim()+"/";
    return makeCard(o).then(function(file){
      var canFiles=w.navigator.canShare&&w.navigator.share;
      try{canFiles=canFiles&&navigator.canShare({files:[file]})}catch(e){canFiles=!1}
      if(canFiles){
        return navigator.share({title:title,text:text,files:[file]}).catch(function(){
          downloadFile(file);
          return tweetFallback(text);
        });
      }
      downloadFile(file);
      return tweetFallback(text);
    }).catch(function(){
      return shareTextOnly(o,text,title,url);
    });
  }
  function readScore(){
    var el=document.querySelector("#result-score,#final-score,#final");
    return el?el.textContent:0;
  }
  function gameIdFromPath(){
    var parts=location.pathname.split("/").filter(Boolean);
    var i=parts.indexOf("games");
    return i>=0&&parts[i+1]?parts[i+1]:(parts[parts.length-1]||"");
  }
  function defaultOpts(){
    var h=document.querySelector("h1");
    var title=(h&&h.textContent||document.title||"매일웹겜").split("—")[0].trim();
    var nick=w.MaeilGuest&&MaeilGuest.getNickname?MaeilGuest.getNickname():"";
    return {title:title,gameId:gameIdFromPath(),score:readScore(),nickname:nick||undefined};
  }
  function bind(btn,getOpts){
    if(!btn)return;
    btn.addEventListener("click",function(){
      var o=typeof getOpts==="function"?getOpts():(getOpts||defaultOpts());
      share(o);
    });
  }
  function syncVisibility(shareBtn){
    var start=document.querySelector("#start-btn");
    var results=document.querySelector("#results");
    var show=false;
    if(results) show=!results.hidden;
    else if(start) show=/다시/.test(start.textContent||"");
    else show=true;
    shareBtn.hidden=!show;
  }
  function watchShare(shareBtn){
    syncVisibility(shareBtn);
    var start=document.querySelector("#start-btn");
    if(start) new MutationObserver(function(){syncVisibility(shareBtn)}).observe(start,{childList:!0,characterData:!0,subtree:!0});
    var results=document.querySelector("#results");
    if(results) new MutationObserver(function(){syncVisibility(shareBtn)}).observe(results,{attributes:!0,attributeFilter:["hidden"]});
  }
  function autoBind(){
    document.querySelectorAll("[data-maeil-share]").forEach(function(btn){
      if((btn.textContent||"").trim()==="자랑하기") btn.textContent="자랑하기 · 나를 이겨봐";
      bind(btn,defaultOpts);
      watchShare(btn);
    });
  }
  w.MaeilShare={share:share,bind:bind,copyText:copyText,buildText:buildText,makeCard:makeCard};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",autoBind);
  else autoBind();
}("undefined"!=typeof window?window:globalThis);
