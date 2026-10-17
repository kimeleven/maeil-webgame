#!/usr/bin/env python3
"""016-omok Day5 (rank_beat_me): 랭킹 · 나를 이겨봐.
Layout DISTINCT from Day0-4: leaderboard rows + medal podium + 최고 기록 score card + 자랑하기 share bubble + VS split.
Reuses board/bg helpers from day4. Noto Sans CJK only."""
import sys, json, math, importlib.util
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, "/workspace/maeil-webgame-promo/_tools")
import render_slides_kr as R
spec = importlib.util.spec_from_file_location("d4", "/workspace/maeil-webgame-promo/016-omok/day4/render_day4.py")
D4 = importlib.util.module_from_spec(spec); spec.loader.exec_module(D4)
bg, draw_board, paste, text_c, pill = D4.bg, D4.draw_board, D4.paste, D4.text_c, D4.pill
OUT = Path(__file__).resolve().parent
W, H = 1080, 1920
INK = D4.INK; CREAM = R.CREAM; GOLD = R.GOLD; MUTED = D4.MUTED
PINK = (255, 120, 170); VIOLET = (170, 140, 255); TEAL = D4.TEAL; AMBER = D4.AMBER; RED = D4.RED
SILVER = (205, 210, 220); BRONZE = (214, 140, 80)
R.assert_korean(R.font(R.FONT_B, 40))

WIN = [(4, 4), (5, 5), (6, 6), (7, 7), (8, 8)]
ME = WIN + [(6, 4), (8, 6), (5, 9), (9, 5)]
AI = [(5, 4), (7, 6), (9, 9), (3, 3), (6, 8), (8, 4), (10, 7)]
BOARD = dict(black=ME, white=AI, win_line=WIN, last=WIN[-1])

def medal(d, cx, cy, r, col, label):
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=col, outline=(40, 34, 24), width=4)
    d.ellipse((cx - r * 0.7, cy - r * 0.7, cx + r * 0.7, cy + r * 0.7), outline=(255, 255, 255), width=3)
    f = R.font(R.FONT_B, int(r * 0.95)); bb = d.textbbox((0, 0), label, font=f)
    d.text((cx - (bb[2] - bb[0]) // 2 - bb[0], cy - (bb[3] - bb[1]) // 2 - bb[1]), label, font=f, fill=INK)

def leaderboard(im, y, rows, me_idx, width=880, accent=PINK, row_h=104):
    """Ranked rows; me_idx row glows. rows: [(name, score)]."""
    x0 = (im.width - width) // 2
    for i, (name, score) in enumerate(rows):
        yy = y + i * (row_h + 14)
        is_me = i == me_idx
        if is_me:
            gl = Image.new("L", im.size, 0)
            ImageDraw.Draw(gl).rounded_rectangle((x0 - 10, yy - 10, x0 + width + 10, yy + row_h + 10), 34, fill=210)
            im.paste(accent, (0, 0), gl.filter(ImageFilter.GaussianBlur(16)))
        d = ImageDraw.Draw(im)
        d.rounded_rectangle((x0, yy, x0 + width, yy + row_h), 30,
                            fill=(255, 238, 246) if is_me else (34, 33, 38), outline=accent if is_me else (70, 66, 60), width=4)
        col = [GOLD, SILVER, BRONZE][i] if i < 3 else (90, 86, 80)
        medal(d, x0 + 66, yy + row_h // 2, 36, col, str(i + 1))
        f = R.font(R.FONT_B, 46); fg = INK if is_me else CREAM
        bb = d.textbbox((0, 0), name, font=f)
        d.text((x0 + 130 - bb[0], yy + (row_h - (bb[3] - bb[1])) // 2 - bb[1]), name, font=f, fill=fg)
        fs = R.font(R.FONT_B, 50); s = f"{score:,}"
        bb = d.textbbox((0, 0), s, font=fs)
        d.text((x0 + width - 40 - (bb[2] - bb[0]) - bb[0], yy + (row_h - (bb[3] - bb[1])) // 2 - bb[1]), s, font=fs,
               fill=(200, 40, 100) if is_me else GOLD)
    return y + len(rows) * (row_h + 14)

def best_card(im, cx, y, w=760, score="2,480", accent=GOLD):
    """End-screen style '최고 기록!' card mock + 자랑하기 button."""
    h = 420; x0 = cx - w // 2
    sh = Image.new("L", im.size, 0); ImageDraw.Draw(sh).rounded_rectangle((x0, y + 20, x0 + w, y + h + 20), 44, fill=170)
    im.paste((0, 0, 0), (0, 0), sh.filter(ImageFilter.GaussianBlur(26)))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((x0, y, x0 + w, y + h), 44, fill=(30, 28, 34), outline=accent, width=6)
    y1 = text_c(d, y + 40, "최고 기록!", accent, R.FONT_B, 72, maxw=w - 80)
    f = R.font(R.FONT_B, 120); bb = d.textbbox((0, 0), score, font=f)
    d.text((cx - (bb[2] - bb[0]) // 2 - bb[0] + 3, y1 - bb[1] + 4), score, font=f, fill=(0, 0, 0))
    d.text((cx - (bb[2] - bb[0]) // 2 - bb[0], y1 - bb[1]), score, font=f, fill=CREAM)
    by = y + h - 120
    pill(d, cx, by, "자랑하기  ↗", INK, PINK, 48)
    # stars
    for k, (sx, sy) in enumerate([(x0 + 70, y + 70), (x0 + w - 70, y + 70), (x0 + 60, y + h - 70), (x0 + w - 60, y + h - 70)]):
        for j in range(4):
            a = j * math.pi / 2 + math.pi / 4 * (k % 2)
            d.line((sx, sy, sx + math.cos(a) * 26, sy + math.sin(a) * 26), fill=AMBER, width=4)
    return y + h

def share_bubble(im, x, y, text, col=VIOLET, tail="left"):
    d = ImageDraw.Draw(im); f = R.font(R.FONT_B, 44); bb = d.textbbox((0, 0), text, font=f)
    w = bb[2] - bb[0] + 70; h = bb[3] - bb[1] + 50
    d.rounded_rectangle((x, y, x + w, y + h), 34, fill=col)
    tx = x + 40 if tail == "left" else x + w - 40
    d.polygon([(tx - 18, y + h - 2), (tx + 18, y + h - 2), (tx - 30 if tail == "left" else tx + 30, y + h + 34)], fill=col)
    d.text((x + 35 - bb[0], y + 25 - bb[1]), text, font=f, fill=INK)
    return y + h

def vs_split(im, y, left=("나", "2,480", PINK), right=("친구", "?", VIOLET)):
    d = ImageDraw.Draw(im); pw, ph = 420, 300; gap = 120
    x0 = (W - (pw * 2 + gap)) // 2
    for i, (name, score, col) in enumerate([left, right]):
        x = x0 + i * (pw + gap)
        gl = Image.new("L", im.size, 0); ImageDraw.Draw(gl).rounded_rectangle((x - 8, y - 8, x + pw + 8, y + ph + 8), 40, fill=190)
        im.paste(col, (0, 0), gl.filter(ImageFilter.GaussianBlur(16)))
        d = ImageDraw.Draw(im)
        d.rounded_rectangle((x, y, x + pw, y + ph), 36, fill=(30, 28, 34), outline=col, width=5)
        f = R.font(R.FONT_B, 56); bb = d.textbbox((0, 0), name, font=f)
        d.text((x + pw // 2 - (bb[2] - bb[0]) // 2 - bb[0], y + 40 - bb[1]), name, font=f, fill=col)
        f2 = R.font(R.FONT_B, 96); bb = d.textbbox((0, 0), score, font=f2)
        d.text((x + pw // 2 - (bb[2] - bb[0]) // 2 - bb[0], y + 140 - bb[1]), score, font=f2, fill=CREAM)
    f = R.font(R.FONT_B, 84); bb = d.textbbox((0, 0), "VS", font=f)
    cx = W // 2; cy = y + ph // 2
    d.ellipse((cx - 70, cy - 70, cx + 70, cy + 70), fill=AMBER, outline=INK, width=6)
    d.text((cx - (bb[2] - bb[0]) // 2 - bb[0], cy - (bb[3] - bb[1]) // 2 - bb[1]), "VS", font=f, fill=INK)
    return y + ph

ROWS = [("고수", 3120), ("나", 2480), ("친구", 2150), ("오목왕", 1890), ("새내기", 1240)]

def make_slides():
    # 1 Hook — leaderboard, me at #2
    im = bg(W, H, (60, 30, 48)); d = ImageDraw.Draw(im)
    pill(d, W // 2, 70, "매일웹겜 W03 · 오목 랭킹 챌린지", INK, PINK, 34)
    y = text_c(d, 190, "나를 이겨봐!", CREAM, R.FONT_B, 130)
    leaderboard(im, 420, ROWS, 1)
    d = ImageDraw.Draw(im)
    y = 1100
    y = text_c(d, y, "친구 기록,", CREAM, R.FONT_B, 96)
    y = text_c(d, y, "이길 수 있어?", PINK, R.FONT_B, 96)
    text_c(d, H - 100, "playtoday.cloud", MUTED, R.FONT_R, 40)
    im.save(OUT / "slide1.png", optimize=True)

    # 2 Win → best record card
    im = bg(W, H, (54, 46, 24)); d = ImageDraw.Draw(im)
    pill(d, W // 2, 70, "WIN · 다섯 완성하면", INK, GOLD, 36)
    paste(im, draw_board(620, **BOARD), 560, GOLD)
    best_card(im, W // 2, 940)
    d = ImageDraw.Draw(im)
    y = text_c(d, 1440, "이기면", CREAM, R.FONT_B, 80)
    y = text_c(d, y, "최고 기록 카드 등장", GOLD, R.FONT_B, 72)
    text_c(d, H - 100, "playtoday.cloud", MUTED, R.FONT_R, 40)
    im.save(OUT / "slide2.png", optimize=True)

    # 3 Share — chat bubbles
    im = bg(W, H, (40, 34, 66)); d = ImageDraw.Draw(im)
    pill(d, W // 2, 70, "SHARE · 자랑하기 버튼", INK, VIOLET, 36)
    best_card(im, W // 2, 200, w=700, score="2,480", accent=PINK)
    share_bubble(im, 110, 720, "오목 2,480점 찍음!", PINK, "left")
    share_bubble(im, 300, 880, "나를 이겨봐 → 링크", VIOLET, "right")
    share_bubble(im, 140, 1040, "헐 바로 도전함!!", TEAL, "left")
    d = ImageDraw.Draw(im)
    y = text_c(d, 1300, "자랑하기로", CREAM, R.FONT_B, 96)
    y = text_c(d, y, "친구에게 보내요", VIOLET, R.FONT_B, 80)
    text_c(d, H - 100, "playtoday.cloud", MUTED, R.FONT_R, 40)
    im.save(OUT / "slide3.png", optimize=True)

    # 4 VS — me vs friend
    im = bg(W, H, (62, 28, 40)); d = ImageDraw.Draw(im)
    pill(d, W // 2, 70, "VS · 기록 대결", INK, AMBER, 36)
    y = text_c(d, 200, "누가 더 높을까?", CREAM, R.FONT_B, 100)
    vs_split(im, 420)
    leaderboard(im, 860, ROWS[:3], 1, row_h=96)
    d = ImageDraw.Draw(im)
    y = text_c(d, 1300, "친구 기록,", CREAM, R.FONT_B, 96)
    y = text_c(d, y, "이길 수 있어?", AMBER, R.FONT_B, 96)
    text_c(d, H - 100, "playtoday.cloud", MUTED, R.FONT_R, 40)
    im.save(OUT / "slide4.png", optimize=True)

    # 5 CTA
    im = bg(W, H, (50, 30, 56)); d = ImageDraw.Draw(im)
    medal(d, W // 2, 220, 110, GOLD, "1")
    paste(im, draw_board(640, **BOARD), 720, PINK)
    d = ImageDraw.Draw(im)
    y = text_c(d, 1100, "지금 한 판!", CREAM, R.FONT_B, 120)
    y = text_c(d, y, "playtoday.cloud", GOLD, R.FONT_B, 78)
    y = text_c(d, y + 10, "설치 · 가입 없이 AI와 한 판", MUTED, R.FONT_R, 44)
    pill(d, W // 2, 1640, "1등 자리, 뺏으러 가자!", INK, PINK, 46)
    im.save(OUT / "slide5.png", optimize=True)

def make_card():
    CW, CH = 1080, 1350
    im = bg(CW, CH, (60, 30, 48)); d = ImageDraw.Draw(im)
    pill(d, CW // 2, 40, "매일웹겜 · 오목 랭킹 챌린지", INK, PINK, 32)
    text_c(d, 130, "나를 이겨봐!", CREAM, R.FONT_B, 110, maxw=CW - 80)
    leaderboard(im, 320, ROWS[:4], 1, width=860, row_h=100)
    d = ImageDraw.Draw(im)
    y = text_c(d, 830, "친구 기록, 이길 수 있어?", PINK, R.FONT_B, 64, maxw=CW - 80)
    y = text_c(d, y, "이기면 최고 기록 카드 → 자랑하기로 공유", CREAM, R.FONT_B, 40, maxw=CW - 80)
    pill(d, CW // 2, y + 30, "지금 한 판 ▶", INK, GOLD, 50)
    text_c(d, CH - 110, "playtoday.cloud/games/016-omok", MUTED, R.FONT_R, 34, maxw=CW - 90)
    im.save(OUT / "card.png", optimize=True)
    im.convert("RGB").save(OUT / "card_tg.jpg", quality=88, optimize=True)

CAPTIONS = [
    (["나를 이겨봐", "챌린지!"], "오목 나를 이겨봐 챌린지!"),
    (["이기면", "최고 기록 카드!"], "이기면 최고 기록 카드가 나와요"),
    (["자랑하기 버튼으로", "친구에게 보내요"], "자랑하기 버튼으로 친구에게 보내 보세요"),
    (["친구 기록,", "이길 수 있어?"], "친구 기록, 이길 수 있어?"),
    (["지금 한 판!"], "지금 한 판!"),
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
