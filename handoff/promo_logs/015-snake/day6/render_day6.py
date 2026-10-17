#!/usr/bin/env python3
"""015-snake Day6 (week_wrap_next_omok): slides/card/captions. Noto Sans CJK via _tools/render_slides_kr.py."""
import sys, json, math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, "/workspace/maeil-webgame-promo/_tools")
import render_slides_kr as R

OUT = Path(__file__).resolve().parent
SRC = OUT.parent / "day0" / "_src"
W, H = 1080, 1920
INK = (20, 19, 17); CREAM = R.CREAM; GOLD = R.GOLD; TEAL = (125, 222, 192); MUTED = (201, 189, 166); CORAL = (255, 122, 92)
LILAC = (180, 160, 220)
R.assert_korean(R.font(R.FONT_B, 40))

def bg(w, h, tint=(36, 44, 62)):
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

def check_row(d, x, y, label, done=True, w=820):
    """Checklist row with circle check."""
    h = 92
    d.rounded_rectangle((x, y, x + w, y + h), 22, fill=(36, 34, 30), outline=TEAL if done else MUTED, width=4)
    # checkbox
    cx, cy = x + 48, y + h // 2
    r = 26
    if done:
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=TEAL)
        # check mark
        d.line([(cx - 12, cy), (cx - 2, cy + 12), (cx + 14, cy - 12)], fill=INK, width=6)
    else:
        d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=MUTED, width=4)
    f = R.font(R.FONT_B, 44); bb = d.textbbox((0, 0), label, font=f)
    d.text((x + 100, y + (h - (bb[3] - bb[1])) // 2 - bb[1]), label, font=f, fill=CREAM if done else MUTED)
    return y + h + 18

def chip(d, cx, cy, label, color, iw=200, ih=88):
    d.rounded_rectangle((cx - iw // 2, cy - ih // 2, cx + iw // 2, cy + ih // 2), ih // 2, fill=(36, 34, 30), outline=color, width=5)
    f = R.font(R.FONT_B, 40); bb = d.textbbox((0, 0), label, font=f)
    d.text((cx - (bb[2] - bb[0]) // 2 - bb[0], cy - (bb[3] - bb[1]) // 2 - bb[1]), label, font=f, fill=color)

def highlight_chips(d, cy):
    items = [
        (W // 2 - 230, "속도 UP", TEAL),
        (W // 2 + 230, "콤보", GOLD),
        (W // 2 - 230, "황금 별", CORAL),
        (W // 2 + 230, "랭킹", LILAC),
    ]
    # two rows
    chip(d, items[0][0], cy, items[0][1], items[0][2])
    chip(d, items[1][0], cy, items[1][1], items[1][2])
    chip(d, items[2][0], cy + 120, items[2][1], items[2][2])
    chip(d, items[3][0], cy + 120, items[3][1], items[3][2])

def omok_board(d, cx, cy, size=420):
    """Gomoku/omok 5-in-a-row board silhouette with winning line."""
    half = size // 2
    # wood board
    d.rounded_rectangle((cx - half, cy - half, cx + half, cy + half), 28, fill=(48, 38, 28), outline=GOLD, width=6)
    # grid 9x9-ish (lines)
    n = 9
    pad = 40
    left, top = cx - half + pad, cy - half + pad
    right, bot = cx + half - pad, cy + half - pad
    step = (right - left) / (n - 1)
    for i in range(n):
        x = int(left + i * step)
        y = int(top + i * step)
        d.line([(left, y), (right, y)], fill=(90, 70, 50), width=2)
        d.line([(x, top), (x, bot)], fill=(90, 70, 50), width=2)
    # stones: black winning 5 horizontal on row 4, white scattered
    def stone(gi, gj, black=True):
        x = int(left + gi * step)
        y = int(top + gj * step)
        r = int(step * 0.38)
        col = (28, 26, 24) if black else (235, 228, 210)
        d.ellipse((x - r, y - r, x + r, y + r), fill=col)
        if not black:
            d.ellipse((x - r * 0.4, y - r * 0.55, x - r * 0.05, y - r * 0.15), fill=(255, 255, 245))
        else:
            d.ellipse((x - r * 0.35, y - r * 0.5, x - r * 0.05, y - r * 0.15), fill=(70, 68, 66))
    # winning black row
    for i in range(2, 7):
        stone(i, 4, True)
    # highlight winning line
    y4 = int(top + 4 * step)
    d.line([(int(left + 2 * step), y4), (int(left + 6 * step), y4)], fill=CORAL, width=5)
    # white stones
    stone(3, 2, False); stone(5, 3, False); stone(6, 5, False); stone(4, 6, False)
    # label
    f = R.font(R.FONT_B, 36); t = "오목 · 5목"; bb = d.textbbox((0, 0), t, font=f)
    d.text((cx - (bb[2] - bb[0]) // 2 - bb[0], cy + half + 24), t, font=f, fill=GOLD)

def calendar_strip(d, cy):
    """Week day pills Mon–Sun with Day6 highlighted."""
    days = ["월", "화", "수", "목", "금", "토", "일"]
    labels = ["D1", "D2", "D3", "D4", "D5", "D6", "끝"]
    # map: W02 started Mon 10/6 → Sun 10/12 is end; Day6 is Sat? Wait.
    # User said Day6 2026-10-11 which is Sunday. Calendar W02 starts 2026-10-06 Mon.
    # Day1=10/6 Mon ... Day6=10/11 Sat? Wait Oct 11 2026 is Sunday per user_info.
    # user_info: Sunday Oct 11, 2026. So Day6 is Sunday Oct 11.
    # Days: Mon10/6 D1, Tue D2, Wed D3, Thu D4, Fri D5, Sat D6? But RESULT day5 was 10/10 Sat.
    # day5 RESULT: 2026-10-10 KST Day5 — Saturday. So Day6 = Sunday 10/11.
    # Week strip: 월화수목금토일 = D1..D6 + leftover or show 6 days of ads.
    # Show Mon–Sat as done D1–D6? Actually: Day1 Mon ... Day5 Fri? No:
    # day1 10/6, day2 10/7, day3 10/8, day4 10/9, day5 10/10, day6 10/11.
    # So Mon=D1 ... Sat=D6? Oct 11 is Sunday!
    # Oct 6 2026 is Monday. Oct 11 is Saturday? Let me check:
    # User info says "Sunday Oct 11, 2026". If Oct 6 is Monday (calendar), then Oct 11 = Saturday.
    # Contradiction: calendar says 2026-10-06 W02 Monday. If Oct 6=Mon, Oct 11=Sat.
    # user_info says Sunday Oct 11 — might be wrong timezone label or calendar assumption.
    # Telegram caption uses 10/11(일) as user requested explicitly: 「W02 · 10/11(일) Day6」
    # So follow user: Sunday. Highlight 일 as Day6 / active.
    # Days Mon-Sat checked (D1-D5 + Sat?), active Sunday Day6.
    # Simpler: show 7 day pills with first 5 checked, 6th (토 or 일) active as "오늘", last muted.
    # User caption: 10/11(일) — highlight Sunday.
    n = 7
    total_w = 920
    gap = 12
    cell = (total_w - gap * (n - 1)) // n
    x0 = (W - total_w) // 2
    for i, (day, lab) in enumerate(zip(days, ["D1", "D2", "D3", "D4", "D5", "D6", "—"])):
        x = x0 + i * (cell + gap)
        # Day6 is Sunday index 6 per user 10/11(일); Mon-Sat = past week days D1-? 
        # Actually ads: D1 Mon..D6 Sun. So indices 0-5 = D1-D6? Then Sunday=D6 index 6.
        # Mon=0 D1 ... Sat=5 D6? No if Day6 is Sunday then Mon=D1..Sun=D6, index 6 = D6 active, 0-5 done.
        done = i < 6
        active = i == 6
        if active:
            fill, outline, tc = GOLD, GOLD, INK
        elif done:
            fill, outline, tc = (36, 48, 44), TEAL, TEAL
        else:
            fill, outline, tc = (36, 34, 30), MUTED, MUTED
        d.rounded_rectangle((x, cy, x + cell, cy + 110), 18, fill=fill, outline=outline, width=4)
        f = R.font(R.FONT_B, 36); bb = d.textbbox((0, 0), day, font=f)
        d.text((x + cell // 2 - (bb[2] - bb[0]) // 2 - bb[0], cy + 14), day, font=f, fill=tc if not active else INK)
        f2 = R.font(R.FONT_B, 28); lab2 = "오늘" if active else ("✓" if done else "")
        bb2 = d.textbbox((0, 0), lab2, font=f2)
        d.text((x + cell // 2 - (bb2[2] - bb2[0]) // 2 - bb2[0], cy + 62), lab2, font=f2, fill=INK if active else (TEAL if done else MUTED))


def slide1():
    im = bg(W, H, (40, 48, 68)); d = ImageDraw.Draw(im)
    y = pill(d, W // 2, 140, "매일웹겜 W02 · 주간 마무리", INK, GOLD, 38) + 36
    y = text_c(d, y, "이번 주 스네이크", CREAM, R.FONT_B, 100)
    text_c(d, y, "마지막 날!", GOLD, R.FONT_B, 130)
    calendar_strip(d, 620)
    # checklist of week's angles
    y = 800
    x = (W - 820) // 2
    y = check_row(d, x, y, "조작 · 속도 · 콤보")
    y = check_row(d, x, y, "황금 별 · 랭킹 도전")
    y = check_row(d, x, y, "오늘: 한 판 더!", done=True)
    framed(im, "play1", W // 2, 1580, 420, glow=TEAL)
    d = ImageDraw.Draw(im); text_c(d, H - 120, "playtoday.cloud", MUTED, R.FONT_R, 44)
    im.save(OUT / "slide1.png", optimize=True)

def slide2():
    im = bg(W, H, (32, 50, 48)); d = ImageDraw.Draw(im)
    y = text_c(d, 180, "이번 주 하이라이트", CREAM, R.FONT_B, 100)
    y = text_c(d, y, "다 모아봤어요", GOLD, R.FONT_B, 110)
    highlight_chips(d, 560)
    framed(im, "star", W // 2, 1100, 480, glow=GOLD)
    d = ImageDraw.Draw(im)
    y = text_c(d, 1480, "속도·콤보·황금별·랭킹", TEAL, R.FONT_B, 52)
    text_c(d, y, "한 주에 다 담았어요", MUTED, R.FONT_R, 48)
    im.save(OUT / "slide2.png", optimize=True)

def slide3():
    im = bg(W, H, (48, 36, 52)); d = ImageDraw.Draw(im)
    y = text_c(d, 200, "한 판 더", CREAM, R.FONT_B, 120)
    y = text_c(d, y, "해볼래요?", GOLD, R.FONT_B, 130)
    # big CTA pill
    pill(d, W // 2, 620, "지금 바로 한 판!", INK, TEAL, 52)
    framed(im, "play2", W // 2, 1100, 520, glow=CORAL)
    d = ImageDraw.Draw(im)
    y = text_c(d, 1520, "설치 없이 브라우저로", MUTED, R.FONT_R, 52)
    text_c(d, y, "스네이크 마지막 기회", CREAM, R.FONT_B, 56)
    im.save(OUT / "slide3.png", optimize=True)

def slide4():
    im = bg(W, H, (44, 36, 58)); d = ImageDraw.Draw(im)
    y = pill(d, W // 2, 160, "다음 주 W03 · 10/13~", INK, LILAC, 38) + 30
    y = text_c(d, y, "다음 주는", CREAM, R.FONT_B, 110)
    y = text_c(d, y, "오목!", GOLD, R.FONT_B, 140)
    omok_board(d, W // 2, 980, 440)
    y = text_c(d, 1480, "5목을 먼저 놓으면 승리", TEAL, R.FONT_B, 52)
    text_c(d, y, "클래식 한 판, 다음 주에!", MUTED, R.FONT_R, 48)
    im.save(OUT / "slide4.png", optimize=True)

def slide5():
    im = bg(W, H, (40, 48, 68)); d = ImageDraw.Draw(im)
    y = pill(d, W // 2, 170, "설치 · 가입 없이 브라우저로", INK, GOLD, 40) + 40
    y = text_c(d, y, "한 판 더 하고", CREAM, R.FONT_B, 100)
    y = text_c(d, y, "오목 예고 확인!", GOLD, R.FONT_B, 110)
    # dual chips: snake last + omok next
    chip(d, W // 2 - 220, 720, "스네이크", TEAL, 240, 90)
    chip(d, W // 2 + 220, 720, "다음 오목", GOLD, 240, 90)
    framed(im, "play3", W // 2, 1180, 480, glow=GOLD)
    d = ImageDraw.Draw(im)
    y = text_c(d, 1580, "지금 플레이!", TEAL, R.FONT_B, 120)
    text_c(d, H - 140, "playtoday.cloud", GOLD, R.FONT_B, 72)
    im.save(OUT / "slide5.png", optimize=True)

def card():
    S = 1080
    im = bg(S, S, (40, 48, 68)); d = ImageDraw.Draw(im)
    y = pill(d, S // 2, 48, "매일웹겜 · 스네이크 주간 마무리", INK, GOLD, 30) + 18
    y = text_c(d, y, "이번 주 스네이크", CREAM, R.FONT_B, 72, maxw=S - 100, cw=S)
    text_c(d, y - 4, "마지막 날!", GOLD, R.FONT_B, 92, maxw=S - 100, cw=S)
    # mini chips
    chip(d, S // 2 - 200, 420, "한 판 더", TEAL, 220, 72)
    chip(d, S // 2 + 200, 420, "다음 오목", GOLD, 220, 72)
    # mini omok
    omok_board(d, S // 2, 680, 280)
    y = text_c(d, 880, "설치 없이 브라우저로 · 지금 플레이", TEAL, R.FONT_B, 36, maxw=S - 90, cw=S)
    text_c(d, y - 2, "playtoday.cloud/games/015-snake", MUTED, R.FONT_R, 34, maxw=S - 100, cw=S)
    im.save(OUT / "card.png", optimize=True)
    im.save(OUT / "card_tg.jpg", quality=92)

# captions: lines + weight source text (narration phrase char count without spaces)
CAPTIONS = [
    (["이번 주 스네이크", "마지막 날!"], "이번 주 스네이크 마지막 날!"),
    (["한 판 더", "해볼래요?"], "한 판 더 해보고,"),
    (["다음 주는", "오목!"], "다음 주엔 오목이 찾아와요."),
    (["설치 없이", "브라우저로"], "설치 없이 브라우저에서 바로."),
    (["지금 플레이!"], "지금 플레이!"),
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
