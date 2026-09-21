(() => {
  if (location.protocol === "file:") {
    document.querySelector(".app-link").hidden = true;
    document.querySelector(".brand").removeAttribute("href");
  }
  const input = document.querySelector("#suche"),
    status = document.querySelector("#status"),
    results = document.querySelector("#results");
  const articles = [...document.querySelectorAll("main article")];
  const normalize = (s) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ß/g, "ss")
      .replace(/ae/g, "a")
      .replace(/oe/g, "o")
      .replace(/ue/g, "u");
  const records = [];
  for (const article of articles) {
    let record = { article, id: article.id, title: article.dataset.title, text: "" };
    records.push(record);
    for (const child of article.children) {
      if (/^H[2-6]$/.test(child.tagName) && child.id) {
        record = {
          article,
          id: child.id,
          title: `${article.dataset.title} · ${child.textContent.replace(/#$/, "")}`,
          text: "",
        };
        records.push(record);
      } else record.text += " " + child.textContent;
    }
  }
  for (const record of records) record.search = normalize(record.title + " " + record.text);
  function search() {
    const words = normalize(input.value.trim()).split(/\s+/).filter(Boolean);
    results.replaceChildren();
    if (!words.length) {
      articles.forEach((a) => (a.hidden = false));
      results.hidden = true;
      status.textContent = `${articles.length} Kapitel verfügbar. Wähle einen Bereich oder gib einen Suchbegriff ein.`;
      return;
    }
    const matches = records
      .filter((r) => words.every((w) => r.search.includes(w)))
      .sort(
        (a, b) =>
          words.filter((w) => normalize(b.title).includes(w)).length -
          words.filter((w) => normalize(a.title).includes(w)).length,
      );
    const visible = new Set(matches.map((r) => r.article));
    articles.forEach((a) => (a.hidden = !visible.has(a)));
    status.textContent = matches.length
      ? `${matches.length} Fundstellen in ${visible.size} Kapiteln. Treffer öffnen, um den vollständigen Zusammenhang zu lesen.`
      : "Keine Treffer. Versuche einen kürzeren Begriff, etwa Zähler, Foto, Router oder Sicherung.";
    for (const record of matches.slice(0, 60)) {
      const li = document.createElement("li"),
        link = document.createElement("a"),
        excerpt = document.createElement("p");
      link.href = `#${record.id}`;
      link.textContent = record.title;
      const text = record.text.replace(/\s+/g, " ").trim();
      const position = normalize(text).indexOf(words[0]);
      const start = Math.max(0, position - 70);
      excerpt.textContent =
        (start ? "… " : "") + text.slice(start, start + 230) + (text.length > start + 230 ? " …" : "");
      li.append(link, excerpt);
      results.append(li);
    }
    if (matches.length > 60) {
      const more = document.createElement("li");
      more.textContent = "Die ersten 60 Fundstellen werden angezeigt. Mit weiteren Wörtern eingrenzen.";
      results.append(more);
    }
    results.hidden = false;
  }
  input.addEventListener("input", search);
  document.querySelector("#clear").addEventListener("click", () => {
    input.value = "";
    search();
    input.focus();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
      e.preventDefault();
      input.focus();
    }
    if (e.key === "Escape" && document.activeElement === input) {
      input.value = "";
      search();
    }
  });
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[href^='#']");
    if (!link) return;
    const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
    if (!target) return;
    input.value = "";
    search();
    document.querySelectorAll("nav a[aria-current]").forEach((a) => a.removeAttribute("aria-current"));
    const chapter = target.closest("article");
    const navLink = [...document.querySelectorAll("nav a")].find((a) => a.hash === `#${chapter?.id}`);
    navLink?.setAttribute("aria-current", "location");
    if (target.matches("article,h2,h3,h4,h5,h6"))
      requestAnimationFrame(() => target.focus({ preventScroll: true }));
  });
  input.value = new URLSearchParams(location.search).get("q") ?? "";
  search();
  if (matchMedia("(max-width:950px)").matches) document.querySelector("#navigation").open = false;
})();
