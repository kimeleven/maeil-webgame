#!/usr/bin/env python3
"""015-snake Day4 (golden_star_bonus): slides/card/captions. Noto Sans CJK via _tools/render_slides_kr.py."""
import sys, json, math
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

def rounded(img, r):
    m = Image.new("L", img.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, img.width - 1, img.height - 1), r, fill=255)
    return m

def framed(im, src, cx, cy, width, glow=GOLD, tilt=0):
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

def star_poly(cx, cy, r_out, r_in, n=5):
    pts = []
    for i in range(n * 2):
        ang = -math.pi / 2 + i * math.pi / n
        r = r_out if i % 2 == 0 else r_in
        pts.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))
    return pts

def draw_star(d, cx, cy, r_out, fill=GOLD, outline=None):
    pts = star_poly(cx, cy, r_out, r_out * 0.42)
    d.polygon(pts, fill=fill)
    # highlight
    hi = star_poly(cx - r_out * 0.08, cy - r_out * 0.12, r_out * 0.35, r_out * 0.14)
    d.polygon(hi, fill=(255, 240, 180))
    if outline:
        d.line(pts + [pts[0]], fill=outline, width=4)

def food_dots(d, cx, cy, n=5, gap=110, r=28):
    xs = [cx - (n - 1) * gap // 2 + i * gap for i in range(n)]
    for i, x in enumerate(xs):
        d.ellipse((x - r, cy - r, x + r, cy + r), fill=TEAL)
        d.ellipse((x - r * 0.45, cy - r * 0.55, x - r * 0.05, cy - r * 0.15), fill=(200, 255, 230))
        if i < n - 1:
            d.line([(x + r + 8, cy), (xs[i + 1] - r - 8, cy)], fill=MUTED, width=6)
    # arrow to star after 5th
    ax = xs[-1] + gap
    d.polygon([(ax - 20, cy - 24), (ax + 30, cy), (ax - 20, cy + 24)], fill=GOLD)
    draw_star(d, ax + 90, cy, 48)


def slide1():
    im = bg(W, H, (64, 48, 22)); d = ImageDraw.Draw(im)
    y = pill(d, W // 2, 140, "매일웹겜 W02 · 황금 별", INK, GOLD, 38) + 40
    y = text_c(d, y, "황금 별 보이면", CREAM, R.FONT_B, 112)
    text_c(d, y, "무조건 먹어요!", GOLD, R.FONT_B, 130)
    framed(im, "star", W // 2, 1180, 720, glow=GOLD)
    d = ImageDraw.Draw(im); text_c(d, H - 140, "playtoday.cloud", MUTED, R.FONT_R, 44)
    im.save(OUT / "slide1.png", optimize=True)

def slide2():
    im = bg(W, H, (30, 52, 46)); d = ImageDraw.Draw(im)
    y = text_c(d, 220, "먹이 다섯 개마다", CREAM, R.FONT_B, 110)
    y = text_c(d, y, "황금 별 등장!", GOLD, R.FONT_B, 140)
    food_dots(d, W // 2 - 40, 780, 5, 130, 32)
    y = text_c(d, 1000, "eaten % 5 == 0 일 때 스폰", MUTED, R.FONT_R, 48)
    # mini framed star board
    framed(im, "star", W // 2, 1480, 480, glow=TEAL)
    d = ImageDraw.Draw(im)
    im.save(OUT / "slide2.png", optimize=True)

def slide3():
    im = bg(W, H, (64, 52, 26)); d = ImageDraw.Draw(im)
    y = text_c(d, 200, "먹으면 점수 UP", CREAM, R.FONT_B, 120)
    y = text_c(d, y, "시간도 +3초!", GOLD, R.FONT_B, 130)
    # reward cards
    cards = [
        ("점수", "50+Lv×5", TEAL),
        ("시간", "+3초", GOLD),
        ("성장", "+2칸", CORAL),
    ]
    cw, ch, gap = 280, 320, 40
    x0 = (W - (3 * cw + 2 * gap)) // 2
    top = 620
    for i, (lab, val, col) in enumerate(cards):
        x = x0 + i * (cw + gap)
        d.rounded_rectangle((x, top, x + cw, top + ch), 36, fill=(36, 34, 30))
        d.rounded_rectangle((x + 6, top + 6, x + cw - 6, top + ch - 6), 30, outline=col, width=5)
        f = R.font(R.FONT_B, 44); bb = d.textbbox((0, 0), lab, font=f)
        d.text((x + cw // 2 - (bb[2] - bb[0]) // 2 - bb[0], top + 40), lab, font=f, fill=MUTED)
        f2 = R.font(R.FONT_B, 56); bb = d.textbbox((0, 0), val, font=f2)
        d.text((x + cw // 2 - (bb[2] - bb[0]) // 2 - bb[0], top + 140), val, font=f2, fill=col)
    # float text preview
    y = text_c(d, 1060, "화면에 「+점수 · +3초」", TEAL, R.FONT_B, 64)
    y = text_c(d, y, "Lv.1이면 +55점!", CREAM, R.FONT_B, 70)
    draw_star(d, W // 2, 1580, 90)
    text_c(d, 1720, "고득점 지름길", MUTED, R.FONT_R, 48)
    im.save(OUT / "slide3.png", optimize=True)

def slide4():
    im = bg(W, H, (58, 28, 28)); d = ImageDraw.Draw(im)
    y = text_c(d, 200, "5초 안 먹으면", CREAM, R.FONT_B, 116)
    text_c(d, y, "바로 사라져요!", CORAL, R.FONT_B, 130)
    # countdown ring ~5s
    cx, cy, r = W // 2, 900, 240
    d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(60, 56, 48), width=42)
    d.arc((cx - r, cy - r, cx + r, cy + r), -90, -90 + 288, fill=CORAL, width=42)  # ~80% left urgency
    f = R.font(R.FONT_B, 160); s = "5"; bb = d.textbbox((0, 0), s, font=f)
    d.text((cx - (bb[2] - bb[0]) // 2 - bb[0], cy - (bb[3] - bb[1]) // 2 - bb[1] - 30), s, font=f, fill=CREAM)
    f = R.font(R.FONT_B, 54); s = "초"; bb = d.textbbox((0, 0), s, font=f)
    d.text((cx - (bb[2] - bb[0]) // 2 - bb[0], cy + 90), s, font=f, fill=MUTED)
    y = text_c(d, 1280, "보이면 최단 거리로!", GOLD, R.FONT_B, 72)
    y = text_c(d, y, "놓치면 보너스 날아감", MUTED, R.FONT_R, 52)
    framed(im, "play2", W // 2, 1680, 360, glow=CORAL)
    im.save(OUT / "slide4.png", optimize=True)

def slide5():
    im = bg(W, H, (64, 48, 22)); d = ImageDraw.Draw(im)
    y = pill(d, W // 2, 170, "설치 · 가입 없이 브라우저로", INK, GOLD, 40)
    draw_star(d, W // 2, 480, 110)
    y = text_c(d, 680, "황금 별로 고득점", CREAM, R.FONT_B, 120)
    y = text_c(d, y, "지금 도전!", TEAL, R.FONT_B, 130)
    framed(im, "star", W // 2, 1380, 480, glow=GOLD)
    d = ImageDraw.Draw(im); text_c(d, H - 150, "playtoday.cloud", GOLD, R.FONT_B, 76)
    im.save(OUT / "slide5.png", optimize=True)

def card():
    S = 1080
    im = bg(S, S, (64, 48, 22)); d = ImageDraw.Draw(im)
    y = pill(d, S // 2, 48, "매일웹겜 · 스네이크 황금 별", INK, GOLD, 32) + 22
    y = text_c(d, y, "황금 별 보이면", CREAM, R.FONT_B, 80, maxw=S - 100, cw=S)
    text_c(d, y - 6, "무조건 먹어요!", GOLD, R.FONT_B, 110, maxw=S - 100, cw=S)
    draw_star(d, S // 2, 520, 100)
    y = text_c(d, 680, "먹이 5개마다 · 점수 UP · +3초", TEAL, R.FONT_B, 44, maxw=S - 90, cw=S)
    y = text_c(d, y - 4, "5초 안 먹으면 사라져요", CORAL, R.FONT_B, 44, maxw=S - 90, cw=S)
    text_c(d, y - 2, "playtoday.cloud/games/015-snake", MUTED, R.FONT_R, 36, maxw=S - 100, cw=S)
    im.save(OUT / "card.png", optimize=True)
    im.save(OUT / "card_tg.jpg", quality=92)

CAPTIONS = [
    (["황금 별 보이면", "무조건 먹어요"], "황금 별 보이면 무조건 먹어요!"),
    (["먹이 다섯 개마다", "황금 별 등장!"], "먹이 다섯 개마다 황금 별이 떠요."),
    (["먹으면 점수 UP", "시간도 +3초"], "먹으면 점수가 확 뛰고 시간도 3초 늘어나요."),
    (["5초 안 먹으면", "바로 사라져요"], "5초 안에 안 먹으면 사라지니 놓치지 마세요."),
    (["황금 별로 고득점", "지금 도전!"], "황금 별로 고득점, 지금 도전!"),
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
