#!/usr/bin/env python3
"""016-omok Day3 (double_threat): 양날 공격 · 한 수로 두 방향 위협.
Layout DISTINCT from Day0–2: dual threat arrows + A|B split panels (AI can block only one).
Procedural boards; CTA uses real game screenshot. Noto Sans CJK only."""
import sys, json, math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont
sys.path.insert(0, "/workspace/maeil-webgame-promo/_tools")
import render_slides_kr as R

OUT = Path(__file__).resolve().parent
SRC = OUT / "_src"
W, H = 1080, 1920
INK = (20, 19, 17); CREAM = R.CREAM; GOLD = R.GOLD; MUTED = (201, 189, 166)
RED = (255, 84, 72); TEAL = (125, 222, 192); AMBER = (255, 186, 72); VIOLET = (180, 130, 255)
R.assert_korean(R.font(R.FONT_B, 40))

def bg(w, h, tint):
    im = Image.new("RGB", (w, h), INK)
    glow = Image.new("RGB", (w, h), INK)
    ImageDraw.Draw(glow).ellipse((w // 2 - 580, int(h * 0.02), w // 2 + 580, int(h * 0.55)), fill=tint)
    return Image.blend(im, glow.filter(ImageFilter.GaussianBlur(130)), 0.75)

N = 15
def draw_board(size, black=(), white=(), threats=(), fork=None, marks=(), last=None, ghost=None):
    """threats: list of (points, color) lines. fork=gold-ringed stone. marks=empty glowing points. ghost=semi stone."""
    S = 900; im = Image.new("RGB", (S, S), (54, 42, 28)); d = ImageDraw.Draw(im)
    for y in range(S):
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
    # threat glow lines first
    for pts, col in threats:
        if len(pts) < 2: continue
        x0, y0 = P(*pts[0]); x1, y1 = P(*pts[-1])
        ov = Image.new("RGBA", (S, S), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
        od.line((x0, y0, x1, y1), fill=col + (160,), width=int(c * 0.9))
        blurred = ov.filter(ImageFilter.GaussianBlur(12))
        im.paste(blurred, (0, 0), blurred)
        # arrow heads at both ends
        d = ImageDraw.Draw(im)
        for end, prev in ((pts[0], pts[1]), (pts[-1], pts[-2])):
            px, py = P(*end); qx, qy = P(*prev)
            ang = math.atan2(py - qy, px - qx)
            ah = c * 0.55
            tip = (px + math.cos(ang) * c * 0.15, py + math.sin(ang) * c * 0.15)
            p1 = (tip[0] - ah * math.cos(ang - 0.45), tip[1] - ah * math.sin(ang - 0.45))
            p2 = (tip[0] - ah * math.cos(ang + 0.45), tip[1] - ah * math.sin(ang + 0.45))
            d.polygon([tip, p1, p2], fill=col)
    def stone(col, row, kind, alpha=255):
        x, y = P(col, row)
        sh = Image.new("L", (S, S), 0); ImageDraw.Draw(sh).ellipse((x - r + 3, y - r + 6, x + r + 3, y + r + 6), fill=150)
        im.paste((0, 0, 0), (0, 0), sh.filter(ImageFilter.GaussianBlur(5)))
        dd = ImageDraw.Draw(im)
        if kind == "b":
            fill = (26, 25, 24); hi = (70, 70, 68); ol = (8, 8, 8)
        else:
            fill = (236, 226, 205); hi = (252, 248, 238); ol = (180, 168, 145)
        if alpha < 255:
            ov = Image.new("RGBA", (S, S), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
            od.ellipse((x - r, y - r, x + r, y + r), fill=fill + (alpha,), outline=ol + (alpha,), width=2)
            od.ellipse((x - r * 0.55, y - r * 0.6, x - r * 0.15, y - r * 0.2), fill=hi + (alpha,))
            im.paste(ov, (0, 0), ov)
        else:
            dd.ellipse((x - r, y - r, x + r, y + r), fill=fill, outline=ol, width=2)
            dd.ellipse((x - r * 0.55, y - r * 0.6, x - r * 0.15, y - r * 0.2), fill=hi)
    for p in black: stone(*p, "b")
    for p in white: stone(*p, "w")
    if ghost:
        stone(*ghost, "b", alpha=120)
    d = ImageDraw.Draw(im)
    if last:
        x, y = P(*last); d.ellipse((x - 7, y - 7, x + 7, y + 7), fill=GOLD)
    if fork:
        x, y = P(*fork)
        gl = Image.new("L", (S, S), 0); ImageDraw.Draw(gl).ellipse((x - r - 16, y - r - 16, x + r + 16, y + r + 16), outline=255, width=12)
        im.paste(GOLD, (0, 0), gl.filter(ImageFilter.GaussianBlur(7)))
        ImageDraw.Draw(im).ellipse((x - r - 12, y - r - 12, x + r + 12, y + r + 12), outline=GOLD, width=6)
        # star spark at fork
        d = ImageDraw.Draw(im)
        for i in range(8):
            ang = i * math.pi / 4; L = r * 1.55
            d.line((x + math.cos(ang) * r * 0.9, y + math.sin(ang) * r * 0.9,
                    x + math.cos(ang) * L, y + math.sin(ang) * L), fill=GOLD, width=3)
    d = ImageDraw.Draw(im)
    for p in marks:
        x, y = P(*p)
        gl = Image.new("L", (S, S), 0); ImageDraw.Draw(gl).ellipse((x - r - 6, y - r - 6, x + r + 6, y + r + 6), fill=200)
        im.paste(AMBER, (0, 0), gl.filter(ImageFilter.GaussianBlur(14)))
        d = ImageDraw.Draw(im)
        d.ellipse((x - r * 0.55, y - r * 0.55, x + r * 0.55, y + r * 0.55), outline=AMBER, width=5)
        # question mark via small circle + stem look: draw "?" with font if possible
        f = ImageFont.truetype(R.FONT_B, int(r * 1.4), index=0)
        bb = d.textbbox((0, 0), "?", font=f)
        d.text((x - (bb[2] - bb[0]) / 2 - bb[0], y - (bb[3] - bb[1]) / 2 - bb[1]), "?", font=f, fill=AMBER)
    return im.resize((size, size), Image.LANCZOS)

def paste(im, b, cy, glow=GOLD, size_override=None):
    size = size_override or b.size[0]; 
    if size != b.size[0]:
        b = b.resize((size, size), Image.LANCZOS)
    x = (im.width - size) // 2; y = cy - size // 2
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

def dual_chips(d, y):
    """Two threat chips side by side — Day3 signature (not stage bar)."""
    chips = [("위협 A · 넷", RED), ("위협 B · 열린 셋", TEAL)]
    for i, (lab, col) in enumerate(chips):
        cx = W // 2 + (i - 0.5) * 420
        f = R.font(R.FONT_B, 34); bb = d.textbbox((0, 0), lab, font=f)
        ww = bb[2] - bb[0] + 48; hh = bb[3] - bb[1] + 28
        d.rounded_rectangle((cx - ww // 2, y, cx + ww // 2, y + hh), hh // 2, fill=col)
        d.text((cx - (bb[2] - bb[0]) // 2 - bb[0], y + 14 - bb[1]), lab, font=f, fill=INK)

# --- Board positions: black fork at (7,7) creates horizontal FOUR + vertical OPEN THREE ---
# Horizontal: (4,7)(5,7)(6,7) + fork(7,7) = four; next would be (8,7) or (3,7)
# Vertical: (7,5)(7,6) + fork(7,7) = open three (7,4 and 7,8 empty)
ME_BASE = [(4, 7), (5, 7), (6, 7), (7, 5), (7, 6), (9, 9), (10, 10), (5, 9)]
AI = [(8, 5), (9, 6), (10, 7), (6, 9), (8, 9), (3, 5)]
FORK = (7, 7)
H_THREAT = [(4, 7), (5, 7), (6, 7), (7, 7), (8, 7)]  # four line + next empty
V_THREAT = [(7, 4), (7, 5), (7, 6), (7, 7), (7, 8)]  # open three span

BOARDS = {
    "hook": dict(
        black=ME_BASE + [FORK], white=AI,
        threats=[(H_THREAT[:4], RED), (V_THREAT[1:4], TEAL)],
        fork=FORK, last=FORK,
    ),
    "before": dict(
        black=ME_BASE, white=AI,
        marks=[FORK], ghost=None,
    ),
    "after": dict(
        black=ME_BASE + [FORK], white=AI,
        threats=[(H_THREAT[:4], RED), (V_THREAT[1:4], TEAL)],
        fork=FORK, last=FORK,
    ),
    "block_a": dict(  # AI blocks horizontal end — vertical still open
        black=ME_BASE + [FORK], white=AI + [(8, 7)],
        threats=[(V_THREAT[1:4], TEAL)],
        fork=FORK, last=(8, 7),
    ),
    "block_b": dict(  # AI blocks vertical — horizontal four still threatens
        black=ME_BASE + [FORK], white=AI + [(7, 8)],
        threats=[(H_THREAT[:4], RED)],
        fork=FORK, last=(7, 8),
    ),
}

def make_ab_panel(which):
    """Small board for A or B split."""
    key = "block_a" if which == "A" else "block_b"
    return draw_board(420, **BOARDS[key])

def make_slides():
    # 1 Hook — dual arrows on fork
    im = bg(W, H, (55, 38, 28)); d = ImageDraw.Draw(im)
    pill(d, W // 2, 100, "매일웹겜 W03 · 오목 양날 공격", INK, GOLD, 36)
    paste(im, draw_board(820, **BOARDS["hook"]), 680, GOLD)
    d = ImageDraw.Draw(im)
    y = 1160
    y = text_c(d, y, "한 수로 두 곳", CREAM, R.FONT_B, 112)
    y = text_c(d, y, "위협하면 이겨", AMBER, R.FONT_B, 72)
    dual_chips(d, 1580)
    text_c(d, H - 120, "playtoday.cloud", MUTED, R.FONT_R, 40)
    im.save(OUT / "slide1.png", optimize=True)

    # 2 Before — glowing empty fork point
    im = bg(W, H, (42, 40, 28)); d = ImageDraw.Draw(im)
    pill(d, W // 2, 100, "Before · 양날 자리 찾기", INK, AMBER, 36)
    paste(im, draw_board(820, **BOARDS["before"]), 680, AMBER)
    d = ImageDraw.Draw(im)
    y = 1160
    y = text_c(d, y, "여기 한 수면", CREAM, R.FONT_B, 112)
    y = text_c(d, y, "두 방향이 동시에!", GOLD, R.FONT_B, 64)
    dual_chips(d, 1580)
    text_c(d, H - 120, "playtoday.cloud", MUTED, R.FONT_R, 40)
    im.save(OUT / "slide2.png", optimize=True)

    # 3 After — fork placed, dual arrows labeled
    im = bg(W, H, (48, 32, 40)); d = ImageDraw.Draw(im)
    pill(d, W // 2, 100, "After · 한 수로 양날 완성", INK, TEAL, 36)
    paste(im, draw_board(820, **BOARDS["after"]), 680, TEAL)
    d = ImageDraw.Draw(im)
    y = 1160
    y = text_c(d, y, "넷 + 열린 셋", CREAM, R.FONT_B, 112)
    y = text_c(d, y, "한 번에 만들기", TEAL, R.FONT_B, 64)
    dual_chips(d, 1580)
    text_c(d, H - 120, "playtoday.cloud", MUTED, R.FONT_R, 40)
    im.save(OUT / "slide3.png", optimize=True)

    # 4 A or B split — signature Day3 layout
    im = bg(W, H, (36, 34, 48)); d = ImageDraw.Draw(im)
    pill(d, W // 2, 90, "A or B? · AI는 하나만 막아요", INK, VIOLET, 34)
    # two panels
    pa = make_ab_panel("A"); pb = make_ab_panel("B")
    gap = 36; total_w = pa.size[0] * 2 + gap
    x0 = (W - total_w) // 2; cy = 620
    for i, (panel, label, col) in enumerate([(pa, "A 막기", RED), (pb, "B 막기", TEAL)]):
        x = x0 + i * (pa.size[0] + gap); y = cy - panel.size[0] // 2
        m = Image.new("L", panel.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, panel.size[0] - 1, panel.size[1] - 1), 28, fill=255)
        sh = Image.new("L", im.size, 0); ImageDraw.Draw(sh).rounded_rectangle((x, y + 12, x + panel.size[0], y + panel.size[1] + 12), 32, fill=160)
        im.paste((0, 0, 0), (0, 0), sh.filter(ImageFilter.GaussianBlur(20)))
        gl = Image.new("L", im.size, 0); ImageDraw.Draw(gl).rounded_rectangle((x - 4, y - 4, x + panel.size[0] + 4, y + panel.size[1] + 4), 32, outline=255, width=6)
        im.paste(col, (0, 0), gl.filter(ImageFilter.GaussianBlur(8)))
        im.paste(panel, (x, y), m)
        d = ImageDraw.Draw(im)
        f = R.font(R.FONT_B, 40); bb = d.textbbox((0, 0), label, font=f)
        lx = x + panel.size[0] // 2 - (bb[2] - bb[0]) // 2 - bb[0]
        d.rounded_rectangle((lx - 20, y - 70, lx + (bb[2] - bb[0]) + 20, y - 18), 26, fill=col)
        d.text((lx, y - 58 - bb[1]), label, font=f, fill=INK)
    d = ImageDraw.Draw(im)
    # big X vs leftover threat note
    y = 980
    y = text_c(d, y, "어느 쪽을 막아도", CREAM, R.FONT_B, 96)
    y = text_c(d, y, "다른 쪽이 남아요", AMBER, R.FONT_B, 64)
    y = text_c(d, y + 8, "그래서 양날이 이긴다", MUTED, R.FONT_R, 44)
    dual_chips(d, 1580)
    text_c(d, H - 120, "playtoday.cloud", MUTED, R.FONT_R, 40)
    im.save(OUT / "slide4.png", optimize=True)

    # 5 CTA
    im = bg(W, H, (40, 46, 34)); d = ImageDraw.Draw(im)
    b = Image.open(SRC / "win_board.png").convert("RGB"); s0 = min(b.size)
    paste(im, b.crop((0, 0, s0, s0)).resize((700, 700), Image.LANCZOS), 600)
    d = ImageDraw.Draw(im)
    y = 1040
    y = text_c(d, y, "한 수로 끝내는 짜릿함", CREAM, R.FONT_B, 100)
    y = text_c(d, y, "playtoday.cloud", GOLD, R.FONT_B, 78)
    y = text_c(d, y + 10, "설치 · 가입 없이 AI와 한 판", MUTED, R.FONT_R, 44)
    pill(d, W // 2, 1620, "양날 공격, 지금 만들어 봐!", INK, TEAL, 42)
    im.save(OUT / "slide5.png", optimize=True)

def make_card():
    S = 1080
    im = bg(S, S, (52, 34, 28)); d = ImageDraw.Draw(im)
    pill(d, S // 2, 36, "매일웹겜 · 오목 양날 공격", INK, GOLD, 32)
    paste(im, draw_board(540, **BOARDS["hook"]), 460, GOLD)
    d = ImageDraw.Draw(im)
    y = 760
    y = text_c(d, y, "한 수로 두 곳 위협하면 이겨", CREAM, R.FONT_B, 56, maxw=S - 70)
    y = text_c(d, y - 4, "넷 + 열린 셋 · AI는 하나만 막아요", AMBER, R.FONT_B, 36, maxw=S - 70)
    text_c(d, y - 8, "playtoday.cloud/games/016-omok", MUTED, R.FONT_R, 30, maxw=S - 90)
    im.save(OUT / "card.png", optimize=True)
    im.save(OUT / "card_tg.jpg", quality=92)

# Captions from narration (do not change narration.txt)
# 오목 양날 공격! 한 수로 두 곳을 동시에 위협하면, AI는 한 곳밖에 못 막아요. 넷과 셋을 한 번에 만들어 보세요. 한 수로 끝내는 짜릿함, 지금 도전!
CAPTIONS = [
    (["오목 양날 공격!"], "오목 양날 공격!"),
    (["한 수로 두 곳을", "동시에 위협하면"], "한 수로 두 곳을 동시에 위협하면"),
    (["AI는 한 곳밖에", "못 막아요"], "AI는 한 곳밖에 못 막아요"),
    (["넷과 셋을 한 번에", "만들어 보세요"], "넷과 셋을 한 번에 만들어 보세요"),
    (["한 수로 끝내는", "짜릿함"], "한 수로 끝내는 짜릿함"),
    (["지금 도전!"], "지금 도전!"),
]

def make_captions():
    capdir = OUT / "captions"; capdir.mkdir(exist_ok=True)
    for p in capdir.glob("cap*.png"): p.unlink()
    meta = []
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
