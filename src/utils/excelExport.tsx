import { TableMeta } from "../model/tableMeta";
import { ViewModel } from "../model/ViewModel";
import { dvService } from "./dataverse";
import ExcelJS from "exceljs";

interface ExcelExportProps {
  dvsvc: dvService;
  connection: ToolBoxAPI.DataverseConnection | null;
  vm: ViewModel;
}

export class ExcelExport {
  dvsvc: dvService;
  connection: ToolBoxAPI.DataverseConnection | null;
  vm: ViewModel;

  constructor(props: ExcelExportProps) {
    this.dvsvc = props.dvsvc;
    this.connection = props.connection;
    this.vm = props.vm;
  }

  async export(tables: TableMeta[]): Promise<void> {
    console.log("Beginning export of tables:", tables);
    for (const table of tables) {
      console.log(`Exporting table: ${table.displayName}`);

      const workbook = new ExcelJS.Workbook();

      if (this.vm.excelOptions.includeTableDetails) {
        this.addTableDetailsSheet(workbook, table);
      }

      if (this.vm.excelOptions.includeColumns) await this.addColumnsSheet(workbook, table);
      if (this.vm.excelOptions.includeKeys) await this.addKeysSheet(workbook, table);
      if (this.vm.excelOptions.includePrivileges) await this.addPrivilegesSheet(workbook, table);
      if (this.vm.excelOptions.includeRelationships) await this.addRelationshipsSheet(workbook, table);
      if (this.vm.excelOptions.includeSolutions) await this.addSolutionsSheet(workbook, table);

      const fileName = `${table.displayName}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      this.downloadBlob(blob, fileName);
    }
  }
  async addKeysSheet(workbook: ExcelJS.Workbook, table: TableMeta) {
    const sheet = workbook.addWorksheet("Keys");
    console.log("Adding keys for table:", table.keys.length);
    if (!table.keys || table.keys.length === 0) {
      console.log("No keys found, fetching from dvService...");
      await this.dvsvc.getKeysMeta(table).then((keys) => {
        table.keys = keys;
      });
    }
    if (table.keys.length === 0) {
      return;
    }
    sheet.addRow(["Key Name", ...table.keys[0].attributes.map((attr) => attr.attributeName)]);
    table.keys.forEach((key) => {
      const rowData = [key.keyName, ...key.attributes.map((attr) => attr.attributeValue)];
      sheet.addRow(rowData);
    });

    this.styleSheet(sheet);
  }

  private addTableDetailsSheet(workbook: ExcelJS.Workbook, table: TableMeta): void {
    const sheet = workbook.addWorksheet("Table Details");
    sheet.addRow(["Table Name", table.tableName]);
    sheet.addRow(["Display Name", table.displayName]);
    table.attributes.map((attr) => {
      sheet.addRow([attr.attributeName, attr.attributeValue]);
    });

    this.styleSheet(sheet);
  }

  private async addColumnsSheet(workbook: ExcelJS.Workbook, table: TableMeta): Promise<void> {
    const sheet = workbook.addWorksheet("Columns");
    console.log("Adding columns for table:", table.columns.length);
    if (!table.columns || table.columns.length === 0) {
      console.log("No columns found, fetching from dvService...");
      await this.dvsvc.getColumnsMeta(table.tableName).then((columns) => {
        table.columns = columns;
      });
    }
    console.log("Total columns to add:", table.columns.length);
    sheet.addRow(["Column Name", "Display Name", "Data Type", ...this.vm.columnAttributes.map((attr) => attr.name)]);
    table.columns.forEach((column) => {
      const rowData = [
        column.columnName,
        column.displayName,
        column.dataType,
        ...this.vm.columnAttributes.map(
          (attr) => column.attributes.find((a) => a.attributeName === attr.name)?.attributeValue || "",
        ),
      ];
      sheet.addRow(rowData);
    });

    this.styleSheet(sheet);
  }

  private async addPrivilegesSheet(workbook: ExcelJS.Workbook, table: TableMeta): Promise<void> {
    const sheet = workbook.addWorksheet("Privileges");
    console.log("Adding privileges for table:", table.privileges.length);
    if (!table.privileges || table.privileges.length === 0) {
      console.log("No privileges found, fetching from dvService...");
      await this.dvsvc.getPrivilegesMetadata(table).then((privileges) => {
        table.privileges = privileges;
      });
    }
    if (table.privileges.length === 0) {
      return;
    }
    sheet.addRow(["Privilege Name", ...table.privileges[0].attributes.map((attr) => attr.attributeName)]);
    table.privileges.forEach((privilege) => {
      const rowData = [privilege.privilegeName, ...privilege.attributes.map((attr) => attr.attributeValue)];
      sheet.addRow(rowData);
    });

    this.styleSheet(sheet);
  }

  private async addSolutionsSheet(workbook: ExcelJS.Workbook, table: TableMeta): Promise<void> {
    const sheet = workbook.addWorksheet("Solutions");
    console.log("Adding solutions for table:", table.solutions.length);
    if (!table.solutions || table.solutions.length === 0) {
      console.log("No solutions found, fetching from dvService...");
      await this.dvsvc.getSolutionsForTable(table).then((solutions) => {
        table.solutions = solutions;
      });
    }
    if (table.solutions.length === 0) {
      return;
    }
    sheet.addRow([
      "Solution Name",
      "Unique Name",
      "Solution Id",
      "Description",
      "Version",
      "Is Managed",
      "Sub Components",
    ]);
    table.solutions.forEach((solution) => {
      const rowData = [
        solution.solutionName,
        solution.uniqueName,
        solution.solutionId,
        solution.description,
        solution.version,
        solution.isManaged ? "Yes" : "No",
        solution.subcomponents ? "Yes" : "No",
      ];
      sheet.addRow(rowData);
    });

    this.styleSheet(sheet);
  }

  private async addRelationshipsSheet(workbook: ExcelJS.Workbook, table: TableMeta): Promise<void> {
    const relTypes = ["OneToManyRelationship", "ManyToOneRelationship", "ManyToManyRelationship"];
    for (const type of relTypes) {
      const sheet = workbook.addWorksheet(type);
      console.log("Adding relationships for table:", table.relationships.length);
      if (!table.relationships || table.relationships.filter((r) => r.type === type).length === 0) {
        console.log("No relationships found, fetching from dvService...");
        await this.dvsvc.getRelationshipsMeta(table, type).then((relationships) => {
          table.relationships.push(...relationships);
        });
      }
      if (table.relationships.filter((r) => r.type === type).length === 0) {
        return;
      }
      sheet.addRow([
        "Relationship Name",
        ...this.vm.relationshipAttributes.filter((r) => r.type === type).map((attr) => attr.attributeName),
      ]);
      table.relationships
        .filter((r) => r.type === type)
        .forEach((relationship) => {
          const rowData = [
            relationship.relationshipName,
            ...this.vm.relationshipAttributes
              .filter((r) => r.type === type)
              .map(
                (attr) =>
                  relationship.attributes.find((a) => a.attributeName === attr.attributeName)?.attributeValue || "",
              ),
          ];
          sheet.addRow(rowData);
        });

      this.styleSheet(sheet);
    }
  }
  // Stolen from @Power-Maverick
  private downloadBlob(blob: Blob, fileName: string): void {
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }
  private styleSheet(sheet: ExcelJS.Worksheet): void {
    this.styleHeaderRow(sheet.getRow(1));
    this.applyAlternatingRowFill(sheet, 1);
  }
  private styleHeaderRow(row: ExcelJS.Row): void {
    row.font = { bold: true, color: { argb: "FFFFFFFF" } };
    row.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0078D4" },
    };
    row.alignment = { vertical: "middle", horizontal: "left" };
    row.height = 20;
  }

  private applyAlternatingRowFill(worksheet: ExcelJS.Worksheet, headerRowIndex = 1): void {
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > headerRowIndex && rowNumber % 2 === 0) {
        row.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF3F4F6" },
        };
      }
    });
  }
}
