
/**
 * Finds the highest numeric part of a receipt number (e.g., 23 from 'R-0023')
 * in a specified sheet. It checks the entire column to find the true maximum.
 * @param {string} sheetName The name of the sheet to check.
 * @returns {number} The highest receipt number found, or 0 if none are found.
 */
function findLastReceiptInSheet(sheetName) {
  const receiptColumn = 2; // This corresponds to Column B
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) {
      console.log(`Sheet "${sheetName}" not found. Skipping.`);
      return 0; // If sheet doesn't exist, it has no receipts.
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < 1) {
      return 0; // If sheet is empty, it has no receipts.
    }

    // Get all values in the receipt column to find the last valid entry.
    const columnValues = sheet.getRange(1, receiptColumn, lastRow).getValues();
    let lastNumericPart = 0;

    // Loop through all values to find valid receipt numbers and get the maximum.
    for (let i = 0; i < columnValues.length; i++) {
      const cellValue = columnValues[i][0];
      if (cellValue && typeof cellValue === 'string' && cellValue.startsWith('R-')) {
        const numericPart = parseInt(cellValue.substring(2), 10);
        if (!isNaN(numericPart) && numericPart > lastNumericPart) {
          lastNumericPart = numericPart;
        }
      }
    }
    return lastNumericPart;

  } catch (e) {
    console.error(`Error processing sheet "${sheetName}": ${e.message}`);
    return 0; // Return 0 in case of an error.
  }
}

/**
 * Gets the next sequential receipt number by checking both 'Admissions' and 'df' sheets.
 * This is the function called by the client-side JavaScript.
 * @returns {string} The new formatted receipt number (e.g., "R-0025").
 */
function getNextReceiptNumber() {
  try {
    // Find the last receipt number from both sheets.
    const lastNumAdmissions = findLastReceiptInSheet("Admissions");
    const lastNumDf = findLastReceiptInSheet("df");

    console.log(`Last number in 'Admissions' sheet: ${lastNumAdmissions}`);
    console.log(`Last number in 'df' sheet: ${lastNumDf}`);

    // Determine the highest number between the two sheets.
    const latestNum = Math.max(lastNumAdmissions, lastNumDf);
    console.log(`Highest number found across all sheets: ${latestNum}`);

    // Increment to get the new number.
    const newNumericPart = latestNum + 1;

    // Format the new receipt number with four digits (e.g., R-0001, R-0024, R-0155).
    const newReceiptNumber = "R-" + ("000" + newNumericPart).slice(-4);
    
    return newReceiptNumber;

  } catch (e) {
    console.error(`A critical error occurred in getNextReceiptNumber: ${e.message}`);
    // Fallback in case of any unexpected error.
    return "R-0001";
  }
}