#!/usr/bin/env python3
"""016-omok Day4 (speed_score): 스피드 클리어 · 빨리 이길수록 점수가 쑥쑥.
Layout DISTINCT from Day0–3: speed timer HUD + score pop + move-count strip.
Procedural boards; CTA procedural (+ optional _src screenshot). Noto Sans CJK only."""
import sys, json, math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont
sys.path.insert(0, "/workspace/maeil-webgame-promo/_tools")
import render_slides_kr as R

OUT = Path(__file__).resolve().parent
SRC = OUT / "_src"
W, H = 1080, 1920
INK = (20, 19, 17); CREAM = R.CREAM; GOLD = R.GOLD; MUTED = (201, 189, 166)
RED = (255, 84, 72); TEAL = (125, 222, 192); AMBER = (255, 186, 72)
CYAN = (80, 220, 255); LIME = (160, 255, 120)
R.assert_korean(R.font(R.FONT_B, 40))

def bg(w, h, tint):
    im = Image.new("RGB", (w, h), INK)
    glow = Image.new("RGB", (w, h), INK)
    ImageDraw.Draw(glow).ellipse((w // 2 - 580, int(h * 0.02), w // 2 + 580, int(h * 0.55)), fill=tint)
    return Image.blend(im, glow.filter(ImageFilter.GaussianBlur(130)), 0.75)

N = 15
def draw_board(size, black=(), white=(), win_line=None, last=None, ghost=None, dim_extra=False):
    """win_line: list of 5 points highlighted gold. last=gold dot. ghost=semi stone."""
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
    if win_line and len(win_line) >= 2:
        x0, y0 = P(*win_line[0]); x1, y1 = P(*win_line[-1])
        ov = Image.new("RGBA", (S, S), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
        od.line((x0, y0, x1, y1), fill=GOLD + (180,), width=int(c * 1.05))
        blurred = ov.filter(ImageFilter.GaussianBlur(14))
        im.paste(blurred, (0, 0), blurred)
        for p in win_line:
            x, y = P(*p)
            gl = Image.new("L", (S, S), 0); ImageDraw.Draw(gl).ellipse((x - r - 10, y - r - 10, x + r + 10, y + r + 10), fill=220)
            im.paste(GOLD, (0, 0), gl.filter(ImageFilter.GaussianBlur(10)))
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
    if win_line:
        # sparkles on win
        for i, p in enumerate(win_line):
            x, y = P(*p)
            for j in range(6):
                ang = j * math.pi / 3 + i * 0.2
                L = r * 1.35
                d.line((x + math.cos(ang) * r * 0.7, y + math.sin(ang) * r * 0.7,
                        x + math.cos(ang) * L, y + math.sin(ang) * L), fill=AMBER, width=2)
    return im.resize((size, size), Image.LANCZOS)

def paste(im, b, cy, glow=GOLD, size_override=None):
    size = size_override or b.size[0]
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

# --- Day4 signature: Speed Timer HUD ---
def timer_hud(im, y, time_str="0:42", accent=CYAN):
    """Big digital timer chip centered — Day4 signature (not stage bar / dual chips)."""
    d = ImageDraw.Draw(im)
    f = R.font(R.FONT_B, 72)
    lab = R.font(R.FONT_B, 28)
    bb = d.textbbox((0, 0), time_str, font=f)
    tw = bb[2] - bb[0]; th = bb[3] - bb[1]
    # outer panel
    pw, ph = tw + 220, th + 70
    cx = W // 2
    x0, y0 = cx - pw // 2, y
    # glow
    gl = Image.new("L", im.size, 0)
    ImageDraw.Draw(gl).rounded_rectangle((x0 - 8, y0 - 8, x0 + pw + 8, y0 + ph + 8), 40, fill=200)
    im.paste(accent, (0, 0), gl.filter(ImageFilter.GaussianBlur(16)))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((x0, y0, x0 + pw, y0 + ph), 36, fill=(28, 30, 36), outline=accent, width=5)
    # clock icon circle
    ix = x0 + 56; iy = y0 + ph // 2
    d.ellipse((ix - 28, iy - 28, ix + 28, iy + 28), outline=accent, width=4)
    d.line((ix, iy, ix, iy - 14), fill=accent, width=3)
    d.line((ix, iy, ix + 10, iy + 6), fill=accent, width=3)
    # time text
    tx = x0 + 100 - bb[0]
    ty = y0 + (ph - th) // 2 - bb[1]
    d.text((tx + 2, ty + 2), time_str, font=f, fill=(0, 0, 0))
    d.text((tx, ty), time_str, font=f, fill=CREAM)
    # SPEED tag
    tag = "SPEED"
    tb = d.textbbox((0, 0), tag, font=lab)
    tx2 = x0 + pw - (tb[2] - tb[0]) - 36
    d.rounded_rectangle((tx2 - 14, y0 + 14, tx2 + (tb[2] - tb[0]) + 14, y0 + 14 + (tb[3] - tb[1]) + 16), 14, fill=accent)
    d.text((tx2 - tb[0], y0 + 22 - tb[1]), tag, font=lab, fill=INK)
    return y0 + ph

def score_pop(im, cx, cy, text="+1200", sub="SPEED", color=AMBER):
    """Floating score pop bubble with sparks."""
    d = ImageDraw.Draw(im)
    f = R.font(R.FONT_B, 86)
    fs = R.font(R.FONT_B, 36)
    bb = d.textbbox((0, 0), text, font=f)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    # glow orb
    gl = Image.new("L", im.size, 0)
    ImageDraw.Draw(gl).ellipse((cx - tw // 2 - 40, cy - th // 2 - 30, cx + tw // 2 + 40, cy + th // 2 + 50), fill=180)
    im.paste(color, (0, 0), gl.filter(ImageFilter.GaussianBlur(28)))
    d = ImageDraw.Draw(im)
    x = cx - tw // 2 - bb[0]; y = cy - th // 2 - bb[1]
    d.text((x + 3, y + 4), text, font=f, fill=(0, 0, 0))
    d.text((x, y), text, font=f, fill=color)
    # sub badge
    sb = d.textbbox((0, 0), sub, font=fs)
    sw, sh = sb[2] - sb[0], sb[3] - sb[1]
    d.rounded_rectangle((cx - sw // 2 - 20, cy + th // 2 + 8, cx + sw // 2 + 20, cy + th // 2 + 8 + sh + 20), 20, fill=color)
    d.text((cx - sw // 2 - sb[0], cy + th // 2 + 18 - sb[1]), sub, font=fs, fill=INK)
    # sparks
    for i in range(10):
        ang = i * math.pi / 5
        L1, L2 = 55, 90
        d.line((cx + math.cos(ang) * L1, cy + math.sin(ang) * L1,
                cx + math.cos(ang) * L2, cy + math.sin(ang) * L2), fill=GOLD, width=3)

def move_strip(im, y, moves, label="수", accent=TEAL, highlight=None):
    """Horizontal move-count strip — Day4 signature (not dual chips / stage bar).
    moves: list of labels e.g. ['1','2','3',...,'12'] or shorter; highlight=index lit gold."""
    d = ImageDraw.Draw(im)
    n = len(moves)
    chip_w = min(68, (W - 160) // max(n, 1) - 8)
    gap = 8
    total = n * chip_w + (n - 1) * gap
    x0 = (W - total) // 2
    # label pill left of strip area top
    f_lab = R.font(R.FONT_B, 32)
    lab = f"{label} · {n}수"
    lb = d.textbbox((0, 0), lab, font=f_lab)
    lw = lb[2] - lb[0] + 40
    d.rounded_rectangle(((W - lw) // 2, y, (W + lw) // 2, y + 48), 24, fill=(40, 42, 48), outline=accent, width=3)
    d.text(((W - (lb[2] - lb[0])) // 2 - lb[0], y + 10 - lb[1]), lab, font=f_lab, fill=CREAM)
    y2 = y + 64
    f = R.font(R.FONT_B, 28)
    for i, m in enumerate(moves):
        x = x0 + i * (chip_w + gap)
        col = GOLD if (highlight is not None and i == highlight) else (accent if i < (highlight or n) else (60, 58, 54))
        fg = INK if col in (GOLD, accent, AMBER, TEAL, CYAN, LIME) else MUTED
        if highlight is not None and i > highlight:
            col = (55, 52, 48); fg = MUTED
        elif highlight is not None and i < highlight:
            col = accent; fg = INK
        d.rounded_rectangle((x, y2, x + chip_w, y2 + 52), 14, fill=col)
        bb = d.textbbox((0, 0), str(m), font=f)
        d.text((x + chip_w // 2 - (bb[2] - bb[0]) // 2 - bb[0], y2 + 12 - bb[1]), str(m), font=f, fill=fg)
    return y2 + 60

# Win path: black five in a row horizontally at row 7
WIN = [(5, 7), (6, 7), (7, 7), (8, 7), (9, 7)]
ME_FAST = [(7, 5), (6, 6), (8, 6), (5, 8), (9, 8)] + WIN  # extras + win
AI_FAST = [(4, 4), (10, 4), (3, 7), (11, 7), (7, 9), (4, 10)]
# Long path extras (wasteful moves)
ME_LONG_EXTRA = [(2, 2), (12, 2), (2, 12), (12, 12), (1, 7), (13, 7), (7, 1), (7, 13)]
AI_LONG = AI_FAST + [(1, 1), (13, 1), (1, 13), (13, 13), (0, 7), (14, 7)]

BOARDS = {
    "hook": dict(black=ME_FAST, white=AI_FAST, win_line=WIN, last=WIN[-1]),
    "score": dict(black=ME_FAST, white=AI_FAST, win_line=WIN, last=WIN[-1]),
    "short": dict(black=WIN + [(7, 5), (6, 6)], white=AI_FAST[:4], win_line=WIN, last=WIN[-1]),
    "long": dict(black=ME_FAST + ME_LONG_EXTRA, white=AI_LONG, win_line=WIN, last=WIN[-1]),
    "clear": dict(black=ME_FAST, white=AI_FAST, win_line=WIN, last=WIN[-1]),
}

def make_slides():
    # 1 Hook — timer HUD + fast five
    im = bg(W, H, (36, 48, 58)); d = ImageDraw.Draw(im)
    pill(d, W // 2, 70, "매일웹겜 W03 · 오목 스피드 클리어", INK, CYAN, 34)
    timer_hud(im, 150, "0:42", CYAN)
    paste(im, draw_board(700, **BOARDS["hook"]), 720, CYAN)
    d = ImageDraw.Draw(im)
    y = 1140
    y = text_c(d, y, "빨리 이길수록", CREAM, R.FONT_B, 100)
    y = text_c(d, y, "점수가 쑥쑥", AMBER, R.FONT_B, 72)
    move_strip(im, 1520, [str(i) for i in range(1, 13)], label="수", accent=CYAN, highlight=11)
    text_c(d, H - 100, "playtoday.cloud", MUTED, R.FONT_R, 40)
    im.save(OUT / "slide1.png", optimize=True)

    # 2 Score — score pop + timer bonus
    im = bg(W, H, (48, 40, 28)); d = ImageDraw.Draw(im)
    pill(d, W // 2, 70, "SCORE · 타이머 보너스", INK, AMBER, 36)
    timer_hud(im, 150, "0:38", AMBER)
    paste(im, draw_board(620, **BOARDS["score"]), 640, AMBER)
    score_pop(im, W // 2, 1080, "+1200", "SPEED BONUS", AMBER)
    d = ImageDraw.Draw(im)
    y = 1280
    y = text_c(d, y, "남은 시간 = 보너스", CREAM, R.FONT_B, 72)
    y = text_c(d, y, "빨리 끝낼수록 점수 UP", GOLD, R.FONT_B, 52)
    move_strip(im, 1580, [str(i) for i in range(1, 11)], label="수", accent=AMBER, highlight=9)
    text_c(d, H - 100, "playtoday.cloud", MUTED, R.FONT_R, 40)
    im.save(OUT / "slide2.png", optimize=True)

    # 3 Trim moves — short vs long with move strips
    im = bg(W, H, (34, 44, 40)); d = ImageDraw.Draw(im)
    pill(d, W // 2, 60, "TRIM · 군더더기 수 줄이기", INK, TEAL, 34)
    # two mini boards side by side
    short_b = draw_board(400, **BOARDS["short"])
    long_b = draw_board(400, **BOARDS["long"])
    gap = 40; total_w = 400 * 2 + gap
    x0 = (W - total_w) // 2; cy = 520
    for i, (panel, label, col, moves_n) in enumerate([
        (short_b, "짧은 경로", TEAL, 7),
        (long_b, "긴 경로", RED, 18),
    ]):
        x = x0 + i * (400 + gap); y = cy - 200
        m = Image.new("L", panel.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, 399, 399), 28, fill=255)
        sh = Image.new("L", im.size, 0); ImageDraw.Draw(sh).rounded_rectangle((x, y + 12, x + 400, y + 412), 32, fill=160)
        im.paste((0, 0, 0), (0, 0), sh.filter(ImageFilter.GaussianBlur(20)))
        gl = Image.new("L", im.size, 0); ImageDraw.Draw(gl).rounded_rectangle((x - 4, y - 4, x + 404, y + 404), 32, outline=255, width=6)
        im.paste(col, (0, 0), gl.filter(ImageFilter.GaussianBlur(8)))
        im.paste(panel, (x, y), m)
        d = ImageDraw.Draw(im)
        f = R.font(R.FONT_B, 36); bb = d.textbbox((0, 0), label, font=f)
        lx = x + 200 - (bb[2] - bb[0]) // 2 - bb[0]
        d.rounded_rectangle((lx - 16, y - 64, lx + (bb[2] - bb[0]) + 16, y - 14), 22, fill=col)
        d.text((lx, y - 52 - bb[1]), label, font=f, fill=INK)
        # mini move count under each board
        mf = R.font(R.FONT_B, 40)
        mt = f"{moves_n}수"
        mb = d.textbbox((0, 0), mt, font=mf)
        d.text((x + 200 - (mb[2] - mb[0]) // 2 - mb[0], y + 420), mt, font=mf, fill=col)
    d = ImageDraw.Draw(im)
    y = 1000
    y = text_c(d, y, "짧은 승리 경로로", CREAM, R.FONT_B, 88)
    y = text_c(d, y, "군더더기 수 줄이기", TEAL, R.FONT_B, 64)
    # compare strips
    move_strip(im, 1280, [str(i) for i in range(1, 8)], label="짧음", accent=TEAL, highlight=6)
    move_strip(im, 1440, [str(i) for i in range(1, 13)], label="김", accent=RED, highlight=11)
    text_c(d, H - 100, "playtoday.cloud", MUTED, R.FONT_R, 40)
    im.save(OUT / "slide3.png", optimize=True)

    # 4 Clear — five + SPEED CLEAR badge
    im = bg(W, H, (42, 32, 52)); d = ImageDraw.Draw(im)
    pill(d, W // 2, 70, "CLEAR · 다섯 완성", INK, LIME, 36)
    timer_hud(im, 150, "0:35", LIME)
    paste(im, draw_board(700, **BOARDS["clear"]), 700, LIME)
    d = ImageDraw.Draw(im)
    # SPEED CLEAR badge overlay area
    badge = "SPEED CLEAR"
    bf = R.font(R.FONT_B, 56)
    bb = d.textbbox((0, 0), badge, font=bf)
    bw, bh = bb[2] - bb[0] + 80, bb[3] - bb[1] + 40
    bx = (W - bw) // 2; by = 1080
    gl = Image.new("L", im.size, 0)
    ImageDraw.Draw(gl).rounded_rectangle((bx - 10, by - 10, bx + bw + 10, by + bh + 10), 40, fill=200)
    im.paste(LIME, (0, 0), gl.filter(ImageFilter.GaussianBlur(18)))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((bx, by, bx + bw, by + bh), 36, fill=LIME)
    d.text((bx + 40 - bb[0], by + 20 - bb[1]), badge, font=bf, fill=INK)
    y = 1220
    y = text_c(d, y, "다섯 완성!", CREAM, R.FONT_B, 100)
    y = text_c(d, y, "빠른 승리 = 높은 점수", GOLD, R.FONT_B, 56)
    move_strip(im, 1520, [str(i) for i in range(1, 10)], label="수", accent=LIME, highlight=8)
    text_c(d, H - 100, "playtoday.cloud", MUTED, R.FONT_R, 40)
    im.save(OUT / "slide4.png", optimize=True)

    # 5 CTA — procedural (or screenshot if present) + 지금 타임어택
    im = bg(W, H, (40, 46, 34)); d = ImageDraw.Draw(im)
    win_path = SRC / "win_board.png"
    if win_path.exists():
        b = Image.open(win_path).convert("RGB"); s0 = min(b.size)
        board_im = b.crop((0, 0, s0, s0)).resize((700, 700), Image.LANCZOS)
    else:
        board_im = draw_board(700, **BOARDS["clear"])
    paste(im, board_im, 580, GOLD)
    timer_hud(im, 100, "GO!", CYAN)
    d = ImageDraw.Draw(im)
    y = 1000
    y = text_c(d, y, "지금 타임어택", CREAM, R.FONT_B, 100)
    y = text_c(d, y, "playtoday.cloud", GOLD, R.FONT_B, 78)
    y = text_c(d, y + 10, "설치 · 가입 없이 AI와 한 판", MUTED, R.FONT_R, 44)
    pill(d, W // 2, 1580, "스피드 클리어, 지금 도전!", INK, CYAN, 42)
    move_strip(im, 1700, ["GO", "!", "!", "!", "!"], label="START", accent=CYAN, highlight=0)
    im.save(OUT / "slide5.png", optimize=True)

def make_card():
    # 1080x1350-ish SNS card (portrait closer to square than shorts)
    CW, CH = 1080, 1350
    im = bg(CW, CH, (36, 48, 58)); d = ImageDraw.Draw(im)
    # reuse helpers with local W temporarily via drawing on this canvas
    # timer-like banner
    pill(d, CW // 2, 36, "매일웹겜 · 오목 스피드 클리어", INK, CYAN, 30)
    # mini timer
    f = R.font(R.FONT_B, 56)
    t = "0:42"
    bb = d.textbbox((0, 0), t, font=f)
    tw = bb[2] - bb[0] + 160; th = bb[3] - bb[1] + 50
    tx0 = (CW - tw) // 2; ty0 = 100
    gl = Image.new("L", im.size, 0)
    ImageDraw.Draw(gl).rounded_rectangle((tx0 - 6, ty0 - 6, tx0 + tw + 6, ty0 + th + 6), 32, fill=180)
    im.paste(CYAN, (0, 0), gl.filter(ImageFilter.GaussianBlur(12)))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((tx0, ty0, tx0 + tw, ty0 + th), 28, fill=(28, 30, 36), outline=CYAN, width=4)
    d.text((tx0 + 80 - bb[0], ty0 + 14 - bb[1]), t, font=f, fill=CREAM)
    tf = R.font(R.FONT_B, 24)
    d.rounded_rectangle((tx0 + tw - 100, ty0 + 12, tx0 + tw - 16, ty0 + 48), 12, fill=CYAN)
    d.text((tx0 + tw - 92, ty0 + 18), "SPEED", font=tf, fill=INK)

    board = draw_board(520, **BOARDS["hook"])
    # paste centered
    bx = (CW - 520) // 2; by = 220
    m = Image.new("L", (520, 520), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, 519, 519), 32, fill=255)
    sh = Image.new("L", im.size, 0); ImageDraw.Draw(sh).rounded_rectangle((bx, by + 14, bx + 520, by + 534), 36, fill=160)
    im.paste((0, 0, 0), (0, 0), sh.filter(ImageFilter.GaussianBlur(22)))
    gl = Image.new("L", im.size, 0); ImageDraw.Draw(gl).rounded_rectangle((bx - 5, by - 5, bx + 525, by + 525), 36, outline=255, width=6)
    im.paste(CYAN, (0, 0), gl.filter(ImageFilter.GaussianBlur(10)))
    im.paste(board, (bx, by), m)

    d = ImageDraw.Draw(im)
    # score pop mini
    score_pop(im, CW // 2, 800, "+1200", "SPEED", AMBER)
    d = ImageDraw.Draw(im)
    y = 920
    # text_c uses d.im.size[0] so OK for any width
    y = text_c(d, y, "빨리 이길수록 점수가 쑥쑥", CREAM, R.FONT_B, 48, maxw=CW - 70)
    y = text_c(d, y - 4, "군더더기 없이 다섯 완성!", AMBER, R.FONT_B, 36, maxw=CW - 70)
    # move strip adapted for card width — inline small chips
    moves = [str(i) for i in range(1, 10)]
    chip_w = 56; gap = 6; n = len(moves)
    total = n * chip_w + (n - 1) * gap
    x0 = (CW - total) // 2; y2 = 1100
    f2 = R.font(R.FONT_B, 24)
    for i, mlab in enumerate(moves):
        x = x0 + i * (chip_w + gap)
        col = GOLD if i == 8 else CYAN
        d.rounded_rectangle((x, y2, x + chip_w, y2 + 44), 12, fill=col)
        bb2 = d.textbbox((0, 0), mlab, font=f2)
        d.text((x + chip_w // 2 - (bb2[2] - bb2[0]) // 2 - bb2[0], y2 + 10 - bb2[1]), mlab, font=f2, fill=INK)
    text_c(d, 1180, "playtoday.cloud/games/016-omok", MUTED, R.FONT_R, 28, maxw=CW - 90)
    im.save(OUT / "card.png", optimize=True)
    # telegram JPEG ~85
    im.convert("RGB").save(OUT / "card_tg.jpg", quality=85, optimize=True)

# Captions from narration
# 오목 스피드 클리어! 빨리 이길수록 점수가 쑥쑥 올라가요. 군더더기 없이 다섯을 완성하세요. 빠른 승리, 높은 점수! 지금 도전해 보세요!
CAPTIONS = [
    (["오목 스피드 클리어!"], "오목 스피드 클리어!"),
    (["빨리 이길수록", "점수가 쑥쑥"], "빨리 이길수록 점수가 쑥쑥"),
    (["군더더기 없이", "다섯을 완성하세요"], "군더더기 없이 다섯을 완성하세요"),
    (["빠른 승리,", "높은 점수!"], "빠른 승리, 높은 점수!"),
    (["지금 도전!"], "지금 도전!"),
    (["playtoday"], "playtoday.cloud"),
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
