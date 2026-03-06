/**
 * Friends Library - Apps Script
 * Handles checkout, return, and progress updates from the dashboard.
 *
 * Deploy: Extensions → Apps Script → Deploy → New Deployment → Web App
 * Execute as: Me | Access: Anyone
 *
 * Deployed URL: paste into APPS_SCRIPT_URL in index.html
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logsSheet = ss.getSheetByName('Check out logs');

    if (data.action === 'checkout') {
      // Append a new checkout row
      logsSheet.appendRow([
        data.name,
        data.book,
        data.startDate,
        data.currentPage || 0,
        data.totalPages || 0,
        data.status || 'Reading',
        data.dueBack || ''
      ]);
      return ContentService.createTextOutput(JSON.stringify({ success: true, action: 'checkout' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === 'updateProgress') {
      // Find existing row and update
      const rows = logsSheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === data.name && rows[i][1] === data.book &&
            (rows[i][5] === 'Reading' || rows[i][5] === 'Reserved')) {
          logsSheet.getRange(i + 1, 4).setValue(data.currentPage);
          logsSheet.getRange(i + 1, 6).setValue(data.status || 'Reading');
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, action: 'updateProgress' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'Friends Library API is running' }))
    .setMimeType(ContentService.MimeType.JSON);
}
