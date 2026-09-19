!function(w){
  var BASE="https://www.playtoday.cloud";
  function buildText(o){
    var title=String(o&&o.title||"매일웹겜").trim();
    var score=0|Number(o&&o.score||0);
    var gameId=String(o&&o.gameId||"").trim();
    return "매일웹겜 · "+title+" "+score+"점! 한 판 어때요?\n"+BASE+"/games/"+gameId+"/";
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
  function share(o){
    o=o||{};
    var text=buildText(o);
    var title=String(o.title||"매일웹겜").trim();
    var url=BASE+"/games/"+String(o.gameId||"").trim()+"/";
    if(w.navigator.share){
      return navigator.share({title:title,text:text,url:url}).catch(function(){
        return tweetFallback(text);
      });
    }
    return tweetFallback(text);
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
      bind(btn,defaultOpts);
      watchShare(btn);
    });
  }
  w.MaeilShare={share:share,bind:bind,copyText:copyText,buildText:buildText};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",autoBind);
  else autoBind();
}("undefined"!=typeof window?window:globalThis);
