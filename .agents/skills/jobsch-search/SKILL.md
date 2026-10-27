---
name: jobsch-search
version: 1.0.0
description: >
  Use this skill to search jobs.ch, Switzerland's largest job portal, for open
  positions anywhere in Switzerland (Ticino, Lugano, Mendrisio, Chiasso,
  Bellinzona, Zürich, Basel, Geneva...), or to read a specific jobs.ch vacancy.
  Covers all sectors and roles in English, German, French and Italian.
  Trigger phrases: jobs in Switzerland, Swiss jobs, jobs.ch, jobs in Ticino,
  jobs in Lugano, frontaliere, Stellenangebote, Stellensuche, Jobs Schweiz,
  offres d'emploi Suisse, offerte di lavoro Ticino, lavoro in Svizzera,
  cerco lavoro Lugano.
context: fork
enabled: true  # set to false to keep this portal installed but have /scrape skip it
allowed-tools: Bash(bun run .agents/skills/jobsch-search/cli/src/cli.ts *)
---

# jobs.ch Search Skill

Search live vacancies on **jobs.ch** (JobCloud), the largest job board in Switzerland.
It covers every canton, including Ticino, and postings in English, German, French and Italian.
No authentication and **zero runtime dependencies**: it runs with just `bun`.

The CLI reads only the public search page (`/en/vacancies/`) and the vacancy pages
(`/en/vacancies/detail/<uuid>/`). Both are allowed by jobs.ch's robots.txt. It never calls
`/api/`, which robots.txt disallows. Keep volume low: this is for personal job searching.

## When to use this skill

- Find openings in a Swiss city or canton, e.g. Ticino roles for a cross-border commuter (frontaliere) from Lombardy or Piedmont.
- Filter by recency (published in the last N days).
- Read the full description of a specific jobs.ch vacancy.

## Commands

### Search vacancies

```bash
bun run .agents/skills/jobsch-search/cli/src/cli.ts search [-q "<keywords>"] [-l "<place>"] [flags]
```

- `--query <text>` / `-q <text>`: keywords (title, skill, role). Matching is semantic, so English terms also find German and Italian postings.
- `--location <text>` / `-l <text>`: a city or canton, e.g. `"Lugano"`, `"Ticino"`, `"Mendrisio"`, `"Zürich"`.
- At least one of `--query` or `--location` is required.
- `--jobage <days>`: published within N days. Any whole number works (jobs.ch's `publication-date` parameter).
- `--page <n>`: 1-indexed page, 20 results per page. A page past the last one returns an empty list.
- `--limit <n>` / `-n <n>`: caps the number of results emitted (client-side).
- `--format json|table|plain`: default `json`.

### Fetch full vacancy detail

```bash
bun run .agents/skills/jobsch-search/cli/src/cli.ts detail <uuid|url> [--format json|plain]
```

`uuid` is the `id` from search results. A full jobs.ch vacancy URL works too, in any language path (`/en/vacancies/detail/`, `/de/stellenangebote/detail/`, `/fr/offres-emplois/detail/`). The output includes:

- the description;
- employment type and workload;
- industry;
- posted and valid-through dates.

## Usage examples

```bash
# Sales roles anywhere in Ticino, last 7 days
bun run .agents/skills/jobsch-search/cli/src/cli.ts search -q "sales" -l "Ticino" --jobage 7 --format table

# Business development in Lugano
bun run .agents/skills/jobsch-search/cli/src/cli.ts search -q "business development" -l "Lugano" --format table

# Marketing in Zürich, second page
bun run .agents/skills/jobsch-search/cli/src/cli.ts search -q "marketing" -l "Zürich" --page 2 --format table

# Italian-language keyword in Mendrisio
bun run .agents/skills/jobsch-search/cli/src/cli.ts search -q "addetto vendite" -l "Mendrisio" --format table

# Full detail for one vacancy
bun run .agents/skills/jobsch-search/cli/src/cli.ts detail 24cd919f-2dc6-4c42-bdaa-554919edcdc9 --format plain
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default. Programmatic use and passing ids to `detail`. `meta` also carries `totalHits` and `numPages`. |
| `table` | Quick human-readable scanning |
| `plain` | Reading a single vacancy's full detail (`detail` command) |

Each search result has `id`, `title`, `company`, `location`, `date` (publication date), `url`, `workload` (e.g. `80-100%`) and `isNew`.

All errors go to **stderr** as `{ "error": "...", "code": "..." }`, and the process exits with code `1`.

## Notes

- Vacancy ids are UUIDs (e.g. `217947a9-55cf-4eea-956b-0ba024a39313`).
- `location` is the employer's free-text place. Some employers put a path there, e.g. `EMEA > CHE > Stabio`.
- The `--jobage` filter uses jobs.ch's own date logic. A re-published posting can show an older `date` than the window suggests.
- The same vacancy can appear twice on one page when it is also promoted. The CLI drops the duplicates.
- Expired vacancies return `NOT_FOUND` from `detail`.
- jobup.ch (French-speaking Switzerland) belongs to the same JobCloud group and shares most of its inventory with jobs.ch, so this skill covers it in practice.
