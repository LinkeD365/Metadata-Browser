import { useCallback, useEffect, useMemo, useState } from "react";
import { useConnection, useEventLog, useToolboxEvents } from "./hooks/useToolboxAPI";
import { ViewModel } from "./model/ViewModel";
import { dvService } from "./utils/dataverse";
import { MetadataBrowser } from "./components/MetadataBrowser";
import { FluentProvider, webDarkTheme, webLightTheme } from "@fluentui/react-components";

function App() {
  const { connection, isLoading, refreshConnection } = useConnection();
  const { addLog } = useEventLog();
  const [theme, setTheme] = useState<string>("light");

  // Handle platform events
  const handleEvent = useCallback(
    async (event: string, _data: any) => {
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
        case "theme:changed":
        case "settings:updated":
          console.log("Theme or settings updated, refreshing theme");
          const theme = await window.toolboxAPI.utils.getCurrentTheme();
          setTheme(theme);
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

  useEffect(() => {
    (async () => {
      const currentTheme = await window.toolboxAPI.utils.getCurrentTheme();
      setTheme(currentTheme);
    })();
  }, []);

  const [viewModel] = useState(() => new ViewModel());

  useEffect(() => {
    console.log("Loading default table columns from settings");
    (async () => {
      try {
        const savedColumns = await window.toolboxAPI.settings.getSetting("defaultTableColumns");
        if (savedColumns) {
          viewModel.tableAttributes = savedColumns.split(",").map((col: string) => col.trim());
        }
        const savedColAttribs = await window.toolboxAPI.settings.getSetting("defaultColumnAttributes");
        if (savedColAttribs) {
          viewModel.columnAttributes = savedColAttribs.split(",").map((col: string) => col.trim());
        }
      } catch (error) {
        console.error("Failed to load default settings:", error);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- viewModel is a stable reference that doesn't need to trigger re-runs
  }, []);
  const dvSvc = useMemo(
    () =>
      new dvService({
        connection: connection,
        dvApi: window.dataverseAPI,
        onLog: addLog,
      }),
    [connection, addLog]
  );
  return (
    <>
      <FluentProvider theme={theme === "dark" ? webDarkTheme : webLightTheme}>
        <MetadataBrowser
          connection={connection}
          viewModel={viewModel}
          dvService={dvSvc}
          onLog={addLog}
          isLoading={isLoading}
        />
      </FluentProvider>
    </>
  );
}

export default App;
