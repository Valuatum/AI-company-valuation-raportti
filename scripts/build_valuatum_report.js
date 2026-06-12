const fs = require("fs");
const path = require("path");

const sourceTextPath = process.argv[2];
const wrapperHtmlPath = process.argv[3];
const outputHtmlPath = process.argv[4];

if (!sourceTextPath || !wrapperHtmlPath || !outputHtmlPath) {
  throw new Error("Usage: node build_valuatum_report.js <pasted-text.txt> <wrapper standalone.html> <output standalone.html>");
}

const sourceText = fs.readFileSync(sourceTextPath, "utf8").replace(/\r\n/g, "\n");
const wrapperHtml = fs.readFileSync(wrapperHtmlPath, "utf8");
const wrapperMatch = wrapperHtml.match(/<script type="__bundler\/template">\s*([\s\S]*?)\s*<\/script>/);

if (!wrapperMatch) {
  throw new Error("Bundler template script not found");
}

const baseTemplate = JSON.parse(wrapperMatch[1]);
const styles = Array.from(baseTemplate.matchAll(/<style>[\s\S]*?<\/style>/g)).map((m) => m[0]).join("\n");

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineMd(value) {
  let s = esc(value);
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return s;
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function isTableDivider(line) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function parseTable(lines, start) {
  const rows = [];
  let i = start;
  while (i < lines.length && /^\s*\|/.test(lines[i])) {
    if (!isTableDivider(lines[i])) {
      const cells = lines[i]
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim());
      rows.push(cells);
    }
    i += 1;
  }
  return { rows, next: i };
}

function tableHtml(rows) {
  if (!rows.length) return "";
  const head = rows[0];
  const body = rows.slice(1);
  return `<table class="score content-table">
    <thead><tr>${head.map((cell) => `<th>${inlineMd(cell)}</th>`).join("")}</tr></thead>
    <tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${inlineMd(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
  </table>`;
}

function paragraphHtml(lines) {
  return `<p>${inlineMd(lines.join(" "))}</p>`;
}

const reportStart = sourceText.indexOf("## KANSI");
const reportEnd = sourceText.indexOf("## RAPORTIN RAKENNE TAITTOA VARTEN");
const reportText = sourceText.slice(reportStart >= 0 ? reportStart : 0, reportEnd >= 0 ? reportEnd : sourceText.length).trim();
const lines = reportText.split("\n");

let blocks = [];
let currentParagraph = [];
let currentList = null;
let sectionIndex = 0;
let inCover = false;
let coverLines = [];
let metricRows = [];
let sectionTitles = [];

function flushParagraph() {
  if (!currentParagraph.length) return;
  blocks.push(paragraphHtml(currentParagraph));
  currentParagraph = [];
}

function flushList() {
  if (!currentList) return;
  const tag = currentList.type === "ol" ? "ol" : "ul";
  blocks.push(`<${tag} class="note-list flow-list">${currentList.items.map((item) => `<li>${inlineMd(item)}</li>`).join("")}</${tag}>`);
  currentList = null;
}

for (let i = 0; i < lines.length; i += 1) {
  const raw = lines[i];
  const line = raw.trim();

  if (!line || line === "---") {
    flushParagraph();
    flushList();
    continue;
  }

  if (line === "## KANSI") {
    inCover = true;
    continue;
  }

  if (line.startsWith("## ")) {
    inCover = false;
    flushParagraph();
    flushList();
    sectionIndex += 1;
    const title = line.replace(/^##\s+/, "").replace(/^\d+\.\s*/, "");
    const match = line.match(/^##\s+(\d+)\.\s+(.+)/);
    const displayTitle = match ? match[2] : title;
    const number = match ? match[1] : String(sectionIndex);
    const id = slugify(`${number}-${displayTitle}`);
    sectionTitles.push({ number, title: displayTitle, id });
    blocks.push(`<div class="section-start" data-section-id="${id}" data-section-number="${number}" data-section-title="${esc(displayTitle)}">
      <div class="sec-head"><span class="sec-num">${esc(number)}</span><div class="sh-t"><h2>${inlineMd(displayTitle)}</h2><div class="sh-sub">Valuatum Oy · AI-Arvonmääritysraportti</div></div></div>
      <div class="sec-rule"></div>
    </div>`);
    continue;
  }

  if (inCover) {
    coverLines.push(line);
    continue;
  }

  if (line.startsWith("### ")) {
    flushParagraph();
    flushList();
    const heading = line.replace(/^###\s+/, "");
    blocks.push(`<h4 class="blk">${inlineMd(heading)}</h4>`);
    continue;
  }

  if (line.startsWith(">")) {
    flushParagraph();
    flushList();
    const quoteLines = [];
    while (i < lines.length && lines[i].trim().startsWith(">")) {
      quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
      i += 1;
    }
    i -= 1;
    blocks.push(`<p class="muted intro-note"><em>${inlineMd(quoteLines.join(" "))}</em></p>`);
    continue;
  }

  if (/^\s*\|/.test(raw)) {
    flushParagraph();
    flushList();
    const parsed = parseTable(lines, i);
    if (parsed.rows.some((row) => row.some((cell) => cell.includes("Oman pääoman arvo") || cell.includes("Yritysarvo")))) {
      metricRows = parsed.rows;
    }
    blocks.push(tableHtml(parsed.rows));
    i = parsed.next - 1;
    continue;
  }

  const bullet = line.match(/^[-*]\s+(.+)/);
  const ordered = line.match(/^(\d+)\.\s+(.+)/);
  if (bullet || ordered) {
    flushParagraph();
    const type = ordered ? "ol" : "ul";
    const item = ordered ? ordered[2] : bullet[1];
    if (!currentList || currentList.type !== type) {
      flushList();
      currentList = { type, items: [] };
    }
    currentList.items.push(item);
    continue;
  }

  currentParagraph.push(line);
}

flushParagraph();
flushList();

const metricBody = metricRows.slice(1).map((row) => ({ label: row[0] || "", value: row[1] || "" }));
const metricCards = metricBody.slice(0, 4).map((row) => {
  const value = row.value.length > 54 ? row.value.replace(/\*\*/g, "") : row.value;
  return `<div class="mcard"><div class="mval" style="font-size:${value.length > 25 ? "10.5pt" : "16pt"};">${inlineMd(value)}</div><div class="mlabel">${inlineMd(row.label)}</div></div>`;
}).join("");

const methodRows = metricBody.slice(4).map((row) => `<div class="kv"><span class="k">${inlineMd(row.label)}</span><span class="v">${inlineMd(row.value)}</span></div>`).join("");

const tocRows = sectionTitles.map((item) => `<div class="toc-row" data-toc-for="${esc(item.id)}"><span class="tn">${esc(item.number)}</span><span class="tt">${inlineMd(item.title)}</span><span class="td"></span><span class="tp"></span></div>`).join("");

const coverTitle = coverLines.find((line) => line.includes("AI-Arvonmääritysraportti")) || "AI-Arvonmääritysraportti";

const staticPages = `
<section class="page cover" data-screen-label="01 Kansi">
  <div class="pbody">
    <div class="cv-brand"><span></span>Valuatum</div>
    <div class="cv-tag">AI-Arvonmääritysraportti</div>
    <h1>${inlineMd(coverTitle)}</h1>
    <div class="cv-co">Valuatum Oy</div>
    <div class="cv-meta">Y-tunnus 1612398-8 · 12.6.2026<br>Toimiala: ei ilmoitettu input-datassa</div>
    <div style="margin-top:32mm;">
      <div class="cv-big" style="font-size:30pt;">Ei määritettävissä<span class="u">luotettavasti</span><span class="cap">Oman pääoman arvo annetulla datalla</span></div>
    </div>
  </div>
  <div class="pfoot"><span>Valuatum · AI-Arvonmääritysraportti</span><span class="pf-r" data-pf=""></span></div>
</section>

<section class="page" data-screen-label="02 Snapshot">
  <div class="phead"><span class="brandmark"><i></i>Valuatum</span><span>Valuatum Oy · 1612398-8 · 12.6.2026</span></div>
  <div class="pbody">
    <div class="sec-head"><span class="sec-num" style="background:var(--green); color:#fff;">·</span><div class="sh-t"><h2>Snapshot</h2><div class="sh-sub">Avainluvut · johtopäätös · lukuohje</div></div></div>
    <div class="sec-rule"></div>
    <div class="mgrid" style="grid-template-columns:repeat(2,1fr); margin-bottom:14px;">${metricCards}</div>
    <div>${methodRows}</div>
    <div class="callout kill" style="margin-top:14px;">
      <div class="co-t"><span class="co-badge"></span>Mikä kaataisi tämän arvion</div>
      <p>Arvio menettää perustansa, jos 462 tEUR:n konsernisaaminen osoittautuu kokonaan tai osittain perintäkelvottomaksi, jos tappiollisuus jatkuu ennustetulla uralla ja syö jäljellä olevan oman pääoman, tai jos 94 tEUR:n "muu vaihto-omaisuus" -erä ei ole realisoitavissa tasearvostaan.</p>
    </div>
  </div>
  <div class="pfoot"><span>Valuatum · AI-Arvonmääritysraportti</span><span class="pf-r" data-pf=""></span></div>
</section>

<section class="page" data-screen-label="03 Sisällysluettelo">
  <div class="phead"><span class="brandmark"><i></i>Valuatum</span><span>Valuatum Oy · 1612398-8 · 12.6.2026</span></div>
  <div class="pbody">
    <div class="sec-head"><span class="sec-num" style="background:var(--green); color:#fff;">·</span><div class="sh-t"><h2>Sisällys</h2><div class="sh-sub">AI-Arvonmääritysraportti · Valuatum Oy</div></div></div>
    <div class="sec-rule"></div>
    <div class="toc">${tocRows}</div>
    <div class="callout neutral" style="margin-top:22px;">
      <div class="co-t"><span class="co-badge"></span>Näin raporttia luetaan</div>
      <p>Kaikki luvut perustuvat toimitettuun input-dataan ja Valuatumin deterministiseen laskentaan silloin, kun kyseiset luvut on toimitettu lähtöaineistossa. Tekoälyn rooli on rajattu lukujen tulkintaan, menetelmien soveltuvuuden arviointiin ja analyysitekstin tuottamiseen.</p>
    </div>
  </div>
  <div class="pfoot"><span>Valuatum · AI-Arvonmääritysraportti</span><span class="pf-r" data-pf=""></span></div>
</section>`;

const flowBlocks = blocks.join("\n");

const paginationScript = `<script>
(function(){
  var header = '<div class="phead"><span class="brandmark"><i></i>Valuatum</span><span>Valuatum Oy · 1612398-8 · 12.6.2026</span></div>';
  var footer = '<div class="pfoot"><span>Valuatum · AI-Arvonmääritysraportti</span><span class="pf-r" data-pf=""></span></div>';
  var report = document.getElementById('report');
  var source = document.getElementById('flow-source');
  var blocks = Array.prototype.slice.call(source.children);
  var sectionPages = {};

  function makePage(label) {
    var page = document.createElement('section');
    page.className = 'page';
    page.setAttribute('data-screen-label', label || '');
    page.innerHTML = header + '<div class="pbody"></div>' + footer;
    report.appendChild(page);
    return page.querySelector('.pbody');
  }

  var body = makePage('04 Raportti');
  blocks.forEach(function(block) {
    var clone = block.cloneNode(true);
    if (clone.classList && clone.classList.contains('section-start') && body.children.length > 0) {
      body = makePage('');
    }
    body.appendChild(clone);
    var page = body.closest('.page');
    if (body.scrollHeight > body.clientHeight + 1 && body.children.length > 1) {
      body.removeChild(clone);
      body = makePage('');
      body.appendChild(clone);
    }
    if (clone.classList && clone.classList.contains('section-start')) {
      sectionPages[clone.getAttribute('data-section-id')] = Array.prototype.indexOf.call(document.querySelectorAll('.page'), body.closest('.page')) + 1;
      body.closest('.page').setAttribute('data-screen-label', String(sectionPages[clone.getAttribute('data-section-id')]).padStart(2, '0') + ' ' + clone.getAttribute('data-section-title'));
    }
  });

  source.remove();

  var pages = Array.prototype.slice.call(document.querySelectorAll('.page'));
  var total = pages.length;
  pages.forEach(function(page, index) {
    var no = index + 1;
    if (!page.getAttribute('data-screen-label')) {
      page.setAttribute('data-screen-label', String(no).padStart(2, '0') + ' Raportti');
    }
    var pf = page.querySelector('[data-pf]');
    if (pf) pf.textContent = no + ' / ' + total;
  });

  Array.prototype.slice.call(document.querySelectorAll('[data-toc-for]')).forEach(function(row) {
    var pageNo = sectionPages[row.getAttribute('data-toc-for')];
    var target = row.querySelector('.tp');
    if (target) target.textContent = pageNo || '';
  });

  window.__reportReady = true;
})();
</script>`;

const extraCss = `<style>
.flow-source{ display:none; }
.page .pbody > p{ margin:0 0 7px; }
.intro-note{ font-size:8.2pt; line-height:1.38; color:var(--gray); margin:0 0 9px!important; }
.content-table{ margin:6px 0 10px; font-size:7.1pt; line-height:1.22; table-layout:fixed; }
.content-table th,.content-table td{ padding:4px 5px; }
.content-table td{ word-break:normal; overflow-wrap:anywhere; }
.flow-list{ margin-bottom:9px; }
.flow-list li{ margin-bottom:4px; }
.section-start{ break-inside:avoid; }
.section-start .sec-head{ margin-top:0; }
.mval strong{ color:inherit; }
.muted{ color:var(--gray); }
.cover .pbody{ padding-top:0; }
@media screen{ .page{ margin-bottom:9mm; } }
</style>`;

const template = `<!DOCTYPE html>
<html lang="fi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Valuatum Oy — AI-Arvonmääritysraportti</title>
${styles}
${extraCss}
</head>
<body>
<div id="report">
${staticPages}
</div>
<div id="flow-source" class="flow-source">
${flowBlocks}
</div>
${paginationScript}
</body>
</html>`;

const encodedTemplate = JSON.stringify(template).replace(/<\//g, "<\\u002F");
const newTemplateScript = `<script type="__bundler/template">\n${encodedTemplate}\n  </script>`;
const output = wrapperHtml.replace(/<script type="__bundler\/template">\s*[\s\S]*?\s*<\/script>/, newTemplateScript)
  .replace(/<title>[\s\S]*?<\/title>/, "<title>Valuatum Oy — AI-Arvonmääritysraportti</title>");

fs.mkdirSync(path.dirname(outputHtmlPath), { recursive: true });
fs.writeFileSync(outputHtmlPath, output, "utf8");

console.log(`Wrote ${outputHtmlPath}`);
