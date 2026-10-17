#!/usr/bin/env python3
"""Rebuild shorts.mp4 = slides + centered big captions + narration + BGM.
Usage:
  python3 mux_shorts.py                      # auto: narration_gemini.wav > narration.wav > narration_edge.mp3
  python3 mux_shorts.py --narration X.wav    # swap in any narration (e.g. Gemini TTS wav)
  python3 mux_shorts.py --narration X.wav --out shorts_gemini.mp4 --bgm-vol 0.12
Caption timing is proportional to narration text length, scaled to the narration's real duration.
"""
import argparse, json, subprocess, sys
from pathlib import Path
D = Path(__file__).resolve().parent

def dur(p):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                          "-of", "default=nw=1:nk=1", str(p)], text=True).strip())

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--narration", type=Path)
    ap.add_argument("--out", type=Path, default=D / "shorts.mp4")
    ap.add_argument("--bgm", type=Path, default=D / "bgm.wav")
    ap.add_argument("--bgm-vol", type=float, default=0.12)
    ap.add_argument("--lead", type=float, default=0.15, help="silence before narration starts")
    a = ap.parse_args()
    narr = a.narration
    if narr is None:
        for c in ["narration_gemini.wav", "narration.wav", "narration_edge.mp3"]:
            if (D / c).exists(): narr = D / c; break
    if not narr or not Path(narr).exists(): sys.exit("no narration file")
    narr = Path(narr).resolve()
    nd = dur(narr); total = round(nd + a.lead + 0.6, 3)
    slides = sorted(D.glob("slide[0-9]*.png"))
    caps = json.loads((D / "captions" / "captions.json").read_text())
    # slides: equal split, last slide slightly longer
    n = len(slides); seg = total / n
    inputs = []; fc = []
    for i, s in enumerate(slides):
        inputs += ["-loop", "1", "-t", f"{seg:.3f}", "-framerate", "30", "-i", str(s)]
        fc.append(f"[{i}:v]scale=1080:1920,setsar=1,format=yuv420p[s{i}]")
    fc.append("".join(f"[s{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=0[base]")
    ci = n
    for c in caps: inputs += ["-i", str(D / "captions" / c["file"])]
    # caption windows proportional to weight across narration time
    W = sum(c["weight"] for c in caps); t = a.lead; prev = "base"
    for k, c in enumerate(caps):
        t1 = t + nd * c["weight"] / W
        end = total if k == len(caps) - 1 else t1
        fc.append(f"[{prev}][{ci + k}:v]overlay=x=0:y=(H-h)/2+60:enable='between(t,{t:.3f},{end:.3f})'[v{k}]")
        prev = f"v{k}"; t = t1
    ai = ci + len(caps)
    inputs += ["-i", str(narr), "-stream_loop", "-1", "-i", str(a.bgm)]
    lead_ms = int(a.lead * 1000)
    fc.append(f"[{ai}:a]aresample=44100,adelay={lead_ms}|{lead_ms},apad[nar]")
    fc.append(f"[{ai + 1}:a]aresample=44100,volume={a.bgm_vol},afade=t=out:st={max(0.5, total - 1.2):.2f}:d=1.2[bg]")
    fc.append("[nar][bg]amix=inputs=2:duration=shortest:normalize=0,atrim=0:" + f"{total:.3f}" + "[a]")
    cmd = ["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", ";".join(fc),
           "-map", f"[{prev}]", "-map", "[a]", "-t", f"{total:.3f}", "-r", "30",
           "-c:v", "libx264", "-preset", "medium", "-crf", "22", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "160k", "-ac", "2", "-movflags", "+faststart", str(a.out)]
    subprocess.check_call(cmd)
    (D / "voice_used.txt").write_text(f"{narr.name}\n")
    print(f"{a.out} narration={narr.name} narr_dur={nd:.2f}s video_dur={total:.2f}s")

if __name__ == "__main__":
    main()
