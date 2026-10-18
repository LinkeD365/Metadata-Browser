# Metadata Browser

## Dataverse Metadata browser

## Credits and permission

This tool is an independent implementation, with @MscrmTools [Metadata Browser for XrmToolBox](https://github.com/MscrmTools/MsCrmTools.MetadataBrowser) serving as inspiration. No source code was copied or adapted from that project. The original XrmToolBox tool is licensed under [GPL-3.0](https://github.com/MscrmTools/MsCrmTools.MetadataBrowser/blob/master/LICENSE); that license applies to the original project, not this independent implementation.

The publisher has permission to use the name "Metadata Browser" for this tool.

Compared with its inspiration, this PPTB implementation adds side-by-side comparison of two Dataverse connections, direct links to the Power Apps connection browser, and configurable CSV/XLSX exports of metadata.

## Features

- Browse Dataverse tables from all tables or a selected solution.
- Compare table metadata across the active and secondary Dataverse connections.
- Inspect table columns, keys, privileges, relationships, solutions, views, business process flows, and business rules.
- Choose metadata columns to display and export selected metadata to CSV or Excel.
- Search and sort solutions, and open a table in the Power Apps connection browser through a deliberate user action.

The tool reads Dataverse metadata and does not modify Dataverse data or schema. Exports save metadata to files only when requested. Saved column and export preferences are stored in ToolBox settings.

## Latest
20/5/26 - Added open in links, Views, BPFs, Business Rules
20/1/26 - Added Export to Excel
18/10/26
- Clarified independent implementation, credits, and name permission; documented connection comparison, exports, and read-only behavior.
- Added bounded metadata lookups, export error notifications, automated tests, and implementation notes.

## Installation and use

1. Install the tool in ToolBox and connect to at least one Dataverse environment. A second connection is optional.
2. Load tables from all tables or choose a solution.
3. Select a table to inspect its metadata. With two connections, the comparison view indicates metadata found in only one environment.
4. Choose metadata columns, then export selected metadata to local CSV or Excel files when needed.

See [implementation and testing details](./IMPLEMENTATION.MD) for API, build, and test information.

## License

MIT
