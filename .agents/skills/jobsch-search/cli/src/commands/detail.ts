import { BASE_URL, DETAIL_PATH, normalizeId, pageFetch, parseJobDetail, writeError } from "../helpers.js"

export interface DetailOpts {
  id: string
  format: "json" | "plain"
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const id = normalizeId(opts.id)
  if (!id) {
    writeError(`Could not parse a jobs.ch vacancy id (UUID) from "${opts.id}"`, "BAD_ID")
    return 1
  }
  try {
    const res = await pageFetch(`${BASE_URL}${DETAIL_PATH}${id}/`)
    // Expired vacancies 404 or redirect away from the detail page.
    if (res.status !== 200) {
      writeError("Job not found (expired or removed)", "NOT_FOUND")
      return 1
    }
    const job = parseJobDetail(res.body, id)
    if (!job) {
      writeError("No JobPosting data found on the vacancy page (markup may have changed)", "PARSE_FAILED")
      return 1
    }

    if (opts.format === "plain") {
      const lines = [
        job.title,
        `${job.company || "—"} · ${job.location || "—"}`,
        "",
        job.employmentType ? `Employment: ${job.employmentType}` : "",
        job.workload ? `Workload: ${job.workload}` : "",
        job.industry ? `Industry: ${job.industry}` : "",
        job.date ? `Posted: ${job.date.slice(0, 10)}` : "",
        job.validThrough ? `Valid through: ${job.validThrough.slice(0, 10)}` : "",
        "",
        job.description || "(no description)",
        "",
        `URL: ${job.url}`,
      ].filter((l, i, a) => l !== "" || (i > 0 && a[i - 1] !== ""))
      process.stdout.write(lines.join("\n").replace(/\n{3,}/g, "\n\n") + "\n")
    } else {
      process.stdout.write(JSON.stringify(job, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}
