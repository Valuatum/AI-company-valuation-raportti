const fs = require("fs");

const input = process.argv[2];
const output = process.argv[3];

const source = fs.readFileSync(input, "utf8");
const match = source.match(/<script type="__bundler\/template">\s*([\s\S]*?)\s*<\/script>/);

if (!match) {
  throw new Error("Bundler template script not found");
}

const template = JSON.parse(match[1]);
fs.writeFileSync(output, template, "utf8");

console.log(`Extracted ${template.length} chars to ${output}`);
