// Renders a lesson from window.LESSON.
// Section types: explain, cards, mcq, typed, order, writing.
// Scored sections (mcq, typed, order) need a one-letter `key` used in the result summary.
(function () {
  const L = window.LESSON;
  const app = document.getElementById("app");
  const results = {}; // id -> { ok, q, given, correct, tag }
  const scored = [];  // { key, title, count }

  const norm = s => s.toLowerCase().replace(/[’']/g, "").replace(/[.,!?;:"“”]/g, "").replace(/\s+/g, " ").trim();
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  const shuffle = a => {
    const orig = a.join("|");
    for (let t = 0; t < 10; t++) {
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      if (a.join("|") !== orig) break;
    }
    return a;
  };
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
  };

  function updateScore() {
    const vals = Object.values(results);
    const ok = vals.filter(r => r.ok).length;
    const total = scored.reduce((n, s) => n + s.count, 0);
    document.getElementById("scoreText").textContent = `Điểm: ${ok} / ${vals.length} (bài có ${total} câu)`;
    if (vals.length === total) store.set(`score-${L.id}`, `${ok}/${total}`);
  }

  function fbHtml(ok, why, correct) {
    const w = why ? ` <span class="why">${why}</span>` : "";
    return ok ? `✔ Đúng!${w}` : `✘ Chưa đúng.${correct ? ` Đáp án: <b>${correct}</b>` : ""}${w}`;
  }

  function record(id, r) {
    if (id in results) return; // first attempt counts
    results[id] = r;
    updateScore();
  }

  const render = {
    explain(s, body) { body.innerHTML = s.html; },

    cards(s, body) {
      const box = el("div", "cards");
      s.items.forEach(([f, b]) => {
        const c = el("div", "card", `<div class="card-inner"><div class="face front">${f}</div><div class="face back">${b}</div></div>`);
        c.onclick = () => c.classList.toggle("flipped");
        box.appendChild(c);
      });
      body.appendChild(box);
    },

    mcq(s, body) {
      s.items.forEach((it, i) => {
        const id = `${s.key}${i + 1}`;
        const div = el("div", "q", `<p><b>${i + 1}.</b> ${it.q}</p><div class="opts"></div><div class="fb"></div>`);
        const opts = div.querySelector(".opts"), fb = div.querySelector(".fb");
        it.opts.forEach((o, j) => {
          const b = el("button", null, o);
          b.onclick = () => {
            const ok = j === it.a;
            opts.querySelectorAll("button").forEach((x, k) => {
              x.disabled = true;
              if (k === it.a) x.classList.add("right");
            });
            if (!ok) b.classList.add("wrong");
            fb.className = "fb show " + (ok ? "ok" : "no");
            fb.innerHTML = fbHtml(ok, it.why, ok ? "" : it.opts[it.a]);
            record(id, { ok, q: it.q, given: o, correct: it.opts[it.a], tag: it.tag || "" });
          };
          opts.appendChild(b);
        });
        body.appendChild(div);
      });
    },

    typed(s, body) {
      s.items.forEach((it, i) => {
        const id = `${s.key}${i + 1}`;
        const div = el("div", "q", `<p><b>${i + 1}.</b> ${it.q}</p>
          <div class="row"><input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" class="${s.short ? "short" : ""}"><button class="btn">Kiểm tra</button></div>
          <div class="fb"></div>`);
        const input = div.querySelector("input"), fb = div.querySelector(".fb");
        const accepted = it.ans.map(norm);
        const check = () => {
          if (!input.value.trim()) return;
          const ok = accepted.includes(norm(input.value));
          fb.className = "fb show " + (ok ? "ok" : "no");
          fb.innerHTML = fbHtml(ok, it.why, ok ? "" : it.ans[0]);
          record(id, { ok, q: it.q.replace(/<[^>]+>/g, ""), given: input.value.trim(), correct: it.ans[0], tag: it.tag || "" });
        };
        div.querySelector("button").onclick = check;
        input.addEventListener("keydown", e => { if (e.key === "Enter") check(); });
        body.appendChild(div);
      });
    },

    // Words are given in the correct order, separated by "|"; they get shuffled.
    order(s, body) {
      s.items.forEach((it, i) => {
        const id = `${s.key}${i + 1}`;
        const words = it.words.split("|").map(w => w.trim());
        const accepted = [words.join(" "), ...(it.alt || [])].map(norm);
        const div = el("div", "q", `<p><b>${i + 1}.</b> ${it.prompt || "Sắp xếp thành câu đúng:"}</p>
          <div class="built"></div><div class="pool"></div>
          <div class="row"><button class="btn">Kiểm tra</button><button class="btn ghost">Làm lại</button></div>
          <div class="fb"></div>`);
        const built = div.querySelector(".built"), pool = div.querySelector(".pool"), fb = div.querySelector(".fb");
        const [checkBtn, resetBtn] = div.querySelectorAll(".row button");
        let chosen = [];
        const order = shuffle(words.map((_, k) => k));
        const draw = () => {
          built.innerHTML = ""; pool.innerHTML = "";
          chosen.forEach((k, pos) => {
            const c = el("button", "chip", words[k]);
            c.onclick = () => { chosen.splice(pos, 1); draw(); };
            built.appendChild(c);
          });
          order.filter(k => !chosen.includes(k)).forEach(k => {
            const c = el("button", "chip", words[k]);
            c.onclick = () => { chosen.push(k); draw(); };
            pool.appendChild(c);
          });
        };
        checkBtn.onclick = () => {
          if (chosen.length !== words.length) return;
          const given = chosen.map(k => words[k]).join(" ");
          const ok = accepted.includes(norm(given));
          fb.className = "fb show " + (ok ? "ok" : "no");
          fb.innerHTML = fbHtml(ok, it.why, ok ? "" : words.join(" "));
          record(id, { ok, q: it.prompt || "Sắp xếp câu", given, correct: words.join(" "), tag: it.tag || "" });
        };
        resetBtn.onclick = () => { chosen = []; fb.className = "fb"; draw(); };
        draw();
        body.appendChild(div);
      });
    },

    writing(s, body) {
      const ta = el("textarea");
      ta.id = "writing";
      ta.placeholder = s.placeholder || "Viết ở đây...";
      ta.value = store.get(`w-${L.id}`) || "";
      ta.addEventListener("input", () => store.set(`w-${L.id}`, ta.value));
      body.appendChild(ta);
    },
  };

  // ---- build page ----
  app.appendChild(el("a", "back-link", "← Danh sách bài học")).href = "../index.html";
  app.appendChild(el("h1", null, `Bài ${L.id} — ${L.title}`));
  app.appendChild(el("p", "sub", L.sub));

  L.sections.forEach((s, idx) => {
    const sec = el("section");
    if (s.time) sec.appendChild(el("span", "time", `⏱ ${s.time}`));
    sec.appendChild(el("h2", null, `${idx + 1}. ${s.title}`));
    if (s.hint) sec.appendChild(el("p", "hint", s.hint));
    const body = el("div");
    sec.appendChild(body);
    render[s.type](s, body);
    if (s.key) scored.push({ key: s.key, title: s.title, count: s.items.length });
    app.appendChild(sec);
  });

  const bar = el("div", "score", `<span id="scoreText"></span><span id="copied"></span>
    <button class="btn primary" id="copyBtn">📋 Copy kết quả</button>`);
  app.appendChild(bar);
  updateScore();

  document.getElementById("copyBtn").onclick = async () => {
    const vals = Object.entries(results);
    const ok = vals.filter(([, r]) => r.ok).length;
    const lines = [`KẾT QUẢ BÀI ${L.id} — ${L.title}`, `Tổng: ${ok}/${vals.length} câu đã làm`];
    scored.forEach(({ key, title, count }) => {
      const items = vals.filter(([k]) => k.replace(/\d+$/, "") === key);
      const wrong = items.filter(([, r]) => !r.ok);
      lines.push(`${title}: ${items.length - wrong.length}/${items.length}${items.length < count ? ` (bỏ ${count - items.length} câu)` : ""}`);
      wrong.forEach(([k, r]) => lines.push(`  ✘ ${k}: "${r.q}" → tôi: "${r.given}" | đúng: "${r.correct}"${r.tag ? ` [${r.tag}]` : ""}`));
    });
    const w = document.getElementById("writing");
    if (w) lines.push("", "BÀI VIẾT:", w.value.trim() || "(chưa viết)");
    const text = lines.join("\n");
    const out = document.getElementById("copied");
    try {
      await navigator.clipboard.writeText(text);
      out.textContent = "Đã copy — dán vào chat nhé!";
    } catch (e) {
      window.prompt("Copy đoạn này:", text);
    }
  };
})();
