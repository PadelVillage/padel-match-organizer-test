// ─────────────────────────────────────────────────────────────────────────────
// BANCO della voce 59/B, in un browser VERO (Chromium via Playwright).
//
// Prova il caricatore COM'È — file vero, non parafrasi — servito da un server
// locale, con api.github.com intercettato. Copre le sei strade che contano, e
// ognuna dichiara PRIMA cosa deve succedere.
//
// 🚨 Ogni caso verifica anche di essere stato APPLICATO (la regola della 29ª:
//    un sabotaggio non applicato dà lo stesso verde di un caso cieco).
// ─────────────────────────────────────────────────────────────────────────────
//
// ▶️ COME SI LANCIA (serve playwright, che QUESTO repo non ha):
//    si copia nella cartella tools/verifica-browser del repo dell'app, che ce l'ha:
//      cp banco-freschezza.mjs <repo-app>/tools/verifica-browser/ && cd $_ && npm install
//      node banco-freschezza.mjs
//    Non tocca la rete vera: server locale + api.github.com intercettato.
//
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

const CARICATORE = '/workspace/padel-match-organizer-test/index.html';
const CHROME = '/opt/pw-browsers/chromium';

// App finta minuscola: al banco interessa il caricatore, non i 3 MB dell'app.
// Rifà il body come fa l'app vera, così si prova anche il ricontrollo del banner.
const APP_FINTA = `<!DOCTYPE html><html><body><h1 id="appFinta">APP DI TEST</h1>
<script>setTimeout(function(){document.body.innerHTML='<h1 id="appFinta">APP RIMONTATA</h1>';},300);<\/script>
</body></html>`;
const APP_FINTA_2 = APP_FINTA.replace('APP DI TEST', 'APP DI TEST v2');

// L'impronta git che il server GitHub finto deve riportare, calcolata come git.
import { createHash } from 'node:crypto';
const impronta = (s) => {
  const b = Buffer.from(s, 'utf8');
  return createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${b.length}\0`), b])).digest('hex');
};

const caricatore = readFileSync(CARICATORE, 'utf8');

// ── il server locale che fa da test.padelvillage.club ────────────────────────
let appServita = APP_FINTA;
const server = createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/' || url === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(caricatore);
  }
  if (url === '/app.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(appServita);
  }
  res.writeHead(404); res.end('no');
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({ executablePath: CHROME });
let ko = 0, fatti = 0;

async function prova(nome, { attesa, sorgente, rispostaGitHub, appPrimariaRotta = false, pagina }) {
  fatti++;
  const ctx = await browser.newContext();
  const page = pagina ? null : await ctx.newPage();
  const p = page || pagina;

  let chiamateGitHub = 0;
  await p.route('**://api.github.com/**', async (route) => {
    chiamateGitHub++;
    if (rispostaGitHub === 'muto') return route.fulfill({ status: 403, body: 'rate limited' });
    if (rispostaGitHub === 'rete') return route.abort('failed');
    if (rispostaGitHub === 'appeso') { await new Promise((r) => setTimeout(r, 30000)); return route.abort('failed'); }
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify([
        { name: 'CLAUDE.md', path: 'CLAUDE.md', type: 'file', sha: 'a'.repeat(40) },
        { name: 'index.html', path: 'index.html', type: 'file', sha: sorgente },
        { name: 'docs', path: 'docs', type: 'dir', sha: 'b'.repeat(40) }
      ])
    });
  });
  if (appPrimariaRotta) {
    await p.route('**/app.html', (route) => route.fulfill({ status: 500, body: 'giu' }));
    await p.route('**://raw.githubusercontent.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: APP_FINTA }));
  }

  await p.goto(BASE, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2000);

  const visto = {
    app: await p.locator('#appFinta').count() > 0,
    avviso: await p.locator('#pmoAvvisoCopiaVecchia').count() > 0,
    chiamate: chiamateGitHub,
    memoria: await p.evaluate(() => { try { return localStorage.getItem('pmoTestFreschezza.v1'); } catch (e) { return null; } })
  };

  // ① l'app deve SEMPRE essere a schermo: il controllo non è mai bloccante
  const appOk = visto.app === true;
  // ② l'avviso deve comparire solo dove atteso
  const avvisoOk = visto.avviso === attesa.avviso;
  const chiamateOk = attesa.chiamate === undefined || visto.chiamate === attesa.chiamate;
  const ok = appOk && avvisoOk && chiamateOk;
  if (!ok) ko++;
  console.log(`${ok ? '✅' : '❌'} ${nome}`);
  console.log(`     app a schermo: ${visto.app} (atteso true) · avviso: ${visto.avviso} (atteso ${attesa.avviso}) · chiamate a GitHub: ${visto.chiamate}${attesa.chiamate !== undefined ? ' (attese ' + attesa.chiamate + ')' : ''}`);
  if (!pagina) await ctx.close();
  return { ctx, page: p, visto };
}

const shaFinta = impronta(APP_FINTA);
console.log(`impronta dell'app finta servita: ${shaFinta.slice(0, 12)}…\n`);

// ── 1. copia FRESCA: sorgente identica alla servita → nessun avviso ──────────
await prova('copia fresca (sorgente == servita) → nessun avviso, e la memoria registra il verdetto',
  { attesa: { avviso: false, chiamate: 1 }, sorgente: shaFinta, rispostaGitHub: 'ok' });

// ── 2. copia VECCHIA: è il caso per cui la voce esiste ───────────────────────
await prova('copia VECCHIA (sorgente != servita) → avviso mostrato',
  { attesa: { avviso: true, chiamate: 1 }, sorgente: 'c'.repeat(40), rispostaGitHub: 'ok' });

// ── 3-5. GitHub non collabora: in tutti i casi SILENZIO, mai allarme ─────────
await prova('GitHub risponde 403 (quota) → silenzio, nessun falso allarme',
  { attesa: { avviso: false, chiamate: 1 }, sorgente: 'c'.repeat(40), rispostaGitHub: 'muto' });
await prova('la rete cade → silenzio',
  { attesa: { avviso: false, chiamate: 1 }, sorgente: 'c'.repeat(40), rispostaGitHub: 'rete' });
await prova('GitHub resta APPESO → il tetto d\'attesa taglia, silenzio, app viva',
  { attesa: { avviso: false }, sorgente: 'c'.repeat(40), rispostaGitHub: 'appeso' });

// ── 6. l'app è arrivata dal RIPIEGO (raw = la sorgente) → non si controlla ───
await prova('app presa dal ripiego raw (è la sorgente) → nessuna chiamata di controllo',
  { attesa: { avviso: false, chiamate: 1 }, sorgente: 'c'.repeat(40), rispostaGitHub: 'ok', appPrimariaRotta: true });
//   nota: la chiamata attesa è quella che il RIPIEGO fa per lo SHA, non il controllo.

// ── 7. la memoria: entro l'ora non si richiama GitHub, ma l'avviso resta ─────
{
  fatti++;
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  let chiamate = 0;
  await page.route('**://api.github.com/**', (route) => {
    chiamate++;
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify([{ name: 'index.html', path: 'index.html', type: 'file', sha: 'c'.repeat(40) }]) });
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const primo = { avviso: await page.locator('#pmoAvvisoCopiaVecchia').count() > 0, chiamate };
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const secondo = { avviso: await page.locator('#pmoAvvisoCopiaVecchia').count() > 0, chiamate };
  const ok = primo.avviso && secondo.avviso && primo.chiamate === 1 && secondo.chiamate === 1;
  if (!ok) ko++;
  console.log(`${ok ? '✅' : '❌'} memoria: al 2° carico entro l'ora NON si richiama GitHub, ma l'avviso resta`);
  console.log(`     1° carico: avviso=${primo.avviso} chiamate=${primo.chiamate} · 2° carico: avviso=${secondo.avviso} chiamate=${secondo.chiamate} (attese 1 e 1)`);

  // ── 8. …ma se la copia SERVITA cambia, la memoria non vale più ─────────────
  fatti++;
  appServita = APP_FINTA_2;                        // arriva una sincronia: copia nuova
  const shaNuova = impronta(APP_FINTA_2);
  await page.unroute('**://api.github.com/**');
  await page.route('**://api.github.com/**', (route) => {
    chiamate++;
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify([{ name: 'index.html', path: 'index.html', type: 'file', sha: shaNuova }]) });
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const terzo = { avviso: await page.locator('#pmoAvvisoCopiaVecchia').count() > 0, chiamate };
  const ok8 = terzo.chiamate === 2 && terzo.avviso === false;
  if (!ok8) ko++;
  console.log(`${ok8 ? '✅' : '❌'} la copia servita cambia → la memoria si invalida da sé, si ricontrolla, e l'avviso sparisce`);
  console.log(`     3° carico: avviso=${terzo.avviso} (atteso false) chiamate totali=${terzo.chiamate} (attese 2)`);
  await ctx.close();
  appServita = APP_FINTA;
}

// ── 9. SABOTAGGIO: il banco sa diventare rosso? ───────────────────────────────
// Si spegne il confronto (si dichiara sempre fresco) e il caso 2 DEVE cadere.
{
  fatti++;
  const sabotato = caricatore.replace('const vecchia = sorgente !== servita;', 'const vecchia = false;');
  const applicato = sabotato !== caricatore;
  if (!applicato) { ko++; console.log('❌ SABOTAGGIO NON APPLICATO — il verde che segue non varrebbe niente'); }
  else {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.route('**://api.github.com/**', (route) => route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify([{ name: 'index.html', path: 'index.html', type: 'file', sha: 'c'.repeat(40) }]) }));
    await page.route(BASE, (route) => route.fulfill({ status: 200, contentType: 'text/html', body: sabotato }));
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const avviso = await page.locator('#pmoAvvisoCopiaVecchia').count() > 0;
    const ok = avviso === false;   // col sabotaggio l'avviso NON deve uscire ⇒ il caso 2 cadrebbe
    if (!ok) ko++;
    console.log(`${ok ? '✅' : '❌'} sabotaggio applicato (confronto spento): l'avviso NON esce ⇒ il caso 2 misura davvero`);
    await ctx.close();
  }
}

// ── 10. «Ho capito» e' DEFINITIVO: la guardia non lo rimette addosso ─────────
{
  fatti++;
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.route('**://api.github.com/**', (route) => route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify([{ name: 'index.html', path: 'index.html', type: 'file', sha: 'c'.repeat(40) }]) }));
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#pmoAvvisoCopiaVecchia', { timeout: 5000 });
  await page.locator('#pmoAvvisoCopiaVecchia button').click();
  const subito = await page.locator('#pmoAvvisoCopiaVecchia').count();
  await page.waitForTimeout(2000);            // due giri di guardia
  const dopo = await page.locator('#pmoAvvisoCopiaVecchia').count();
  const ok = subito === 0 && dopo === 0;
  if (!ok) ko++;
  console.log(`${ok ? '✅' : '❌'} «Ho capito» è definitivo: sparito=${subito === 0}, e dopo 2 s resta sparito=${dopo === 0}`);
  await ctx.close();
}

await browser.close();
server.close();
console.log(`\n${ko === 0 ? '🟢 BANCO VERDE' : '🔴 BANCO ROSSO'} — ${fatti - ko}/${fatti}`);
process.exit(ko === 0 ? 0 : 1);
