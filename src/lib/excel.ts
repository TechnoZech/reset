function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export type ExcelCell = string | number | null | undefined;

function cellXml(value: ExcelCell) {
  if (value == null || value === "") return "<Cell/>";
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<Cell><Data ss:Type="Number">${value}</Data></Cell>`;
  }
  return `<Cell><Data ss:Type="String">${escapeXml(String(value))}</Data></Cell>`;
}

function sheetXml(name: string, rows: ExcelCell[][]) {
  const safeName = escapeXml(name.slice(0, 31).replace(/[:\\/?*\[\]]/g, "-"));
  const table = rows
    .map((row) => `<Row>${row.map(cellXml).join("")}</Row>`)
    .join("");
  return `<Worksheet ss:Name="${safeName}"><Table>${table}</Table></Worksheet>`;
}

/** SpreadsheetML workbook Excel opens as .xls */
export function buildExcelXml(sheets: { name: string; rows: ExcelCell[][] }[]) {
  return (
    `<?xml version="1.0"?>` +
    `<?mso-application progid="Excel.Sheet"?>` +
    `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ` +
    `xmlns:o="urn:schemas-microsoft-com:office:office" ` +
    `xmlns:x="urn:schemas-microsoft-com:office:excel" ` +
    `xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">` +
    sheets.map((s) => sheetXml(s.name, s.rows)).join("") +
    `</Workbook>`
  );
}
