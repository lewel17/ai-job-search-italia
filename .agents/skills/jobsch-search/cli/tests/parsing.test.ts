import { describe, expect, test } from "bun:test"
import { extractInitState, normalizeId, parseJobDetail, parseSearchPage } from "../src/helpers.ts"

const ID = "217947a9-55cf-4eea-956b-0ba024a39313"

function searchPage(results: unknown[]): string {
  const state = { vacancy: { results: { main: { results, meta: { totalHits: results.length, numPages: 1 } } } } }
  return `<html><script>window.X = {"a":1};
      __INIT__ = ${JSON.stringify(state)};
      window.after = "}";</script></html>`
}

describe("parseSearchPage", () => {
  test("maps results, decodes entities and drops duplicate ids", () => {
    const r = {
      id: ID,
      title: "Director, Sales",
      company: { name: "Energy Vault SA" },
      place: "EMEA &gt; CHE &gt; Stabio",
      publicationDate: "2026-09-29T04:33:00+02:00",
      employmentGrades: [80, 100],
      isNew: true,
    }
    const page = parseSearchPage(searchPage([r, r, { id: "broken" }, null]))!
    expect(page.totalHits).toBe(4)
    expect(page.cards).toHaveLength(1)
    expect(page.cards[0]).toEqual({
      id: ID,
      title: "Director, Sales",
      company: "Energy Vault SA",
      location: "EMEA > CHE > Stabio",
      date: "2026-09-29T04:33:00+02:00",
      url: `https://www.jobs.ch/en/vacancies/detail/${ID}/`,
      workload: "80-100%",
      isNew: true,
    })
  })

  test("returns null when the page has no app state", () => {
    expect(parseSearchPage("<html></html>")).toBeNull()
    expect(extractInitState("__INIT__ = {broken")).toBeNull()
  })
})

describe("parseJobDetail", () => {
  test("reads the JSON-LD JobPosting and keeps list breaks", () => {
    const jp = {
      "@type": "JobPosting",
      title: "Key Account Manager",
      description: "<p>Intro &amp; more.</p><h2>Tasks</h2><ul><li>Close deals</li><li>Grow accounts</li></ul>",
      datePosted: "2026-10-26",
      employmentType: "Permanent position",
      hiringOrganization: { name: "Diamond SA" },
      jobLocation: { address: { addressRegion: "Losone" } },
    }
    const html = `<script type="application/ld+json">{bad json</script><script type="application/ld+json">${JSON.stringify(jp)}</script>`
    const job = parseJobDetail(html, ID)!
    expect(job.company).toBe("Diamond SA")
    expect(job.location).toBe("Losone")
    expect(job.description).toBe("Intro & more.\n\nTasks\n\n- Close deals\n- Grow accounts")
  })

  test("returns null without a JobPosting", () => {
    expect(parseJobDetail("<html></html>", ID)).toBeNull()
  })
})

describe("normalizeId", () => {
  test("accepts UUIDs and jobs.ch URLs in any language path", () => {
    expect(normalizeId(ID)).toBe(ID)
    expect(normalizeId(`https://www.jobs.ch/en/vacancies/detail/${ID}/`)).toBe(ID)
    expect(normalizeId(`www.jobs.ch/de/stellenangebote/detail/${ID}/`)).toBe(ID)
  })
  test("rejects other hosts and non-ids", () => {
    expect(normalizeId(`https://www.jobs.ch.evil.io/en/vacancies/detail/${ID}/`)).toBeNull()
    expect(normalizeId(`https://boards.greenhouse.io/x/detail/${ID}/`)).toBeNull()
    expect(normalizeId("12345")).toBeNull()
  })
})
