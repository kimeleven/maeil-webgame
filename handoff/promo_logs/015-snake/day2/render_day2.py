#!/usr/bin/env python3
"""015-snake Day2 (speed_challenge): slides/card/captions. Noto Sans CJK via _tools/render_slides_kr.py."""
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

def slide1():
    im = bg(W, H); speed_lines(im, 900, 1600, n=22)
    d = ImageDraw.Draw(im)
    y = pill(d, W // 2, 140, "매일웹겜 W02 · 스피드 챌린지", INK, CORAL, 38) + 40
    y = text_c(d, y, "먹을수록 빨라진다", CREAM, R.FONT_B, 112)
    text_c(d, y, "60초, 버틸 수 있어?", GOLD, R.FONT_B, 72)
    framed(im, "long2", W // 2, 1230, 760)
    d = ImageDraw.Draw(im); text_c(d, H - 140, "playtoday.cloud", MUTED, R.FONT_R, 44)
    im.save(OUT / "slide1.png", optimize=True)

def slide2():
    im = bg(W, H, (30, 52, 46)); d = ImageDraw.Draw(im)
    y = text_c(d, 220, "먹이 4개마다", CREAM, R.FONT_B, 118)
    y = text_c(d, y, "속도 UP!", CORAL, R.FONT_B, 150)
    # four food dots -> level badge
    cy = 700; xs = [170, 330, 490, 650]
    for i, x in enumerate(xs):
        d.ellipse((x - 58, cy - 58, x + 58, cy + 58), fill=CORAL)
        d.ellipse((x - 30, cy - 40, x - 6, cy - 16), fill=(255, 200, 180))
        f = R.font(R.FONT_B, 54); s = str(i + 1); bb = d.textbbox((0, 0), s, font=f)
        d.text((x - (bb[2] - bb[0]) // 2 - bb[0], cy + 80), s, font=f, fill=MUTED)
    chevrons(d, 790, cy, 2, 60, GOLD)
    d.rounded_rectangle((850, cy - 80, 1010, cy + 80), 36, fill=GOLD)
    f = R.font(R.FONT_B, 52); bb = d.textbbox((0, 0), "Lv+1", font=f)
    d.text((930 - (bb[2] - bb[0]) // 2 - bb[0], cy - (bb[3] - bb[1]) // 2 - bb[1]), "Lv+1", font=f, fill=INK)
    framed(im, "play2", W // 2, 1480, 560, glow=TEAL)
    d = ImageDraw.Draw(im); text_c(d, H - 130, "화면에 「속도 UP」이 뜨면 긴장!", MUTED, R.FONT_R, 44)
    im.save(OUT / "slide2.png", optimize=True)

def slide3():
    im = bg(W, H, (64, 30, 30)); speed_lines(im, 1200, 1800, col=(255, 160, 130), n=18, seed=9)
    d = ImageDraw.Draw(im)
    y = text_c(d, 220, "레벨 9엔", CREAM, R.FONT_B, 120)
    y = text_c(d, y, "두 배 넘게 빨라요", CORAL, R.FONT_B, 96)
    y = text_c(d, y + 20, "한 칸 이동 0.15초 → 0.062초", CREAM, R.FONT_B, 58)
    text_c(d, y + 10, "약 2.4배 빨라지는 손맛", GOLD, R.FONT_B, 64)
    gauge(d, W // 2, 1560, 330, 1.0, label_lo="", label_hi="")
    f = R.font(R.FONT_B, 70)
    for x, t, c in ((W // 2 - 330, "Lv.1", TEAL), (W // 2 + 330, "Lv.9", CORAL)):
        bb = d.textbbox((0, 0), t, font=f); d.text((x - (bb[2] - bb[0]) // 2 - bb[0], 1600), t, font=f, fill=c)
    text_c(d, H - 130, "레벨은 결과 화면에서 확인", MUTED, R.FONT_R, 40)
    im.save(OUT / "slide3.png", optimize=True)

def xmark(d, cx, cy, s, col):
    d.line([(cx - s, cy - s), (cx + s, cy + s)], fill=col, width=18)
    d.line([(cx - s, cy + s), (cx + s, cy - s)], fill=col, width=18)

def slide4():
    im = bg(W, H, (34, 40, 58)); d = ImageDraw.Draw(im)
    y = text_c(d, 220, "벽이랑 꼬리만", CREAM, R.FONT_B, 116)
    text_c(d, y, "피하면 OK!", TEAL, R.FONT_B, 120)
    bx = framed(im, "long1", W // 2, 1130, 820, glow=TEAL)
    d = ImageDraw.Draw(im)
    for (cx, cy, t) in ((bx[0] + 10, bx[1] + 140, "벽"), (bx[2] - 10, bx[3] - 140, "내 꼬리")):
        d.ellipse((cx - 70, cy - 70, cx + 70, cy + 70), fill=(30, 20, 18), outline=CORAL, width=8)
        xmark(d, cx, cy, 34, CORAL)
    y = text_c(d, bx[3] + 60, "빨라질수록 미리미리 꺾기", GOLD, R.FONT_B, 60)
    text_c(d, H - 140, "부딪히면 바로 끝!", MUTED, R.FONT_R, 44)
    im.save(OUT / "slide4.png", optimize=True)

def slide5():
    im = bg(W, H); speed_lines(im, 300, 800, n=14, seed=21); d = ImageDraw.Draw(im)
    y = pill(d, W // 2, 170, "설치 · 가입 없이 브라우저로", INK, GOLD, 40)
    framed(im, "play3", W // 2, 760, 600, glow=GOLD)
    d = ImageDraw.Draw(im)
    y = text_c(d, 1150, "60초 버티기", CREAM, R.FONT_B, 130)
    y = text_c(d, y, "지금 도전!", CORAL, R.FONT_B, 120)
    text_c(d, y + 10, "playtoday.cloud", GOLD, R.FONT_B, 76)
    im.save(OUT / "slide5.png", optimize=True)

def card():
    S = 1080
    im = bg(S, S, (64, 34, 30)); speed_lines(im, 960, 1060, n=8, seed=5); d = ImageDraw.Draw(im)
    y = pill(d, S // 2, 48, "매일웹겜 · 스네이크 스피드 챌린지", INK, CORAL, 32) + 18
    y = text_c(d, y, "먹을수록 빨라지는데", CREAM, R.FONT_B, 80, maxw=S - 100, cw=S)
    text_c(d, y - 6, "버틸 수 있어?", GOLD, R.FONT_B, 92, maxw=S - 100, cw=S)
    gauge(d, S // 2, 680, 250, 1.0, label_lo="", label_hi="")
    f = R.font(R.FONT_B, 52)
    for x, t, c in ((S // 2 - 250, "Lv.1", TEAL), (S // 2 + 250, "Lv.9", CORAL)):
        bb = d.textbbox((0, 0), t, font=f); d.text((x - (bb[2] - bb[0]) // 2 - bb[0], 712), t, font=f, fill=c)
    y = text_c(d, 840, "먹이 4개마다 속도 UP · 최대 약 2.4배", TEAL, R.FONT_B, 44, maxw=S - 100, cw=S)
    text_c(d, y - 6, "playtoday.cloud/games/015-snake", MUTED, R.FONT_R, 36, maxw=S - 100, cw=S)
    im.save(OUT / "card.png", optimize=True)
    im.save(OUT / "card_tg.jpg", quality=92)

CAPTIONS = [
    (["먹을수록 빨라져요", "버틸 수 있어?"], "먹을수록 빨라지는 스네이크, 버틸 수 있어?"),
    (["먹이 4개마다", "속도 UP!"], "먹이 네 개마다 속도가 쑥 올라가요."),
    (["레벨 9엔", "두 배 넘게 빨라요"], "레벨 9에선 처음보다 두 배 넘게 빨라져요!"),
    (["벽이랑 꼬리만", "피하면 OK"], "벽이랑 내 꼬리만 피하면 OK."),
    (["60초 버티기", "지금 도전!"], "60초 버티기, 지금 도전!"),
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
