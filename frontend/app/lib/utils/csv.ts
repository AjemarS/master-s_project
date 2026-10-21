type Cell = string | number | boolean | null | undefined;

/** RFC 4180 quoting, plus a leading ' on =+-@ so Excel does not run a cell as a formula */
function cell(value: Cell): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  if (typeof value === "string" && /^[=+\-@]/.test(s)) s = `'${s}`;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV text: ";" separator and "\r\n" rows, as Excel expects with Ukrainian regional settings */
export function toCsv(header: string[], rows: Cell[][]): string {
  return [header, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");
}

/** Saves the rows as a .csv file; the BOM makes Excel read Cyrillic as UTF-8 */
export function downloadCsv(filename: string, header: string[], rows: Cell[][]) {
  const blob = new Blob(["﻿" + toCsv(header, rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
