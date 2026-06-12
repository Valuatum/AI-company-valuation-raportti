const fs = require("fs");
const path = require("path");

const input = process.argv[2];
const output = process.argv[3];
const pageIndex = Number(process.argv[4]);

if (!input || !output || !Number.isInteger(pageIndex)) {
  throw new Error("Usage: node make_page_preview_html.js <input standalone.html> <output preview.html> <zero-based-page-index>");
}

const source = fs.readFileSync(input, "utf8");
const match = source.match(/<script type="__bundler\/template">\s*([\s\S]*?)\s*<\/script>/);
if (!match) {
  throw new Error("Bundler template script not found");
}

let template = JSON.parse(match[1]);

const previewScript = `<script>
setTimeout(function(){
  var pages = Array.prototype.slice.call(document.querySelectorAll('.page'));
  var target = pages[${pageIndex}];
  if (!target) return;
  document.body.innerHTML = '';
  document.body.style.padding = '0';
  document.body.style.margin = '0';
  document.body.style.background = '#fff';
  target.style.margin = '0';
  target.style.boxShadow = 'none';
  document.body.appendChild(target);
}, 1000);
</script>`;

template = template.replace("</body>", `${previewScript}\n</body>`);
const encodedTemplate = JSON.stringify(template).replace(/<\//g, "<\\u002F");
const newTemplateScript = `<script type="__bundler/template">\n${encodedTemplate}\n  </script>`;
const updated = source.replace(/<script type="__bundler\/template">\s*[\s\S]*?\s*<\/script>/, newTemplateScript);

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, updated, "utf8");
console.log(output);
