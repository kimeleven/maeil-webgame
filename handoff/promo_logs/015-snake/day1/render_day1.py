#!/usr/bin/env python3
"""015-snake Day1 (controls_tips): slides/card/captions. Noto Sans CJK via _tools/render_slides_kr.py."""
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

def bg(w, h, tint=(40, 52, 46)):
    im = Image.new("RGB", (w, h), INK)
    glow = Image.new("RGB", (w, h), INK)
    g = ImageDraw.Draw(glow)
    g.ellipse((w // 2 - 560, int(h * 0.28), w // 2 + 560, int(h * 0.86)), fill=tint)
    return Image.blend(im, glow.filter(ImageFilter.GaussianBlur(130)), 0.75)

def rounded(img, r):
    m = Image.new("L", img.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, img.width - 1, img.height - 1), r, fill=255)
    return m

def framed(im, src, box, cx, cy, width, glow=TEAL):
    p = Image.open(SRC / f"{src}.png").convert("RGB").crop(box)
    h = int(p.height * width / p.width); p = p.resize((width, h), Image.LANCZOS)
    x = cx - width // 2; y = cy - h // 2
    sh = Image.new("L", im.size, 0); ImageDraw.Draw(sh).rounded_rectangle((x, y + 20, x + width, y + h + 20), 44, fill=170)
    im.paste((0, 0, 0), (0, 0), sh.filter(ImageFilter.GaussianBlur(30)))
    gl = Image.new("L", im.size, 0); ImageDraw.Draw(gl).rounded_rectangle((x - 6, y - 6, x + width + 6, y + h + 6), 46, outline=255, width=6)
    im.paste(glow, (0, 0), gl.filter(ImageFilter.GaussianBlur(10)))
    im.paste(p, (x, y), rounded(p, 40))
    return (x, y, x + width, y + h)

def text_c(d, y, text, color, path, start, maxw=W - 140, shadow=True):
    f, bb = R.fit(d, text, path, maxw, start)
    tw = bb[2] - bb[0]; x = (d.im.size[0] - tw) // 2 - bb[0]
    if shadow: d.text((x + 3, y + 4), text, font=f, fill=(0, 0, 0))
    d.text((x, y), text, font=f, fill=color)
    return y + (bb[3] - bb[1]) + 26

def pill(d, cx, y, text, fg, bgc, size=40):
    f = R.font(R.FONT_B, size); bb = d.textbbox((0, 0), text, font=f)
    w = bb[2] - bb[0] + 64; h = bb[3] - bb[1] + 34
    d.rounded_rectangle((cx - w // 2, y, cx + w // 2, y + h), h // 2, fill=bgc)
    d.text((cx - (bb[2] - bb[0]) // 2 - bb[0], y + 17 - bb[1]), text, font=f, fill=fg)
    return y + h

def num_badge(d, cx, cy, n, col=GOLD):
    d.ellipse((cx - 62, cy - 62, cx + 62, cy + 62), fill=col)
    f = R.font(R.FONT_B, 80); bb = d.textbbox((0, 0), str(n), font=f)
    d.text((cx - (bb[2] - bb[0]) // 2 - bb[0], cy - (bb[3] - bb[1]) // 2 - bb[1]), str(n), font=f, fill=INK)

def tri(d, cx, cy, s, direction, fill):
    pts = {"up": [(cx, cy - s), (cx - s, cy + s * .7), (cx + s, cy + s * .7)],
           "down": [(cx, cy + s), (cx - s, cy - s * .7), (cx + s, cy - s * .7)],
           "left": [(cx - s, cy), (cx + s * .7, cy - s), (cx + s * .7, cy + s)],
           "right": [(cx + s, cy), (cx - s * .7, cy - s), (cx - s * .7, cy + s)]}[direction]
    d.polygon(pts, fill=fill)

def keycap(d, x, y, w, h, label=None, arrow=None, hot=False):
    d.rounded_rectangle((x, y + 10, x + w, y + h + 10), 22, fill=(8, 8, 7))
    d.rounded_rectangle((x, y, x + w, y + h), 22, fill=(70, 64, 54) if not hot else GOLD, outline=(110, 100, 84), width=3)
    c = (x + w // 2, y + h // 2)
    fg = CREAM if not hot else INK
    if arrow: tri(d, c[0], c[1], 26, arrow, fg)
    if label:
        f = R.font(R.FONT_B, 64); bb = d.textbbox((0, 0), label, font=f)
        d.text((c[0] - (bb[2] - bb[0]) // 2 - bb[0], c[1] - (bb[3] - bb[1]) // 2 - bb[1]), label, font=f, fill=fg)

def swipe_arrow(im, x0, y0, x1, y1):
    lay = Image.new("RGBA", im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    for k in range(10):
        t = k / 9; a = int(60 + 180 * t)
        x = x0 + (x1 - x0) * t; y = y0 + (y1 - y0) * t
        r = 16 + 10 * t
        d.ellipse((x - r, y - r, x + r, y + r), fill=(255, 255, 255, a))
    tri(d, x1 + 40, y1, 46, "right", (255, 255, 255, 240))
    # finger dot
    d.ellipse((x0 - 46, y0 - 46, x0 + 46, y0 + 46), outline=(255, 214, 120, 255), width=8)
    im.paste(lay, (0, 0), lay)

FULL = (0, 0, 1170, 2280)
BOARD = (34, 440, 1140, 1556)
PAD = (240, 1870, 930, 2270)

def slide1():
    im = bg(W, H); d = ImageDraw.Draw(im)
    y = pill(d, W // 2, 140, "매일웹겜 W02 · 스네이크 조작 팁", INK, GOLD, 38) + 40
    y = text_c(d, y, "조작 3종 꿀팁", CREAM, R.FONT_B, 124)
    text_c(d, y, "손가락 한 번이면 방향 전환", TEAL, R.FONT_B, 58)
    framed(im, "play1", FULL, W // 2, 1180, 600)
    d = ImageDraw.Draw(im); text_c(d, H - 140, "playtoday.cloud", MUTED, R.FONT_R, 44)
    im.save(OUT / "slide1.png", optimize=True)

def slide2():
    im = bg(W, H, (30, 50, 60)); d = ImageDraw.Draw(im)
    num_badge(d, W // 2, 230, 1)
    y = text_c(d, 330, "스와이프", CREAM, R.FONT_B, 120)
    text_c(d, y, "화면을 쓱 밀면 그쪽으로!", TEAL, R.FONT_B, 58)
    bx = framed(im, "long1", BOARD, W // 2, 1170, 900)
    swipe_arrow(im, bx[0] + 220, bx[1] + 470, bx[2] - 240, bx[1] + 470)
    d = ImageDraw.Draw(im); text_c(d, H - 160, "모바일 추천 · 한 손으로 OK", MUTED, R.FONT_R, 46)
    im.save(OUT / "slide2.png", optimize=True)

def slide3():
    im = bg(W, H, (58, 46, 30)); d = ImageDraw.Draw(im)
    num_badge(d, W // 2, 230, 2)
    y = text_c(d, 330, "방향패드", CREAM, R.FONT_B, 120)
    text_c(d, y, "아래 버튼을 톡톡!", TEAL, R.FONT_B, 58)
    framed(im, "play2", BOARD, W // 2, 940, 700, glow=GOLD)
    framed(im, "play2", PAD, W // 2, 1520, 820, glow=GOLD)
    d = ImageDraw.Draw(im); text_c(d, H - 150, "정확하게 꺾고 싶을 때", MUTED, R.FONT_R, 46)
    im.save(OUT / "slide3.png", optimize=True)

def slide4():
    im = bg(W, H, (50, 36, 52)); d = ImageDraw.Draw(im)
    num_badge(d, W // 2, 230, 3)
    y = text_c(d, 330, "PC 키보드", CREAM, R.FONT_B, 120)
    text_c(d, y, "방향키 또는 WASD", TEAL, R.FONT_B, 62)
    s = 170; g = 22; cx = W // 2; top = 820
    keycap(d, cx - s // 2, top, s, s, arrow="up", hot=True)
    for i, a in enumerate(["left", "down", "right"]):
        keycap(d, cx - s // 2 + (i - 1) * (s + g), top + s + g, s, s, arrow=a, hot=(a == "right"))
    top2 = 1340; s2 = 150
    keycap(d, cx - s2 // 2, top2, s2, s2, label="W")
    for i, l in enumerate("ASD"):
        keycap(d, cx - s2 // 2 + (i - 1) * (s2 + g), top2 + s2 + g, s2, s2, label=l)
    text_c(d, H - 160, "책상에서도 손맛 그대로", MUTED, R.FONT_R, 46)
    im.save(OUT / "slide4.png", optimize=True)

def slide5():
    im = bg(W, H); d = ImageDraw.Draw(im)
    y = pill(d, W // 2, 170, "설치 · 가입 없이 브라우저로", INK, GOLD, 40)
    framed(im, "long2", BOARD, W // 2, 760, 640)
    d = ImageDraw.Draw(im)
    y = text_c(d, 1150, "편한 걸로 한 판!", CREAM, R.FONT_B, 116)
    y = text_c(d, y, "playtoday.cloud", GOLD, R.FONT_B, 80)
    text_c(d, y + 10, "60초 · 먹을수록 빨라지는 스네이크", MUTED, R.FONT_R, 44)
    im.save(OUT / "slide5.png", optimize=True)

def card():
    S = 1080
    im = bg(S, S, (36, 50, 44)); d = ImageDraw.Draw(im)
    y = pill(d, S // 2, 48, "매일웹겜 · 스네이크 조작 꿀팁", INK, GOLD, 32) + 14
    text_c(d, y, "조작은 3가지, 고르면 끝", CREAM, R.FONT_B, 76, maxw=S - 100)
    # three columns
    cols = [("1", "스와이프", "쓱 밀기"), ("2", "방향패드", "톡톡 누르기"), ("3", "키보드", "방향키로 착착")]
    cw = 300; gap = 30; x0 = (S - (cw * 3 + gap * 2)) // 2; top = 300
    for i, (n, t, s) in enumerate(cols):
        x = x0 + i * (cw + gap)
        d.rounded_rectangle((x, top, x + cw, top + 420), 34, fill=(34, 32, 28), outline=(90, 82, 66), width=3)
        num_badge(d, x + cw // 2, top + 80, n, col=[TEAL, GOLD, CORAL][i])
        f, bb = R.fit(d, t, R.FONT_B, cw - 30, 58)
        d.text((x + cw // 2 - (bb[2] - bb[0]) // 2 - bb[0], top + 180), t, font=f, fill=CREAM)
        f2, bb2 = R.fit(d, s, R.FONT_R, cw - 30, 40)
        d.text((x + cw // 2 - (bb2[2] - bb2[0]) // 2 - bb2[0], top + 268), s, font=f2, fill=MUTED)
        cx = x + cw // 2; cy = top + 372
        if i == 0:
            for k in range(5): d.ellipse((cx - 90 + k * 36 - 8, cy - 8, cx - 90 + k * 36 + 8, cy + 8), fill=(255, 255, 255, ))
            tri(d, cx + 98, cy, 18, "right", (255, 255, 255))
        elif i == 1:
            for dx, dy, a in ((0, -16, "up"), (-34, 16, "left"), (0, 16, "down"), (34, 16, "right")): tri(d, cx + dx, cy + dy, 12, a, GOLD)
        else:
            for k, l in enumerate("WASD"):
                f3 = R.font(R.FONT_B, 34); bb3 = d.textbbox((0, 0), l, font=f3)
                d.text((cx - 84 + k * 46, cy - 26), l, font=f3, fill=CORAL)
    y = 790
    y = text_c(d, y, "손가락 한 번이면 방향 전환!", TEAL, R.FONT_B, 54, maxw=S - 100)
    text_c(d, y, "playtoday.cloud/games/015-snake", MUTED, R.FONT_R, 38, maxw=S - 100)
    im.save(OUT / "card.png", optimize=True)
    im.save(OUT / "card_tg.jpg", quality=92)

CAPTIONS = [
    (["스네이크", "조작 꿀팁 3가지!"], "스네이크 조작 꿀팁 세 가지!"),
    (["첫째, 쓱 밀면", "방향 전환!"], "첫째, 화면을 쓱 밀면 방향 전환."),
    (["둘째, 아래", "방향패드 톡톡!"], "둘째, 아래 방향패드를 톡톡."),
    (["셋째, PC는", "키보드 방향키!"], "셋째, PC는 키보드 방향키로!"),
    (["편한 걸로", "지금 한 판!"], "편한 걸로 지금 한 판!"),
]

def captions():
    capdir = OUT / "captions"; capdir.mkdir(exist_ok=True)
    f = R.font(R.FONT_B, 104); meta = []
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
