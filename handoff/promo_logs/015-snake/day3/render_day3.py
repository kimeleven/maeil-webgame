#!/usr/bin/env python3
"""015-snake Day3 (combo_strategy): slides/card/captions. Noto Sans CJK via _tools/render_slides_kr.py."""
import sys, json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, "/workspace/maeil-webgame-promo/_tools")
import render_slides_kr as R

OUT = Path(__file__).resolve().parent
SRC = OUT.parent / "day0" / "_src"
W, H = 1080, 1920
INK = (20, 19, 17); CREAM = R.CREAM; GOLD = R.GOLD; TEAL = (125, 222, 192); MUTED = (201, 189, 166); CORAL = (255, 122, 92)
R.assert_korean(R.font(R.FONT_B, 40))

def bg(w, h, tint=(60, 34, 30)):
    im = Image.new("RGB", (w, h), INK)
    glow = Image.new("RGB", (w, h), INK)
    g = ImageDraw.Draw(glow)
    g.ellipse((w // 2 - 600, int(h * 0.22), w // 2 + 600, int(h * 0.88)), fill=tint)
    return Image.blend(im, glow.filter(ImageFilter.GaussianBlur(140)), 0.8)

def speed_lines(im, y0, y1, col=(255, 255, 255), n=16, seed=3):
    import random
    rnd = random.Random(seed)
    lay = Image.new("RGBA", im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    for _ in range(n):
        y = rnd.randint(y0, y1); x = rnd.randint(-100, im.size[0] - 200); L = rnd.randint(160, 420)
        a = rnd.randint(40, 120); wdt = rnd.randint(4, 10)
        d.rounded_rectangle((x, y, x + L, y + wdt), wdt // 2, fill=(*col, a))
    im.paste(lay, (0, 0), lay)

def rounded(img, r):
    m = Image.new("L", img.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, img.width - 1, img.height - 1), r, fill=255)
    return m

def framed(im, src, cx, cy, width, glow=CORAL, tilt=0):
    p = Image.open(SRC / f"{src}_board.png").convert("RGB")
    h = int(p.height * width / p.width); p = p.resize((width, h), Image.LANCZOS)
    x = cx - width // 2; y = cy - h // 2
    sh = Image.new("L", im.size, 0); ImageDraw.Draw(sh).rounded_rectangle((x, y + 24, x + width, y + h + 24), 44, fill=180)
    im.paste((0, 0, 0), (0, 0), sh.filter(ImageFilter.GaussianBlur(32)))
    gl = Image.new("L", im.size, 0); ImageDraw.Draw(gl).rounded_rectangle((x - 8, y - 8, x + width + 8, y + h + 8), 48, outline=255, width=8)
    im.paste(glow, (0, 0), gl.filter(ImageFilter.GaussianBlur(12)))
    im.paste(p, (x, y), rounded(p, 40))
    return (x, y, x + width, y + h)

def text_c(d, y, text, color, path, start, maxw=W - 140, shadow=True, cw=None):
    cw = cw or d.im.size[0]
    f, bb = R.fit(d, text, path, maxw, start)
    tw = bb[2] - bb[0]; x = (cw - tw) // 2 - bb[0]
    if shadow: d.text((x + 3, y + 4), text, font=f, fill=(0, 0, 0))
    d.text((x, y), text, font=f, fill=color)
    return y + (bb[3] - bb[1]) + 26

def pill(d, cx, y, text, fg, bgc, size=40):
    f = R.font(R.FONT_B, size); bb = d.textbbox((0, 0), text, font=f)
    w = bb[2] - bb[0] + 64; h = bb[3] - bb[1] + 34
    d.rounded_rectangle((cx - w // 2, y, cx + w // 2, y + h), h // 2, fill=bgc)
    d.text((cx - (bb[2] - bb[0]) // 2 - bb[0], y + 17 - bb[1]), text, font=f, fill=fg)
    return y + h

def chevrons(d, cx, cy, n, s, col):
    for k in range(n):
        x = cx - (n - 1) * s * 0.55 + k * s * 1.1
        d.line([(x - s * .35, cy - s * .5), (x + s * .25, cy), (x - s * .35, cy + s * .5)], fill=col, width=int(s * .22), joint="curve")

def gauge(d, cx, cy, r, frac, label_lo="느림", label_hi="최고속"):
    # semicircle speedometer
    box = (cx - r, cy - r, cx + r, cy + r)
    d.arc(box, 180, 360, fill=(60, 56, 48), width=56)
    segs = 9
    for i in range(segs):
        a0 = 180 + i * 180 / segs + 1.5; a1 = 180 + (i + 1) * 180 / segs - 1.5
        t = i / (segs - 1)
        col = tuple(int(TEAL[c] + (CORAL[c] - TEAL[c]) * t) for c in range(3))
        if (i + 0.5) / segs <= frac: d.arc(box, a0, a1, fill=col, width=56)
    import math
    ang = math.radians(180 + 180 * frac)
    nx = cx + (r - 70) * math.cos(ang); ny = cy + (r - 70) * math.sin(ang)
    d.line([(cx, cy), (nx, ny)], fill=CREAM, width=14)
    d.ellipse((cx - 30, cy - 30, cx + 30, cy + 30), fill=GOLD)
    f = R.font(R.FONT_R, 40)
    d.text((cx - r - 10, cy + 30), label_lo, font=f, fill=MUTED)
    bb = d.textbbox((0, 0), label_hi, font=f)
    d.text((cx + r + 10 - (bb[2] - bb[0]), cy + 30), label_hi, font=f, fill=MUTED)


COMBO_W = 3.2
def chain(d, cx, cy, n=4, gap=190, r=54):
    xs=[cx-(n-1)*gap//2+i*gap for i in range(n)]
    for i,x in enumerate(xs[:-1]):
        d.line([(x+r,cy),(xs[i+1]-r,cy)],fill=TEAL,width=10)
    for i,x in enumerate(xs):
        d.ellipse((x-r,cy-r,x+r,cy+r),fill=CORAL)
        d.ellipse((x-r*0.5,cy-r*0.7,x-r*0.1,cy-r*0.3),fill=(255,200,180))
        t=f"+{10+i*5}"; f=R.font(R.FONT_B,50); bb=d.textbbox((0,0),t,font=f)
        d.text((x-(bb[2]-bb[0])//2-bb[0],cy+r+22),t,font=f,fill=TEAL if i else CREAM)

def slide1():
    im = bg(W, H, (30, 52, 46)); d = ImageDraw.Draw(im)
    y = pill(d, W // 2, 140, "매일웹겜 W02 · 콤보 공략", INK, TEAL, 38) + 40
    y = text_c(d, y, "3초 안에 연달아", CREAM, R.FONT_B, 112)
    text_c(d, y, "먹으면 콤보!", GOLD, R.FONT_B, 130)
    framed(im, "play1", W // 2, 1180, 700, glow=TEAL)
    d = ImageDraw.Draw(im); text_c(d, H - 140, "playtoday.cloud", MUTED, R.FONT_R, 44)
    im.save(OUT / "slide1.png", optimize=True)

def slide2():
    im = bg(W, H, (40, 36, 64)); d = ImageDraw.Draw(im)
    y = text_c(d, 220, "콤보 이어질수록", CREAM, R.FONT_B, 110)
    y = text_c(d, y, "+5점씩 더!", TEAL, R.FONT_B, 150)
    # staircase bars: base 10, combo1 15, combo2 20, combo3 25
    labels=["기본","1콤보","2콤보","3콤보"]; vals=[10,15,20,25]
    bw=170; gap=60; x0=(W-(4*bw+3*gap))//2; base=1500
    for i,(lab,v) in enumerate(zip(labels,vals)):
        h=int(v*26); x=x0+i*(bw+gap)
        t=i/3; col=tuple(int(CREAM[c]+(TEAL[c]-CREAM[c])*t) for c in range(3))
        d.rounded_rectangle((x,base-h,x+bw,base),28,fill=col)
        f=R.font(R.FONT_B,58); s=f"+{v}"; bb=d.textbbox((0,0),s,font=f)
        d.text((x+bw//2-(bb[2]-bb[0])//2-bb[0],base-h-90),s,font=f,fill=GOLD)
        f2=R.font(R.FONT_B,46); bb=d.textbbox((0,0),lab,font=f2)
        d.text((x+bw//2-(bb[2]-bb[0])//2-bb[0],base+30),lab,font=f2,fill=MUTED)
    text_c(d, H - 230, "Lv.1 기준 · 먹이 한 개당 점수", MUTED, R.FONT_R, 44)
    text_c(d, H - 150, "화면에 「+점수 콤보」가 뜨면 성공", CREAM, R.FONT_R, 44)
    im.save(OUT / "slide2.png", optimize=True)

def slide3():
    im = bg(W, H, (64, 52, 26)); d = ImageDraw.Draw(im)
    y = text_c(d, 220, "먹이 보이면", CREAM, R.FONT_B, 120)
    y = text_c(d, y, "최단 거리로!", GOLD, R.FONT_B, 140)
    # countdown ring 3.2s
    cx, cy, r = W // 2, 960, 230
    d.ellipse((cx-r,cy-r,cx+r,cy+r),outline=(60,56,48),width=40)
    d.arc((cx-r,cy-r,cx+r,cy+r),-90,-90+300,fill=TEAL,width=40)
    f=R.font(R.FONT_B,150); s="3.2"; bb=d.textbbox((0,0),s,font=f)
    d.text((cx-(bb[2]-bb[0])//2-bb[0],cy-(bb[3]-bb[1])//2-bb[1]-20),s,font=f,fill=CREAM)
    f=R.font(R.FONT_B,54); s="초"; bb=d.textbbox((0,0),s,font=f)
    d.text((cx-(bb[2]-bb[0])//2-bb[0],cy+90),s,font=f,fill=MUTED)
    y = text_c(d, 1290, "다음 먹이까지 3.2초 안에", CREAM, R.FONT_B, 64)
    y = text_c(d, y, "돌아가면 콤보가 끊겨요", CORAL, R.FONT_B, 64)
    chain(d, W // 2, 1640, 4, 200, 50)
    im.save(OUT / "slide3.png", optimize=True)

def slide4():
    im = bg(W, H, (34, 40, 58)); d = ImageDraw.Draw(im)
    y = text_c(d, 220, "끝까지 버티면", CREAM, R.FONT_B, 116)
    text_c(d, y, "길이 보너스!", GOLD, R.FONT_B, 130)
    bx = framed(im, "long2", W // 2, 1080, 760, glow=GOLD)
    d = ImageDraw.Draw(im)
    y = text_c(d, bx[3] + 60, "시간 종료 시 길이 × 5점", TEAL, R.FONT_B, 66)
    text_c(d, y, "부딪히면 보너스 없음!", MUTED, R.FONT_R, 48)
    im.save(OUT / "slide4.png", optimize=True)

def slide5():
    im = bg(W, H, (30, 52, 46)); d = ImageDraw.Draw(im)
    y = pill(d, W // 2, 170, "설치 · 가입 없이 브라우저로", INK, GOLD, 40)
    chain(d, W // 2, 520, 4, 200, 56)
    y = text_c(d, 760, "콤보 쌓아서", CREAM, R.FONT_B, 130)
    y = text_c(d, y, "최고 점수 도전!", TEAL, R.FONT_B, 120)
    framed(im, "play3", W // 2, 1430, 460, glow=TEAL)
    d = ImageDraw.Draw(im); text_c(d, H - 150, "playtoday.cloud", GOLD, R.FONT_B, 76)
    im.save(OUT / "slide5.png", optimize=True)

def card():
    S = 1080
    im = bg(S, S, (30, 52, 46)); d = ImageDraw.Draw(im)
    y = pill(d, S // 2, 48, "매일웹겜 · 스네이크 콤보 공략", INK, TEAL, 32) + 22
    y = text_c(d, y, "3초 안에 연달아 먹으면", CREAM, R.FONT_B, 80, maxw=S - 100, cw=S)
    text_c(d, y - 6, "콤보!", GOLD, R.FONT_B, 120, maxw=S - 100, cw=S)
    chain(d, S // 2, 640, 4, 200, 58)
    y = text_c(d, 830, "콤보마다 한 입에 +5점 · 끝까지 버티면 길이 보너스", TEAL, R.FONT_B, 40, maxw=S - 90, cw=S)
    text_c(d, y - 6, "playtoday.cloud/games/015-snake", MUTED, R.FONT_R, 36, maxw=S - 100, cw=S)
    im.save(OUT / "card.png", optimize=True)
    im.save(OUT / "card_tg.jpg", quality=92)

CAPTIONS = [
    (["3초 안에 연달아", "먹으면 콤보!"], "3초 안에 연달아 먹으면 콤보!"),
    (["콤보마다", "한 입에 +5점 더"], "콤보가 이어질수록 한 입에 5점씩 더 붙어요."),
    (["먹이 보이면", "최단 거리로!"], "먹이가 보이면 돌아가지 말고 최단 거리로!"),
    (["끝까지 버티면", "길이 보너스까지"], "시간 끝까지 버티면 길이 보너스까지 챙겨요."),
    (["콤보 쌓아서", "최고 점수 도전!"], "콤보 쌓아서 최고 점수, 지금 도전!"),
]

def captions():
    capdir = OUT / "captions"; capdir.mkdir(exist_ok=True)
    meta = []
    for i, (lines, weight) in enumerate(CAPTIONS):
        assert len(lines) <= 2 and all(len(l) <= 12 for l in lines), lines
        im = Image.new("RGBA", (W, 330), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        lh = 128; y0 = (330 - lh * len(lines)) // 2
        for j, line in enumerate(lines):
            ff, _ = R.fit(d, line, R.FONT_B, W - 80, 104)
            bb = d.textbbox((0, 0), line, font=ff, stroke_width=10)
            x = (W - (bb[2] - bb[0])) // 2 - bb[0]
            d.text((x, y0 + j * lh - bb[1] + 4), line, font=ff, fill=(255, 255, 255), stroke_width=10, stroke_fill=(0, 0, 0))
        p = capdir / f"cap{i + 1}.png"; im.save(p)
        meta.append(dict(file=p.name, lines=lines, weight=len(weight.replace(" ", ""))))
    (capdir / "captions.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1))

if __name__ == "__main__":
    slide1(); slide2(); slide3(); slide4(); slide5(); card(); captions(); print("ok")
