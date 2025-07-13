// function InquiryProcessForm(formData) {
//   console.log("Processing form...");

  
//   const userIdForAudit = formData.loggedInUserId || "Anonymous";

//   let pdfFolder;
//   try {
//     pdfFolder = DriveApp.getFolderById(CONFIG.ADMISSIONS_PDF_FOLDER_ID);
//   } catch (e) {
//     console.error("PDF folder access error:", e);
//     createAuditLogEntry("PDF Folder Access Error", userIdForAudit, {
//       error: e.message,
//       formDataSummary: { fullName: formData.fullName, email: formData.email }
//     });
//     return { success: false, message: "Cannot access PDF folder.", error: e.message };
//   }

  
//   const dfSheet = ss.getSheetByName(CONFIG.INQUIRY_SHEET_NAME);
//   if (!dfSheet) {
//     console.error("DF sheet not found.");
//     createAuditLogEntry("Sheet Not Found Error", userIdForAudit, {
//       reason: "DF sheet missing.",
//       formDataSummary: { fullName: formData.fullName }
//     });
//     return { success: false, message: "DF sheet not found." };
//   }

  
//   let htmlContent;
//   try {
//     htmlContent = HtmlService.createHtmlOutputFromFile("ifrom").getContent();
//   } catch (e) {
//     console.error("HTML template error:", e);
//     createAuditLogEntry("HTML Template Error", userIdForAudit, {
//       error: e.message
//     });
//     return { success: false, message: "HTML template load failed." };
//   }


//   Object.keys(formData).forEach(key => {


//     const regex = new RegExp(`(<div[^>]*id="${key}"[^>]*>)(.*?)(</div>)`, 's');

//     if (regex.test(htmlContent)) {
//       htmlContent = htmlContent.replace(regex, `$1${formData[key]}$3`);
//     }
//   });



//   let pdfBlob;
//   try {
//     pdfBlob = Utilities.newBlob(htmlContent, 'text/html')
//       .getAs('application/pdf')
//       .setName("Inquiry_Form_" + (formData.fullName || "User") + ".pdf");
//     pdfFolder.createFile(pdfBlob);

//   } catch (e) {
//     console.error("PDF conversion error:", e);
//     createAuditLogEntry("PDF Conversion Error", userIdForAudit, { error: e.message });
//     return { success: false, message: "PDF generation failed." };
//   }


//   try {
//     const requiredFields = ["firstName", "lastName", "phoneNo", "whatsappNo", "parentsNo", "address"];
//     const missingFields = requiredFields.filter(field => !formData[field]);

    
//     if (missingFields.length > 0) {

//       createAuditLogEntry("Form Validation Failed", userIdForAudit, {
//         reason: `Missing: ${missingFields.join(", ")}`
//       });
//       return { success: false, message: `Missing: ${missingFields.join(", ")}` };
//     }




//     const rowData = [
//       new Date(),
//       formData.date || new Date().toISOString().split("T")[0],
//       formData.fullName,
//       formData.qualification || "",
//       formData.phoneNo,
//       formData.whatsappNo,
//       formData.parentsNo,
//       formData.email || "",
//       formData.age || "",
//       formData.address,
//       formData.interestedCourse || "",
//       formData.inquiryTakenBy || "",
//       formData.branch || "",
//       userIdForAudit
   
   
//    ];


//     dfSheet.appendRow(rowData);
  
//     createAuditLogEntry("Inquiry Form Submission", userIdForAudit, {
//       studentName: formData.fullName,
//       interestedCourse: formData.interestedCourse
//     });

//     return {
//       success: true,
//       message: "Inquiry submitted successfully!",
//       studentName: formData.fullName
 
//    };
//   } catch (e) {
//     console.error("Final write error:", e);
//     createAuditLogEntry("Process Form Error", userIdForAudit, { error: e.message });
//     return { success: false, message: "Final write failed.", error: e.message };
//   }
// }
function InquiryProcessForm(formData) {
  console.log("Processing form...");

  const userIdForAudit = formData.loggedInUserId || "Anonymous";

  // 1. PDF Folder Setup
  let pdfFolder;
  try {
    pdfFolder = DriveApp.getFolderById(CONFIG.ADMISSIONS_PDF_FOLDER_ID);
  } catch (e) {
    console.error("PDF folder access error:", e);
    createAuditLogEntry("PDF Folder Access Error", userIdForAudit, {
      error: e.message,
      formDataSummary: { 
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email 
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
    console.error("DF sheet not found.");
    createAuditLogEntry("Sheet Not Found Error", userIdForAudit, {
      reason: "DF sheet missing.",
      formDataSummary: { 
        firstName: formData.firstName,
        lastName: formData.lastName 
      }
    });
    return { 
      success: false, 
      message: "DF sheet not found." 
    };
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
    console.error("HTML template error:", e);
    createAuditLogEntry("HTML Template Error", userIdForAudit, {
      error: e.message
    });
    return { 
      success: false, 
      message: "HTML template load failed." 
    };
  }

  // 4. PDF Generation
  let pdfBlob;
  try {
    pdfBlob = Utilities.newBlob(htmlContent, 'text/html')
      .getAs('application/pdf')
      .setName(`Inquiry_Form_${formData.firstName}_${formData.lastName}.pdf`);
    pdfFolder.createFile(pdfBlob);
  } catch (e) {
    console.error("PDF conversion error:", e);
    createAuditLogEntry("PDF Conversion Error", userIdForAudit, { 
      error: e.message 
    });
    return { 
      success: false, 
      message: "PDF generation failed." 
    };
  }

  // 5. Data Validation and Sheet Update
  try {
    const requiredFields = [
      "firstName", "lastName", 
      "phoneNo", "whatsappNo", "parentsNo", 
      "addressLine1", "pincode", "gender"
    ];
    
    const missingFields = requiredFields.filter(field => !formData[field]);

    if (missingFields.length > 0) {
      createAuditLogEntry("Form Validation Failed", userIdForAudit, {
        reason: `Missing: ${missingFields.join(", ")}`
      });
      return { 
        success: false, 
        message: `Missing required fields: ${missingFields.join(", ")}` 
      };
    }

    // Prepare row data with all fields including middle name and address lines
    const rowData = [
      new Date(), // Timestamp
      formData.date || new Date().toISOString().split("T")[0], // Form date
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

    // Append to sheet
    dfSheet.appendRow(rowData);
  
    // Audit log
    createAuditLogEntry("Inquiry Form Submission", userIdForAudit, {
      studentName: `${formData.firstName} ${formData.lastName}`,
      interestedCourse: formData.interestedCourse
    });

    return {
      success: true,
      message: "Inquiry submitted successfully!",
      studentName: `${formData.firstName} ${formData.lastName}`
    };
    
  } catch (e) {
    console.error("Final write error:", e);
    createAuditLogEntry("Process Form Error", userIdForAudit, { 
      error: e.message 
    });
    return { 
      success: false, 
      message: "Final write failed.", 
      error: e.message 
    };
  }
}



