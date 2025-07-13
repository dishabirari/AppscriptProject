/**
 * Server-side function to lookup Aadhaar in the Google Sheet.
 * This function is called by the client-side JavaScript using google.script.run.
 *
 * @param {string} aadhaarNumber The Aadhaar number to lookup.
 * @returns {object} An object indicating if the record was found and the record data if found.
 */
function lookupAadhaarRecord(aadhaarNumber) {
  console.log(`SERVER DEBUG: === Starting lookupAadhaarRecord ===`);
  console.log(`SERVER DEBUG: Received Aadhaar number for lookup: "${aadhaarNumber}" (Type: ${typeof aadhaarNumber})`);

  // Basic Aadhaar number format validation on the server side
  if (!aadhaarNumber || typeof aadhaarNumber !== 'string' || !/^\d{12}$/.test(aadhaarNumber)) {
    console.warn(`SERVER DEBUG: Invalid Aadhaar format: "${aadhaarNumber}". Returning {found: false, message: 'Invalid Aadhaar format received by server.'}.`);
    return { found: false, message: 'Invalid Aadhaar format received by server.' };
  }

  const sheet = ss.getSheetByName(CONFIG.AADHAAR_RECORDS_SHEET_NAME);
  if (!sheet) {
    console.error(`SERVER ERROR: Aadhaar lookup sheet '${CONFIG.AADHAAR_RECORDS_SHEET_NAME}' not found. Please check CONFIG.AADHAAR_RECORDS_SHEET_NAME.`);
    createAuditLogEntry("Sheet Not Found Error", "System", {
      reason: `Aadhaar lookup sheet '${CONFIG.AADHAAR_RECORDS_SHEET_NAME}' missing.`
    });
    return { found: false, message: `Aadhaar lookup sheet '${CONFIG.AADHAAR_RECORDS_SHEET_NAME}' not found.` };
  }
  console.log(`SERVER DEBUG: Sheet '${CONFIG.AADHAAR_RECORDS_SHEET_NAME}' found.`);

  let data;
  try {
    data = sheet.getDataRange().getValues(); // Get all data from the sheet
    console.log(`SERVER DEBUG: Successfully retrieved data from sheet. Total rows: ${data.length}`);
    if (data.length <= 1) { // Check if there's only a header or no data at all
      console.warn("SERVER DEBUG: Sheet is empty or contains only headers. No data rows to process.");
      return { found: false, message: "Sheet is empty or has no data." };
    }
    // Log the header row and first data row for inspection (uncomment if needed for deeper dive)
    // console.log("SERVER DEBUG: Header Row (index 0):", data[0]);
    // console.log("SERVER DEBUG: First Data Row (index 1):", data[1]);

  } catch (e) {
    console.error("SERVER ERROR: Could not get sheet data range or values:", e.message, e.stack);
    createAuditLogEntry("Sheet Data Access Error", "System", { error: e.message });
    return { found: false, message: "Error accessing sheet data." };
  }

  let foundRecord = null;

  // Iterate through rows to find the Aadhaar number
  // Start from row 1 (index 1) to skip header row (assuming row 0 is header)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    // Ensure the column index is valid before accessing
    if (CONFIG.AADHAAR_LOOKUP_COLUMN >= row.length || CONFIG.AADHAAR_LOOKUP_COLUMN < 0) {
        console.error(`SERVER ERROR: AADHAAR_LOOKUP_COLUMN (${CONFIG.AADHAAR_LOOKUP_COLUMN}) is out of bounds for row ${i}. Row length: ${row.length}. Check your CONFIG.`);
        continue; // Skip this row if column index is invalid
    }

    // Crucial: Convert to string and trim to handle potential formatting issues in sheet
    const aadhaarInSheet = String(row[CONFIG.AADHAAR_LOOKUP_COLUMN]).trim();

    console.log(`SERVER DEBUG: Checking row ${i}. Sheet Aadhaar: "${aadhaarInSheet}" (Length: ${aadhaarInSheet.length}, Type: ${typeof aadhaarInSheet}), Search Aadhaar: "${aadhaarNumber}" (Length: ${aadhaarNumber.length}, Type: ${typeof aadhaarNumber})`);

    if (aadhaarInSheet === aadhaarNumber) {
      console.log(`SERVER DEBUG: MATCH FOUND in row ${i}!`);
      foundRecord = {
        fullName: String(row[CONFIG.FULL_NAME_LOOKUP_COLUMN] || '').trim(),
        qualification: String(row[CONFIG.QUALIFICATION_LOOKUP_COLUMN] || '').trim(),
        age: String(row[CONFIG.AGE_LOOKUP_COLUMN] || '').trim(),
        phoneNo: String(row[CONFIG.PHONE_NO_LOOKUP_COLUMN] || '').trim(),
        whatsappNo: String(row[CONFIG.WHATSAPP_NO_LOOKUP_COLUMN] || '').trim(),
        parentsNo: String(row[CONFIG.PARENTS_NO_LOOKUP_COLUMN] || '').trim(),
        email: String(row[CONFIG.EMAIL_LOOKUP_COLUMN] || '').trim(),
        address: String(row[CONFIG.ADDRESS_LOOKUP_COLUMN] || '').trim(),
        date: String(row[CONFIG.DATE_LOOKUP_COLUMN] || '').trim() // Date as string, will be re-parsed client-side
      };
      console.log("SERVER DEBUG: Constructed foundRecord object:", foundRecord);
      break; // Aadhaar found, stop searching
    }
  }

  if (foundRecord) {
    console.log(`SERVER DEBUG: Aadhaar record found. Returning {found: true, record: ...}`);
    return { found: true, record: foundRecord };
  } else {
    console.log(`SERVER DEBUG: No Aadhaar record found. Returning {found: false}.`);
    return { found: false };
  }
  // This line will not be reached as a return happens inside the if/else block
  // console.log(`SERVER DEBUG: === Exiting lookupAadhaarRecord ===`);
}




/**
 * Processes the inquiry form submission, generates PDF, and appends data to sheet.
 * This is the function called by your client-side InquiryFormHandle.
 *
 * @param {object} formData An object containing all form field values.
 * @returns {object} A success/failure response object.
 */
function InquiryProcessForm(formData) {
  console.log("SERVER DEBUG: Processing form submission...");
  console.log("SERVER DEBUG: Received formData:", formData); // Log incoming data

  const userIdForAudit = formData.loggedInUserId || CONFIG.DEFAULT_USER;

  // 1. PDF Folder Setup
  let pdfFolder;
  try {
    pdfFolder = DriveApp.getFolderById(CONFIG.ADMISSIONS_PDF_FOLDER_ID);
  } catch (e) {
    console.error("SERVER ERROR: PDF folder access error:", e);
    createAuditLogEntry("PDF Folder Access Error", userIdForAudit, {
      error: e.message,
      formDataSummary: { 
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email, aadhaar: formData.aadhaar 
      }
    });
    return { 
      success: false, 
      message: "Cannot access PDF folder.", 
      error: e.message 
    };
  }

  // 2. Get the Sheet
  const dfSheet = ss.getSheetByName(CONFIG.INQUIRY_SHEET_NAME);
  if (!dfSheet) {
    console.error(`SERVER ERROR: Inquiry sheet '${CONFIG.INQUIRY_SHEET_NAME}' not found.`);
    createAuditLogEntry("Sheet Not Found Error", userIdForAudit, {
      reason: `Inquiry sheet '${CONFIG.INQUIRY_SHEET_NAME}' missing.`,
      formDataSummary: {
        firstName: formData.firstName,
        lastName: formData.lastName, 
        aadhaar: formData.aadhaar 
      }
    });
    return { success: false, message: `Inquiry sheet '${CONFIG.INQUIRY_SHEET_NAME}' not found.` };
  }

  // 3. HTML Template Processing
  let htmlContent;
  try {
    htmlContent = HtmlService.createHtmlOutputFromFile("ifrom").getContent();
    
    // Combine names for fullName display in PDF
    formData.fullName = [
      formData.firstName,
      formData.middleName,
      formData.lastName
    ].filter(Boolean).join(" ");
    
    // Combine address for display in PDF
    formData.address = [
      formData.addressLine1,
      formData.addressLine2,
      formData.addressLine3,
      `Pincode: ${formData.pincode}`
    ].filter(Boolean).join(", ");

    // Update HTML content with form data
    Object.keys(formData).forEach(key => {
      const regex = new RegExp(`(<div[^>]*id="${key}"[^>]*>)(.*?)(</div>)`, 's');
      if (regex.test(htmlContent)) {
        htmlContent = htmlContent.replace(regex, `$1${formData[key]}$3`);
      }
    });

  } catch (e) {
    console.error("SERVER ERROR: HTML template 'ifrom' error:", e);
    createAuditLogEntry("HTML Template Error", userIdForAudit, {
      error: e.message,
      formDataSummary: { fullName: formData.fullName, aadhaar: formData.aadhaar }
    });
    return { 
      success: false, 
      message: "HTML template load failed." 
    };
  }

  // Replace placeholders in HTML content with form data for PDF generation
  Object.keys(formData).forEach(key => {
    // Escape special characters in the key for regex
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(<div[^>]*id="${escapedKey}"[^>]*>)(.*?)(</div>)`, 's');

    // Ensure value is not null/undefined before replacing
    const valueToReplace = formData[key] !== undefined && formData[key] !== null ? formData[key] : '';

    if (regex.test(htmlContent)) {
      htmlContent = htmlContent.replace(regex, `$1${valueToReplace}$3`);
    }
    // Also check for direct placeholder replacement like {{key}}
    const simplePlaceholderRegex = new RegExp(`{{${escapedKey}}}`, 'g');
    htmlContent = htmlContent.replace(simplePlaceholderRegex, valueToReplace);
  });



  let pdfBlob;
  try {
    // Add Aadhaar to the PDF file name for better organization
    pdfBlob = Utilities.newBlob(htmlContent, 'text/html')
      .getAs('application/pdf')
      .setName(`Inquiry_Form_${formData.firstName}_${formData.lastName}.pdf`);
    pdfFolder.createFile(pdfBlob);
  } catch (e) {
    console.error("PDF conversion error:", e);
    createAuditLogEntry("PDF Conversion Error", userIdForAudit, { error: e.message,
      formDataSummary: { 
        firstName: formData.firstName,
        lastName: formData.lastName,
        aadhaar: formData.aadhaar 
      }
     });
    return { success: false, message: "PDF generation failed." };
  }

  // 5. Data Validation and Sheet Update
  try {
    // Server-side validation of required fields
    const requiredFields = [
      "firstName", "lastName", 
      "aadhaar", "phoneNo", "whatsappNo", "parentsNo", 
      "addressLine1", "pincode", "gender"
    ];
    
    const missingFields = requiredFields.filter(field => !formData[field]);

    if (missingFields.length > 0) {
      console.log(`SERVER DEBUG: Missing required fields: ${missingFields.join(", ")}`);
      createAuditLogEntry("Form Validation Failed", userIdForAudit, {
        reason: `Missing fields: ${missingFields.join(", ")}`,
        formDataSummary: { fullName: formData.fullName, aadhaar: formData.aadhaar }
      });
      return { success: false, message: `Missing required fields: ${missingFields.join(", ")}` };
    }

    // Prepare row data for appending to the Inquiry sheet (DF sheet)
    // **CRITICAL CORRECTION HERE: ORDER MUST MATCH YOUR SPREADSHEET COLUMNS EXACTLY**
    // Your sheet columns are: Timestamp (auto), Date, Aadhar, Full Name, Qualification, ...
    const rowData = [
      new Date(),
      formData.date || new Date().toISOString().split("T")[0],
      formData.aadhaar,
      formData.firstName,
      formData.middleName || "", // Middle name (optional)
      formData.lastName,
      formData.gender,
      formData.qualification || "",
      formData.phoneNo,
      formData.whatsappNo,
      formData.parentsNo,
      formData.email || "",
      formData.age || "",
      formData.addressLine1, // Address line 1 (required)
      formData.addressLine2 || "", // Address line 2 (optional)
      formData.addressLine3 || "", // Address line 3 (optional)
      formData.pincode,
      formData.interestedCourse || "",
      formData.inquiryTakenBy || "",
      formData.branch || "",
      userIdForAudit
   
   
   ];

    console.log("SERVER DEBUG: Appending rowData to sheet:", rowData);
    
    console.log("SERVER DEBUG: Row appended successfully.");
    dfSheet.appendRow(rowData);
  
    createAuditLogEntry("Inquiry Form Submission", userIdForAudit, {
      studentName: `${formData.firstName} ${formData.lastName}`,
      interestedCourse: formData.interestedCourse,
      aadhaar: formData.aadhaar
    });

    return {
      success: true,
      message: "Inquiry submitted successfully!",
      studentName: `${formData.firstName} ${formData.lastName}`,

      aadhaar: formData.aadhaar
    };
    
  } catch (e) {
    console.error("SERVER ERROR: Error during final write to sheet:", e);
    createAuditLogEntry("Process Form Error", userIdForAudit, {
      
      error: e.message,
      formDataSummary: { fullName: formData.fullName, aadhaar: formData.aadhaar }
    
    });
    return { 
      success: false, 
      message: `An unexpected error occurred during submission: ${e.message}`, 
      error: e.message 
    };
  }
}



