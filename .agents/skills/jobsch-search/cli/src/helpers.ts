// Data source: jobs.ch public search and vacancy pages. No authentication required.
// Both pages are server-rendered and embed the app state as `__INIT__ = {...}` in an
// inline script; the search results live at vacancy.results.main, and each vacancy
// page also carries a schema.org JobPosting in JSON-LD. We read those JSON blobs
// rather than the rendered markup, which is far more stable than class names.
// /api/ is disallowed by robots.txt, so the CLI never calls it.

export const BASE_URL = "https://www.jobs.ch"
export const SEARCH_PATH = "/en/vacancies/"
export const DETAIL_PATH = "/en/vacancies/detail/"

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA = "Mozilla/5.0 (compatible; jobsch-cli/1.0)"

export interface FetchResult {
  status: number
  body: string
  location: string | null
}

/**
 * Fetch a page with exponential backoff on 429/5xx. Redirects are NOT followed:
 * jobs.ch answers a page number past the last page with a 301 back to page 1,
 * and following it would print page 1's postings as if they were page N.
 * Returns status 404 with an empty body on a 404.
 */
export async function pageFetch(url: string): Promise<FetchResult> {
  const maxRetries = 6
  let delay = 500
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(20000),
    })
    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`)
      }
      const jitter = Math.floor(Math.random() * 500)
      await new Promise((r) => setTimeout(r, delay + jitter))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (response.status === 404) return { status: 404, body: "", location: null }
    if (response.status >= 300 && response.status < 400) {
      return { status: response.status, body: "", location: response.headers.get("location") }
    }
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }
    return { status: response.status, body: await response.text(), location: null }
  }
  throw new Error("Request failed after max retries")
}

export interface JobCard {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null
  url: string
  workload: string | null
  isNew: boolean
}

export interface JobDetail extends JobCard {
  description: string | null
  employmentType: string | null
  validThrough: string | null
  industry: string | null
  region: string | null
}

export interface SearchPage {
  cards: JobCard[]
  totalHits: number | null
  numPages: number | null
}

function numericEntity(cp: number): string {
  return cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ""
}

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => numericEntity(parseInt(dec, 10)))
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, hex) => numericEntity(parseInt(hex, 16)))
    .replace(/&nbsp;/g, " ")
    // Last, so "&amp;lt;" decodes to the literal "&lt;" rather than "<".
    .replace(/&amp;/g, "&")
}

function clean(text: string): string {
  return decodeHtmlEntities(text.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim()
}

/** Turn description HTML into readable text, keeping paragraph and list breaks. */
export function htmlToText(html: string): string {
  const withBreaks = html
    .replace(/\s+/g, " ")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/(p|ul|ol|div|h\d)>/gi, "\n\n")
  return withBreaks
    .split("\n")
    .map((l) => (l.startsWith("- ") ? "- " + clean(l.slice(2)) : clean(l)))
    .filter((l) => l !== "-")
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/** Extract the `__INIT__ = {...}` app state embedded in a jobs.ch page. */
export function extractInitState(html: string): any | null {
  const marker = html.indexOf("__INIT__ = ")
  if (marker === -1) return null
  const start = html.indexOf("{", marker)
  if (start === -1) return null
  // Walk to the matching brace, respecting strings, so trailing script code
  // after the object does not break JSON.parse.
  let depth = 0
  let inString = false
  for (let i = start; i < html.length; i++) {
    const ch = html[i]
    if (inString) {
      if (ch === "\\") i++
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === "{") depth++
    else if (ch === "}") {
      depth--
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, i + 1))
        } catch {
          return null
        }
      }
    }
  }
  return null
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? clean(v) : null
}

function workload(grades: unknown): string | null {
  if (!Array.isArray(grades) || grades.length === 0) return null
  const [lo, hi] = [grades[0], grades[grades.length - 1]]
  if (typeof lo !== "number" || typeof hi !== "number") return null
  return lo === hi ? `${lo}%` : `${lo}-${hi}%`
}

/** Build one JobCard from a result object; returns null if it lacks an id or title. */
export function toJobCard(r: any): JobCard | null {
  if (!r || typeof r !== "object") return null
  const id = typeof r.id === "string" ? r.id : null
  const title = str(r.title)
  if (!id || !title) return null
  return {
    id,
    title,
    company: str(r.company?.name),
    location: str(r.place),
    date: typeof r.publicationDate === "string" ? r.publicationDate : null,
    url: `${BASE_URL}${DETAIL_PATH}${id}/`,
    workload: workload(r.employmentGrades),
    isNew: r.isNew === true,
  }
}

/**
 * Parse a search-results page. Each result is converted independently, so one
 * malformed entry cannot break the rest; duplicates (the same vacancy can be
 * listed twice when it is also promoted on the page) are dropped by id.
 */
export function parseSearchPage(html: string): SearchPage | null {
  const state = extractInitState(html)
  const main = state?.vacancy?.results?.main
  if (!main || !Array.isArray(main.results)) return null
  const seen = new Set<string>()
  const cards: JobCard[] = []
  for (const r of main.results) {
    const card = toJobCard(r)
    if (!card || seen.has(card.id)) continue
    seen.add(card.id)
    cards.push(card)
  }
  const meta = main.meta ?? {}
  return {
    cards,
    totalHits: typeof meta.totalHits === "number" ? meta.totalHits : null,
    numPages: typeof meta.numPages === "number" ? meta.numPages : null,
  }
}

/** Find the schema.org JobPosting object in the page's JSON-LD scripts. */
export function extractJobPosting(html: string): any | null {
  const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1])
      const items = Array.isArray(parsed) ? parsed : parsed?.["@graph"] ?? [parsed]
      for (const it of items) if (it?.["@type"] === "JobPosting") return it
    } catch {
      // skip a malformed block, keep looking
    }
  }
  return null
}

/** Parse a vacancy page. Returns null when the page carries no JobPosting. */
export function parseJobDetail(html: string, id: string): JobDetail | null {
  const jp = extractJobPosting(html)
  if (!jp) return null
  const addr = Array.isArray(jp.jobLocation) ? jp.jobLocation[0]?.address : jp.jobLocation?.address
  const locality = str(addr?.addressLocality) ?? str(addr?.addressRegion)
  const employment = Array.isArray(jp.employmentType) ? jp.employmentType.join(", ") : str(jp.employmentType)
  return {
    id,
    title: str(jp.title) ?? "(untitled)",
    company: str(jp.hiringOrganization?.name),
    location: locality,
    date: typeof jp.datePosted === "string" ? jp.datePosted : null,
    url: `${BASE_URL}${DETAIL_PATH}${id}/`,
    workload: str(jp.workHours),
    isNew: false,
    description: typeof jp.description === "string" ? htmlToText(jp.description) || null : null,
    employmentType: employment,
    validThrough: typeof jp.validThrough === "string" ? jp.validThrough : null,
    industry: str(jp.industry),
    region: str(addr?.addressRegion),
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const JOBSCH_HOST = /(^|\.)jobs\.ch$/i

/**
 * Accept a vacancy UUID or a jobs.ch vacancy URL (any language path:
 * /en/vacancies/detail/, /de/stellenangebote/detail/, /fr/offres-emplois/detail/).
 * URLs on any other host are rejected, read through real URL parsing so
 * look-alike hosts (jobs.ch.evil.io) fall on the reject side.
 */
export function normalizeId(input: string): string | null {
  const trimmed = input.trim()
  if (UUID.test(trimmed)) return trimmed.toLowerCase()
  const hasScheme = /^https?:\/\//i.test(trimmed)
  if (!hasScheme && !/^[a-z0-9.-]+\.[a-z]{2,}\//i.test(trimmed)) return null
  let parsed: URL
  try {
    parsed = new URL(hasScheme ? trimmed : `https://${trimmed}`)
  } catch {
    return null
  }
  if (!JOBSCH_HOST.test(parsed.hostname)) return null
  const m = parsed.pathname.match(/\/detail\/([0-9a-f-]{36})\/?$/i)
  return m && UUID.test(m[1]) ? m[1].toLowerCase() : null
}
