# padel-match-organizer-test — solo il caricatore di TEST

Questo repo **non contiene l'applicazione**. Contiene solo il necessario per dare
all'ambiente TEST del gestionale un indirizzo suo: **`test.padelvillage.club`**.

L'app vera vive in [`PadelVillage/padel-match-organizer`](https://github.com/PadelVillage/padel-match-organizer),
ramo **`test-preview`**. Il caricatore qui dentro la scarica al volo a ogni apertura.

| file | cosa fa |
|---|---|
| `index.html` | il caricatore: scarica `index.html` dal ramo `test-preview` e lo esegue |
| `config-test.js` | dice all'app di collegarsi al Supabase di TEST (`cudiqnrrlbyqryrtaprd`) |
| `CNAME` | assegna il dominio a GitHub Pages |

## ⚠️ Non modificare l'app da qui

Per cambiare il gestionale di TEST si lavora su `padel-match-organizer`, ramo
`test-preview`. Un push lì è **subito live** su questo indirizzo: nessun workflow
gira, il caricatore prende sempre l'ultimo commit del ramo.

→ Quindi **non aspettare un segno verde** dopo un cambio all'app: per verificare,
apri l'indirizzo e controlla il numero di versione.

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
