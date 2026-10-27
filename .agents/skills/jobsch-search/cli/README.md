# jobsch-cli

Search jobs.ch (Switzerland) from the command line. It has zero runtime dependencies: `bun install` only pulls TypeScript types for `typecheck`.

```bash
bun run src/cli.ts search -q "sales" -l "Ticino" --jobage 7 --format table
bun run src/cli.ts detail <uuid> --format plain
bun run test        # parsing tests plus a live smoke test
bun run typecheck
```

How it works:

- Search results come from the `__INIT__` app state embedded in the public search page.
- Vacancy details come from the page's JSON-LD `JobPosting`.

See `../url-reference.md` for the endpoints and the fields each one exposes.
