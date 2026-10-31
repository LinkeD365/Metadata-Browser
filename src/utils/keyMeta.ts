import type { KeyMeta } from "../model/tableMeta";

export function getKeyRowId(keyMeta: Pick<KeyMeta, "attributes" | "keyName">): string {
  return keyMeta.attributes.find((attribute) => attribute.attributeName === "LogicalName")?.attributeValue || keyMeta.keyName;
}
