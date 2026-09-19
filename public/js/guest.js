!function (t) {
  var n = "maeil.anon_id",
    e = "maeil.nickname",
    STYLE_ID = "maeil-nick-style";

  function r() {
    try {
      var e = localStorage.getItem(n);
      return (
        (e && /^[A-Za-z0-9._:-]{8,128}$/.test(e)) ||
          ((e = (function () {
            try {
              if (t.crypto && crypto.randomUUID) return crypto.randomUUID();
            } catch (t) {}
            return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
              /[xy]/g,
              function (t) {
                var n = (16 * Math.random()) | 0;
                return ("x" === t ? n : (3 & n) | 8).toString(16);
              }
            );
          })()),
          localStorage.setItem(n, e)),
        e
      );
    } catch (t) {
      return "guest-" + String(Date.now());
    }
  }

  function c() {
    try {
      return (localStorage.getItem(e) || "").trim().slice(0, 24);
    } catch (t) {
      return "";
    }
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent =
      ".maeil-nick{margin:10px 0 12px;padding:10px 10px 8px;border-radius:14px;" +
      "border:1px solid rgba(239,230,212,.14);background:rgba(18,22,30,.88);" +
      "text-align:left;max-width:100%;box-sizing:border-box}" +
      ".maeil-nick-label{display:block;font-size:11px;color:#c9bda6;margin:0 0 6px}" +
      ".maeil-nick-row{display:flex;gap:8px;align-items:stretch}" +
      ".maeil-nick-input{flex:1;min-width:0;min-height:40px;border-radius:11px;" +
      "border:1px solid #3a4252;background:#12161e;color:#efe6d4;padding:0 11px;" +
      "font-size:15px;box-sizing:border-box}" +
      ".maeil-nick-input:focus{outline:2px solid rgba(232,200,122,.55);outline-offset:1px}" +
      ".maeil-nick-save{flex-shrink:0;min-height:40px;padding:0 14px;border:0;" +
      "border-radius:11px;background:linear-gradient(135deg,#e8c87a,#c9a227);" +
      "color:#141311;font-weight:800;font-size:14px;cursor:pointer}" +
      ".maeil-nick-status{margin:6px 2px 0;font-size:12px;color:#8b93a3;min-height:1.2em}";
    (document.head || document.documentElement).appendChild(s);
  }

  function mountNickForm(rootEl) {
    if (!rootEl || rootEl.getAttribute("data-maeil-nick-mounted") === "1")
      return null;
    ensureStyle();
    rootEl.setAttribute("data-maeil-nick-mounted", "1");
    rootEl.classList.add("maeil-nick");
    rootEl.setAttribute("aria-label", "닉네임");
    var uid = "mn-" + Math.random().toString(36).slice(2, 8);
    rootEl.innerHTML =
      '<label class="maeil-nick-label" for="' +
      uid +
      '-in">닉네임</label>' +
      '<div class="maeil-nick-row">' +
      '<input class="maeil-nick-input" id="' +
      uid +
      '-in" maxlength="24" placeholder="순위에 올라갈 이름" autocomplete="nickname"/>' +
      '<button class="maeil-nick-save" type="button" id="' +
      uid +
      '-btn">저장</button></div>' +
      '<p class="maeil-nick-status" id="' +
      uid +
      '-st"></p>';
    var input = rootEl.querySelector(".maeil-nick-input");
    var btn = rootEl.querySelector(".maeil-nick-save");
    var status = rootEl.querySelector(".maeil-nick-status");

    function refresh() {
      var nick = c();
      if (input && document.activeElement !== input) input.value = nick;
      if (status)
        status.textContent = nick
          ? "저장됨 · " + nick
          : "닉네임을 저장하면 순위에 이름이 올라가요";
    }

    function save() {
      o.setNickname(input ? input.value : "");
      refresh();
    }

    if (btn) btn.addEventListener("click", save);
    if (input) {
      input.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") {
          ev.preventDefault();
          save();
        }
      });
      input.addEventListener("blur", function () {
        var cur = c();
        var next = String(input.value || "").trim().slice(0, 24);
        if (next !== cur) save();
      });
    }
    refresh();
    return { refresh: refresh, save: save, root: rootEl };
  }

  function autoMount() {
    try {
      var nodes = document.querySelectorAll("[data-maeil-nick]");
      for (var i = 0; i < nodes.length; i++) mountNickForm(nodes[i]);
    } catch (t) {}
  }

  var o = {
    getAnonId: r,
    getNickname: c,
    setNickname: function (t) {
      var n = String(null == t ? "" : t)
        .trim()
        .slice(0, 24);
      try {
        n ? localStorage.setItem(e, n) : localStorage.removeItem(e);
      } catch (t) {}
      return n;
    },
    postScore: function (t, n) {
      try {
        var e = { anon_id: r(), game_id: t, score: 0 | Number(n) },
          o = c();
        return (
          o && (e.nickname = o),
          fetch("/api/scores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(e),
          })
            .then(function (t) {
              return t.json().catch(function () {
                return null;
              });
            })
            .catch(function () {
              return null;
            })
        );
      } catch (t) {
        return Promise.resolve(null);
      }
    },
    fetchTop: function (t, n) {
      try {
        var e = new URLSearchParams({
          game_id: t,
          limit: String(n || 10),
          anon_id: r(),
        });
        return fetch("/api/scores?" + e, { cache: "no-cache" })
          .then(function (t) {
            return t.json();
          })
          .catch(function () {
            return null;
          });
      } catch (t) {
        return Promise.resolve(null);
      }
    },
    mountNickForm: mountNickForm,
    autoMountNickForms: autoMount,
  };

  t.MaeilGuest = o;

  if (typeof document !== "undefined") {
    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", autoMount);
    else autoMount();
  }
}.call(
  this,
  "undefined" != typeof window ? window : globalThis
);
