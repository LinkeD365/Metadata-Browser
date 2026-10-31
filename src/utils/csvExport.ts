export function serializeCsv(rows: readonly (readonly unknown[])[]): string {
  return rows.map((row) => row.map((value) => {
    let text = value === null || value === undefined ? "" : String(value);
    if (/^[\s]*[=+\-@]/.test(text)) {
      text = "'" + text;
    }
    return `"${text.replace(/"/g, '""')}"`;
  }).join(",")).join("\r\n");
}

export async function saveCsvFile(
  fileName: string,
  rows: readonly (readonly unknown[])[],
  saveFile: (fileName: string, content: string) => Promise<string | null>,
  onLog: (message: string, type: "info" | "success" | "error") => void,
  notify: (title: string, message: string, type: "error") => void | Promise<void>,
): Promise<void> {
  try {
    const savedPath = await saveFile(fileName, serializeCsv(rows));
    onLog(savedPath ? "CSV export saved." : "CSV export cancelled.", savedPath ? "success" : "info");
  } catch {
    const message = "Unable to save CSV export. Check the destination and retry.";
    onLog(message, "error");
    await notify("Export failed", message, "error");
  }
}
