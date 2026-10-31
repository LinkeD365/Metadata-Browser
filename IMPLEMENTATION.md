# Implementation Notes

This document records the implementation details for Metadata Browser.
For usage instructions, see [README.md](./README.md).

## Implementation Details

- The tool icon is `public/metadataBrowserLogo.svg`. Vite copies it to the root of `dist/`, which is included in the npm package; the manifest's `icon` names that built asset.
- The manifest enables one to four PPTB connection slots. Dataverse requests use the injected API with numeric slot indices, preserving gaps in the connection list.
- The solution picker reads only connection slot 0. Both all-tables and solution-based selection use primary tables as the baseline; other slots contribute matching tables by logical name, never additional table-list rows. Comparison does not require the selected solution to exist in those environments.
- Metadata records are merged by their logical identifiers. Each merged row tracks per-environment presence, display names, and a source slot. All nine comparison grids use `Field Title (Connection Name)` headers for primary and comparison columns via the shared connection comparison helpers. Missing or unnamed connections retain an `Environment N` fallback inside the parentheses.
- Opening a table in the connection browser targets the slot from which that table's metadata originated.
- Keys, privileges and relationship reads address tables by logical name in each target environment. Table solution membership resolves that environment's metadata ID before issuing FetchXML, so independently created tables with different IDs can be compared.
- All OData collections follow `@odata.nextLink` with a maximum of 1,000 pages. Continuations must stay within the connected environment's `/api/data/v9.2/` API; cycles, malformed continuations and exhausted limits fail explicitly. Views' system and personal queries are paged independently.
- Solution components are read in 5,000-record pages using paging cookies when available. Simple paging is limited to 50,000 records, and requests fail rather than silently return an incomplete result if that limit is reached without a paging cookie. Paging is capped at 1,000 requests.
- Expanding a solution's tables uses at most five concurrent metadata requests. Individual table lookup failures are reported without exposing response bodies or identifiers in logs; the remaining successful results are returned in their original order.
- Exported CSV and Excel files are created only after the user initiates an export. Their contents are no longer copied to the developer console.
- The in-app event log remains available to the user, but its messages are no longer mirrored to the developer console.
- `runReportedOperation` restores busy state in `finally` and reports category-specific failures without response bodies. Detail loads are committed only after all target requests succeed; reopen the affected tab to retry after fixing access. Table-list requests invalidate stale results when a newer selection or component unmount occurs.
- Connection changes clear selected tables and detail tabs. Host event subscriptions are removed during cleanup. Initial theme/settings/connection failures are reported; Fluent portals retain theme tokens without inheriting root layout styles.
- CSV exports use a shared serializer for quoted fields, embedded quotes/newlines and spreadsheet formula-like text. Save results distinguish cancellation, success and failure. Excel exports fetch primary-only metadata into separate working records rather than reusing/mutating comparison caches; each selected table produces one workbook. An empty relationship direction does not skip later directions.
- The package explicitly includes both README image sources and the separate manual acceptance checklist so distributed documentation links remain valid.

## Tests

All automated tests live in `tests/`; shared test fixtures are kept alongside the focused suites rather than mixed into application code. The full command runs Vitest and type-checks the test sources:

```sh
npm test
```

Run focused tests for the service and multi-environment merge behavior:

```sh
npx vitest run tests/dataverse.test.ts tests/connectionComparison.test.ts tests/primaryTableSelection.test.ts
```

Run focused intake regressions:

```sh
npx vitest run tests/odataPagination.test.ts tests/dataverseCollections.test.ts tests/operationRecovery.test.ts tests/csvExport.test.ts tests/excelExport.test.ts
```

The focused suites cover same-origin continuation paging/cycles/limits, every collection reader, cross-environment table resolution, error cleanup/retry, CSV serialization/save results and Excel workbook generation. `settings.test.ts` verifies saved preference shapes and rejects malformed JSON/values. Shared operational helpers are in `src/utils/async.ts`; test-specific fixtures remain local to their suites.

The suite covers service and utility behavior, four-slot connection merging and targeting, and model defaults. `connectionComparison.test.ts` also verifies field-title prefixes with parenthesized environment names for every grid's field label, primary and comparison headers, and numbered fallbacks for unnamed or missing connections. `primaryTableSelection.test.ts` covers primary-only selection, comparison filtering, solution membership, disconnected slots, and empty baselines. It does not emulate the PPTB host or replace real-environment acceptance checks; verify the UI, light/dark themes, permissions, and large-environment behavior inside PPTB.

## Implementation Plan

1. Use the current PPTB connection settings and obtain all configured connection slots.
2. Load solution choices and table selections from primary, with bounded and paged reads; load matching tables from comparison slots.
3. Merge records while retaining each environment's display value and source slot.
4. Expose environment-specific columns and route browser links to the originating slot.
5. Verify the service, merge behavior, production build, and PPTB manifest locally; complete live acceptance checks inside PPTB.

## Validation Commands

```sh
npm run build
npm run validate
npm test
npm audit --audit-level=high
npm pack --dry-run
npm run verify-package
```

`verify-package` checks the final npm dry-run inventory, synchronized versions, HTML/IIFE entry point, built icon, all local README links, the manual checklist and absence of direct `eval` calls in the bundle. Run it after building; both CI and release publishing enforce it.

## Dependency and CSP Review

ExcelJS is updated to the supported 4.4 release. Vite resolves it to the bare browser bundle rather than the legacy-polyfilled bundle that generated an `eval` warning. The tool is hosted in modern Electron and does not require those legacy polyfills or relaxed CSP.

The 31/10/26 audit after the update reports **9 moderate, 0 high and 0 critical** findings. These are not claimed to be resolved:

- [minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249): glob-pattern amplification, propagated through Node-side archiver/glob/rimraf/readdir-glob dependencies. The tool uses ExcelJS's browser document workbook and does not import its streaming archive writer, traverse input folders or accept glob patterns.
- [uuid advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq): bounds checks for v3/v5/v6 when callers provide a buffer. ExcelJS calls v4 with no supplied buffer for conditional-format IDs; this tool does not invoke those vulnerable APIs.

No forced downgrade or cross-major transitive overrides are used; overriding installed dependencies would also not repair code embedded in ExcelJS's prebuilt browser bundle. Re-run audit for each release, review updated advisories and the actual reachable paths, and record the publisher's risk decision in [MANUAL_TESTS.md](./MANUAL_TESTS.md). Critical/High findings block CI and publishing. The remaining bundle-size warning is expected for PPTB's single-IIFE output, not suppressed.

## Human Acceptance

[MANUAL_TESTS.md](./MANUAL_TESTS.md) is the separate human-review checklist linked from the README. All live acceptance checks start pending. It covers package/docs, one-to-four connections with gaps, all comparison grids, differing metadata IDs, paging/error paths, CSV/Excel/defaults, theme/accessibility/privacy and release sign-off. Run it inside PPTB against authorized realistic environments; automated tests do not render a mocked host or establish human acceptance.

## CI and Releases

The workflows follow BulkDataStudio's Release Please and npm trusted-publishing pattern, targeting this repository's `master` branch.

- `.github/workflows/ci.yml` runs on pull requests and pushes to `master`, and can be started manually. It installs from `npm-shrinkwrap.json` with `npm ci`, runs the automated tests and their type check, and builds using Node.js 24.
- `.github/workflows/release.yml` runs on pushes to `master` or manual dispatch from `master`. Release Please creates or updates a release pull request from Conventional Commits such as `fix:` and `feat:`. Review and merge that PR to create the GitHub release and trigger publishing.
- `release-please-config.json` uses the Node release strategy, keeping the package and shrinkwrap versions in sync and generating `CHANGELOG.md`. Tags remain plain versions such as `0.7.1`, matching existing releases. The bootstrap commit and `.release-please-manifest.json` start release tracking after the existing `0.7.0` release.
- Both workflows run tests, local manifest validation, a Critical/High audit gate and the build. Publishing checks out the generated release tag, then publishes `@linked365/pptb-metadata-browser` publicly with provenance. Other pushes do not publish or directly bump versions. Release runs are serialized. Complete the manual checklist and use the `npm` environment's human approval rules before approving a release.

Before the first automated release, configure:

1. GitHub Actions repository settings to allow workflows to create and approve pull requests.
2. A GitHub environment named `npm`, with any required approval rules.
3. An npm trusted publisher for `@linked365/pptb-metadata-browser`: GitHub owner `LinkeD365`, repository `Metadata-Browser`, workflow filename `release.yml`, and environment `npm`.

No npm token is required; the publishing job uses GitHub OIDC (`id-token: write`). Release Please uses the repository's `GITHUB_TOKEN`. Pull requests created with that token do not automatically trigger other workflows, so manually dispatch CI to verify the release PR branch before merging if required by branch protection.

Workflow execution, release PR creation, and npm authentication must be verified on GitHub after these settings are configured. Local validation does not publish a package.
