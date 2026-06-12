const fs = require("fs");
const path = require("path");

const input = process.argv[2];
const output = process.argv[3];

const source = fs.readFileSync(input, "utf8");
const match = source.match(/<script type="__bundler\/template">\s*([\s\S]*?)\s*<\/script>/);

if (!match) {
  throw new Error("Bundler template script not found");
}

let template = JSON.parse(match[1]);
const script = `<script>
setTimeout(function(){
  var pages = Array.prototype.slice.call(document.querySelectorAll('.page'));
  var text = document.body.innerText || '';
  var result = {
    pageCount: pages.length,
    labels: pages.map(function(page){ return page.getAttribute('data-screen-label'); }),
    footers: pages.map(function(page){ var pf = page.querySelector('[data-pf]'); return pf ? pf.textContent : ''; }),
    hasValuatum: text.indexOf('Valuatum Oy') !== -1,
    hasDcf: text.indexOf('DCF 274 tEUR') !== -1,
    hasEva: text.indexOf('EVA 0,18 tEUR') !== -1,
    hasMethodology: text.indexOf('Metodologia, tekoälyn rooli ja rajoitukset') !== -1 || text.indexOf('METODOLOGIA, TEKOÄLYN ROOLI JA RAJOITUKSET') !== -1,
    overflow: pages.map(function(page, index){
      var body = page.querySelector('.pbody');
      return {
        page: index + 1,
        label: page.getAttribute('data-screen-label'),
        pageOverflow: Math.ceil(page.scrollHeight - page.clientHeight),
        bodyOverflow: body ? Math.ceil(body.scrollHeight - body.clientHeight) : 0
      };
    })
  };
  var pre = document.createElement('pre');
  pre.id = '__verify_result';
  pre.textContent = JSON.stringify(result);
  document.body.appendChild(pre);
}, 1000);
</script>`;

template = template.replace("</body>", `${script}\n</body>`);
const encodedTemplate = JSON.stringify(template).replace(/<\//g, "<\\u002F");
const updated = source.replace(/<script type="__bundler\/template">\s*[\s\S]*?\s*<\/script>/, `<script type="__bundler/template">\n${encodedTemplate}\n  </script>`);

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, updated, "utf8");
console.log(output);
