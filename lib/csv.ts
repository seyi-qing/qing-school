/**
 * Minimal CSV export helper.
 * ------------------------------------------------------------------
 * Written by hand (no dependency) since it's a handful of lines: join
 * rows with commas, quote any cell containing a comma/quote/newline. This
 * is what "Export to Excel" means under the hood for tabular reports --
 * Excel and Google Sheets both open CSV natively.
 */
export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const escape = (cell: string | number) => {
    const str = String(cell ?? "");
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };
  const lines = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))];
  return lines.join("\n");
}

export function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
