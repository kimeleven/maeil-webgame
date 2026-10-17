#!/usr/bin/env python3
"""016-omok Day0 slides/card/captions. Uses _tools/render_slides_kr.py (Noto Sans CJK)."""
import sys, json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, "/workspace/maeil-webgame-promo/_tools")
import render_slides_kr as R

OUT = Path(__file__).resolve().parent
SRC = OUT / "_src"
W, H = 1080, 1920
INK = (20, 19, 17); CREAM = R.CREAM; GOLD = R.GOLD; TEAL = (125, 222, 192); MUTED = (201, 189, 166)
R.assert_korean(R.font(R.FONT_B, 40))

def bg(w, h):
    im = Image.new("RGB", (w, h), INK)
    glow = Image.new("RGB", (w, h), INK)
    g = ImageDraw.Draw(glow)
    g.ellipse((w // 2 - 520, int(h * 0.30), w // 2 + 520, int(h * 0.80)), fill=(52, 44, 30))
    return Image.blend(im, glow.filter(ImageFilter.GaussianBlur(120)), 0.7)

def board(name, size):
    b = Image.open(SRC / f"{name}_board.png").convert("RGB")
    s = min(b.size); b = b.crop((0, 0, s, s)).resize((size, size), Image.LANCZOS)
    m = Image.new("L", (size, size), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, size - 1, size - 1), 36, fill=255)
    return b, m

def paste_board(im, name, size, cy):
    b, m = board(name, size)
    x = (im.width - size) // 2; y = cy - size // 2
    sh = Image.new("L", im.size, 0); ImageDraw.Draw(sh).rounded_rectangle((x, y + 18, x + size, y + size + 18), 40, fill=170)
    im.paste((0, 0, 0), (0, 0), sh.filter(ImageFilter.GaussianBlur(28)))
    gl = Image.new("L", im.size, 0); ImageDraw.Draw(gl).rounded_rectangle((x - 6, y - 6, x + size + 6, y + size + 6), 42, outline=255, width=6)
    im.paste(GOLD, (0, 0), gl.filter(ImageFilter.GaussianBlur(10)))
    im.paste(b, (x, y), m)

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

SLIDES = [
    dict(kick="매일웹겜 · 이번 주 클래식 W03", t1="오목", t2="먼저 다섯 줄을 만들어라!", shot="open"),
    dict(kick="조작은 간단하게", t1="탭으로 돌 두기", t2="빈 칸을 누르면 바로 착수", shot="play"),
    dict(kick="AI와 한 판", t1="막기 · 뻗기 · 중앙", t2="네 줄 보이면 무조건 막아!", shot="threat"),
    dict(kick="빨리 이길수록", t1="점수 UP", t2="빈칸·스피드 보너스", shot="mid"),
]

def make_slides():
    for i, s in enumerate(SLIDES, 1):
        im = bg(W, H); d = ImageDraw.Draw(im)
        y = 150
        y = pill(d, W // 2, y, s["kick"], INK, GOLD, 38) + 40
        y = text_c(d, y, s["t1"], CREAM, R.FONT_B, 128 if i == 1 else 104)
        y = text_c(d, y, s["t2"], TEAL, R.FONT_B, 58)
        paste_board(im, s["shot"], 860, 1010 + 40)
        d = ImageDraw.Draw(im)
        text_c(d, H - 150, "playtoday.cloud", MUTED, R.FONT_R, 44)
        im.save(OUT / f"slide{i}.png", optimize=True)
    im = bg(W, H); d = ImageDraw.Draw(im)
    paste_board(im, "win", 620, 760)
    d = ImageDraw.Draw(im)
    y = 180
    y = pill(d, W // 2, y, "설치 · 가입 없이 바로", INK, GOLD, 40)
    y = 1120
    y = text_c(d, y, "지금 한 판!", CREAM, R.FONT_B, 120)
    y = text_c(d, y, "playtoday.cloud", GOLD, R.FONT_B, 78)
    y = text_c(d, y + 10, "나를 이겨봐 · 순위에 이름 올리기", MUTED, R.FONT_R, 44)
    im.save(OUT / "slide5.png", optimize=True)

def make_card():
    S = 1080
    im = bg(S, S); d = ImageDraw.Draw(im)
    paste_board(im, "open", 560, 610)
    d = ImageDraw.Draw(im)
    y = 52
    y = pill(d, S // 2, y, "매일웹겜 · 이번 주 클래식 W03", INK, GOLD, 32) + 8
    text_c(d, y, "오목", CREAM, R.FONT_B, 104, maxw=S - 120)
    y = 912
    y = text_c(d, y, "탭으로 돌 놓고 · 먼저 다섯 줄!", TEAL, R.FONT_B, 46, maxw=S - 100)
    text_c(d, y - 8, "playtoday.cloud/games/016-omok", MUTED, R.FONT_R, 36, maxw=S - 100)
    im.save(OUT / "card.png", optimize=True)
    im.save(OUT / "card_tg.jpg", quality=92)

CAPTIONS = [
    (["이번 주 매일웹겜은", "오목!"], "이번 주 매일웹겜은 오목!"),
    (["탭으로 돌을 놓고"], "탭으로 돌을 놓고"),
    (["먼저 다섯 줄을", "만들어 보세요"], "먼저 다섯 줄을 만들어 보세요."),
    (["AI와 한 판,"], "AI와 한 판,"),
    (["빨리 이길수록", "고득점!"], "빨리 이길수록 고득점!"),
]

def make_captions():
    capdir = OUT / "captions"; capdir.mkdir(exist_ok=True)
    f = R.font(R.FONT_B, 104)
    meta = []
    for i, (lines, weight) in enumerate(CAPTIONS):
        assert len(lines) <= 2 and all(len(l) <= 12 for l in lines), lines
        im = Image.new("RGBA", (W, 330), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        lh = 128; y0 = (330 - lh * len(lines)) // 2
        for j, line in enumerate(lines):
            bb = d.textbbox((0, 0), line, font=f, stroke_width=10)
            x = (W - (bb[2] - bb[0])) // 2 - bb[0]
            d.text((x, y0 + j * lh - bb[1] + 4), line, font=f, fill=(255, 255, 255), stroke_width=10, stroke_fill=(0, 0, 0))
        p = capdir / f"cap{i + 1}.png"; im.save(p)
        meta.append(dict(file=p.name, lines=lines, weight=len(weight.replace(" ", ""))))
    (capdir / "captions.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1))

if __name__ == "__main__":
    make_slides(); make_card(); make_captions(); print("ok")
