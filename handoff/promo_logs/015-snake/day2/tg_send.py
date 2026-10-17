#!/usr/bin/env python3
# Owner DM only. Never group chats.
import json, uuid, urllib.request
from pathlib import Path
D = Path(__file__).resolve().parent
CHAT = 5799051013
assert CHAT not in (-5396172801, -5278661601)
token = Path("/home/box/.local/telegram/bot_token").read_text().strip()
cap = (D / "telegram_caption.txt").read_text().strip()
photo = (D / "card_tg.jpg").read_bytes()
b = uuid.uuid4().hex
parts = []
for k, v in (("chat_id", str(CHAT)), ("caption", cap)):
    parts.append(f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
parts.append(f'--{b}\r\nContent-Disposition: form-data; name="photo"; filename="card_tg.jpg"\r\nContent-Type: image/jpeg\r\n\r\n'.encode() + photo + b"\r\n")
parts.append(f"--{b}--\r\n".encode())
req = urllib.request.Request(f"https://api.telegram.org/bot{token}/sendPhoto", data=b"".join(parts),
                             headers={"Content-Type": f"multipart/form-data; boundary={b}"})
with urllib.request.urlopen(req, timeout=60) as r:
    res = json.loads(r.read())
(D / "tg_send_raw.json").write_text(json.dumps(res, ensure_ascii=False))
m = res.get("result", {})
out = {"ok": res.get("ok"), "message_id": m.get("message_id"), "chat_id": m.get("chat", {}).get("id"),
       "chat_type": m.get("chat", {}).get("type"), "photo": str(D / "card_tg.jpg"),
       "caption_file": str(D / "telegram_caption.txt"), "note": "owner DM only"}
(D / "tg_send_result.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
print(json.dumps(out, ensure_ascii=False))
