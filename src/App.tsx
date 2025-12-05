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
        case "theme:changed":
          console.log("Theme changed to:", _data.data.theme);
          setTheme(_data.data.theme);
          break;
      }
    },
    [refreshConnection]
  );

  window.toolboxAPI.events.on(async (event: unknown, payload: any) => {
    console.log("Event:", payload?.event, "Data:", payload?.data);
    console.log("Event", event);
    switch (payload?.event) {
      case "connection:updated":
        refreshConnection();
        break;
      // case 'connection:activated':
      //   handleConnectionActivated(payload.data);
      //   break;
      case "theme:changed":
      case "settings:updated":
        if (payload?.data && typeof payload.data.theme === "string") {
          const theme = await window.toolboxAPI.utils.getCurrentTheme();
          setTheme(theme);
        }
        break;
    }
  });

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
    if (viewModel) {
      window.toolboxAPI.settings.getSetting("defaultTableColumns").then((savedColumns: string | null) => {
        if (savedColumns) {
          viewModel.tableAttributes = savedColumns.split(",").map((col) => col.trim());
        }
      });
      window.toolboxAPI.settings.getSetting("defaultColumnAttributes").then((savedColAttribs: string | null) => {
        if (savedColAttribs) {
          viewModel.columnAttributes = savedColAttribs.split(",").map((col) => col.trim());
        }
      });
    }
  }, [viewModel]);
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
