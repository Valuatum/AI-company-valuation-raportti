const fs = require("fs");
const path = require("path");

const input = process.argv[2];
const output = process.argv[3];

if (!input || !output) {
  throw new Error("Usage: node make_chrome_verify_html.js <input standalone.html> <output verify.html>");
}

const source = fs.readFileSync(input, "utf8");
const match = source.match(/<script type="__bundler\/template">\s*([\s\S]*?)\s*<\/script>/);
if (!match) {
  throw new Error("Bundler template script not found");
}

let template = JSON.parse(match[1]);

const verifyScript = `<script>
setTimeout(function(){
  var pages = Array.prototype.slice.call(document.querySelectorAll('.page'));
  var allText = document.body ? document.body.innerText : '';
  var result = {
    pageCount: pages.length,
    labels: pages.map(function(p){ return p.getAttribute('data-screen-label'); }),
    footers: pages.map(function(p){ var el = p.querySelector('[data-pf]'); return el ? el.textContent : ''; }),
    hasNewSourceBullet: allText.indexOf('Julkiset verkkolähteet liiketoimintaprofiilia varten (osio 3)') !== -1,
    hasDecisionMarker: allText.indexOf('(päätelmä, ei varmennettu tieto)') !== -1,
    hasSourceRegister: allText.indexOf('Lähderekisteri (osio 3)') !== -1,
    hasOldSection3Text: allText.indexOf('Athlos Oy toimii elektronisten komponenttien valmistuksessa') !== -1,
    tocHasShiftedPages: allText.indexOf('Historiallinen taloudellinen kehitys') !== -1 && allText.indexOf('Metodologia, tekoälyn rooli ja rajoitukset') !== -1,
    overflow: pages.map(function(p, i){
      var body = p.querySelector('.pbody');
      return {
        page: i + 1,
        label: p.getAttribute('data-screen-label'),
        pageOverflow: Math.ceil(p.scrollHeight - p.clientHeight),
        bodyOverflow: body ? Math.ceil(body.scrollHeight - body.clientHeight) : 0,
        bodyScrollHeight: body ? Math.ceil(body.scrollHeight) : 0,
        bodyClientHeight: body ? Math.ceil(body.clientHeight) : 0
      };
    })
  };
  var pre = document.createElement('pre');
  pre.id = '__verify_result';
  pre.textContent = JSON.stringify(result);
  pre.style.cssText = 'white-space:pre-wrap;font:12px monospace;';
  document.body.appendChild(pre);
}, 1000);
</script>`;

if (!template.includes("</body>")) {
  throw new Error("Template body end not found");
}

template = template.replace("</body>", `${verifyScript}\n</body>`);

const encodedTemplate = JSON.stringify(template).replace(/<\//g, "<\\u002F");
const newTemplateScript = `<script type="__bundler/template">\n${encodedTemplate}\n  </script>`;
const updated = source.replace(/<script type="__bundler\/template">\s*[\s\S]*?\s*<\/script>/, newTemplateScript);

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, updated, "utf8");
console.log(output);
