# jobs.ch URL reference

Investigated 2026-10-26.

## robots.txt (relevant lines)

- Allowed: `/en/vacancies/?...` (search) and `/en/vacancies/detail/<uuid>/` (one path segment after `detail/`).
- Disallowed: `/api/`, `/api_proxy/`, `/en/vacancies/detail/*/*/*` (deeper paths), `/*?*feat=`, `/en/application/*`, the login and register paths.

The CLI uses only the two allowed page types, with the UA `Mozilla/5.0 (compatible; jobsch-cli/1.0)`, which jobs.ch serves normally (HTTP 200).

## Search

`GET https://www.jobs.ch/en/vacancies/?term=<kw>&location=<place>&publication-date=<days>&page=<n>`

| Param | Meaning |
|-------|---------|
| `term` | Keywords. Search is semantic (`searchVersion: "semantic"`). |
| `location` | City or canton name: `Lugano`, `Ticino`, `Zürich`. |
| `publication-date` | Published within N days. Any integer is accepted (tested 1, 3, 5, 7, 14, 30). |
| `page` | 1-indexed, 20 rows per page (`meta.baseOptions.rows`). |

A `page` past `numPages` answers **301** to the page-less URL. The CLI does not follow redirects and reports an empty page.

### Response structure

The HTML embeds the app state in an inline script: `__INIT__ = {...};` followed by more script code. The CLI brace-matches the object.

- `vacancy.results.main.meta`: `{ numPages, totalHits, searchHash, baseOptions: { rows } }`
- `vacancy.results.main.results[]` fields:
  - `id` (UUID), `title`;
  - `company.name`, `place` (free text, may contain HTML entities such as `&gt;`);
  - `publicationDate`, `initialPublicationDate` (ISO);
  - `employmentGrades` ([min, max] %), `employmentTypeIds`, `isNew`, `isPaid`, `relativeDate`.
- `vacancy.query`: the parsed query echoed back, e.g. `term`, `locations[]`, `publicationDate`.

## Detail

`GET https://www.jobs.ch/en/vacancies/detail/<uuid>/`

The page holds a JSON-LD `<script type="application/ld+json">` with `@type: JobPosting`. Its fields:

- `title`;
- `description` (HTML);
- `datePosted`, `validThrough`;
- `employmentType`, `workHours`, `industry`;
- `hiringOrganization.name`;
- `jobLocation.address.{addressRegion, postalCode, addressCountry}` (the city is in `addressRegion`);
- `baseSalary`, `skills`.

`__INIT__.vacancyDetail.selected` holds only the id, so JSON-LD is the source for detail.

Language variants of the same page: `/de/stellenangebote/detail/<uuid>/` and `/fr/offres-emplois/detail/<uuid>/`.
