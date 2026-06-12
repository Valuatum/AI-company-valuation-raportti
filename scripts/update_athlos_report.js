const fs = require("fs");
const path = require("path");

const input = process.argv[2];
const output = process.argv[3];

if (!input || !output) {
  throw new Error("Usage: node update_athlos_report.js <input standalone.html> <output standalone.html>");
}

const header = '<div class="phead"><span class="brandmark"><i></i>Valuatum</span><span>Athlos Oy · 2752258-9 · 12.6.2026</span></div>';
const footer = '<div class="pfoot"><span>Valuatum · AI-Arvonmääritysraportti</span><span class="pf-r" data-pf=""></span></div>';

function page(commentTitle, screenLabel, body) {
  return `<!-- ============================ PAGE 7 — ${commentTitle} ============================ -->
<section class="page" data-screen-label="07 ${screenLabel}">
  ${header}
  <div class="pbody">
${body}
  </div>
  ${footer}
</section>`;
}

function updateToc(template, title, oldPage, newPage) {
  const row = `<span class="tt">${title}</span><span class="td"></span><span class="tp">${oldPage}</span>`;
  const replacement = `<span class="tt">${title}</span><span class="td"></span><span class="tp">${newPage}</span>`;
  if (!template.includes(row)) {
    throw new Error(`TOC row not found: ${title}`);
  }
  return template.replace(row, replacement);
}

function renumberPageCommentsAndLabels(template) {
  let commentNo = 0;
  template = template.replace(/(<!-- ============================ PAGE )\d+( — [^\n]*? ============================ -->)/g, (_match, before, after) => {
    commentNo += 1;
    return `${before}${commentNo}${after}`;
  });

  let labelNo = 0;
  template = template.replace(/data-screen-label="\d{2} ([^"]*)"/g, (_match, label) => {
    labelNo += 1;
    return `data-screen-label="${String(labelNo).padStart(2, "0")} ${label}"`;
  });

  if (commentNo !== labelNo) {
    throw new Error(`Page count mismatch after renumbering: ${commentNo} comments vs ${labelNo} labels`);
  }

  return template;
}

const source = fs.readFileSync(input, "utf8");
const templateMatch = source.match(/<script type="__bundler\/template">\s*([\s\S]*?)\s*<\/script>/);
if (!templateMatch) {
  throw new Error("Bundler template script not found");
}

let template = JSON.parse(templateMatch[1]);

const oldSourceListItem = `      <li><strong>Toimialavertailuaineisto:</strong> TOL 26.11 Elektronisten komponenttien valmistus, vertailuryhmän koko 73–187 yhtiötä vuodesta riippuen.</li>
      <li><strong>Ennusteet:</strong> järjestelmän tuottamat automaattiennusteet 2026–2035 (ennustesäännöt kuvattu osiossa 5).</li>`;

const newSourceListItem = `      <li><strong>Toimialavertailuaineisto:</strong> TOL 26.11 Elektronisten komponenttien valmistus, vertailuryhmän koko 73–187 yhtiötä vuodesta riippuen.</li>
      <li><strong>Julkiset verkkolähteet liiketoimintaprofiilia varten (osio 3):</strong> kaupparekisteritiedot, yhtiön verkkosivut (athlos.fi) ja lehdistötiedotteet, ankkuroitu Y-tunnuksella 2752258-9. Verkkolähteet vaikuttavat vain analyysitekstiin ja riskikuvaan — eivät yhteenkään laskettuun lukuun.</li>
      <li><strong>Ennusteet:</strong> järjestelmän tuottamat automaattiennusteet 2026–2035 (ennustesäännöt kuvattu osiossa 5).</li>`;

if (!template.includes(oldSourceListItem)) {
  throw new Error("Section 2 source-list insertion point not found");
}
template = template.replace(oldSourceListItem, newSourceListItem);

const section3Start = template.indexOf("<!-- ============================ PAGE 7 — LIIKETOIMINTAPROFIILI ============================ -->");
const section4Start = template.indexOf("<!-- ============================ PAGE 8 — HISTORIA I ============================ -->");
if (section3Start < 0 || section4Start < 0 || section4Start <= section3Start) {
  throw new Error("Could not locate section 3 boundaries");
}

const section3Page1Body = `    <div class="sec-head"><span class="sec-num">3</span><div class="sh-t"><h2>Yhtiön liiketoimintaprofiili</h2><div class="sh-sub">Tuotekehitysvetoinen laitevalmistaja · TOL 26.11</div></div></div>
    <div class="sec-rule"></div>

    <p style="font-size:8.2pt; line-height:1.38; color:var(--gray); margin:0 0 9px;"><em>Tämä osio yhdistää tilinpäätösanalyysin julkisiin lähteisiin (rekisteritiedot, yhtiön verkkosivut, lehdistötiedotteet). Verkkolähteistä peräisin olevat tiedot on merkitty lähdeviittein; ne kuvaavat yhtiön omaa tai kolmannen osapuolen julkaisemaa tietoa, eivät tilintarkastettua dataa.</em></p>

    <h4 class="blk">Mitä yhtiö tekee</h4>
    <p>Athlos Oy on espoolainen, vuonna 2016 rekisteröity röntgenkuvantamissensorien kehittäjä ja valmistaja [PRH-rekisteritiedot; athlos.fi, haettu 12.6.2026]. Yhtiö on erikoistunut suoramuunnostekniikkaan (direct conversion) perustuviin CdTe- ja Si-pohjaisiin kuvantamissensoreihin, jotka yhdistetään yhtiön omaan CMOS-lukupiiriin [athlos.fi]. Tuoteperheitä on kaksi markkinasegmenttiä varten:</p>

    <div class="mgrid" style="grid-template-columns:repeat(2,1fr); margin:9px 0 10px;">
      <div class="mcard">
        <div class="mval" style="font-size:12pt;">DC-Air® / WIOS</div>
        <div class="mlabel"><strong style="color:var(--green);">Hammaskuvantaminen</strong><br>Langaton intraoraalinen röntgensensori hammaskuvantamiseen. Tuote sai Yhdysvaltain FDA:n 510(k)-hyväksynnän heinäkuussa 2021, ja sen USA-jakelusta vastaa Freedom Technologies Group (FTG), joka on Athloksen ja yhdysvaltalaisten kumppanien yhteisyritys [PRNewswire 13.9.2021]. Riippumaton Clinicians Report -arviointiorganisaatio arvioi tuotteen kahdesti vuonna 2022 [athlos.fi].</div>
      </div>
      <div class="mcard">
        <div class="mval" style="font-size:12pt;">UFS (Ultra-Fast Scanner)</div>
        <div class="mlabel"><strong style="color:var(--green);">Teollisuuden röntgenkuvantaminen</strong><br>Nopea viivaskannaussensori teollisuuden röntgenkuvantamiseen (linjastotarkastus) [athlos.fi].</div>
      </div>
    </div>

    <p>Valmistus tapahtuu VTT:n Micronova-puhdastilassa sekä yhtiön omassa ISO 7 -puhdastilassa Espoossa [athlos.fi; yhtiön rekrytointi-ilmoitus, Duunitori 2021]. Toimitusjohtaja on Konstantinos Spartiotis [kaupparekisteri].</p>

    <h4 class="blk">Miten tämä selittää tilinpäätöksen rakenteen</h4>
    <p>Verkkolähteistä saatu kuva tekee tilinpäätöksen erityispiirteistä ymmärrettäviä — ja arvioitavia:</p>
    <ol style="margin:4px 0 0; padding-left:18px;">
      <li style="margin-bottom:5px;"><strong>Aktivoidut kehittämismenot (1 569 tEUR, suurin omaisuuserä)</strong> vastaavat sensori- ja CMOS-teknologian kehitystyötä. Kahdesti riippumattomasti arvioitu, FDA-hyväksytty tuote tukee erän arvoa enemmän kuin pelkkä tasearvo kertoisi — mutta erän arvo realisoituu vain, jos myynti skaalautuu.</li>
      <li style="margin-bottom:5px;"><strong>Koneiden ja kaluston hyppäys 125 → 746 tEUR vuonna 2022</strong> ajoittuu yhteen DC-Airin kaupallistamisen kanssa: oman puhdastilatuotannon laitteistoa.</li>
    </ol>`;

const section3Page2Body = `    <ol start="3" style="margin:0; padding-left:18px;">
      <li style="margin-bottom:5px;"><strong>Liikevaihdon profiili 2021–2025 saa selityshypoteesin</strong> <em>(päätelmä, ei varmennettu tieto)</em>: huippuvuosi 2022 (3 770 tEUR) osuu DC-Airin USA-lanseerauksen jälkeiseen vuoteen, ja romahdus 2023–2024 viittaa jakelukanavan tilausten — ei välttämättä loppukysynnän — heilahteluun. Yhden jakelijarakenteen (FTG) kautta kulkeva myynti tekee liikevaihdosta harvojen päätösten varaista, mikä näkyy myös saatujen ennakoiden heilunnassa (640 → 0 tEUR).</li>
      <li style="margin-bottom:5px;"><strong>Varasto (1 118 tEUR, 70 % liikevaihdosta)</strong> on uskottavampi strategisena komponenttipuskurina (puolijohdemateriaalit, pitkät toimitusajat) kuin epäkuranttina eränä — mutta se sitoo kassaa, jota tappiovuodet tarvitsisivat, ja epäkuranttiusriski säilyy kunnes kierto paranee.</li>
    </ol>

    <p>Organisaatio on pieni ja vakaa: henkilöstömäärä on pysynyt 7–11 henkilössä koko tarkastelujakson. Rahoitusrakenne yhdistää pankkilainoja (1 859 tEUR), takasijaisia pääomalainoja (1 626 tEUR), lähipiirivelkaa (815 tEUR) ja omistajien oman pääoman ehtoisia sijoituksia (1 045 tEUR vuonna 2025) — rakenne, jossa omistajat ja lähipiiri kantavat merkittävän osan riskistä.</p>

    <div class="callout neutral" style="margin-top:9px;">
      <div class="co-t"><span class="co-badge"></span>Vaikutus arvonmääritykseen (callout)</div>
      <p>Yhtiön arvo ei ole sen taseessa vaan tulevassa kannattavuudessa: tase ilman pääomalainoja on negatiivinen, joten substanssipohjaiset menetelmät eivät tuota mielekästä going concern -arvoa. Arvonmääritys on pakko perustaa tuottopohjaisiin menetelmiin, jotka olettavat kannattavuuskäänteen.</p>
      <p>Verkkolähteet tarkentavat riskikuvaa kahteen suuntaan: yhtäältä FDA-hyväksytty, patentoituun teknologiaan perustuva tuoteportfolio kahdella markkinalla (hammas + teollisuus) tukee käänneoletusta enemmän kuin TOL-koodi "elektronisten komponenttien valmistus" antaisi ymmärtää; toisaalta riippuvuus yksittäisestä jakelukanavasta selittää liikevaihdon volatiliteetin ja pitää riskipreemion korkeana (oman pääoman kustannus 11,8 %, ks. osio 8). Huomionarvoista on, että toimialavertailu (TOL 26.11, elektroniset komponentit) aliarvioi lääkintälaiteliiketoiminnan tyypillisen katetason — yhtiön oma bruttokate (59 %) on selvästi komponenttivalmistajan profiilia korkeampi, mikä tukee EBIT-% vs P/Sales -menetelmän marginaalioletusta varovaisena.</p>
    </div>

    <h4 class="blk" style="margin-top:9px;">Lähderekisteri (osio 3)</h4>
    <table class="score" style="font-size:7pt; line-height:1.23;">
      <thead><tr><th style="width:25%;">Lähde</th><th style="width:56%;">Tieto</th><th style="width:19%;">Haettu</th></tr></thead>
      <tbody>
        <tr><td>PRH / kaupparekisteri (proff.fi)</td><td>Rekisteröinti 29.3.2016, kotipaikka Espoo, toimitusjohtaja</td><td>12.6.2026</td></tr>
        <tr><td>athlos.fi</td><td>Teknologia, tuoteperheet DC-Air®/WIOS ja UFS, valmistus, Clinicians Report -arvioinnit</td><td>12.6.2026</td></tr>
        <tr><td>PRNewswire 13.9.2021</td><td>FDA 510(k) 22.7.2021, FTG-jakeluyhteisyritys USA:ssa</td><td>12.6.2026</td></tr>
        <tr><td>Duunitori 9/2021 (yhtiön ilmoitus)</td><td>Oma ISO 7 -puhdastila, lääketieteelliset ja teolliset röntgenlaitteet</td><td>12.6.2026</td></tr>
      </tbody>
    </table>`;

const newSection3 = `${page("LIIKETOIMINTAPROFIILI I", "Liiketoimintaprofiili", section3Page1Body)}

${page("LIIKETOIMINTAPROFIILI II", "Liiketoimintaprofiili — analyysi", section3Page2Body)}

`;

template = template.slice(0, section3Start) + newSection3 + template.slice(section4Start);

const tocUpdates = [
  ["Historiallinen taloudellinen kehitys", "8", "9"],
  ["Ennusteet", "10", "11"],
  ["Valuaatiopolun valinta", "11", "12"],
  ["Arvonmääritys", "12", "13"],
  ["Diskontattu kassavirta", "13", "14"],
  ["EBIT-% vs P/Sales -menetelmä", "14", "15"],
  ["Herkkyysanalyysi ja skenaariot", "15", "16"],
  ["Arvon ajurit", "16", "17"],
  ["Riskit", "17", "18"],
  ["Toimenpiteet arvon kasvattamiseksi", "18", "19"],
  ["Tilinpäätöstaulukot ja toimialavertailu", "19", "20"],
  ["Metodologia, tekoälyn rooli ja rajoitukset", "21", "22"],
];

for (const [title, oldPage, newPage] of tocUpdates) {
  template = updateToc(template, title, oldPage, newPage);
}

template = renumberPageCommentsAndLabels(template);

const encodedTemplate = JSON.stringify(template).replace(/<\//g, "<\\u002F");
const newTemplateScript = `<script type="__bundler/template">\n${encodedTemplate}\n  </script>`;
const updatedSource = source.replace(/<script type="__bundler\/template">\s*[\s\S]*?\s*<\/script>/, newTemplateScript);

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, updatedSource, "utf8");

console.log(`Wrote ${output}`);
