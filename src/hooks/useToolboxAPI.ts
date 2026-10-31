import { useCallback, useEffect, useRef, useState } from "react";

export type LogEntry = {
  timestamp: Date;
  message: string;
  type: "info" | "success" | "warning" | "error";
};

export function useConnection(onError: () => Promise<void>) {
  const [connections, setConnections] = useState<Array<ToolBoxAPI.DataverseConnection | null>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const refreshRequest = useRef(0);

  const refreshConnection = useCallback(async () => {
    const request = ++refreshRequest.current;
    setIsLoading(true);
    setConnections([]);
    try {
      const currentConnections = await window.toolboxAPI.connections.getConnections();
      if (request === refreshRequest.current) setConnections(currentConnections);
    } catch {
      if (request === refreshRequest.current) {
        setConnections([]);
        await onError();
      }
    } finally {
      if (request === refreshRequest.current) setIsLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void refreshConnection();
    return () => { refreshRequest.current += 1; };
  }, [refreshConnection]);

  return { connections, isLoading, refreshConnection };
}

export function useToolboxEvents(onEvent: (event: string, data: unknown) => void | Promise<void>) {
  useEffect(() => {
    const handler = (_event: unknown, payload: ToolBoxAPI.ToolBoxEventPayload) => {
      void onEvent(payload.event, payload.data);
    };

    window.toolboxAPI.events.on(handler);

    return () => {
      window.toolboxAPI.events.off(handler);
    };
  }, [onEvent]);
}

export function useEventLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Use useCallback without dependencies since we're using the functional update form of setState
  // This ensures the functions are stable across renders and won't cause infinite loops
  const addLog = useCallback((message: string, type: LogEntry["type"] = "info") => {
    setLogs((prev) => [
      {
        timestamp: new Date(),
        message,
        type,
      },
      ...prev.slice(0, 49), // Keep last 50 entries
    ]);
  }, []); // Empty deps is safe because we use functional setState

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []); // Empty deps is safe because we use functional setState

  return { logs, addLog, clearLogs };
}
