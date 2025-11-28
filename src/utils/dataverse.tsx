import { FieldMeta } from "../model/fieldMeta";
import { TableMeta } from "../model/tableMeta";

interface dvServiceProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvApi: DataverseAPI.API;
  onLog: (
    message: string,
    type?: "info" | "success" | "warning" | "error"
  ) => void;
}
export class dvService {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvApi: DataverseAPI.API;
  onLog: (
    message: string,
    type?: "info" | "success" | "warning" | "error"
  ) => void;

  constructor(props: dvServiceProps) {
    this.connection = props.connection;
    this.dvApi = props.dvApi;
    this.onLog = props.onLog;
  }

  async getAllTables(): Promise<TableMeta[]> {
    this.onLog("Fetching table metadata...", "info");
    if (!this.connection || !this.connection.isActive) {
      throw new Error("No connection available");
    }
    const tables = await this.dvApi.getAllEntitiesMetadata();

    const tableMetaList: TableMeta[] = tables.value.map((table) => {
      console.log("Table fetched: ", table);
      const tableMeta = new TableMeta();
      tableMeta.tableName = table.LogicalName;
      tableMeta.displayName =
        table.DisplayName?.LocalizedLabels?.[0]?.Label || table.LogicalName;
      return tableMeta;
    });
    return tableMetaList;
  }
  async getFieldsMeta(table: string): Promise<FieldMeta[]> {
    this.onLog(`Fetching field metadata for table: ${table}`, "info");
    if (!this.connection || !this.connection.isActive) {
      throw new Error("No connection available");
    }
    try {
      const meta = await this.dvApi.getEntityMetadata(table, true);
      const attributes = meta?.Attributes || [];
      console.log("Attributes fetched: ", attributes);
      const fieldMetaList: FieldMeta[] = (attributes as any[]).map(
        (attr: any) => {
          console.log("Attribute fetched: ", attr);
          const fieldMeta = new FieldMeta();
          fieldMeta.fieldName = attr.LogicalName;
          fieldMeta.displayName =
            attr.DisplayName?.LocalizedLabels?.[0]?.Label || attr.LogicalName;

          return fieldMeta;
        }
      );
      return fieldMetaList;
    } catch (error) {
      this.onLog(
        `Error fetching field metadata for table ${table}: ${
          (error as Error).message
        }`,
        "error"
      );
      throw error;
    }
  }
}
