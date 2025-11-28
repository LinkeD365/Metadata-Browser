import React from "react";
import { observer } from "mobx-react";
import { ViewModel } from "../model/ViewModel";
import { dvService } from "../utils/dataverse";
import { TableMeta } from "../model/tableMeta";

interface TableColumnsProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvService: dvService;
  isLoading: boolean;
  viewModel: ViewModel;
  table: string;
  onLog: (
    message: string,
    type?: "info" | "success" | "warning" | "error"
  ) => void;
  showNotification: (
    title: string,
    message: string,
    type: "info" | "success" | "warning" | "error"
  ) => void;
}

export const TableColumns = observer(
  (props: TableColumnsProps): React.JSX.Element => {
    const { connection, dvService, onLog, viewModel, table, showNotification } =
      props;

    const [selectedTable] = React.useState<TableMeta>(
      viewModel.tableMetadata.filter((t) => t.tableName === table)[0]
    );
    const [loadingMeta, setLoadingMeta] = React.useState(false);

    async function getFieldsMeta() {
      if (!connection) {
        await showNotification(
          "No Connection",
          "Please connect to a Dataverse environment",
          "warning"
        );
        return;
      }
      try {
        setLoadingMeta(true);
        await dvService.getFieldsMeta(table).then((fields) => {
          selectedTable.fields = fields;
          onLog(
            `Loaded ${fields.length} columns for table: ${table}`,
            "success"
          );
        }).catch((error: { message: any }) => {
          throw new Error(error.message);
        });
      } catch (error) {
        const errorMsg = `Error loading columns for table ${table}: ${
          (error as Error).message
        }`;
        onLog(errorMsg, "error");
        await showNotification("Error", errorMsg, "error");
      } finally {
        setLoadingMeta(false);
      }
    }

    React.useEffect(() => {
      onLog(`Loading columns for table: ${table}`, "info");

      if (selectedTable && selectedTable.fields?.length === 0) {
        getFieldsMeta();
      }
    }, [selectedTable, table]);

    return (
      <>
        {loadingMeta ? (
          "Loading..."
        ) : (
          <>
            {table} {selectedTable.fields.length}
          </>
        )}
      </>
    );
  }
);
