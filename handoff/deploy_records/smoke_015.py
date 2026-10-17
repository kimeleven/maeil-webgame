import json,sys,hashlib,urllib.request,os
BASE=sys.argv[1] if len(sys.argv)>1 else "https://www.playtoday.cloud"
OUT=sys.argv[2] if len(sys.argv)>2 else "/workspace/SMOKE_015_RESULT.json"
LOCAL="/workspace/_deploy_015/public"
STUBS=["b.onclick=()=>{n++","PLACEHOLDER","FILE00","LOAD_FROM_DISK"]
def get(path):
    u=path if path.startswith("http") else BASE+path
    try:
        r=urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":"maeil-smoke","Cache-Control":"no-cache"}),timeout=25)
        return r.status,r.read()
    except urllib.error.HTTPError as e: return e.code,e.read()
    except Exception as e: return 0,str(e).encode()
checks=[];fails=[]
def chk(name,ok,**kw):
    checks.append(dict(url=name,ok=bool(ok),**kw))
    if not ok: fails.append(name)
s,b=get("/"); chk("/",s==200,status=s, lobby_nick=b'nick-input' in b, guest_js=b'/js/guest.js' in b)
s2,_=get("/js/guest.js"); chk("/js/guest.js",s2==200,status=s2)
games=sorted(os.listdir(LOCAL+"/games"))
hashes={}
for g in games:
    for f in ["","game.js","game.css"]:
        p=f"/games/{g}/{f}"; s,b=get(p)
        kw=dict(status=s,bytes=len(b))
        ok=s==200
        if f=="game.js":
            h=hashlib.sha256(b).hexdigest()[:16]; hashes[g]=h
            stub=[x for x in STUBS if x.encode() in b]
            local=open(f"{LOCAL}/games/{g}/game.js","rb").read()
            kw.update(sha16=h,ge1kb=len(b)>=1024,stub=bool(stub),matches_local=(b==local))
            ok=ok and not stub and b==local
        if f=="" : ok=ok and len(b)>300
        chk(p,ok,**kw)
distinct=len(set(hashes.values()))==len(hashes); chk("distinct_game_js",distinct,n=len(hashes))
s,b=get("/api/games")
try: j=json.loads(b); src=j.get("source"); ids=[x["id"] for x in j.get("games",[])]
except Exception: src=None; ids=[]
missing=[g for g in games if g not in ids]
chk("/api/games",s==200 and src=="neon" and not missing,status=s,source=src,count=len(ids),missing=missing)
for g in ["014-minesweeper","001-tap-dodge","015-snake"]:
    s,b=get(f"/api/scores?game_id={g}&limit=5")
    try: src=json.loads(b).get("source")
    except Exception: src=None
    chk(f"/api/scores?game_id={g}",s==200 and src not in (None,"stub"),status=s,source=src)
s,b=get("/sitemap.xml"); chk("/sitemap.xml",s==200 and b"015-snake" in b,status=s)
res=dict(ok=not fails,fails=fails,base=BASE,game="015-snake",checks=checks)
json.dump(res,open(OUT,"w"),ensure_ascii=False,indent=1)
print(json.dumps(dict(ok=res["ok"],fails=fails,n=len(checks)),ensure_ascii=False))
