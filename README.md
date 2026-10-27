# AI Job Search · Italia

**Un assistente per la ricerca di lavoro che gira sul tuo computer, adattato al mercato italiano, spagnolo e svizzero.**

Ogni mattina e ogni sera, con un solo comando, cerca gli annunci nuovi, scarta quelli che non fanno per te, dà un punteggio agli altri e prepara candidature complete (CV e lettera su misura, in PDF). Alla fine ti consegna un report in italiano da approvare. Non invia mai niente senza il tuo ok.

Si basa su [**ai-job-search**](https://github.com/MadsLorentzen/ai-job-search) di Mads Lorentzen (licenza MIT), costruito su [Claude Code](https://claude.com/claude-code). Il progetto originale è pensato per la Danimarca; questa versione aggiunge quello che serve per cercare lavoro da qui. La documentazione originale completa è in [README.en.md](README.en.md).

> Progetto indipendente: non è affiliato né approvato da Anthropic o dall'autore originale.

---

## Cosa aggiunge questa versione

| | Originale | Questa versione |
|---|---|---|
| **Routine quotidiana** | comandi separati da lanciare uno per uno | **`/giro`**: ricerca → filtro → punteggio → 4 candidature pronte → report, in un comando |
| **Portali** | Danimarca + LinkedIn + freehire | in più **jobs.ch** (Svizzera e Ticino), per chi vive vicino al confine |
| **Filtri per il Sud Europa** | lingua, deal-breaker del profilo | in più: visto e sponsorship (UK), finestra di laurea per stage e graduate program, attesa obbligatoria prima di ricandidarsi, ruoli riservati alle categorie protette (L. 68/99) |
| **Convenzioni del CV** | standard nordico | foto sì per Italia, Spagna e Svizzera, mai per UK e USA; consenso GDPR quando richiesto; lettera nella lingua dell'annuncio |
| **Consegna** | file sparsi nelle cartelle | **`outbox/`**: una cartella per giro e per azienda, con i PDF già rinominati e pronti da allegare |
| **Monitoraggio** | — | **dashboard HTML** delle candidature, aggiornata a ogni giro |

### Come funziona `/giro`

```
/giro mattina
   │
   ├─ 1. Cerca      LinkedIn (più città), jobs.ch, altri portali attivi — ultimi 7 giorni
   ├─ 2. Filtra     scarta per titolo: troppo senior, lingue che non parli, ruoli fuori target
   ├─ 3. Valuta     punteggio di compatibilità + controlli su visto, lingue, requisiti, scadenze
   ├─ 4. Sceglie    max 4, priorità al tuo mercato, una sola candidatura per azienda
   ├─ 5. Prepara    flusso /apply completo: CV e lettera, revisione di un secondo agente, PDF verificati
   ├─ 6. Coda       gli altri annunci buoni, con il CV più adatto già indicato
   └─ 7. Report     cosa ha trovato, cosa ha scartato e PERCHÉ, cosa serve da te
```

Il report spiega ogni scelta fatta in autonomia. Esempio: *"Non ho preparato l'azienda X: l'annuncio chiede di aspettare un anno prima di ricandidarsi, e il tracker mostra un rifiuto il mese scorso. È in coda al n. 3 se vuoi provarci lo stesso."* Per approvare basta rispondere, per esempio, *"invia A, C, 1, 3"*.

### Risultati

L'ho usato per la mia ricerca di lavoro dopo la laurea, due giri al giorno:

- circa **300 annunci** analizzati per giro su 6 città (Milano, Como, Lugano, Barcellona, Madrid, Londra);
- circa **30 candidature complete** preparate in una settimana, ognuna con CV e lettera su misura, ricerca sull'azienda e controllo ATS;
- zero candidature inviate senza una mia approvazione esplicita.

---

## Installazione (macOS)

Serve un abbonamento Claude Pro o Max (oppure crediti API), più Python 3.10+, [Bun](https://bun.sh) e LaTeX.

```bash
# 1. Scarica il progetto (fuori da Documenti: macOS ne limita l'accesso)
git clone https://github.com/lewel17/ai-job-search-italia.git ~/ai-job-search
cd ~/ai-job-search

# 2. Strumenti di ricerca
python3 tools/install_portal_clis.py

# 3. LaTeX leggero, senza password di amministratore
curl -fsSL https://yihui.org/tinytex/install-bin-unix.sh | sh
echo 'export PATH="$HOME/Library/TinyTeX/bin/universal-darwin:$PATH"' >> ~/.zshrc && source ~/.zshrc
tlmgr install moderncv fontawesome5 fontawesome6 academicons import luatexbase pgf \
  titlesec textpos xltxtra xunicode cite realscripts needspace
```

Dettagli e alternative (Windows, Linux, MacTeX) in [SETUP.md](SETUP.md).

> **Privacy:** `/setup` scrive i tuoi dati personali dentro i file del progetto. **Non fare un fork pubblico** della tua copia di lavoro e non pubblicarla: tienila solo sul tuo computer o in un repository privato.

## Primo utilizzo

1. Metti i tuoi documenti in `documents/`: il CV in `cv/`, il PDF di LinkedIn in `linkedin/`, e in `projects/` una descrizione dettagliata delle tue esperienze (numeri, responsabilità, risultati). Più materiale dai, migliori sono le candidature.
2. Apri il progetto con Claude Code (dall'app desktop: **Code → New session → Local**, oppure `claude` dal Terminale).
3. Lancia **`/setup`**: legge i documenti, poi ti fa le domande su città, ruoli, lingue, cosa escludere.
4. Compila la sezione **`## Giro`** in `CLAUDE.md` (mercato prioritario, sponsorship, foto).
5. Lancia **`/giro`**.

## Tutti i comandi

| Comando | A cosa serve |
|---|---|
| **`/giro`** | **Il giro completo: ricerca, filtro, punteggio, candidature, report** |
| `/setup` | Costruisce il tuo profilo dai documenti o con un'intervista |
| `/scrape` | Cerca annunci sui portali attivi |
| `/rank` | Dà un punteggio agli annunci trovati |
| `/apply <link>` | Prepara una singola candidatura completa |
| `/interview` | Preparazione al colloquio, con simulazione |
| `/outcome` | Registra l'esito di una candidatura e prepara i follow-up |
| `/gmail-sync` | Legge le risposte delle aziende da Gmail e aggiorna il tracker |
| `/upskill` | Individua le competenze che ti mancano e un piano per colmarle |
| `/add-portal` | Crea l'integrazione per un nuovo portale (es. InfoJobs) |

## Aggiornamenti dall'originale

Il repository originale è collegato come `upstream`:

```bash
git fetch upstream --tags
python3 tools/check_upstream_updates.py   # mostra cosa cambierebbe nei tuoi file
```

## Crediti e licenza

- Framework originale: [Mads Lorentzen](https://github.com/MadsLorentzen/ai-job-search), MIT.
- Adattamento per Italia, Spagna e Svizzera (`/giro`, jobs.ch, filtri e convenzioni locali): [Leonardo Palma](https://github.com/lewel17).

Licenza MIT: vedi [LICENSE](LICENSE).
