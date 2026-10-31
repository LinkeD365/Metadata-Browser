# Implementation Notes

This document records the implementation details for Metadata Browser.
For usage instructions, see [README.md](./README.md).

## Implementation Details

- The manifest enables one to four PPTB connection slots. Dataverse requests use the injected API with numeric slot indices, preserving gaps in the connection list.
- The solution picker reads only connection slot 0. Both all-tables and solution-based selection use primary tables as the baseline; other slots contribute matching tables by logical name, never additional table-list rows. Comparison does not require the selected solution to exist in those environments.
- Metadata records are merged by their logical identifiers. Each merged row tracks per-environment presence, display names, and a source slot; grid columns use the configured environment names.
- Opening a table in the connection browser targets the slot from which that table's metadata originated.
- Solution components are read in 5,000-record pages using paging cookies when available. Simple paging is limited to 50,000 records, and requests fail rather than silently return an incomplete result if that limit is reached without a paging cookie. Paging is capped at 1,000 requests.
- Expanding a solution's tables uses at most five concurrent metadata requests. Individual table lookup failures are reported without exposing response bodies or identifiers in logs; the remaining successful results are returned in their original order.
- Exported CSV and Excel files are created only after the user initiates an export. Their contents are no longer copied to the developer console.
- The in-app event log remains available to the user, but its messages are no longer mirrored to the developer console.

## Tests

All automated tests live in `tests/`; shared test fixtures are kept alongside the focused suites rather than mixed into application code. The full command runs Vitest and type-checks the test sources:

```sh
npm test
```

Run focused tests for the service and multi-environment merge behavior:

```sh
npx vitest run tests/dataverse.test.ts tests/connectionComparison.test.ts tests/primaryTableSelection.test.ts
```

The suite covers service and utility behavior, four-slot connection merging and targeting, and model defaults. `primaryTableSelection.test.ts` covers primary-only selection, comparison filtering, solution membership, disconnected slots, and empty baselines. It does not emulate the PPTB host or replace real-environment acceptance checks; verify the UI, light/dark themes, permissions, and large-environment behavior inside PPTB.

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
```
