import type { ColDef } from "ag-grid-community";

export type ConnectionComparisonRecord = {
  hasPrimaryConnection: boolean;
  hasSecondaryConnection: boolean;
  secondaryDisplayName?: string;
  connectionPresence?: boolean[];
  connectionDisplayNames?: string[];
  sourceConnectionIndex?: number;
};

export interface ConnectionRecordSet<T> {
  records: T[];
  getDisplayName: (record: T) => string;
}

export async function loadConnectionRecordSets<T>(
  connections: Array<ToolBoxAPI.DataverseConnection | null>,
  isPresent: (connectionIndex: number) => boolean,
  loader: (connectionIndex: number) => Promise<T[]>,
  getDisplayName: (record: T) => string,
): Promise<ConnectionRecordSet<T>[]> {
  return Promise.all(
    connections.map(async (connection, connectionIndex) => ({
      records: connection && isPresent(connectionIndex) ? await loader(connectionIndex) : [],
      getDisplayName,
    })),
  );
}

export function mergeConnectionRecordSets<T extends ConnectionComparisonRecord>(
  connectionRecords: ConnectionRecordSet<T>[],
  getKey: (record: T) => string,
  primaryDisplayFieldsToClear: string[] = [],
): T[] {
  const mergedRecords = new Map<string, T>();

  connectionRecords.forEach(({ records, getDisplayName }, connectionIndex) => {
    records.forEach((record) => {
      const key = getKey(record);
      let mergedRecord = mergedRecords.get(key);

      if (!mergedRecord) {
        mergedRecord = { ...record, connectionPresence: [], connectionDisplayNames: [] } as T;
        if (connectionIndex > 0) {
          const mergedFields = mergedRecord as Record<string, unknown>;
          primaryDisplayFieldsToClear.forEach((fieldName) => {
            if (typeof mergedFields[fieldName] === "string") {
              mergedFields[fieldName] = "";
            }
          });
        }
        mergedRecords.set(key, mergedRecord);
      }

      const presence = mergedRecord.connectionPresence ?? (mergedRecord.connectionPresence = []);
      const displayNames = mergedRecord.connectionDisplayNames ?? (mergedRecord.connectionDisplayNames = []);
      presence[connectionIndex] = true;
      displayNames[connectionIndex] = getDisplayName(record);
      if (mergedRecord.sourceConnectionIndex === undefined || connectionIndex < mergedRecord.sourceConnectionIndex) {
        mergedRecord.sourceConnectionIndex = connectionIndex;
      }

      mergedRecord.hasPrimaryConnection = Boolean(presence[0]);
      mergedRecord.hasSecondaryConnection = Boolean(presence[1]);
      mergedRecord.secondaryDisplayName = displayNames[1];
    });
  });

  return Array.from(mergedRecords.values());
}

export function mergeConnectionComparisonRecords<T extends ConnectionComparisonRecord>(
  primaryRecords: T[],
  secondaryRecords: T[],
  getKey: (record: T) => string,
  getDisplayName: (record: T) => string,
  primaryDisplayFieldsToClear: string[] = [],
): T[] {
  return mergeConnectionRecordSets(
    [
      { records: primaryRecords, getDisplayName },
      { records: secondaryRecords, getDisplayName },
    ],
    getKey,
    primaryDisplayFieldsToClear,
  );
}

export function getConnectionDisplayLabel(
  connection: ToolBoxAPI.DataverseConnection | null,
  index: number,
  entityLabel: string,
): string {
  return `${entityLabel} (${connection?.name || `Environment ${index + 1}`})`;
}

export function createConnectionDisplayColumns<T extends ConnectionComparisonRecord>(
  connections: Array<ToolBoxAPI.DataverseConnection | null>,
  entityLabel: string,
): ColDef<T>[] {
  return connections.slice(1).map((connection, offset) => {
    const connectionIndex = offset + 1;
    return {
      headerName: getConnectionDisplayLabel(connection, connectionIndex, entityLabel),
      valueGetter: (params) => params.data?.connectionDisplayNames?.[connectionIndex] ?? "",
    };
  });
}

export function createConnectionRowClassRules<T extends ConnectionComparisonRecord>(hasAdditionalConnections: boolean) {
  return {
    "table-row-primary-only": (params: { data?: T }) =>
      Boolean(
        hasAdditionalConnections &&
          params.data?.hasPrimaryConnection &&
          !(params.data.connectionPresence?.slice(1).some(Boolean) ?? params.data.hasSecondaryConnection),
      ),
    "table-row-non-primary-only": (params: { data?: T }) =>
      Boolean(
        hasAdditionalConnections &&
          !params.data?.hasPrimaryConnection &&
          (params.data?.connectionPresence?.slice(1).some(Boolean) ?? params.data?.hasSecondaryConnection),
      ),
  };
}
