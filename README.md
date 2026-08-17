# padel-match-organizer-test — solo il caricatore di TEST

Questo repo **non contiene l'applicazione**. Contiene solo il necessario per dare
all'ambiente TEST del gestionale un indirizzo suo: **`test.padelvillage.club`**.

L'app vera vive in [`PadelVillage/padel-match-organizer`](https://github.com/PadelVillage/padel-match-organizer),
ramo **`test-preview`**. Qui dentro ne vive una **copia pubblicata** (`app.html`),
che il caricatore serve dalla stessa origine.

| file | cosa fa |
|---|---|
| `index.html` | il caricatore: legge `./app.html` e lo esegue (GitHub `raw` solo come ripiego) |
| `app.html` | ⚠️ **copia generata** dell'app (da `test-preview`) — non si modifica a mano |
| `app-meta.json` | ⚠️ generato: da quale commit viene `app.html` e quando è stato copiato |
| `.github/workflows/sync-app.yml` | tiene fresca la copia (dispatch dal repo dell'app, cron ogni 10′, o a mano) |
| `config-test.js` | dice all'app di collegarsi al Supabase di TEST (`cudiqnrrlbyqryrtaprd`) |
| `CNAME` | assegna il dominio a GitHub Pages |

## 📦 Perché una copia e non il download dal ramo (voce 58, 17/08/2026)

Fino al 17/08/2026 il caricatore scaricava l'app **a ogni apertura** da
`raw.githubusercontent.com` (ramo `test-preview`), in forma anonima e con un
cache-buster che azzerava la CDN: ~3 MB a colpo. GitHub ha strozzato quei
download con **429 anti-scraping** sui percorsi per-ramo del repo — misurato da
due reti diverse — e TEST è rimasto inutilizzabile per ore.

Da allora il caricatore legge `./app.html` su **questa stessa origine** (Pages):
nessuna quota, nessun 429. La strada da `raw` esiste ancora, ma solo come
ripiego se la copia locale non risponde.

## ⚠️ Non modificare l'app da qui

Per cambiare il gestionale di TEST si lavora su `padel-match-organizer`, ramo
`test-preview` — **mai su `app.html`**, che è una copia e verrebbe sovrascritta
dal primo sync. Un push su `test-preview` arriva qui:

- **subito**, se nel repo dell'app esiste il secret `TEST_LOADER_SYNC_TOKEN`
  (il workflow `sync-test-loader.yml` manda un `repository_dispatch` a questo repo);
- **entro ~10 minuti** col cron di `sync-app.yml`, altrimenti;
- **adesso**, lanciando a mano `sync-app` da Actions (workflow_dispatch).

→ Per verificare che un cambio sia arrivato: apri l'indirizzo e controlla il
numero di versione, oppure leggi `app-meta.json` (dice commit e ora della copia).

## Perché esiste (il motivo vero)

Prima TEST stava su `app.padelvillage.club/test/`, cioè **lo stesso indirizzo di
produzione**. I browser danno la memoria locale per indirizzo, non per cartella:
i due ambienti se la dividevano, ~2–3 MB ciascuno contro un tetto di 5–10 MB.

Il 20/07/2026 questo ha causato un guasto reale: una prenotazione non veniva
salvata e l'app diceva ugualmente «✅ Salvata». Curato lato codice, ma la causa di
fondo era la memoria condivisa — che si toglie solo separando gli indirizzi.

## 🔒 Le due cinture di sicurezza

L'app riconosce di essere in TEST — e quindi di dover usare il database di TEST e
di non dover scrivere sul Matchpoint vero — in **due** modi indipendenti:

1. `window.PMO_FORCE_ENV = 'test'`, dichiarato dal caricatore qui dentro;
2. l'hostname che inizia per `test.`, riconosciuto dentro l'app (`pmoIsTestHostname`,
   dalla v6.112/6.113).

Sono ridondanti di proposito. Se salta la prima, la seconda evita che l'app di TEST
finisca a parlare col Supabase **di produzione** e a scrivere sul **Matchpoint vero**
(il worker è un processo unico condiviso fra TEST e PROD).

⚠️ Se un giorno il dominio cambia, va aggiornato in **due** punti: il `CNAME` e la
riga `PMO_PUBLIC_BASE_URL` dentro `index.html`.

## Cosa NON c'è qui

`autovalutazione.html` e `feedback-partita.html` non sono su questo dominio. I link
che TEST genera per quelle pagine vanno regolati dall'app (sono campi configurabili)
oppure quelle pagine vanno aggiunte qui — scelta rimandata di proposito, per non
tenere copie che si disallineano dall'originale.

## Il vecchio indirizzo

`app.padelvillage.club/test/` continua a funzionare: il riconoscimento per percorso
non è stato tolto. Resta vivo in parallelo finché non si decide di ritirarlo.
