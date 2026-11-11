import { useCallback, useEffect, useRef, useState } from "react";

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
