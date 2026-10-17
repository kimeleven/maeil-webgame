#!/usr/bin/env python3
"""Render 매일웹겜 Shorts slides with Noto Sans CJK (KR). Never use default fonts."""
from __future__ import annotations
import argparse, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

FONT_B = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
FONT_R = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
W, H = 1080, 1920
INK = (15, 20, 25)
CREAM = (239, 230, 212)
GOLD = (232, 200, 122)
MUTED = (154, 163, 178)
PADS = [(61, 180, 150), (70, 120, 220), (220, 90, 160), (224, 184, 79)]


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size=size, index=0)


def assert_korean(f: ImageFont.FreeTypeFont) -> None:
    # Fail loudly if glyphs missing (bbox width ~0 or tofu)
    im = Image.new("RGB", (64, 64))
    d = ImageDraw.Draw(im)
    bb = d.textbbox((0, 0), "한글", font=f)
    if bb[2] - bb[0] < 20:
        raise SystemExit("Korean glyphs missing — refuse to render with broken font")


def draw_pads(d: ImageDraw.ImageDraw, cx: int, cy: int, size: int = 130, gap: int = 34) -> None:
    pos = [(0, -1), (-1, 0), (1, 0), (0, 1)]
    for c, (dx, dy) in zip(PADS, pos):
        x = cx + dx * (size + gap)
        y = cy + dy * (size + gap)
        pts = [(x, y - size // 2), (x + size // 2, y), (x, y + size // 2), (x - size // 2, y)]
        d.polygon(pts, fill=c)


def fit(d, text: str, path: str, max_w: int, start: int):
    for s in range(start, 28, -2):
        f = font(path, s)
        bb = d.textbbox((0, 0), text, font=f)
        if bb[2] - bb[0] <= max_w:
            return f, bb
    f = font(path, 28)
    return f, d.textbbox((0, 0), text, font=f)


def make_slide(out: Path, lines: list[tuple[str, tuple, str, int]]) -> None:
    im = Image.new("RGB", (W, H), INK)
    glow = Image.new("RGB", (W, H), INK)
    g = ImageDraw.Draw(glow)
    g.ellipse((W // 2 - 420, H // 2 - 200, W // 2 + 420, H // 2 + 700), fill=(28, 34, 42))
    im = Image.blend(im, glow.filter(ImageFilter.GaussianBlur(80)), 0.55)
    d = ImageDraw.Draw(im)
    assert_korean(font(FONT_B, 40))
    draw_pads(d, W // 2, int(H * 0.52))
    y = 220
    for text, color, path, start in lines:
        f, bb = fit(d, text, path, W - 160, start)
        tw, th = bb[2] - bb[0], bb[3] - bb[1]
        x = (W - tw) // 2
        d.text((x + 2, y + 2), text, font=f, fill=(0, 0, 0))
        d.text((x, y), text, font=f, fill=color)
        y += th + 28
    out.parent.mkdir(parents=True, exist_ok=True)
    im.save(out, optimize=True)


def mux(out_dir: Path, narr: Path, bgm: Path | None) -> Path:
    slides = sorted(out_dir.glob("slide*.png"))
    if len(slides) < 2:
        raise SystemExit("need slide1..N.png")
    dur = float(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(narr)],
        text=True,
    ).strip())
    seg = max(3.0, dur / len(slides))
    listf = out_dir / "slides.txt"
    with listf.open("w") as f:
        for s in slides:
            f.write(f"file '{s.name}'\nduration {seg}\n")
        f.write(f"file '{slides[-1].name}'\n")
    silent = out_dir / "shorts-silent.mp4"
    subprocess.check_call([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(listf),
        "-vf", "scale=1080:1920,format=yuv420p", "-r", "30", "-t", str(dur + 0.3), str(silent),
    ], stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
    out = out_dir / "shorts.mp4"
    if bgm and bgm.exists():
        fade = max(0.5, dur - 1.2)
        fc = f"[1:a]volume=1.0[a1];[2:a]volume=0.12,afade=t=out:st={fade:.2f}:d=1.2[a2];[a1][a2]amix=inputs=2:duration=first:dropout_transition=2[a]"
        cmd = ["ffmpeg", "-y", "-i", str(silent), "-i", str(narr), "-i", str(bgm),
               "-filter_complex", fc, "-map", "0:v", "-map", "[a]",
               "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "aac", "-b:a", "160k",
               "-shortest", "-movflags", "+faststart", str(out)]
    else:
        cmd = ["ffmpeg", "-y", "-i", str(silent), "-i", str(narr),
               "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "fast", "-crf", "23",
               "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", str(out)]
    subprocess.check_call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--line1", required=True)
    ap.add_argument("--line2", required=True)
    ap.add_argument("--line3", required=True)
    ap.add_argument("--line4a", default="설치 없이 바로")
    ap.add_argument("--line4b", default="playtoday.cloud")
    ap.add_argument("--line4c", default="한 판 어때요?")
    ap.add_argument("--narration", type=Path)
    ap.add_argument("--bgm", type=Path)
    args = ap.parse_args()
    out = args.out
    make_slide(out / "slide1.png", [
        (args.line1, CREAM, FONT_B, 78), (args.line2, GOLD, FONT_B, 64), (args.line3, MUTED, FONT_R, 42)])
    make_slide(out / "slide2.png", [
        ("빛나는 패드", CREAM, FONT_B, 72), ("순서를 기억하세요", GOLD, FONT_B, 56), ("네 칸이 차례로 반짝여요", MUTED, FONT_R, 40)])
    make_slide(out / "slide3.png", [
        ("라운드가 올라가면", CREAM, FONT_B, 64), ("시퀀스가 길어져요", GOLD, FONT_B, 56), ("기억력이 점수로", MUTED, FONT_R, 40)])
    make_slide(out / "slide4.png", [
        (args.line4a, CREAM, FONT_B, 64), (args.line4b, GOLD, FONT_B, 56), (args.line4c, MUTED, FONT_R, 40)])
    if args.narration and args.narration.exists():
        p = mux(out, args.narration, args.bgm)
        print(p)


if __name__ == "__main__":
    main()
