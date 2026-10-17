#!/usr/bin/env python3
"""016-omok Day1 (opening_tips): 한수 팁 · 중앙·삼삼 감각. Noto Sans CJK via _tools/render_slides_kr.py."""
import sys, json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, "/workspace/maeil-webgame-promo/_tools")
import render_slides_kr as R

OUT = Path(__file__).resolve().parent
SRC = OUT / "_src"
W, H = 1080, 1920
INK = (20, 19, 17); CREAM = R.CREAM; GOLD = R.GOLD; TEAL = (125, 222, 192); MUTED = (201, 189, 166); CORAL = (255, 122, 92)
R.assert_korean(R.font(R.FONT_B, 40))

def bg(w, h, tint=(44, 52, 38)):
    im = Image.new("RGB", (w, h), INK)
    glow = Image.new("RGB", (w, h), INK)
    g = ImageDraw.Draw(glow)
    g.ellipse((w // 2 - 520, int(h * 0.30), w // 2 + 520, int(h * 0.80)), fill=tint)
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

def num_badge(d, cx, cy, n, col=GOLD):
    d.ellipse((cx - 56, cy - 56, cx + 56, cy + 56), fill=col)
    f = R.font(R.FONT_B, 72); bb = d.textbbox((0, 0), str(n), font=f)
    d.text((cx - (bb[2] - bb[0]) // 2 - bb[0], cy - (bb[3] - bb[1]) // 2 - bb[1]), str(n), font=f, fill=INK)

SLIDES = [
    dict(kick="매일웹겜 W03 · 오목 한수 팁", t1="첫수부터 유리하게", t2="가운데 근처가 핵심!", shot="open", tint=(44, 52, 38)),
    dict(kick="팁 ① 오프닝", t1="가운데 근처", t2="중앙을 잡으면 사방 유리", shot="mid", tint=(36, 48, 58), num=1),
    dict(kick="팁 ② 전개", t1="사방으로 뻗기", t2="한쪽에만 몰지 마세요", shot="play", tint=(52, 44, 30), num=2),
    dict(kick="팁 ③ 주의", t1="삼삼은 피하세요", t2="금수·약점 만들지 않기", shot="threat", tint=(58, 36, 40), num=3),
]

def make_slides():
    for i, s in enumerate(SLIDES, 1):
        im = bg(W, H, s.get("tint", (44, 52, 38))); d = ImageDraw.Draw(im)
        y = 140
        if s.get("num"):
            num_badge(d, W // 2, 200, s["num"]); y = 280
        y = pill(d, W // 2, y, s["kick"], INK, GOLD, 36) + 36
        y = text_c(d, y, s["t1"], CREAM, R.FONT_B, 110)
        y = text_c(d, y, s["t2"], TEAL if i != 4 else CORAL, R.FONT_B, 56)
        paste_board(im, s["shot"], 820 if i > 1 else 860, 1080)
        d = ImageDraw.Draw(im)
        text_c(d, H - 150, "playtoday.cloud", MUTED, R.FONT_R, 44)
        im.save(OUT / f"slide{i}.png", optimize=True)
    im = bg(W, H, (40, 46, 34)); d = ImageDraw.Draw(im)
    paste_board(im, "win", 620, 760)
    d = ImageDraw.Draw(im)
    y = 180
    y = pill(d, W // 2, y, "설치 · 가입 없이 바로", INK, GOLD, 40)
    y = 1120
    y = text_c(d, y, "지금 한 판!", CREAM, R.FONT_B, 120)
    y = text_c(d, y, "playtoday.cloud", GOLD, R.FONT_B, 78)
    y = text_c(d, y + 10, "첫수 팁으로 AI 이겨보기", MUTED, R.FONT_R, 44)
    im.save(OUT / "slide5.png", optimize=True)

def make_card():
    S = 1080
    im = bg(S, S, (44, 52, 38)); d = ImageDraw.Draw(im)
    paste_board(im, "mid", 540, 600)
    d = ImageDraw.Draw(im)
    y = 48
    y = pill(d, S // 2, y, "매일웹겜 · 오목 한수 팁", INK, GOLD, 32) + 6
    text_c(d, y, "첫수는 가운데!", CREAM, R.FONT_B, 92, maxw=S - 100)
    y = 900
    y = text_c(d, y, "중앙 잡고 · 사방 뻗고 · 삼삼 피하기", TEAL, R.FONT_B, 40, maxw=S - 80)
    text_c(d, y - 4, "playtoday.cloud/games/016-omok", MUTED, R.FONT_R, 34, maxw=S - 100)
    im.save(OUT / "card.png", optimize=True)
    im.save(OUT / "card_tg.jpg", quality=92)

CAPTIONS = [
    (["오목 첫수 팁!"], "오목 첫수 팁!"),
    (["가운데 근처가", "유리해요"], "가운데 근처가 유리해요."),
    (["중앙을 잡고", "사방으로 뻗고"], "중앙을 잡고 사방으로 뻗고,"),
    (["삼삼은 피하세요"], "삼삼은 피하세요."),
    (["지금 한 판!"], "지금 한 판!"),
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
