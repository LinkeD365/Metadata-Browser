# Manual Acceptance Tests

User guide: [README.md](./README.md). Technical checks: [IMPLEMENTATION.md](./IMPLEMENTATION.md).

**Status: pending human completion.** Run these tests in the real Power Platform ToolBox host, not a standalone browser or mocked-host preview. Use the final packaged build and authorized non-production environments with representative metadata. No checks below have been marked as completed by the AI assistant.

## Test record

- Package version / commit tested: 1.0.0
- PPTB version (minimum 1.2.7): 1.2.7
- Operating system: Windows 11
- Test date: 31/10/26
- Tester sign-off: Carl Cookson
- Environment aliases and connection slots : linked365dev

For each item, tick only after checking its expected result. Record failures and evidence below. Use **N/A with a reason**, not a tick, when a fixture cannot be provided; unresolved applicable tests block sign-off.

## Package, listing and permissions

- [x] **P01 - Final package:** Build and load the release package through PPTB's supported local-tool/package workflow. The tool opens, the database-and-magnifier icon appears, and the entry point loads without missing assets or CSP errors.
- [x] **P02 - README rendering:** View the README on GitHub, npm, and in PPTB where supported. The small title-line logo, screenshot, implementation link and manual-test link resolve.
- [x] **P03 - Compatibility gate:** Confirm the manifest declares `minAPI: 1.2.7`. On an older PPTB installation, if available, verify installation/opening is blocked or prompts an upgrade rather than running unsupported APIs.
- [x] **P04 - Provenance:** Retain written name-reuse permission and original-author contributor consent for intake review. Confirm independent reimplementation, original GPL-3.0 credit and this implementation's MIT notice accurately describe the source basis.
- [x] **P05 - Publication image:** Verify the screenshot is from the actual running tool and does not expose confidential tenant/user data. Refresh it if necessary after the UI changes.

## Connection and selection behavior

- [x] **C01 - One connection:** Connect only slot 0; load All Tables and a solution. Metadata matches the primary environment and there are no spurious comparison records.
- [x] **C02 - Two, three and four connections:** Repeat with each connection count. The primary solution and table list remain the baseline; secondary-only tables never appear in that list.
- [x] **C03 - Empty slots:** Leave slot 1 empty with slots 2 and/or 3 connected. Data and headers retain the correct slot mapping; queries and browser links are not shifted into another environment.
- [x] **C04 - Primary-only solution:** Select a solution that exists only in primary. Comparison still loads matching tables by logical name from the other environments.
- [x] **C05 - Empty baseline:** Select an empty solution or an environment with no matching tables. Show an understandable empty state without loading unrelated comparison-only tables.
- [x] **C06 - Connection replacement during a read:** Start a slow metadata load, then change/remove a connection. Old detail tabs and selections are cleared; results from the previous selection do not repopulate the current table list or get exported as current data.
- [x] **C07 - Connection failure and retry:** Disconnect/expire the primary connection. A visible notification/log entry explains the failure. Restore access and reload; loading indicators stop and the tool becomes usable.

## Every comparison grid

Repeat the next four checks for **Tables, Columns, Keys, Privileges, Solutions, Views, Business Process Flows, Business Rules**, and **Relationships in all three directions**.

- [x] **G01 - Headers and values:** Every environment display column uses the matching field-title prefix and connection name, e.g. `Table Name (Development)`. Primary and comparison values belong to their named environments; sort, filter and search remain usable.
- [x] **G02 - Presence:** Include a shared record, a primary-only record and (in detail grids) a comparison-only record. Missing environment cells stay blank, row highlighting remains legible and existing values are not attributed to the wrong environment.
- [x] **G03 - Different metadata IDs:** Use a custom table with the same logical name but different metadata IDs in the environments. Keys, privileges, all relationship directions and solution membership match each target environment, not the primary ID.
- [x] **G04 - Names and identifiers:** Include renamed display labels and different localized labels. Columns/keys merge by logical identifiers where supplied; independently inspect source attributes when display names alone are not unique.
- [x] **G05 - Relationship switching:** Open One To Many, Many To One and Many To Many in turn, then revisit each. Previously loaded relationship types remain available and each tab shows only its own type.
- [x] **G06 - Views and workflows:** Verify system and accessible personal views separately, and verify BPFs/business rules against their source environment. Restricted personal views are not claimed as visible.
- [x] **G07 - Maker navigation:** Open the table and each supported section. The correct environment's connection browser opens the correct table/section. An unavailable connection gives feedback rather than navigating under another account.

## Large volumes and error paths

- [x] **L01 - OData paging:** Use collections spanning more than one response page, including solutions, views/workflows and metadata where available. Compare complete counts and late-page records with a trusted source.
- [x] **L02 - FetchXML paging:** Test a solution with more than 5,000 components or membership rows where available. Confirm later pages appear, requests remain bounded and UI remains responsive.
- [x] **L03 - Paging limit:** If feasible in an authorized test harness/fixture, test repeated/invalid continuations and supported paging limits. A failure is visible rather than a success-shaped truncated result; no continuation is sent to another origin. Otherwise attach automated regression evidence and state why a live fixture is unavailable.
- [x] **L04 - Partial component failure:** Make one solution table inaccessible. The failure is visible in the event log, successful table reads remain ordered and the result is understood to be partial.
- [x] **L05 - Missing permissions:** Restrict access to each detail category in turn. A visible error identifies the category, loading stops, and reopening the tab after restoring permissions succeeds.
- [x] **L06 - Empty results:** Test tables with no keys, privileges, views, BPFs, business rules or relationship types. Empty states are distinct from request failures and controls remain usable.
- [x] **L07 - Timeout/rate limit:** Exercise a transient timeout or throttling response. No unbounded retry loop occurs; failure is reported and the user can retry deliberately.

## Exports and local preferences

- [x] **E01 - CSV selections:** Export the table list, details, selected columns, selected relationships, solutions and privileges. File rows/headers match the current selection and selected attributes.
- [x] **E02 - CSV text safety:** Include commas, quotes, line breaks and formula-like text (`=`, `+`, `-`, `@`) in authorized fixture labels/descriptions. Open in a spreadsheet and a text editor; fields remain aligned and formula-like values are text, not executed formulas.
- [x] **E03 - CSV cancel/failure:** Cancel the save dialog and simulate an unwritable destination. Cancellation is not reported as success; write failure produces a notification/log entry and permits retry.
- [x] **E04 - Excel options:** Exercise every workbook option and multiple selected tables. Open the resulting workbooks in Excel and verify worksheet names, headers, cell values and formatting.
- [x] **E05 - Primary-only Excel:** Load comparison grids before exporting, including comparison-only detail records. Excel contains freshly read primary metadata, not mixed comparison caches. Compare exports with and without previously opening those grids.
- [x] **E06 - Empty relationship directions:** Export all relationship directions where the first direction is empty but a later one has records. Later worksheets are still populated.
- [x] **E07 - Excel failure/partial completion:** Fail a read or download midway through a multiple-table export. Controls become enabled, the drawer stays available, and the message warns that earlier files may exist. Check those files before retrying.
- [x] **E08 - Explicit writes only:** Loading/searching/changing tabs creates no exports and performs no Dataverse writes. Only explicit export/default actions write files/preferences.
- [x] **E09 - Defaults:** Save table columns, column/relationship/view/BPF/business-rule attributes and Excel defaults. Reopen the tool; saved preferences apply. Changing and re-saving defaults replaces them.
- [x] **E10 - Preference failure:** In an authorized local test profile, provide invalid saved JSON or simulate a settings failure. A notification/log entry appears and preferences can be reviewed and corrected without exposing settings contents.

## Theme, accessibility and privacy

- [x] **U01 - Both themes:** Run all major screens in light and dark themes, including drawers, dropdowns, comparison highlights, empty states, notifications and event log. Text/icons stay legible.
- [x] **U02 - Live theme switching:** Change PPTB theme while the tool is open. Fluent controls, AG Grid and portals update without broken layout.
- [x] **U03 - Keyboard/layout:** Navigate selection, search, menus, drawers, exports and tabs using the keyboard. Focus and accessible labels remain useful at common window sizes and display scaling.
- [x] **U04 - Event log:** Confirm success/warning/error entries appear, only the latest 50 are retained and Clear works. Request response bodies, export contents and tokens do not appear in console output or notifications.
- [x] **U05 - Network:** Inspect Tool DevTools while loading/exporting. Reads stay within host-authenticated Dataverse APIs; there is no publisher telemetry or upload. Maker navigation goes only to the expected Microsoft portal.
- [x] **U06 - CSP:** With PPTB's normal CSP unchanged, verify Excel creation/download works without `eval`/dynamic-code permission or additional network exceptions.

## Release sign-off

- [x] **R01 - Automated gates:** Record passing `npm test`, build, manifest validation and package checks for this exact version. Review the current audit; no Critical/High findings may remain.
- [x] **R02 - Moderate dependency review:** Review the residual ExcelJS dependency advisories documented in the implementation notes, confirm the export-only browser paths remain unchanged, and record the human risk decision. Do not describe the audit as vulnerability-free.
- [x] **R03 - Human release approval:** Complete applicable tests, resolve failures, retain evidence and personally review the release PR/npm publish approval and marketplace submission. No automated marketplace submission.

## Results and exceptions

| Test ID | Result (Pass / Fail / N/A) | Evidence location | Notes / issue / follow-up |
|---------|---------------------------|-------------------|---------------------------|
|         |                           |                   |                           |

Do not commit credentials, personal data, private environment URLs or sensitive screenshots. Store detailed evidence privately and use aliases in this file.
