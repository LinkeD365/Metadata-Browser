# Implementation notes

For user-facing features and installation, see the [README](./README.md).

## Architecture

- `src/App.tsx` reads ToolBox connections, settings, and theme, then creates the view model and Dataverse service.
- `src/components/` contains Fluent UI and AG Grid views for table browsing, detail panes, comparisons, and exports.
- `src/model/` contains MobX metadata records and view-model state.
- `src/utils/dataverse.tsx` adapts the ToolBox Dataverse API to the metadata-browser features.
- `src/utils/connectionComparison.ts` merges corresponding metadata records across connections.
- `src/utils/mapWithConcurrency.ts` bounds parallel metadata lookups while preserving input order.
- `src/utils/excelExport.tsx` creates user-requested XLSX files. CSV exports use ToolBox's file-system API.

## Host APIs and manifest

The application uses `window.toolboxAPI` to retrieve the primary and optional secondary connection, read/write tool preferences, get the theme, show notifications, save CSV files, and open selected tables in the connection browser. Dataverse reads use `window.dataverseAPI.queryData` and `fetchXmlQuery`.

The package declares one required and up to two supported connections. The `minAPI` is set to `1.2.7`, the documented Desktop version introducing the `features.connections` declaration. The `main` entry is `index.html`, and the icon is the SVG at `public/metaDataBrowserLogo.svg`, copied to the distribution root by Vite.

There are no direct publisher-controlled network calls or declared CSP exceptions. Dataverse data remains in the host and tool unless a user explicitly exports it to a local file. Saved display/export preferences are stored through ToolBox settings.

## Safety and operation limits

The Dataverse service only issues metadata and record queries; this tool has no Dataverse create, update, or delete path. CSV/XLSX output is generated only following an export action. Console logging of connection objects and returned metadata/export payloads has been removed.

Solution component metadata and cross-connection table lookups use a concurrency limit of five requests. `dataverseAPI.queryData` and `fetchXmlQuery` return the result arrays exposed by the host API; this tool does not implement additional paging over those results. Large-environment behavior and host paging semantics must be confirmed in a real environment.

An Excel export failure is logged and shown as a notification, and the export drawer returns to an enabled state. Per-table metadata lookup failures during solution loading are logged and do not prevent successfully retrieved tables from being displayed.

## Build and package validation

```powershell
npm ci
npm run build
npm run validate
npm pack --dry-run
```

The package includes `dist`, `npm-shrinkwrap.json`, and this implementation document. The build emits a single IIFE bundle for the ToolBox host.

## Automated tests

Tests use Vitest in the Node environment. `tests/connectionComparison.test.ts` covers connection merge and row-class behavior. `tests/mapWithConcurrency.test.ts` covers bounded execution, result ordering, invalid limits, empty input, and failure propagation. `tests/dataverse.test.ts` covers metadata API mapping, connection selection, error behavior, and bounded solution requests. `tests/models.test.ts` covers model defaults. `tests/runExcelExport.test.ts` covers empty, successful, and failed export orchestration. `tests/excelExport.test.ts` checks workbook download behavior.

Run the full suite with:

```powershell
npm test
```

Run a focused suite with:

```powershell
npm test -- tests/dataverse.test.ts
```

The application UI and host lifecycle are not rendered with mocked ToolBox APIs in standalone tests. The automated suite therefore does not replace acceptance testing inside Power Platform ToolBox.

## Human verification still required

- Test with a real Dataverse environment, including expired connections, missing permissions, empty results, large solutions, and both light and dark themes.
- Confirm `queryData` paging behavior and the declared minimum host API version against the installed ToolBox release.
- Capture and add a genuine UI screenshot/GIF to the README from the running ToolBox tool before requesting Verified status. No synthetic screenshot is included.
- The latest full `npm audit` completed with zero vulnerabilities. Re-run it after dependency updates and before submission.
- Add the README AI-assistance disclosure if a substantial portion of the tool was AI-generated.

## Test organization

Test suites are kept in `tests/`, with shared service fixtures local to `dataverse.test.ts`. `npm test` runs every `*.test.ts` suite under that directory. No browser-rendered component suite is configured because the tool depends on its real ToolBox host environment.
