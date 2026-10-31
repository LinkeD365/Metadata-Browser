import type { ColumnDefinition, ExcelOptions } from "../model/ViewModel";
import type { RelationshipAttribute } from "../model/tableMeta";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseStringArray(json: string): string[] {
  const value: unknown = JSON.parse(json);
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error("Saved attribute names must be an array of strings");
  }
  return value;
}

export function parseColumnDefinitions(json: string): ColumnDefinition[] {
  const value: unknown = JSON.parse(json);
  if (!Array.isArray(value)) {
    throw new Error("Saved columns must be an array");
  }
  return value.map((item: unknown) => {
    if (!isRecord(item) || typeof item.name !== "string" ||
      (item.custom !== undefined && typeof item.custom !== "boolean")) {
      throw new Error("Saved column definition is invalid");
    }
    return { name: item.name, custom: item.custom === true };
  });
}

export function parseRelationshipAttributes(json: string, type: string): RelationshipAttribute[] {
  const value: unknown = JSON.parse(json);
  if (!Array.isArray(value)) {
    throw new Error("Saved relationships must be an array");
  }
  return value.map((item: unknown) => {
    if (!isRecord(item) || typeof item.attributeName !== "string" || item.type !== type) {
      throw new Error("Saved relationship attribute is invalid");
    }
    return { attributeName: item.attributeName, type };
  });
}

export function parseExcelOptions(json: string): Partial<ExcelOptions> {
  const value: unknown = JSON.parse(json);
  if (!isRecord(value)) {
    throw new Error("Saved Excel options must be an object");
  }
  const keys = [
    "includeTableDetails", "includeColumns", "includeKeys",
    "includePrivileges", "includeRelationships", "includeSolutions",
  ] as const;
  const options: Partial<ExcelOptions> = {};
  for (const key of keys) {
    if (value[key] !== undefined) {
      if (typeof value[key] !== "boolean") {
        throw new Error("Saved Excel option must be a boolean");
      }
      options[key] = value[key];
    }
  }
  return options;
}
