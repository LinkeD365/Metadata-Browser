export type ConnectionComparisonRecord = {
  hasPrimaryConnection: boolean;
  hasSecondaryConnection: boolean;
  secondaryDisplayName?: string;
};

export function mergeConnectionComparisonRecords<T extends ConnectionComparisonRecord>(
  primaryRecords: T[],
  secondaryRecords: T[],
  getKey: (record: T) => string,
  getDisplayName: (record: T) => string,
  primaryDisplayFieldsToClear: string[] = [],
): T[] {
  const mergedRecords = new Map<string, T>();

  primaryRecords.forEach((record) => {
    record.hasPrimaryConnection = true;
    record.hasSecondaryConnection = false;
    mergedRecords.set(getKey(record), record);
  });

  secondaryRecords.forEach((record) => {
    const mergedRecord = mergedRecords.get(getKey(record));

    if (mergedRecord) {
      mergedRecord.hasSecondaryConnection = true;
      mergedRecord.secondaryDisplayName = getDisplayName(record);
      return;
    }

    const secondaryOnlyRecord = { ...record } as T;
    const secondaryOnlyRecordFields = secondaryOnlyRecord as Record<string, unknown>;
    primaryDisplayFieldsToClear.forEach((fieldName) => {
      if (typeof secondaryOnlyRecordFields[fieldName] === "string") {
        secondaryOnlyRecordFields[fieldName] = "";
      }
    });

    secondaryOnlyRecord.hasPrimaryConnection = false;
    secondaryOnlyRecord.hasSecondaryConnection = true;
    secondaryOnlyRecord.secondaryDisplayName = getDisplayName(record);
    mergedRecords.set(getKey(record), secondaryOnlyRecord as T);
  });

  return Array.from(mergedRecords.values());
}

export function createConnectionRowClassRules<T extends ConnectionComparisonRecord>(hasSecondaryConnection: boolean) {
  return {
    "table-row-primary-only": (params: { data?: T }) =>
      Boolean(hasSecondaryConnection && params.data?.hasPrimaryConnection && !params.data?.hasSecondaryConnection),
    "table-row-secondary-only": (params: { data?: T }) =>
      Boolean(hasSecondaryConnection && !params.data?.hasPrimaryConnection && params.data?.hasSecondaryConnection),
  };
}
