import { TableMeta } from "../model/tableMeta";

export async function runExcelExport(
  tables: TableMeta[] | undefined,
  exportTables: (tables: TableMeta[]) => Promise<void>,
  onFailure: (error: unknown) => void | Promise<void>,
): Promise<boolean> {
  if (!tables?.length) {
    return false;
  }

  try {
    await exportTables(tables);
    return true;
  } catch (error) {
    await onFailure(error);
    return false;
  }
}
