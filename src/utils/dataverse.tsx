import { FieldMeta } from "../model/fieldMeta";
import { TableMeta } from "../model/tableMeta";

interface dvServiceProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvApi: DataverseAPI.API;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}
export class dvService {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvApi: DataverseAPI.API;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;

  constructor(props: dvServiceProps) {
    this.connection = props.connection;
    this.dvApi = props.dvApi;
    this.onLog = props.onLog;
  }

  /// Get metadata for all tables
  /// @returns Promise<TableMeta[]> - A promise that resolves to an array of TableMeta
  /// @todo : Need to swap back to toolbox code when fixed
  async getAllTables(): Promise<TableMeta[]> {
    this.onLog("Fetching table metadata...", "info");
    if (!this.connection || !this.connection.isActive) {
      throw new Error("No connection available");
    }
    //const tables = await this.dvApi.getAllEntitiesMetadata();
    const tables = await this.dvApi.queryData("EntityDefinitions");
    //console.log("Tables fetched: ", tables.value);
    const tableMetaList: TableMeta[] = (tables.value as any[]).map((table: any) => {
      //console.log("Table fetched: ", table);
      const tableMeta = new TableMeta();
      tableMeta.tableName = String(table.LogicalName);
      tableMeta.displayName = table.DisplayName?.LocalizedLabels?.[0]?.Label || table.LogicalName;
      tableMeta.attributes = [];
      Object.keys(table).forEach((prop) => {
        const value = table[prop];
        if (typeof value === "function") return;
        try {
          tableMeta.attributes.push({
            attributeName: prop,
            attributeValue: typeof value === "string" ? value : JSON.stringify(value),
          });
        } catch {
          tableMeta.attributes.push({
            attributeName: prop,
            attributeValue: String(value),
          });
        }
      });
      return tableMeta;
    });
    return tableMetaList;
  }

  // Get fields metadata for a specific table
  // @todo: Need to swap back to toolbox code when fixed
  // @param table - The logical name of the table
  // @returns Promise<FieldMeta[]> - A promise that resolves to an array of FieldMeta
  async getFieldsMeta(table: string): Promise<FieldMeta[]> {
    this.onLog(`Fetching field metadata for table: ${table}`, "info");
    if (!this.connection || !this.connection.isActive) {
      throw new Error("No connection available");
    }
    try {
      //const meta = await this.dvApi.getEntityMetadata(table, true);
      const meta = await this.dvApi.queryData(`EntityDefinitions(LogicalName='${table}')/Attributes`);

      console.log("Attributes fetched: ", meta.value);

      const fieldMetaList: FieldMeta[] = (meta.value as any[]).map((attr: any) => {
        //   console.log("Attribute fetched: ", attr);
        const fieldMeta = new FieldMeta();
        fieldMeta.fieldName = attr.LogicalName;
        fieldMeta.displayName = attr.DisplayName?.LocalizedLabels?.[0]?.Label || attr.LogicalName;
        fieldMeta.dataType = attr.AttributeType || "";
        fieldMeta.attributes = [];
        Object.keys(attr).forEach((prop) => {
          const value = attr[prop];
          if (typeof value === "function") return;
          try {
            fieldMeta.attributes.push({
              attributeName: prop,
              attributeValue: typeof value === "string" ? value : JSON.stringify(value),
            });
          } catch {
            fieldMeta.attributes.push({
              attributeName: prop,
              attributeValue: String(value),
            });
          }
        });
        //console.log("FieldMeta created: ", fieldMeta);
        return fieldMeta;
      });
      return fieldMetaList;
    } catch (error) {
      this.onLog(`Error fetching field metadata for table ${table}: ${(error as Error).message}`, "error");
      throw error;
    }
  }
}
