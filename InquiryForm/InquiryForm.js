function InquiryProcessForm(formData) {
  console.log("Processing form...");

  
  const userIdForAudit = formData.loggedInUserId || "Anonymous";

  let pdfFolder;
  try {
    pdfFolder = DriveApp.getFolderById(CONFIG.ADMISSIONS_PDF_FOLDER_ID);
  } catch (e) {
    console.error("PDF folder access error:", e);
    createAuditLogEntry("PDF Folder Access Error", userIdForAudit, {
      error: e.message,
      formDataSummary: { fullName: formData.fullName, email: formData.email }
    });
    return { success: false, message: "Cannot access PDF folder.", error: e.message };
  }

  
  const dfSheet = ss.getSheetByName(CONFIG.INQUIRY_SHEET_NAME);
  if (!dfSheet) {
    console.error("DF sheet not found.");
    createAuditLogEntry("Sheet Not Found Error", userIdForAudit, {
      reason: "DF sheet missing.",
      formDataSummary: { fullName: formData.fullName }
    });
    return { success: false, message: "DF sheet not found." };
  }

  
  let htmlContent;
  try {
    htmlContent = HtmlService.createHtmlOutputFromFile("ifrom").getContent();
  } catch (e) {
    console.error("HTML template error:", e);
    createAuditLogEntry("HTML Template Error", userIdForAudit, {
      error: e.message
    });
    return { success: false, message: "HTML template load failed." };
  }


  Object.keys(formData).forEach(key => {


    const regex = new RegExp(`(<div[^>]*id="${key}"[^>]*>)(.*?)(</div>)`, 's');

    if (regex.test(htmlContent)) {
      htmlContent = htmlContent.replace(regex, `$1${formData[key]}$3`);
    }
  });



  let pdfBlob;
  try {
    pdfBlob = Utilities.newBlob(htmlContent, 'text/html')
      .getAs('application/pdf')
      .setName("Inquiry_Form_" + (formData.fullName || "User") + ".pdf");
    pdfFolder.createFile(pdfBlob);

  } catch (e) {
    console.error("PDF conversion error:", e);
    createAuditLogEntry("PDF Conversion Error", userIdForAudit, { error: e.message });
    return { success: false, message: "PDF generation failed." };
  }


  try {
    const requiredFields = ["fullName", "phoneNo", "whatsappNo", "parentsNo", "address"];
    const missingFields = requiredFields.filter(field => !formData[field]);

    
    if (missingFields.length > 0) {

      createAuditLogEntry("Form Validation Failed", userIdForAudit, {
        reason: `Missing: ${missingFields.join(", ")}`
      });
      return { success: false, message: `Missing: ${missingFields.join(", ")}` };
    }




    const rowData = [
      new Date(),
      formData.date || new Date().toISOString().split("T")[0],
      formData.fullName,
      formData.qualification || "",
      formData.phoneNo,
      formData.whatsappNo,
      formData.parentsNo,
      formData.email || "",
      formData.age || "",
      formData.address,
      formData.interestedCourse || "",
      formData.inquiryTakenBy || "",
      formData.branch || "",
      userIdForAudit
   
   
   ];


    dfSheet.appendRow(rowData);
  
    createAuditLogEntry("Inquiry Form Submission", userIdForAudit, {
      studentName: formData.fullName,
      interestedCourse: formData.interestedCourse
    });

    return {
      success: true,
      message: "Inquiry submitted successfully!",
      studentName: formData.fullName
 
   };
  } catch (e) {
    console.error("Final write error:", e);
    createAuditLogEntry("Process Form Error", userIdForAudit, { error: e.message });
    return { success: false, message: "Final write failed.", error: e.message };
  }
}




