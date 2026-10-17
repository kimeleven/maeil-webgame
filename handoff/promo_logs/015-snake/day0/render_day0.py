#!/usr/bin/env python3
"""015-snake Day0 slides/card/captions. Uses _tools/render_slides_kr.py (Noto Sans CJK) helpers."""
import sys, json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, "/workspace/maeil-webgame-promo/_tools")
import render_slides_kr as R  # FONT_B/FONT_R = Noto Sans CJK, font(), fit(), assert_korean()

OUT = Path(__file__).resolve().parent
SRC = OUT / "_src"
W, H = 1080, 1920
INK = (20, 19, 17); CREAM = R.CREAM; GOLD = R.GOLD; TEAL = (125, 222, 192); MUTED = (201, 189, 166); CORAL = (255, 122, 92)
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
    dict(kick="매일웹겜 · 이번 주 클래식 W02", t1="스네이크", t2="먹을수록 빨라진다!", shot="long2"),
    dict(kick="조작은 간단하게", t1="스와이프로 휙휙", t2="방향패드 · 방향키도 OK", shot="long1"),
    dict(kick="반짝이는 먹이를 냠!", t1="길어질수록 짜릿", t2="연속으로 먹으면 콤보 점수", shot="play3"),
    dict(kick="60초 한 판", t1="속도 UP 챌린지", t2="황금 별 = 보너스 +3초", shot="star"),
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
    # end slide
    im = bg(W, H); d = ImageDraw.Draw(im)
    paste_board(im, "long2", 620, 760)
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
    paste_board(im, "long1", 560, 610)
    d = ImageDraw.Draw(im)
    y = 52
    y = pill(d, S // 2, y, "매일웹겜 · 이번 주 클래식 W02", INK, GOLD, 32) + 8
    text_c(d, y, "스네이크", CREAM, R.FONT_B, 104, maxw=S - 120)
    y = 912
    y = text_c(d, y, "스와이프로 휙휙 · 먹을수록 빨라져요", TEAL, R.FONT_B, 46, maxw=S - 100)
    text_c(d, y - 8, "playtoday.cloud/games/015-snake", MUTED, R.FONT_R, 36, maxw=S - 100)
    im.save(OUT / "card.png", optimize=True)
    im.save(OUT / "card_tg.jpg", quality=92)

# ---- captions: ≤12 chars/line, ≤2 lines; (lines, narration-weight-text)
CAPTIONS = [
    (["이번 주 매일웹겜은", "스네이크!"], "이번 주 매일웹겜은 스네이크!"),
    (["스와이프로 휙휙!"], "스와이프로 휙휙,"),
    (["반짝이는 먹이를", "먹을수록"], "반짝이는 먹이를 먹을수록"),
    (["점점 빨라져요!"], "점점 빨라져요."),
    (["60초 최고 기록"], "60초 최고 기록,"),
    (["지금 도전!"], "지금 도전!"),
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
