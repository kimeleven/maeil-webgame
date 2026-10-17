#!/usr/bin/env python3
"""016-omok Day2 (block_four): 막기 챌린지 · AI 네 줄 차단. Board-top / text-bottom challenge layout.
Boards drawn procedurally in game style; CTA uses real game screenshot. Noto Sans CJK only."""
import sys, json, math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, "/workspace/maeil-webgame-promo/_tools")
import render_slides_kr as R

OUT = Path(__file__).resolve().parent
SRC = OUT / "_src"
W, H = 1080, 1920
INK = (20, 19, 17); CREAM = R.CREAM; GOLD = R.GOLD; MUTED = (201, 189, 166)
RED = (255, 84, 72); GREEN = (96, 230, 150); TEAL = (125, 222, 192)
R.assert_korean(R.font(R.FONT_B, 40))

def bg(w, h, tint):
    im = Image.new("RGB", (w, h), INK)
    glow = Image.new("RGB", (w, h), INK)
    ImageDraw.Draw(glow).ellipse((w // 2 - 560, int(h * 0.05), w // 2 + 560, int(h * 0.60)), fill=tint)
    return Image.blend(im, glow.filter(ImageFilter.GaussianBlur(130)), 0.75)

N = 15
def draw_board(size, black=(), white=(), danger=None, block=(), marks=(), last=None):
    """coords (col,row) 0..14. danger=list of points to draw red line through. block=green-ringed stones. marks=red X empty points."""
    S = 900; im = Image.new("RGB", (S, S), (54, 42, 28)); d = ImageDraw.Draw(im)
    for y in range(S):  # wood gradient
        t = y / S; d.line((0, y, S, y), fill=(int(60 - 22 * t), int(47 - 16 * t), int(31 - 10 * t)))
    for k in range(0, S, 37):
        d.line((0, k, S, k + 6), fill=(70, 55, 36), width=1)
    m = 55; c = (S - 2 * m) / (N - 1)
    P = lambda col, row: (m + col * c, m + row * c)
    for i in range(N):
        d.line((m, m + i * c, S - m, m + i * c), fill=(22, 18, 12), width=2)
        d.line((m + i * c, m, m + i * c, S - m), fill=(22, 18, 12), width=2)
    for (a, b) in [(3, 3), (11, 3), (3, 11), (11, 11), (7, 7)]:
        x, y = P(a, b); d.ellipse((x - 5, y - 5, x + 5, y + 5), fill=(22, 18, 12))
    d.rectangle((2, 2, S - 3, S - 3), outline=GOLD, width=4)
    r = c * 0.43
    if danger:
        x0, y0 = P(*danger[0]); x1, y1 = P(*danger[-1])
        ov = Image.new("RGBA", (S, S), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
        od.line((x0, y0, x1, y1), fill=RED + (150,), width=int(c * 0.95))
        im.paste(ov.filter(ImageFilter.GaussianBlur(14)), (0, 0), ov.filter(ImageFilter.GaussianBlur(14)))
        d = ImageDraw.Draw(im)
    def stone(col, row, kind):
        x, y = P(col, row)
        sh = Image.new("L", (S, S), 0); ImageDraw.Draw(sh).ellipse((x - r + 3, y - r + 6, x + r + 3, y + r + 6), fill=150)
        im.paste((0, 0, 0), (0, 0), sh.filter(ImageFilter.GaussianBlur(5)))
        dd = ImageDraw.Draw(im)
        if kind == "b":
            dd.ellipse((x - r, y - r, x + r, y + r), fill=(26, 25, 24), outline=(8, 8, 8), width=2)
            dd.ellipse((x - r * 0.55, y - r * 0.6, x - r * 0.15, y - r * 0.2), fill=(70, 70, 68))
        else:
            dd.ellipse((x - r, y - r, x + r, y + r), fill=(236, 226, 205), outline=(180, 168, 145), width=2)
            dd.ellipse((x - r * 0.6, y - r * 0.62, x - r * 0.1, y - r * 0.2), fill=(252, 248, 238))
    for p in black: stone(*p, "b")
    for p in white: stone(*p, "w")
    d = ImageDraw.Draw(im)
    if last:
        x, y = P(*last); d.ellipse((x - 7, y - 7, x + 7, y + 7), fill=GOLD)
    for p in block:
        x, y = P(*p)
        gl = Image.new("L", (S, S), 0); ImageDraw.Draw(gl).ellipse((x - r - 14, y - r - 14, x + r + 14, y + r + 14), outline=255, width=10)
        im.paste(GREEN, (0, 0), gl.filter(ImageFilter.GaussianBlur(6)))
        ImageDraw.Draw(im).ellipse((x - r - 10, y - r - 10, x + r + 10, y + r + 10), outline=GREEN, width=5)
    d = ImageDraw.Draw(im)
    for p in marks:
        x, y = P(*p); q = r * 0.75
        gl = Image.new("L", (S, S), 0); ImageDraw.Draw(gl).ellipse((x - r - 8, y - r - 8, x + r + 8, y + r + 8), fill=200)
        im.paste(RED, (0, 0), gl.filter(ImageFilter.GaussianBlur(12)))
        d = ImageDraw.Draw(im)
        d.line((x - q, y - q, x + q, y + q), fill=(255, 255, 255), width=9); d.line((x - q, y + q, x + q, y - q), fill=(255, 255, 255), width=9)
    return im.resize((size, size), Image.LANCZOS)

def paste(im, b, cy, glow=GOLD):
    size = b.size[0]; x = (im.width - size) // 2; y = cy - size // 2
    m = Image.new("L", (size, size), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, size - 1, size - 1), 36, fill=255)
    sh = Image.new("L", im.size, 0); ImageDraw.Draw(sh).rounded_rectangle((x, y + 18, x + size, y + size + 18), 40, fill=170)
    im.paste((0, 0, 0), (0, 0), sh.filter(ImageFilter.GaussianBlur(28)))
    gl = Image.new("L", im.size, 0); ImageDraw.Draw(gl).rounded_rectangle((x - 6, y - 6, x + size + 6, y + size + 6), 42, outline=255, width=8)
    im.paste(glow, (0, 0), gl.filter(ImageFilter.GaussianBlur(12)))
    im.paste(b, (x, y), m)
    return y, y + size

def text_c(d, y, text, color, path, start, maxw=W - 140):
    f, bb = R.fit(d, text, path, maxw, start)
    x = (d.im.size[0] - (bb[2] - bb[0])) // 2 - bb[0]
    d.text((x + 3, y + 4), text, font=f, fill=(0, 0, 0)); d.text((x, y), text, font=f, fill=color)
    return y + (bb[3] - bb[1]) + 26

def pill(d, cx, y, text, fg, bgc, size=40):
    f = R.font(R.FONT_B, size); bb = d.textbbox((0, 0), text, font=f)
    w = bb[2] - bb[0] + 64; h = bb[3] - bb[1] + 34
    d.rounded_rectangle((cx - w // 2, y, cx + w // 2, y + h), h // 2, fill=bgc)
    d.text((cx - (bb[2] - bb[0]) // 2 - bb[0], y + 17 - bb[1]), text, font=f, fill=fg)
    return y + h

def stage_bar(d, y, step):
    labels = ["발견", "막기", "끊기"]
    for i, lab in enumerate(labels):
        cx = W // 2 + (i - 1) * 240
        on = i < step
        d.rounded_rectangle((cx - 100, y, cx + 100, y + 64), 32, fill=GREEN if on else (60, 56, 50))
        f = R.font(R.FONT_B, 34); bb = d.textbbox((0, 0), lab, font=f)
        d.text((cx - (bb[2] - bb[0]) // 2 - bb[0], y + 32 - (bb[3] - bb[1]) // 2 - bb[1]), lab, font=f, fill=INK if on else MUTED)

# positions: AI = white four on row 7 cols 5..8, player = black
AI4 = [(5, 7), (6, 7), (7, 7), (8, 7)]
ME = [(6, 6), (7, 8), (8, 6), (6, 8), (9, 9)]
BOARDS = {
    "hook": dict(white=AI4, black=ME, danger=AI4, last=(8, 7)),
    "find": dict(white=AI4, black=ME, danger=[(4, 7), (9, 7)], marks=[(4, 7), (9, 7)], last=(8, 7)),
    "block": dict(white=AI4 + [(4, 7)], black=ME + [(9, 7)], block=[(9, 7)], last=(9, 7)),
    "three": dict(white=[(6, 5), (7, 6), (8, 7), (4, 7), (5, 7)], black=ME[:2] + [(9, 9), (9, 8)], danger=[(6, 5), (8, 7)], block=[(9, 8)], last=(9, 8)),
}

SLIDES = [
    dict(b="hook", kick="매일웹겜 W03 · 오목 막기 챌린지", t1="네 줄 보이면", t2="무조건 막아!", c2=RED, tint=(70, 30, 26), glow=RED, step=0),
    dict(b="find", kick="1단계 · 발견", t1="AI 네 줄 = 위험", t2="양 끝 빈칸을 찾기", c2=RED, tint=(64, 34, 30), glow=RED, step=1),
    dict(b="block", kick="2단계 · 막기", t1="끝을 바로 막기", t2="한 수 늦으면 패배", c2=GREEN, tint=(26, 58, 40), glow=GREEN, step=2),
    dict(b="three", kick="3단계 · 끊기", t1="열린 셋도 미리", t2="한쪽 끝을 끊어 두기", c2=TEAL, tint=(26, 50, 56), glow=TEAL, step=3),
]

def make_slides():
    for i, s in enumerate(SLIDES, 1):
        im = bg(W, H, s["tint"]); d = ImageDraw.Draw(im)
        pill(d, W // 2, 110, s["kick"], INK, GOLD, 36)
        paste(im, draw_board(860, **BOARDS[s["b"]]), 700, s["glow"])
        d = ImageDraw.Draw(im)
        y = 1190
        y = text_c(d, y, s["t1"], CREAM, R.FONT_B, 112)
        y = text_c(d, y, s["t2"], s["c2"], R.FONT_B, 64)
        stage_bar(d, 1640, s["step"])
        text_c(d, H - 130, "playtoday.cloud", MUTED, R.FONT_R, 40)
        im.save(OUT / f"slide{i}.png", optimize=True)
    # CTA with real game screenshot
    im = bg(W, H, (40, 46, 34)); d = ImageDraw.Draw(im)
    b = Image.open(SRC / "win_board.png").convert("RGB"); s0 = min(b.size)
    paste(im, b.crop((0, 0, s0, s0)).resize((700, 700), Image.LANCZOS), 620)
    d = ImageDraw.Draw(im)
    y = 1060
    y = text_c(d, y, "막기 챌린지 도전!", CREAM, R.FONT_B, 116)
    y = text_c(d, y, "playtoday.cloud", GOLD, R.FONT_B, 78)
    y = text_c(d, y + 10, "설치 · 가입 없이 AI와 한 판", MUTED, R.FONT_R, 44)
    pill(d, W // 2, 1640, "AI 네 줄, 다 막을 수 있어?", INK, GREEN, 42)
    im.save(OUT / "slide5.png", optimize=True)

def make_card():
    S = 1080
    im = bg(S, S, (66, 32, 28)); d = ImageDraw.Draw(im)
    pill(d, S // 2, 40, "매일웹겜 · 오목 막기 챌린지", INK, GOLD, 32)
    paste(im, draw_board(560, **BOARDS["find"]), 470, RED)
    d = ImageDraw.Draw(im)
    y = 780
    y = text_c(d, y, "네 줄 보이면 무조건 막아!", CREAM, R.FONT_B, 76, maxw=S - 80)
    y = text_c(d, y - 6, "발견 · 막기 · 열린 셋 끊기", GREEN, R.FONT_B, 40, maxw=S - 80)
    text_c(d, y - 10, "playtoday.cloud/games/016-omok", MUTED, R.FONT_R, 32, maxw=S - 100)
    im.save(OUT / "card.png", optimize=True)
    im.save(OUT / "card_tg.jpg", quality=92)

CAPTIONS = [
    (["오목 막기 챌린지!"], "오목 막기 챌린지!"),
    (["AI가 네 줄을", "만들면"], "AI가 네 줄을 만들면"),
    (["바로 끝을", "막아요"], "바로 끝을 막아요."),
    (["열린 셋도", "미리 끊어 두세요"], "열린 셋도 미리 끊어 두세요."),
    (["막아야 이겨요"], "막아야 이겨요,"),
    (["지금 도전!"], "지금 도전!"),
]

def make_captions():
    capdir = OUT / "captions"; capdir.mkdir(exist_ok=True)
    for p in capdir.glob("cap*.png"): p.unlink()
    f = R.font(R.FONT_B, 104); meta = []
    for i, (lines, weight) in enumerate(CAPTIONS):
        assert len(lines) <= 2 and all(len(l) <= 12 for l in lines), lines
        im = Image.new("RGBA", (W, 330), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        lh = 128; y0 = (330 - lh * len(lines)) // 2
        for j, line in enumerate(lines):
            ff, bb = R.fit(d, line, R.FONT_B, W - 80, 104)
            bb = d.textbbox((0, 0), line, font=ff, stroke_width=10)
            x = (W - (bb[2] - bb[0])) // 2 - bb[0]
            d.text((x, y0 + j * lh - bb[1] + 4), line, font=ff, fill=(255, 255, 255), stroke_width=10, stroke_fill=(0, 0, 0))
        p = capdir / f"cap{i + 1}.png"; im.save(p)
        meta.append(dict(file=p.name, lines=lines, weight=len(weight.replace(" ", ""))))
    (capdir / "captions.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1))

if __name__ == "__main__":
    make_slides(); make_card(); make_captions(); print("ok")
