// Excel export helpers for the admin panel (client components).
// Lists are paginated server-side (limit ≤ 50), so exports walk every page of
// the current filter before writing a real .xlsx via SheetJS.

import * as XLSX from "xlsx";

// fetchPage(page) → { items, total, limit }. Returns the combined items.
export async function fetchAllPages(fetchPage, { max = 20000 } = {}) {
  const rows = [];
  let page = 1;
  for (;;) {
    const data = await fetchPage(page);
    const items = data.items || [];
    rows.push(...items);
    const totalPages = Math.max(1, Math.ceil((data.total || 0) / (data.limit || 50)));
    if (!items.length || page >= totalPages || rows.length >= max) break;
    page += 1;
  }
  return rows;
}

// rows: array of plain objects — keys become the header row.
export function downloadXlsx(filename, sheetName, rows) {
  const ws = XLSX.utils.json_to_sheet(rows);
  // column widths sized to content so the sheet opens readable
  const keys = rows.length ? Object.keys(rows[0]) : [];
  ws["!cols"] = keys.map((k) => ({
    wch: Math.min(
      60,
      Math.max(k.length, ...rows.map((r) => String(r[k] ?? "").length)) + 2
    ),
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}

export const fmtDate = (v) => (v ? new Date(v).toISOString().slice(0, 19).replace("T", " ") : "");
