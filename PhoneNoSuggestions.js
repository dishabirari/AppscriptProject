function getAllPhoneNumbers() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.INQUIRY_SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  const phoneNumbers = data.slice(1)
    .map(row => String(row[4]).replace(/\D/g, '').trim())
    .filter(p => p.length === 10); // only proper 10-digit numbers

  return [...new Set(phoneNumbers)];
}


function testFillForm() {
  const testData = {
    date: "2025-06-19",
    fullName: "Harsh Patel",
    qualification: "B.Tech",
    age: "21",
    phoneNo: "8433630337",
    whatsappNo: "9876543210",
    parentsNo: "9123456780",
    email: "harsh@example.com",
    address: "123 Example Street, Pune",
    interestedCourse: "AI & ML",
    inquiryTakenBy: "Pranamya",
    branch22: "Main"
  };

  for (const id in testData) {
    const field = document.getElementById(id);
    if (field) {
      field.value = testData[id];
      console.log(`✅ Filled #${id} = ${testData[id]}`);
    } else {
      console.warn(`⚠️ Field with id '${id}' not found in DOM.`);
    }
  }
}





function getStudentData(phone) {
  const inputPhone = String(phone).replace(/\D/g, '').trim();
  Logger.log("📩 Input from frontend: " + inputPhone);

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.INQUIRY_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  // This map is excellent! It connects sheet headers to your HTML element IDs.
  const fieldMap = {
    "Date": "date",
    "Full Name": "fullName",
    "Qualification": "qualification",
    "Age": "age",
    "Phone Number": "phoneNo",
    "WhatsApp Number": "whatsappNo",
    "Parents Number": "parentsNo",
    "Email Address": "email",
    "Address": "address",
    "Interested Course": "interestedCourse",
    "Inquiry Taken By": "inquiryTakenBy",
    "Branch": "branch22"
  };

  // --- FIX #2: Dynamically find the phone number column index ---
  const phoneHeader = "Phone Number";
  const phoneColIdx = headers.indexOf(phoneHeader);

  // Failsafe in case the column header is changed or not found
  if (phoneColIdx === -1) {
    Logger.log(`Error: The header "${phoneHeader}" was not found in your sheet!`);
    return null; 
  }

  for (let i = 1; i < data.length; i++) {
    const rowData = data[i];
    // Use the dynamic index we found
    const sheetPhone = String(rowData[phoneColIdx]).replace(/\D/g, '').trim();
    
    if (sheetPhone === inputPhone) {
      Logger.log(`✅ Match found on row ${i + 1} for phone: ${inputPhone}`);
      const student = {};
      
      headers.forEach((header, idx) => {
        const elementId = fieldMap[header];
        if (elementId) {
          let value = rowData[idx];
          // Minor Improvement: Check if the value is a date object and format it
          if (value instanceof Date) {
            // Formats date as YYYY-MM-DD, suitable for <input type="date">
            student[elementId] = Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
          } else {
            student[elementId] = value;
          }
        }
      });

      Logger.log("➡️ Returning student data: " + JSON.stringify(student, null, 2));
      return student; // This is a correct return value
    }
  }

  Logger.log("❌ No match found for: " + inputPhone);
  // --- FIX #1: Return null for "not found" to trigger the correct logic on the client ---
  return null; 
}
