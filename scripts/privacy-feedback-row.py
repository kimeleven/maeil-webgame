#!/usr/bin/env python3
# t_3a1c9b31: 개인정보 처리방침에 '의견 접수' 행 추가 (6개 언어). 멱등.
import json, pathlib
T = {
 "ko": "의견 접수: '의견남기기'로 보낼 때만 의견 내용, 화면 캡처(직접 켠 경우만), 페이지 주소, 브라우저/OS, 남용 방지용 IP 해시를 저장해요. 이름·이메일은 받지 않아요. 처리 후 90일이 지나면 캡처와 의견을 삭제해요.",
 "en": "Feedback: only when you send it with 'Feedback', we store your message, a screenshot (only if you turn it on), the page URL, browser/OS and a hashed IP to prevent abuse. No name or email. Screenshots and messages are deleted 90 days after we handle them.",
 "ja": "ご意見の受付：「ご意見」から送ったときだけ、ご意見の内容、画面キャプチャ（オンにした場合のみ）、ページURL、ブラウザ/OS、悪用防止用のIPハッシュを保存します。名前・メールは受け取りません。対応後90日でキャプチャとご意見を削除します。",
 "zh-hans": "意见反馈：仅在你通过「意见反馈」提交时，保存意见内容、屏幕截图（仅在你开启时）、页面地址、浏览器/操作系统以及用于防止滥用的IP哈希。不收集姓名和邮箱。处理完成90天后删除截图和意见。",
 "es": "Comentarios: solo cuando los envías con 'Comentarios' guardamos tu mensaje, una captura (solo si la activas), la URL de la página, navegador/SO y un hash de IP para evitar abusos. Sin nombre ni email. Capturas y mensajes se borran 90 días después de atenderlos.",
 "pt-br": "Feedback: só quando você envia pelo 'Feedback' guardamos sua mensagem, uma captura de tela (só se você ativar), a URL da página, navegador/SO e um hash do IP para evitar abuso. Sem nome nem e-mail. Capturas e mensagens são apagadas 90 dias após o atendimento.",
}
root = pathlib.Path(__file__).resolve().parents[1] / "i18n"
for l, t in T.items():
    p = root / f"{l}.json"
    s = p.read_text(encoding="utf-8")
    d = json.loads(s)
    body = d["privacy"]["body"]
    if any(x.startswith(t[:6]) for x in body):
        continue
    old = json.dumps(body[-1], ensure_ascii=False)
    assert s.count(old) == 1, l
    s = s.replace(old, old + ", " + json.dumps(t, ensure_ascii=False))
    json.loads(s)
    p.write_text(s, encoding="utf-8")
    print("added", l)
