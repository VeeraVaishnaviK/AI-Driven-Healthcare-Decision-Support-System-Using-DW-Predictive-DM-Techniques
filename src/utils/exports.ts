/**
 * Utility functions for exporting tabular data into CSV and Excel formats in the client browser.
 */

/**
 * Trigger browser download for a CSV file.
 * Automatically wraps cells in quotes and handles escaping of nested quotes.
 * 
 * @param headers - Array of header strings
 * @param rows - 2D array representing rows and columns
 * @param filename - Destination file name (e.g. 'report.csv')
 */
export function downloadCSV(headers: string[], rows: any[][], filename: string): void {
  if (typeof window === 'undefined') return;

  const escapeCell = (cell: any): string => {
    if (cell === null || cell === undefined) return '';
    const valStr = String(cell);
    // Escape double quotes by doubling them, and wrap cell in double quotes
    return `"${valStr.replace(/"/g, '""')}"`;
  };

  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map(row => row.map(escapeCell).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Trigger browser download for an Excel-compatible styled spreadsheet file (.xls).
 * Uses XML structure with basic CSS styling to present gridlines and clean layouts.
 * 
 * @param headers - Array of header strings
 * @param rows - 2D array representing rows and columns
 * @param filename - Destination file name (e.g. 'report.xls')
 */
export function downloadExcel(headers: string[], rows: any[][], filename: string): void {
  if (typeof window === 'undefined') return;

  const tableHeader = headers
    .map(h => `<th style="background-color: #0f766e; color: #ffffff; font-weight: bold; padding: 6px 12px; border: 1px solid #cbd5e1; text-align: left; font-family: sans-serif; font-size: 10pt;">${h}</th>`)
    .join('');

  const tableRows = rows
    .map(row => {
      const cells = row
        .map(cell => {
          const val = cell === null || cell === undefined ? '' : String(cell);
          // Simple sanitization for HTML context
          const cleanVal = val
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          return `<td style="padding: 6px 12px; border: 1px solid #e2e8f0; font-family: sans-serif; font-size: 9pt; color: #334155;">${cleanVal}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>DSS Report Export</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        table { border-collapse: collapse; }
      </style>
    </head>
    <body>
      <table>
        <thead>
          <tr>${tableHeader}</tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
