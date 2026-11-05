/* Fingerprint Authentication - plain JavaScript.
   Secure mode: uses the browser's WebAuthn API, so the real fingerprint reader / Windows Hello / Touch ID is used.
   Works on https:// or http://localhost.  Demo mode: simulated scanner for devices or pages without biometrics. */
(function () {
  "use strict";

  var KEY = "fpauth.users.v1";
  var $ = function (id) { return document.getElementById(id); };
  var scanner = $("scanner"), statusEl = $("status"), list = $("userList");
  var regBtn = $("regBtn"), logBtn = $("logBtn");

  var users = load();
  var selectedId = null, secure = false, busy = false, resetTimer;

  function load() {
    try {
      var v = JSON.parse(window.localStorage.getItem(KEY) || "[]");
      return Array.isArray(v) ? v.filter(function (u) { return u && typeof u.name === "string" && u.id; }) : [];
    } catch (e) { return []; }
  }
  function save() { try { window.localStorage.setItem(KEY, JSON.stringify(users)); } catch (e) {} }

  /* ---------- helpers ---------- */
  function b64(buf) {
    var s = "", a = new Uint8Array(buf);
    for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function unb64(str) {
    str = str.replace(/-/g, "+").replace(/_/g, "/"); while (str.length % 4) str += "=";
    var bin = atob(str), a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return a.buffer;
  }
  function rand(n) { var a = new Uint8Array(n); (window.crypto || window.msCrypto).getRandomValues(a); return a; }
  function uid() { return b64(rand(9)); }
  function colour(name) {
    var h = 0; for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
    return "hsl(" + h + ",65%,42%)";
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ---------- UI state ---------- */
  function setStatus(text) { statusEl.textContent = text; }
  function scanState(s) {
    scanner.classList.remove("scanning", "ok", "bad");
    if (s) scanner.classList.add(s);
  }
  function lock(on) { busy = on; regBtn.disabled = on; logBtn.disabled = on; }
  function idle(delay) {
    clearTimeout(resetTimer);
    resetTimer = setTimeout(function () { scanState(null); setStatus("Place your finger..."); }, delay || 2500);
  }
  function banner(ok, title, text, name) {
    var r = $("result"); r.hidden = false; r.classList.toggle("fail", !ok);
    $("rIco").textContent = ok ? "\u2713" : "\u2715";
    $("rTitle").textContent = title;
    var t = $("rText"); t.textContent = "";
    if (name) { t.appendChild(document.createTextNode("Welcome, ")); var b = document.createElement("b"); b.textContent = name; t.appendChild(b); }
    else t.textContent = text || "";
    r.classList.remove("pop"); void r.offsetWidth; r.classList.add("pop");
  }
  function hideBanner() { $("result").hidden = true; }

  function render(hitId) {
    list.textContent = "";
    if (!users.length) {
      var li = document.createElement("li"); li.className = "none"; li.textContent = "No users yet. Press Register Fingerprint.";
      list.appendChild(li);
    }
    var needPick = users.filter(function (u) { return !u.credId; }).length > 1;
    $("hint").hidden = !needPick;
    users.forEach(function (u) {
      var li = document.createElement("li"); li.className = "u";
      if (!u.credId) {
        li.classList.add("pick");
        li.tabIndex = 0; li.setAttribute("role", "button");
        li.addEventListener("click", function () { selectedId = selectedId === u.id ? null : u.id; render(); });
        li.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); li.click(); } });
      }
      if (u.id === selectedId) li.classList.add("sel");
      if (u.id === hitId) li.classList.add("hit");
      var av = document.createElement("span"); av.className = "av"; av.style.background = colour(u.name);
      av.textContent = u.name.charAt(0).toUpperCase(); av.setAttribute("aria-hidden", "true");
      var nm = document.createElement("span"); nm.className = "nm"; nm.textContent = u.name;
      var tag = document.createElement("span"); tag.className = "tag"; tag.textContent = u.credId ? "device" : "demo";
      var ck = document.createElement("span"); ck.className = "ck"; ck.textContent = "\u2713"; ck.setAttribute("aria-label", "Registered");
      var del = document.createElement("button"); del.type = "button"; del.className = "del";
      del.innerHTML = "&times;"; del.setAttribute("aria-label", "Remove " + u.name);
      del.addEventListener("click", function (e) {
        e.stopPropagation();
        users = users.filter(function (x) { return x.id !== u.id; });
        if (selectedId === u.id) selectedId = null;
        save(); render(); hideBanner();
      });
      [av, nm, tag, ck, del].forEach(function (el) { li.appendChild(el); });
      list.appendChild(li);
    });
  }

  /* ---------- capability check ---------- */
  function detect() {
    var supported = window.isSecureContext && window.PublicKeyCredential && navigator.credentials;
    if (!supported) return Promise.resolve(false);
    if (!PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) return Promise.resolve(false);
    return PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(function () { return false; });
  }
  detect().then(function (ok) {
    secure = !!ok;
    $("mode").textContent = ok
      ? "Secure mode: uses your device fingerprint / Windows Hello"
      : "Demo mode: simulated scanner (no device biometrics found)";
  });

  /* ---------- register ---------- */
  var dlg = $("dlg");
  regBtn.addEventListener("click", function () {
    if (busy) return;
    $("nameIn").value = ""; $("derr").textContent = "";
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
    $("nameIn").focus();
  });
  $("dCancel").addEventListener("click", function () { dlg.close ? dlg.close() : dlg.removeAttribute("open"); });
  $("dlgForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var name = $("nameIn").value.trim();
    if (!name) { $("derr").textContent = "Enter your name."; $("nameIn").focus(); return; }
    dlg.close ? dlg.close() : dlg.removeAttribute("open");
    register(name);
  });

  function register(name) {
    lock(true); hideBanner(); clearTimeout(resetTimer);
    scanState("scanning"); setStatus("Scanning fingerprint...");
    var job;
    if (secure) {
      job = navigator.credentials.create({ publicKey: {
        challenge: rand(32),
        rp: { name: "Fingerprint Authentication" },
        user: { id: rand(16), name: name, displayName: name },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
        timeout: 60000, attestation: "none"
      }}).then(function (cred) { return { credId: b64(cred.rawId) }; });
    } else {
      job = sleep(1800).then(function () { return { credId: null }; });
    }
    job.then(function (res) {
      var u = { id: uid(), name: name, credId: res.credId };
      users.push(u); save(); render(u.id);
      scanState("ok"); setStatus("Fingerprint registered!");
      banner(true, "Registration Successful!", "", name);
    }).catch(function (err) { fail(err, "Registration failed"); })
      .then(function () { lock(false); idle(); });
  }

  /* ---------- login ---------- */
  logBtn.addEventListener("click", function () {
    if (busy) return;
    hideBanner(); clearTimeout(resetTimer);
    if (!users.length) { scanState("bad"); setStatus("Register a fingerprint first"); banner(false, "No registered users", "Press Register Fingerprint to begin."); idle(); return; }

    var sel = users.filter(function (u) { return u.id === selectedId; })[0];
    var demoUsers = users.filter(function (u) { return !u.credId; });
    var devUsers = users.filter(function (u) { return u.credId; });

    if (sel && !sel.credId) return demoLogin(sel);
    if (devUsers.length && secure) return deviceLogin(devUsers);
    if (!devUsers.length && demoUsers.length === 1) return demoLogin(demoUsers[0]);
    if (demoUsers.length > 1) { setStatus("Tap your name in the list first"); $("hint").hidden = false; idle(); return; }
    scanState("bad"); setStatus("Device fingerprint not available");
    banner(false, "Authentication Failed", "Open this page on localhost or https to use the device fingerprint."); idle();
  });

  function deviceLogin(devUsers) {
    lock(true); scanState("scanning"); setStatus("Scanning fingerprint...");
    navigator.credentials.get({ publicKey: {
      challenge: rand(32), userVerification: "required", timeout: 60000,
      allowCredentials: devUsers.map(function (u) { return { type: "public-key", id: unb64(u.credId), transports: ["internal"] }; })
    }}).then(function (cred) {
      var id = b64(cred.rawId);
      var who = devUsers.filter(function (u) { return u.credId === id; })[0];
      if (!who) throw new Error("nomatch");
      success(who);
    }).catch(function (err) { fail(err, "Authentication Failed"); })
      .then(function () { lock(false); idle(6000); });
  }

  function demoLogin(u) {
    lock(true); scanState("scanning"); setStatus("Scanning fingerprint...");
    sleep(1500).then(function () { success(u); }).then(function () { lock(false); idle(6000); });
  }

  function success(u) {
    scanState("ok"); setStatus("Fingerprint matched");
    render(u.id); banner(true, "Authentication Successful!", "", u.name);
  }

  function fail(err, title) {
    var msg = "Fingerprint not recognised. Try again.";
    if (err && err.name === "NotAllowedError") msg = "Cancelled or timed out. Try again.";
    else if (err && err.name === "InvalidStateError") msg = "This fingerprint is already registered.";
    else if (err && err.name === "SecurityError") msg = "Open the page on localhost or https.";
    scanState("bad"); setStatus("Scan failed");
    banner(false, title, msg);
  }

  render();
})();
