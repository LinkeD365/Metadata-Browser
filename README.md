# Metadata Browser

## Dataverse Metadata browser

This tool is a re-implementation of [Metadata Browser for XrmToolBox](https://github.com/MscrmTools/MsCrmTools.MetadataBrowser "Thanks Tanguy") with permission to use the same name.

## Features

- ✅ Ability to select from solution or all tables
- ✅ Select the details icon to create a new tab with tables details
- ✅ Select attributes you want to display
- ✅ Export to CSV
- ✅ Export to Excel
- ✅ Added Views, BPFs and Business Rules
- ✅ Search on Solutions and default sorting
- ✅ Compare metadata across up to four Dataverse environments

The solution picker and table list use the primary connection. Additional connections compare matching tables without adding tables or solutions to that selection.

## Latest
31/10/26 - Added bounded, paged solution metadata reads, tenant-data protection, and four-environment comparison using current connection settings. Solution selection and the table-list baseline come from the primary connection.
20/5/26 - Added open in links, Views, BPFs, Business Rules
20/1/26 - Added Export to Excel

## Implementation details

See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for the implementation plan, safety behavior, and test commands.

## Installation

1. Install the tool in ToolBox
2. Load and use the tool from the ToolBox interface

The tool should be intuitive, but documentation is here. 

Please create Issues and feature requests

## License

MIT
