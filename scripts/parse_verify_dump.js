const fs = require("fs");

const input = process.argv[2];
const dump = fs.readFileSync(input, "utf8");
const match = dump.match(/<pre id="__verify_result"[^>]*>([\s\S]*?)<\/pre>/);

if (!match) {
  throw new Error("Verification result not found in DOM dump");
}

const raw = match[1]
  .replace(/&quot;/g, '"')
  .replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">");

const result = JSON.parse(raw);
const badOverflow = result.overflow.filter((item) => item.pageOverflow > 1 || item.bodyOverflow > 1);

console.log(JSON.stringify({
  pageCount: result.pageCount,
  labels: result.labels,
  footers: [result.footers[0], result.footers[6], result.footers[7], result.footers[21]],
  hasNewSourceBullet: result.hasNewSourceBullet,
  hasDecisionMarker: result.hasDecisionMarker,
  hasSourceRegister: result.hasSourceRegister,
  hasOldSection3Text: result.hasOldSection3Text,
  badOverflow,
}, null, 2));
