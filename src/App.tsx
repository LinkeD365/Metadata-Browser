import { useCallback, useEffect, useState } from "react";
import {
  useConnection,
  useEventLog,
  useToolboxEvents,
} from "./hooks/useToolboxAPI";
import { ViewModel } from "./model/ViewModel";
import { dvService } from "./utils/dataverse";
import { MetadataBrowser } from "./components/MetadataBrowser";

function App() {
  const { connection, isLoading, refreshConnection } = useConnection();
  const {  addLog  } = useEventLog();

  // Handle platform events
  const handleEvent = useCallback(
    (event: string, _data: any) => {
      switch (event) {
        case "connection:updated":
        case "connection:created":
          refreshConnection();
          break;

        case "connection:deleted":
          refreshConnection();
          break;

        case "terminal:output":
        case "terminal:command:completed":
        case "terminal:error":
          // Terminal events handled by dedicated components
          break;
      }
    },
    [refreshConnection]
  );

  useToolboxEvents(handleEvent);

  // Add initial log (run only once on mount)
  useEffect(() => {
    addLog("Metadata browser loaded", "success");
  }, [addLog]);

  const [viewModel] = useState(() => new ViewModel());
  const dvSvc = new dvService({
    connection: connection,
    dvApi: window.dataverseAPI,
    onLog: addLog,
  });
  return (
    <>
      <MetadataBrowser
        connection={connection}
        viewModel={viewModel}
        dvService={dvSvc}
        onLog={addLog}
        isLoading={isLoading}
      />
    </>
  );
}

export default App;
