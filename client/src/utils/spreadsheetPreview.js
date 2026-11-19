function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function spreadsheetToPreviewHtml(workbook, XLSX) {
  const sheetNames = Array.isArray(workbook?.SheetNames) ? workbook.SheetNames : [];
  if (sheetNames.length === 0) {
    return '<p>File spreadsheet tidak memiliki sheet.</p>';
  }

  return sheetNames.map((sheetName) => {
    const worksheet = workbook.Sheets?.[sheetName];
    const heading = `<h3>${escapeHtml(sheetName)}</h3>`;
    if (!worksheet || !worksheet['!ref']) {
      return `${heading}<p>Sheet ini tidak memiliki data.</p>`;
    }

    // SheetJS membungkus tabel dengan dokumen HTML lengkap; pratinjau hanya perlu tabelnya.
    const table = XLSX.utils.sheet_to_html(worksheet).match(/<table\b[\s\S]*?<\/table>/i)?.[0];
    return table ? `${heading}${table}` : `${heading}<p>Sheet ini tidak memiliki data.</p>`;
  }).join('');
}