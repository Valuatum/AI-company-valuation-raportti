const fs = require("fs");

const input = process.argv[2];
const html = fs.readFileSync(input, "utf8");

const pageLabels = Array.from(html.matchAll(/<section class="page[^"]*" data-screen-label="([^"]*)"/g)).map((m) => m[1]);
const footers = Array.from(html.matchAll(/<span class="pf-r" data-pf="">([^<]*)<\/span>/g)).map((m) => m[1]);
const tocPages = Array.from(html.matchAll(/<div class="toc-row"[^>]*>[\s\S]*?<span class="tt">([\s\S]*?)<\/span>[\s\S]*?<span class="tp">([^<]*)<\/span>/g)).map((m) => ({
  title: m[1].replace(/<[^>]+>/g, ""),
  page: m[2],
}));

const checks = {
  pageCount: pageLabels.length,
  firstLabels: pageLabels.slice(0, 6),
  lastLabels: pageLabels.slice(-5),
  firstFooter: footers[0],
  lastFooter: footers[footers.length - 1],
  tocPages,
  hasValuatumTitle: html.includes("AI-Arvonmääritysraportti") && html.includes("Valuatum Oy"),
  hasKeyText: html.includes("Ei määritettävissä luotettavasti annetulla datalla"),
  hasSection15: html.includes("Metodologia, tekoälyn rooli ja rajoitukset"),
  hasMojibake: /Ã|â€|âˆ/.test(html),
};

console.log(JSON.stringify(checks, null, 2));
