import { TableMeta } from "../model/tableMeta";

export function addTableDetailTab(selectedTables: TableMeta[], table: TableMeta): TableMeta[] {
  if (selectedTables.some((selectedTable) => selectedTable.tableName === table.tableName)) {
    return selectedTables;
  }
  return [...selectedTables, table];
}

export function removeTableDetailTab(selectedTables: TableMeta[], tableName: string): TableMeta[] {
  return selectedTables.filter((selectedTable) => selectedTable.tableName !== tableName);
}
