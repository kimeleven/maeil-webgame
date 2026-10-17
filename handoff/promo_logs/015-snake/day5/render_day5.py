#!/usr/bin/env python3
"""015-snake Day5 (rank_beat_me): slides/card/captions. Noto Sans CJK via _tools/render_slides_kr.py."""
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

def bg(w, h, tint=(36, 42, 58)):
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

def trophy(d, cx, cy, scale=1.0):
    """Simple cream/gold trophy silhouette."""
    s = scale
    # cup
    d.ellipse((cx - 70*s, cy - 90*s, cx + 70*s, cy - 20*s), fill=GOLD)
    d.polygon([(cx - 55*s, cy - 50*s), (cx + 55*s, cy - 50*s), (cx + 35*s, cy + 40*s), (cx - 35*s, cy + 40*s)], fill=GOLD)
    # handles
    d.arc((cx - 110*s, cy - 80*s, cx - 40*s, cy + 10*s), 90, 270, fill=GOLD, width=int(14*s))
    d.arc((cx + 40*s, cy - 80*s, cx + 110*s, cy + 10*s), -90, 90, fill=GOLD, width=int(14*s))
    # stem + base
    d.rectangle((cx - 14*s, cy + 40*s, cx + 14*s, cy + 90*s), fill=TEAL)
    d.rounded_rectangle((cx - 55*s, cy + 88*s, cx + 55*s, cy + 118*s), int(12*s), fill=CREAM)
    # highlight
    d.ellipse((cx - 35*s, cy - 78*s, cx - 5*s, cy - 48*s), fill=(255, 240, 180))

def rank_badge(d, cx, cy, rank="N", size=160):
    r = size // 2
    d.ellipse((cx - r - 8, cy - r - 8, cx + r + 8, cy + r + 8), fill=(40, 38, 34), outline=GOLD, width=8)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(36, 48, 56), outline=TEAL, width=6)
    f = R.font(R.FONT_B, int(size * 0.55)); s = str(rank); bb = d.textbbox((0, 0), s, font=f)
    d.text((cx - (bb[2] - bb[0]) // 2 - bb[0], cy - (bb[3] - bb[1]) // 2 - bb[1] - 8), s, font=f, fill=GOLD)
    f2 = R.font(R.FONT_B, 36); lab = "위"; bb2 = d.textbbox((0, 0), lab, font=f2)
    d.text((cx - (bb2[2] - bb2[0]) // 2 - bb2[0], cy + r - 48), lab, font=f2, fill=MUTED)

def podium(d, base_y):
    """1-2-3 podium bars with ranks."""
    bars = [
        (W // 2 - 280, 180, "2", MUTED, 140),
        (W // 2 - 80, 260, "1", GOLD, 220),
        (W // 2 + 120, 150, "3", CORAL, 110),
    ]
    for x, h, lab, col, _ in bars:
        d.rounded_rectangle((x, base_y - h, x + 160, base_y), 18, fill=(36, 34, 30))
        d.rounded_rectangle((x + 6, base_y - h + 6, x + 154, base_y - 6), 14, outline=col, width=5)
        f = R.font(R.FONT_B, 72); bb = d.textbbox((0, 0), lab, font=f)
        d.text((x + 80 - (bb[2] - bb[0]) // 2 - bb[0], base_y - h // 2 - (bb[3] - bb[1]) // 2 - bb[1]), lab, font=f, fill=col)

def nickname_box(d, cx, y, text="플레이어"):
    w, h = 620, 120
    x = cx - w // 2
    d.rounded_rectangle((x, y, x + w, y + h), 28, fill=(36, 34, 30), outline=TEAL, width=5)
    f = R.font(R.FONT_B, 52); bb = d.textbbox((0, 0), text, font=f)
    d.text((cx - (bb[2] - bb[0]) // 2 - bb[0], y + 34 - bb[1]), text, font=f, fill=CREAM)
    # caret
    d.rectangle((cx + (bb[2] - bb[0]) // 2 + 12, y + 32, cx + (bb[2] - bb[0]) // 2 + 18, y + 88), fill=GOLD)

def share_button(d, cx, y, label="자랑하기"):
    f = R.font(R.FONT_B, 56); bb = d.textbbox((0, 0), label, font=f)
    w = bb[2] - bb[0] + 100; h = bb[3] - bb[1] + 56
    d.rounded_rectangle((cx - w // 2, y, cx + w // 2, y + h), h // 2, fill=TEAL)
    d.text((cx - (bb[2] - bb[0]) // 2 - bb[0], y + 28 - bb[1]), label, font=f, fill=INK)
    return y + h

def score_vs(d, cy):
    """Friend score vs my score comparison."""
    # left friend
    d.rounded_rectangle((80, cy, 480, cy + 280), 32, fill=(36, 34, 30), outline=MUTED, width=5)
    f = R.font(R.FONT_B, 40); t = "친구"; bb = d.textbbox((0, 0), t, font=f)
    d.text((280 - (bb[2] - bb[0]) // 2 - bb[0], cy + 36), t, font=f, fill=MUTED)
    f = R.font(R.FONT_B, 88); t = "1280"; bb = d.textbbox((0, 0), t, font=f)
    d.text((280 - (bb[2] - bb[0]) // 2 - bb[0], cy + 110), t, font=f, fill=CREAM)
    f = R.font(R.FONT_R, 36); t = "점"; bb = d.textbbox((0, 0), t, font=f)
    d.text((280 - (bb[2] - bb[0]) // 2 - bb[0], cy + 210), t, font=f, fill=MUTED)
    # VS
    f = R.font(R.FONT_B, 48); t = "VS"; bb = d.textbbox((0, 0), t, font=f)
    d.text((W // 2 - (bb[2] - bb[0]) // 2 - bb[0], cy + 100), t, font=f, fill=GOLD)
    # right me
    d.rounded_rectangle((600, cy, 1000, cy + 280), 32, fill=(36, 34, 30), outline=GOLD, width=6)
    f = R.font(R.FONT_B, 40); t = "나"; bb = d.textbbox((0, 0), t, font=f)
    d.text((800 - (bb[2] - bb[0]) // 2 - bb[0], cy + 36), t, font=f, fill=GOLD)
    f = R.font(R.FONT_B, 88); t = "1281"; bb = d.textbbox((0, 0), t, font=f)
    d.text((800 - (bb[2] - bb[0]) // 2 - bb[0], cy + 110), t, font=f, fill=TEAL)
    f = R.font(R.FONT_R, 36); t = "점 (+1)"; bb = d.textbbox((0, 0), t, font=f)
    d.text((800 - (bb[2] - bb[0]) // 2 - bb[0], cy + 210), t, font=f, fill=TEAL)


def slide1():
    im = bg(W, H, (42, 48, 72)); d = ImageDraw.Draw(im)
    y = pill(d, W // 2, 140, "매일웹겜 W02 · 랭킹 도전", INK, GOLD, 38) + 40
    y = text_c(d, y, "친구 기록,", CREAM, R.FONT_B, 112)
    text_c(d, y, "이길 수 있어?", GOLD, R.FONT_B, 130)
    trophy(d, W // 2 - 200, 720, 1.15)
    rank_badge(d, W // 2 + 180, 700, "3", 180)
    framed(im, "play1", W // 2, 1280, 560, glow=TEAL)
    d = ImageDraw.Draw(im); text_c(d, H - 140, "playtoday.cloud", MUTED, R.FONT_R, 44)
    im.save(OUT / "slide1.png", optimize=True)

def slide2():
    im = bg(W, H, (28, 48, 52)); d = ImageDraw.Draw(im)
    y = text_c(d, 200, "닉네임 남기고", CREAM, R.FONT_B, 110)
    y = text_c(d, y, "순위에 도전", GOLD, R.FONT_B, 130)
    nickname_box(d, W // 2, 620, "민트봇")
    # arrow down
    d.polygon([(W // 2 - 28, 800), (W // 2 + 28, 800), (W // 2, 860)], fill=TEAL)
    # rank result card
    d.rounded_rectangle((140, 900, 940, 1280), 36, fill=(36, 34, 30), outline=GOLD, width=5)
    y = text_c(d, 960, "현재 순위 3위", TEAL, R.FONT_B, 72)
    y = text_c(d, y, "최고 1280점", CREAM, R.FONT_B, 64)
    text_c(d, y + 10, "MaeilGuest · 순위 등록", MUTED, R.FONT_R, 40)
    podium(d, 1680)
    im.save(OUT / "slide2.png", optimize=True)

def slide3():
    im = bg(W, H, (48, 36, 58)); d = ImageDraw.Draw(im)
    y = text_c(d, 200, "끝난 뒤", CREAM, R.FONT_B, 110)
    y = text_c(d, y, "자랑하기!", GOLD, R.FONT_B, 140)
    # end-screen mock
    d.rounded_rectangle((120, 560, 960, 1180), 40, fill=(36, 34, 30), outline=TEAL, width=5)
    y = text_c(d, 620, "게임 오버", MUTED, R.FONT_R, 48)
    y = text_c(d, y, "1280점", CREAM, R.FONT_B, 100)
    y = text_c(d, y, "현재 순위 3위 · 최고 1280점", TEAL, R.FONT_B, 44)
    share_button(d, W // 2, 980, "자랑하기")
    y = text_c(d, 1280, "나를 이겨봐", GOLD, R.FONT_B, 80)
    y = text_c(d, y, "SNS 도전장 전송", MUTED, R.FONT_R, 48)
    framed(im, "play3", W // 2, 1680, 360, glow=GOLD)
    im.save(OUT / "slide3.png", optimize=True)

def slide4():
    im = bg(W, H, (52, 32, 36)); d = ImageDraw.Draw(im)
    y = text_c(d, 180, "친구에게", CREAM, R.FONT_B, 110)
    text_c(d, y, "도전장 보내요", GOLD, R.FONT_B, 120)
    score_vs(d, 560)
    y = text_c(d, 920, "한 점만 더!", TEAL, R.FONT_B, 120)
    y = text_c(d, y, "오늘 목표: 친구 점수 +1", MUTED, R.FONT_R, 48)
    framed(im, "long1", W // 2, 1480, 480, glow=CORAL)
    im.save(OUT / "slide4.png", optimize=True)

def slide5():
    im = bg(W, H, (42, 48, 72)); d = ImageDraw.Draw(im)
    y = pill(d, W // 2, 170, "설치 · 가입 없이 브라우저로", INK, GOLD, 40)
    trophy(d, W // 2, 480, 1.2)
    y = text_c(d, 720, "한 점만 더!", CREAM, R.FONT_B, 120)
    y = text_c(d, y, "지금 플레이", TEAL, R.FONT_B, 130)
    framed(im, "play2", W // 2, 1380, 480, glow=GOLD)
    d = ImageDraw.Draw(im); text_c(d, H - 150, "playtoday.cloud", GOLD, R.FONT_B, 76)
    im.save(OUT / "slide5.png", optimize=True)

def card():
    S = 1080
    im = bg(S, S, (42, 48, 72)); d = ImageDraw.Draw(im)
    y = pill(d, S // 2, 48, "매일웹겜 · 스네이크 랭킹", INK, GOLD, 32) + 22
    y = text_c(d, y, "친구 기록,", CREAM, R.FONT_B, 80, maxw=S - 100, cw=S)
    text_c(d, y - 6, "이길 수 있어?", GOLD, R.FONT_B, 100, maxw=S - 100, cw=S)
    trophy(d, S // 2 - 160, 520, 0.85)
    rank_badge(d, S // 2 + 160, 500, "N", 140)
    y = text_c(d, 700, "닉네임 → 순위 · 자랑하기 도전장", TEAL, R.FONT_B, 40, maxw=S - 90, cw=S)
    y = text_c(d, y - 4, "한 점만 더! 지금 플레이", CREAM, R.FONT_B, 44, maxw=S - 90, cw=S)
    text_c(d, y - 2, "playtoday.cloud/games/015-snake", MUTED, R.FONT_R, 36, maxw=S - 100, cw=S)
    im.save(OUT / "card.png", optimize=True)
    im.save(OUT / "card_tg.jpg", quality=92)

CAPTIONS = [
    (["친구 기록,", "이길 수 있어?"], "친구 기록, 이길 수 있어?"),
    (["닉네임 남기고", "순위에 도전"], "스네이크에서 닉네임 남기고 순위에 올라보세요."),
    (["끝난 뒤", "자랑하기!"], "끝난 뒤 자랑하기로"),
    (["친구에게", "도전장 보내요"], "친구에게 도전장을 보내요."),
    (["한 점만 더!", "지금 플레이"], "오늘은 친구 점수보다 한 점만 더! 지금 플레이!"),
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
