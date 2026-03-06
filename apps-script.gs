/**
 * Friends Library - Apps Script
 * Handles checkout, return, progress updates, and email notifications.
 *
 * SETUP:
 * 1. Open the Google Sheet → Extensions → Apps Script
 * 2. Paste this code (replace any existing code)
 * 3. Deploy → New Deployment → Web App
 *    - Execute as: Me
 *    - Access: Anyone
 * 4. Copy the deployed URL into APPS_SCRIPT_URL in index.html
 *
 * EMAIL NOTIFICATIONS:
 * Add an "Owner Email" column (column J) to the Books tab.
 * When someone checks out a book, the owner gets an email notification.
 * If no email is set, checkout still works — just no notification.
 */

// ─── OWNER EMAIL LOOKUP ───
function getOwnerEmail(bookTitle) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const booksSheet = ss.getSheetByName('Books');
  const data = booksSheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).toLowerCase().trim());
  
  const titleCol = headers.indexOf('title');
  const emailCol = headers.indexOf('owner email');
  
  if (titleCol === -1 || emailCol === -1) return null;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][titleCol] === bookTitle && data[i][emailCol]) {
      return String(data[i][emailCol]).trim();
    }
  }
  return null;
}

function getOwnerName(bookTitle) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const booksSheet = ss.getSheetByName('Books');
  const data = booksSheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).toLowerCase().trim());
  
  const titleCol = headers.indexOf('title');
  const ownerCol = headers.indexOf('book owner');
  
  if (titleCol === -1 || ownerCol === -1) return 'the owner';
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][titleCol] === bookTitle && data[i][ownerCol]) {
      return String(data[i][ownerCol]).trim();
    }
  }
  return 'the owner';
}

// ─── SEND CHECKOUT NOTIFICATION ───
function sendCheckoutEmail(readerName, bookTitle, dueBack) {
  const ownerEmail = getOwnerEmail(bookTitle);
  if (!ownerEmail) return; // No email configured, skip silently
  
  const ownerName = getOwnerName(bookTitle);
  const dueDate = dueBack ? new Date(dueBack).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'not set';
  
  const subject = `📚 Friends Library: "${bookTitle}" has been checked out`;
  const body = `Hi ${ownerName},\n\n` +
    `${readerName} just checked out your book "${bookTitle}" from the Friends Library.\n\n` +
    `Due back: ${dueDate}\n\n` +
    `You can view the library dashboard here:\nhttps://willslawrence.github.io/friends-library/\n\n` +
    `— Friends Library`;
  
  try {
    MailApp.sendEmail(ownerEmail, subject, body);
  } catch (e) {
    console.log('Email send failed: ' + e.message);
  }
}

// ─── SEND RETURN NOTIFICATION ───
function sendReturnEmail(readerName, bookTitle) {
  const ownerEmail = getOwnerEmail(bookTitle);
  if (!ownerEmail) return;
  
  const ownerName = getOwnerName(bookTitle);
  
  const subject = `✅ Friends Library: "${bookTitle}" has been returned`;
  const body = `Hi ${ownerName},\n\n` +
    `${readerName} has returned your book "${bookTitle}" to the Friends Library.\n\n` +
    `It's now available for others to borrow.\n\n` +
    `— Friends Library`;
  
  try {
    MailApp.sendEmail(ownerEmail, subject, body);
  } catch (e) {
    console.log('Email send failed: ' + e.message);
  }
}

// ─── MAIN HANDLERS ───
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
      
      // Send email notification to book owner
      sendCheckoutEmail(data.name, data.book, data.dueBack);
      
      return ContentService.createTextOutput(JSON.stringify({ success: true, action: 'checkout' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === 'updateProgress') {
      // Find existing row and update
      const rows = logsSheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === data.name && rows[i][1] === data.book &&
            (rows[i][5] === 'Reading' || rows[i][5] === 'Requested')) {
          logsSheet.getRange(i + 1, 4).setValue(data.currentPage);
          logsSheet.getRange(i + 1, 6).setValue(data.status || 'Reading');
          if (data.dueBack) {
            logsSheet.getRange(i + 1, 7).setValue(data.dueBack);
          }
          
          // If returned, notify owner
          if (data.status === 'Returned') {
            sendReturnEmail(data.name, data.book);
          }
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
