import {
  BASE_URL,
  SEARCH_PATH,
  pageFetch,
  parseSearchPage,
  writeError,
  type JobCard,
} from "../helpers.js"

export interface SearchOpts {
  query?: string
  location?: string
  jobage?: number
  page: number
  limit?: number
  format: "json" | "table" | "plain"
}

export function buildUrl(opts: SearchOpts): string {
  // encodeURIComponent, not URLSearchParams: jobs.ch 301-redirects a "+" for a
  // space to the canonical "%20" form.
  const params: [string, string][] = []
  if (opts.location) params.push(["location", opts.location])
  if (opts.jobage) params.push(["publication-date", String(opts.jobage)])
  if (opts.page > 1) params.push(["page", String(opts.page)])
  if (opts.query) params.push(["term", opts.query])
  const qs = params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")
  return `${BASE_URL}${SEARCH_PATH}${qs ? `?${qs}` : ""}`
}

function renderTable(cards: JobCard[]): string {
  if (cards.length === 0) return "No results."
  const rows = cards.map((c) => {
    const title = (c.title || "").slice(0, 42).padEnd(42)
    const company = (c.company || "—").slice(0, 26).padEnd(26)
    const loc = (c.location || "—").slice(0, 18).padEnd(18)
    const date = c.date ? c.date.slice(0, 10) : "—"
    return `${c.id.padEnd(36)} ${title} ${company} ${loc} ${date}`
  })
  const header =
    "ID".padEnd(36) + " " + "TITLE".padEnd(42) + " " + "COMPANY".padEnd(26) + " " + "LOCATION".padEnd(18) + " DATE"
  return [header, "-".repeat(header.length), ...rows].join("\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    let res = await pageFetch(buildUrl(opts))
    // On page 1 a redirect can only be URL canonicalisation (parameter order or
    // encoding), so follow it once when it stays on the search path.
    if (opts.page === 1 && res.status >= 300 && res.status < 400 && res.location?.startsWith(SEARCH_PATH)) {
      res = await pageFetch(`${BASE_URL}${res.location}`)
    }
    let cards: JobCard[] = []
    let totalHits: number | null = null
    let numPages: number | null = null
    // A redirect means jobs.ch rejected the page number (past the last page)
    // and is sending us back to page 1: report an empty page, not page 1.
    if (res.status === 200) {
      const parsed = parseSearchPage(res.body)
      if (!parsed) {
        writeError("Could not find search results in the jobs.ch page (markup may have changed)", "PARSE_FAILED")
        return 1
      }
      ;({ cards, totalHits, numPages } = parsed)
    } else if (!(res.status >= 300 && res.status < 400 && opts.page > 1)) {
      writeError(`Unexpected response ${res.status}${res.location ? ` -> ${res.location}` : ""}`, "SEARCH_FAILED")
      return 1
    }
    if (opts.limit !== undefined) cards = cards.slice(0, opts.limit)

    if (opts.format === "table") {
      process.stdout.write(renderTable(cards) + "\n")
    } else if (opts.format === "plain") {
      process.stdout.write(
        cards
          .map(
            (c) =>
              `${c.title}\n  ${c.company || "—"} · ${c.location || "—"} · ${c.date ? c.date.slice(0, 10) : "—"}${c.workload ? ` · ${c.workload}` : ""}\n  id: ${c.id}\n  ${c.url}`,
          )
          .join("\n\n") + "\n",
      )
    } else {
      process.stdout.write(
        JSON.stringify(
          { meta: { count: cards.length, page: opts.page, totalHits, numPages }, results: cards },
          null,
          2,
        ) + "\n",
      )
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "SEARCH_FAILED")
    return 1
  }
}
