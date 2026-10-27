import { describe, expect, test } from "bun:test"
import { parseJSON, runCLI } from "./helpers.ts"

interface SearchOut {
  meta: { count: number; page: number }
  results: { id: string; title: string; url: string }[]
}

describe("live smoke test", () => {
  test("search returns real results", async () => {
    const out = parseJSON<SearchOut>(await runCLI(["search", "-q", "sales", "-l", "Zürich", "--limit", "5"]))
    expect(out.results.length).toBeGreaterThan(0)
    for (const r of out.results) {
      expect(r.id).toBeTruthy()
      expect(r.title).toBeTruthy()
      expect(r.url).toStartWith("https://www.jobs.ch/en/vacancies/detail/")
    }
  })
})

describe("argument errors", () => {
  test("unknown flag exits 1 with a JSON error on stderr", async () => {
    const r = await runCLI(["search", "-q", "sales", "--bogus", "1"])
    expect(r.exitCode).toBe(1)
    expect(r.stdout).toBe("")
    expect(JSON.parse(r.stderr).code).toBe("UNKNOWN_FLAG")
  })

  test("search without query or location exits 1", async () => {
    const r = await runCLI(["search"])
    expect(r.exitCode).toBe(1)
    expect(JSON.parse(r.stderr).code).toBe("NO_QUERY")
  })

  test("non-integer jobage exits 1", async () => {
    const r = await runCLI(["search", "-q", "sales", "--jobage", "0.5"])
    expect(r.exitCode).toBe(1)
    expect(JSON.parse(r.stderr).code).toBe("BAD_ARG")
  })

  test("detail without an id exits 1", async () => {
    const r = await runCLI(["detail"])
    expect(r.exitCode).toBe(1)
    expect(JSON.parse(r.stderr).code).toBe("NO_ID")
  })
})
