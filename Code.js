/************************************************
 * MAIN HTML ENTRY POINT
 ************************************************/

var ss = SpreadsheetApp.getActiveSpreadsheet();
//Heloooo// i am yoooo// i am hitanshu // yooo again //Heloooo// i am yoooo harshhhhhhh////harsh//heth//kk


function doGet(e) {
  return HtmlService.createTemplateFromFile("index").evaluate();
}

/************************************************
 * HELPER: Include other .html files if needed
 ************************************************/
function include(filename) {
  return HtmlService.createTemplateFromFile(filename).getRawContent();
}


function loginUser(loginData) {
  try {
   
   
    var sheet = ss.getSheetByName("LOGIN");
    if (!sheet) return { success: false, error: "LOGIN sheet not found." };

    var data = sheet.getDataRange().getValues();
    
    for (var i = 1; i < data.length; i++) {
      var username = String(data[i][0]).trim();
      var password = String(data[i][1]).trim();
      var role = (data[i][2] || "").toString().toLowerCase().trim();
      var branch = String(data[i][3]).trim();

      if (username === loginData.username && password === loginData.password) {
        //  Save session data
        PropertiesService.getUserProperties().setProperty("loggedInUser", username);
          createAuditLogEntry("Login Success", username);
        return {
  success: true,
  userName: username,
  role: role,
  branch: branch,
  userId: username   // ✅ This is the ID passed to frontend
};
      }
    }

    return { success: false, error: "Invalid username or password." };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}


/************************************************
 * DROPDOWN: Get dynamic data (sessions, trades, fees types, payment modes)
 ************************************************/
function getDropdownData() {
  try {
    
    var sheet = ss.getSheetByName("DROPDOWN");
    if (!sheet) return { error: "DROPDOWN sheet not found." };

    var data = sheet.getDataRange().getValues();
    // We assume columns:
    // A -> session, B -> trade, C -> feesType, D -> paymentMode
    var sessionSet = {};
    var tradeSet = {};
    var feesTypeSet = {};
    var paymentModeSet = {};

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var sVal = String(row[0] || "").trim();
      var tVal = String(row[1] || "").trim();
      var fVal = String(row[2] || "").trim();
      var pVal = String(row[3] || "").trim();

      if (sVal) sessionSet[sVal] = true;
      if (tVal) tradeSet[tVal] = true;
      if (fVal) feesTypeSet[fVal] = true;
      if (pVal) paymentModeSet[pVal] = true;
    }

    return {
      sessions: Object.keys(sessionSet).sort(),
      trades: Object.keys(tradeSet).sort(),
      feesTypes: Object.keys(feesTypeSet).sort(),
      paymentModes: Object.keys(paymentModeSet).sort(),
    };
  } catch (err) {
    return { error: err.toString() };
  }
}

/************************************************
 * AUTO-INCREMENT STUDENT ID
 ************************************************/
function getNextStudentId() {
  // We'll parse the STUDENT DATA sheet, find the highest ID that matches ST###, increment
  
  var sheet = ss.getSheetByName("STUDENT DATA");
  if (!sheet) return { error: "STUDENT DATA sheet not found." };

  var data = sheet.getDataRange().getValues();
  // We'll track something like ST###
  var maxNum = 0;
  for (var i = 1; i < data.length; i++) {
    var id = String(data[i][0] || "").trim(); // column A -> studentId
    var match = id.match(/^ST(\d+)$/i);
    if (match) {
      var num = parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }
  var nextNum = maxNum + 1;
  var nextId = "ST" + String(nextNum).padStart(3, "0"); // e.g. ST001
  return { nextId: nextId };
}

/************************************************
 * AUTO-INCREMENT TRANSACTION ID
 ************************************************/
function getNextTransactionId() {
  
  var sheet = ss.getSheetByName("FEES");
  if (!sheet) return { error: "FEES sheet not found." };

  var data = sheet.getDataRange().getValues();
  // We'll parse TXN###
  var maxNum = 0;
  for (var i = 1; i < data.length; i++) {
    var txn = String(data[i][4] || "").trim(); // column E -> transactionId
    var match = txn.match(/^TXN(\d+)$/i);
    if (match) {
      var num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  var nextNum = maxNum + 1;
  var nextId = "TXN" + String(nextNum).padStart(3, "0"); // e.g. TXN001
  return { nextTxn: nextId };
}

/************************************************
 * FEES: SUBMIT / UPDATE / GET
 ************************************************/
function submitData(formData) {
  try {
    
    var sheet = ss.getSheetByName("FEES");
    if (!sheet) return "Error: FEES sheet not found.";

    var data = sheet.getDataRange().getValues();
    var sId = formData.studentId.trim();
    var sMonth = (formData.month || "").trim();

    // Check if fees is already paid for the same studentId + month
    for (var i = 1; i < data.length; i++) {
      var rowId = String(data[i][0] || "").trim();
      var rowMonth = String(data[i][2] || "").trim();
      if (rowId === sId && rowMonth === sMonth) {
        return "Error: Fee for this month (" + sMonth + ") is already paid!";
      }
    }

    // If transactionId empty, get next
    var txnId = formData.transactionId.trim();
    if (!txnId) {
      // auto generate
      var nextObj = getNextTransactionId();
      if (nextObj.error) return "Error: " + nextObj.error;
      txnId = nextObj.nextTxn;
    }

    // Append row
    // FEES columns: A->studentId, B->date, C->month, D->session, E->txnId, F->trade, G->studentName,
    // H->fatherName, I->paidAmount, J->paidAmountInWord, K->feesType, L->paymentMode, M->remark, N->userName
    var rowData = [
      sId,
      formData.date,
      sMonth,
      formData.session,
      txnId,
      formData.trade,
      formData.studentName,
      formData.fatherName,
      formData.paidAmount,
      formData.paidAmountInWord,
      formData.feesType,
      formData.paymentMode,
      formData.remark,
      formData.userName,
    ];
    sheet.appendRow(rowData);

    return "Data submitted successfully!";
  } catch (error) {
    return "Error: " + error.toString();
  }
}

/************************************************
 * Inquiry Form: SUBMIT
 ************************************************/
function submitInquiryData(formData2) {
  try {

    var sheet = ss.getSheetByName("INQUIRY FORM");
    if (!sheet) return "Error: DF sheet not found.";

    var data = sheet.getDataRange().getValues();
    var phoneNo = formData2.phoneNo.trim();

    // Check if inquiry already exists with same phone number
    for (var i = 1; i < data.length; i++) {
      var rowPhone = String(data[i][4] || "").trim();
      if (rowPhone === phoneNo) {
        return "Error: Inquiry with this phone number already exists!";
      }
    }

    // Prepare row data
    // DF columns:
    // A->Timestamp, B->Date, C->FullName, D->Qualification, E->PhoneNo,
    // F->WhatsAppNo, G->ParentsNo, H->Email, I->Age, J->Address,
    // K->InterestedCourse, L->InquiryTakenBy, M->Status, N->FollowUpDate,
    // O->Notes, P->AdmissionStatus, Q->AdmissionDate, R->BatchAssigned
    var rowData = [
      new Date(), // Timestamp
      formData2.date, // Date
      formData2.fullName, // Full Name
      formData2.qualification, // Qualification
      phoneNo, // Phone
      formData2.whatsappNo || "", // WhatsApp
      formData2.parentsNo || "", // Parents No
      formData2.email || "", // Email
      formData2.age, // Age
      formData2.address, // Address
      formData2.interestedCourse, // Interested Course
      formData2.inquiryTakenBy,
      formData2.branch, // Inquiry Taken By
      "New Inquiry", // Status
      "", // Follow-up Date
      "", // Notes
      "Not Admitted", // Admission Status
      "", // Admission Date
      "", // Batch Assigned
    ];

    sheet.appendRow(rowData);
    return "Inquiry submitted successfully!";
  } catch (error) {
    return "Error: " + error.toString();
  }
}
/**
 * Admin-only: Update existing fee row
 */
function updateData(formData, userRole) {
  if (!userRole || userRole.toLowerCase() !== "admin") {
    return "Error: You don't have permission to update fee data.";
  }
  try {
    
    var sheet = ss.getSheetByName("FEES");
    if (!sheet) return "Error: FEES sheet not found.";

    var rowNumber = parseInt(formData.recordRowNumber, 10);
    var sId = formData.studentId.trim();
    var sMonth = (formData.month || "").trim();

    // Check duplicates except the row being updated
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (i + 1 === rowNumber) continue;
      var rowId = String(data[i][0] || "").trim();
      var rowMonth = String(data[i][2] || "").trim();
      if (rowId === sId && rowMonth === sMonth) {
        return "Error: Fee for this month (" + sMonth + ") is already paid!";
      }
    }

    // If transactionId empty => auto generate
    var txnId = formData.transactionId.trim();
    if (!txnId) {
      var nextObj = getNextTransactionId();
      if (nextObj.error) return "Error: " + nextObj.error;
      txnId = nextObj.nextTxn;
    }

    var updatedValues = [
      sId,
      formData.date,
      sMonth,
      formData.session,
      txnId,
      formData.trade,
      formData.studentName,
      formData.fatherName,
      formData.paidAmount,
      formData.paidAmountInWord,
      formData.feesType,
      formData.paymentMode,
      formData.remark,
      formData.userName,
    ];
    sheet
      .getRange(rowNumber, 1, 1, updatedValues.length)
      .setValues([updatedValues]);
    return "Data updated successfully!";
  } catch (error) {
    return "Error: " + error.toString();
  }
}

function getStudentSession(studentId) {
  try {
    
    var sheet = ss.getSheetByName("STUDENT DATA");
    if (!sheet) return { error: "STUDENT DATA sheet not found." };

    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(studentId).trim()) {
        return {
          session: data[i][1] || "",
          studentName: data[i][2] || "",
          fatherName: data[i][3] || "",
          instituteName: data[i][4] || "",
          trade: data[i][5] || "",
          className: data[i][6] || "",
        };
      }
    }
    return {
      session: "",
      studentName: "",
      fatherName: "",
      instituteName: "",
      trade: "",
      className: "",
    };
  } catch (error) {
    return { error: error.toString() };
  }
}

function getOldFees(studentId) {
  try {
    
    var sheet = ss.getSheetByName("FEES");
    if (!sheet) return { error: "FEES sheet not found." };

    var data = sheet.getDataRange().getValues();
    var records = [];
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(studentId).trim()) {
        var dateVal = data[i][1];
        var dateStr =
          dateVal instanceof Date
            ? Utilities.formatDate(
                dateVal,
                Session.getScriptTimeZone(),
                "yyyy-MM-dd"
              )
            : String(dateVal).trim();
        records.push({
          row: i + 1,
          studentId: data[i][0],
          date: dateStr,
          month: data[i][2],
          session: data[i][3],
          transactionId: data[i][4],
          trade: data[i][5],
          studentName: data[i][6],
          fatherName: data[i][7],
          paidAmount: data[i][8],
        });
      }
    }
    return records;
  } catch (error) {
    return { error: error.toString() };
  }
}

function getRecord(rowNumber) {
  try {
    
    var sheet = ss.getSheetByName("FEES");
    if (!sheet) return { error: "FEES sheet not found." };

    var row = sheet
      .getRange(rowNumber, 1, 1, sheet.getLastColumn())
      .getValues()[0];
    if (row[1] instanceof Date) {
      row[1] = Utilities.formatDate(
        row[1],
        Session.getScriptTimeZone(),
        "yyyy-MM-dd"
      );
    }
    return { values: row };
  } catch (error) {
    return { error: error.toString() };
  }
}

/************************************************
 * STUDENT DATA: ADD / UPDATE / DELETE
 ************************************************/
function addStudentData(studentData, userRole) {
  if (!userRole || userRole.toLowerCase() !== "admin") {
    return "Error: You don't have permission to add new student data.";
  }
  try {
    
    var sheet = ss.getSheetByName("STUDENT DATA");
    if (!sheet) return "Error: STUDENT DATA sheet not found.";

    // If studentId is empty => auto-generate
    var sId = studentData.studentId.trim();
    if (!sId) {
      var nextObj = getNextStudentId();
      if (nextObj.error) return "Error: " + nextObj.error;
      sId = nextObj.nextId; // e.g. ST003
    }

    // STUDENT DATA columns:
    // 0->studentId, 1->session, 2->studentName, 3->fatherName,
    // 4->instituteName, 5->trade, 6->class, 7->totalFees
    var newRow = [
      sId,
      studentData.session,
      studentData.studentName,
      studentData.fatherName,
      studentData.instituteName,
      studentData.trade,
      studentData.className,
      studentData.totalFees,
    ];
    sheet.appendRow(newRow);
    return "Student added successfully!";
  } catch (error) {
    return "Error: " + error.toString();
  }
}

function getStudentList() {
  try {
    
    var sheet = ss.getSheetByName("STUDENT DATA");
    if (!sheet) return { error: "STUDENT DATA sheet not found." };

    var data = sheet.getDataRange().getValues();
    var students = [];
    for (var i = 1; i < data.length; i++) {
      students.push({
        row: i + 1,
        studentId: data[i][0],
        session: data[i][1],
        studentName: data[i][2],
        fatherName: data[i][3],
        instituteName: data[i][4],
        trade: data[i][5],
        className: data[i][6],
        totalFees: data[i][7],
      });
    }
    return students;
  } catch (error) {
    return { error: error.toString() };
  }
}

function updateStudentData(studentData, userRole) {
  if (!userRole || userRole.toLowerCase() !== "admin") {
    return "Error: You don't have permission to update student data.";
  }
  try {
    
    var sheet = ss.getSheetByName("STUDENT DATA");
    if (!sheet) return "Error: STUDENT DATA sheet not found.";

    var rowNumber = parseInt(studentData.row, 10);

    // If user cleared Student ID => re-generate or keep the old? Typically we keep old ID.
    var sId = studentData.studentId.trim();
    if (!sId) {
      var nextObj = getNextStudentId();
      if (nextObj.error) return "Error: " + nextObj.error;
      sId = nextObj.nextId;
    }

    var updatedValues = [
      sId,
      studentData.session,
      studentData.studentName,
      studentData.fatherName,
      studentData.instituteName,
      studentData.trade,
      studentData.className,
      studentData.totalFees,
    ];
    sheet
      .getRange(rowNumber, 1, 1, updatedValues.length)
      .setValues([updatedValues]);
    return "Student updated successfully!";
  } catch (error) {
    return "Error: " + error.toString();
  }
}

function deleteStudentData(rowNumber, userRole) {
  if (!userRole || userRole.toLowerCase() !== "admin") {
    return "Error: You don't have permission to delete student data.";
  }
  try {
    
    var sheet = ss.getSheetByName("STUDENT DATA");
    if (!sheet) return "Error: STUDENT DATA sheet not found.";

    sheet.deleteRow(rowNumber);
    return "Student deleted successfully!";
  } catch (error) {
    return "Error: " + error.toString();
  }
}

/************************************************
 * ANALYTICS (ADMIN ONLY), with optional date range
 ************************************************/
function getAnalyticsData(
  monthFilter,
  feesTypeFilter,
  paymentModeFilter,
  dateFrom,
  dateTo,
  userRole
) {
  if (!userRole || userRole.toLowerCase() !== "admin") {
    return { error: "You don't have permission to view analytics." };
  }

  var analytics = {
    totalPaidFees: 0,
    totalUnpaidFees: 0,
    totalStudents: 0,
    paidStudentsCount: 0,
    unpaidStudentsCount: 0,
    dateWisePaid: {},
    pieData: { paid: 0, unpaid: 0 },
    lineData: {},
  };

  
  var sheetStudents = ss.getSheetByName("STUDENT DATA");
  var sheetFees = ss.getSheetByName("FEES");
  if (!sheetStudents || !sheetFees) {
    return { error: "Sheets not found. Check STUDENT DATA or FEES." };
  }
  var dataStudents = sheetStudents.getDataRange().getValues();
  var dataFees = sheetFees.getDataRange().getValues();

  // Convert dateFrom/dateTo to actual Dates if provided
  var fromDate = null,
    toDate = null;
  if (dateFrom) {
    fromDate = new Date(dateFrom + "T00:00:00"); // parse
  }
  if (dateTo) {
    toDate = new Date(dateTo + "T23:59:59");
  }

  // Build a student map
  var studentMap = {};
  for (var i = 1; i < dataStudents.length; i++) {
    var sId = String(dataStudents[i][0]).trim();
    var sTotal = parseFloat(dataStudents[i][7]) || 0;
    studentMap[sId] = { totalFees: sTotal, sumPaid: 0, hasPaidRow: false };
  }

  for (var j = 1; j < dataFees.length; j++) {
    var row = dataFees[j];
    var feeStudentId = String(row[0] || "").trim();
    var feeDateVal = row[1];
    var feeMonth = String(row[2] || "").trim();
    var feeType = String(row[10] || "").trim();
    var feePayMode = String(row[11] || "").trim();
    var paidAmount = parseFloat(row[8]) || 0;

    // date range check
    if (fromDate || toDate) {
      var actualDate =
        feeDateVal instanceof Date
          ? feeDateVal
          : new Date(feeDateVal + "T00:00:00");
      if (fromDate && actualDate < fromDate) continue;
      if (toDate && actualDate > toDate) continue;
    }
    // month filter
    if (monthFilter && feeMonth !== monthFilter) continue;
    // feesType filter
    if (feesTypeFilter && feeType !== feesTypeFilter) continue;
    // paymentMode filter
    if (paymentModeFilter && feePayMode !== paymentModeFilter) continue;

    if (!isNaN(paidAmount) && paidAmount > 0) {
      analytics.totalPaidFees += paidAmount;

      // accumulate dateWise
      var dateStr =
        feeDateVal instanceof Date
          ? Utilities.formatDate(
              feeDateVal,
              Session.getScriptTimeZone(),
              "yyyy-MM-dd"
            )
          : String(feeDateVal).trim();

      if (!analytics.dateWisePaid[dateStr]) {
        analytics.dateWisePaid[dateStr] = 0;
      }
      analytics.dateWisePaid[dateStr] += paidAmount;
    }

    if (studentMap[feeStudentId]) {
      studentMap[feeStudentId].sumPaid += paidAmount;
      studentMap[feeStudentId].hasPaidRow = true;
    }
  }

  analytics.totalStudents = Object.keys(studentMap).length;
  var sumUnpaid = 0;
  for (var sid in studentMap) {
    var st = studentMap[sid];
    if (st.hasPaidRow) {
      analytics.paidStudentsCount++;
    } else {
      analytics.unpaidStudentsCount++;
      sumUnpaid += st.totalFees;
    }
  }
  analytics.totalUnpaidFees = sumUnpaid;
  analytics.pieData.paid = analytics.totalPaidFees;
  analytics.pieData.unpaid = analytics.totalUnpaidFees;
  analytics.lineData = analytics.dateWisePaid;

  return analytics;
}

/************************************************
 * CLASS & MONTH DASHBOARD (ADMIN ONLY)
 ************************************************/
function getClassList() {
  try {
    
    var sheet = ss.getSheetByName("STUDENT DATA");
    if (!sheet) return { error: "STUDENT DATA sheet not found." };

    var data = sheet.getDataRange().getValues();
    var classSet = {};
    for (var i = 1; i < data.length; i++) {
      var cls = String(data[i][6] || "").trim(); // col G
      if (cls) classSet[cls] = true;
    }
    return Object.keys(classSet).sort();
  } catch (err) {
    return { error: err.toString() };
  }
}

function getClassMonthDashboard(selectedClass, selectedMonth, userRole) {
  if (!userRole || userRole.toLowerCase() !== "admin") {
    return { error: "You don't have permission to view dashboard." };
  }
  
  var sheetStudents = ss.getSheetByName("STUDENT DATA");
  var sheetFees = ss.getSheetByName("FEES");
  if (!sheetStudents || !sheetFees) {
    return { error: "Sheets not found (STUDENT DATA or FEES missing)." };
  }

  var dataStudents = sheetStudents.getDataRange().getValues();
  var dataFees = sheetFees.getDataRange().getValues();

  // collect all students in selectedClass
  var studentClassMap = {};
  for (var i = 1; i < dataStudents.length; i++) {
    var sId = String(dataStudents[i][0]).trim();
    var sName = String(dataStudents[i][2] || "");
    var sClass = String(dataStudents[i][6] || "");
    var sTotalFees = parseFloat(dataStudents[i][7]) || 0;

    if (!selectedClass || sClass === selectedClass) {
      studentClassMap[sId] = {
        studentName: sName,
        totalFees: sTotalFees,
        sumPaid: 0,
        hasPaid: false,
      };
    }
  }

  var lineData = {};
  for (var j = 1; j < dataFees.length; j++) {
    var row = dataFees[j];
    var feeStudentId = String(row[0] || "").trim();
    var feeDateVal = row[1];
    var feeMonth = String(row[2] || "").trim();
    var paidAmount = parseFloat(row[8]) || 0;

    if (studentClassMap[feeStudentId]) {
      if (!selectedMonth || feeMonth === selectedMonth) {
        if (paidAmount > 0) {
          studentClassMap[feeStudentId].hasPaid = true;
          studentClassMap[feeStudentId].sumPaid += paidAmount;
          var dateStr =
            feeDateVal instanceof Date
              ? Utilities.formatDate(
                  feeDateVal,
                  Session.getScriptTimeZone(),
                  "yyyy-MM-dd"
                )
              : String(feeDateVal).trim();
          if (!lineData[dateStr]) {
            lineData[dateStr] = 0;
          }
          lineData[dateStr] += paidAmount;
        }
      }
    }
  }

  var studentsArray = [];
  for (var key in studentClassMap) {
    var st = studentClassMap[key];
    studentsArray.push({
      studentId: key,
      studentName: st.studentName,
      totalFees: st.totalFees,
      sumPaid: st.sumPaid,
      hasPaid: st.hasPaid,
    });
  }

  // sort lineData
  var sortedDates = Object.keys(lineData).sort();
  var finalLineData = {};
  sortedDates.forEach(function (d) {
    finalLineData[d] = lineData[d];
  });

  return { students: studentsArray, lineData: finalLineData };
}




// function saveEnrollment(data) {
//   try {
//     const ss = SpreadsheetApp.getActiveSpreadsheet();
//     const sheet = ss.getSheetByName("Enrollments");
    
//     // Get current date and format as dd/mm/yyyy
//     const today = new Date();
//     const session = `${today.getDate()}/${today.getMonth()+1}/${today.getFullYear()}`;
    
//     // Ensure we have required fields
//     if (!data.enrollmentID || !data.studentName) {
//       throw new Error("Missing required enrollment data");
//     }
    
//     sheet.appendRow([
//       data.enrollmentID,  // EnrollmentID (PK)
//       data.studentName,   // StudentID (FK)
//       data.course,  // CounselD (FK) with fallback
//       session,            // Session
//       "Active"            // Status
//     ]);
    
//     return {success: true, message: "Enrollment saved successfully"};
//   } catch (e) {
//     console.error("Save enrollment error:", e);
//     throw new Error("Failed to save enrollment: " + e.toString());
//   }
// }
function saveEnrollment(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Enrollments");
    
    // Validate data
    if (!data.enrollmentID || !data.studentName) {
      throw new Error("Missing required enrollment data");
    }
    
    // Check for duplicate enrollment ID
    const existingIds = sheet.getRange(2, 1, sheet.getLastRow()-1, 1).getValues().flat();
    if (existingIds.includes(data.enrollmentID)) {
      throw new Error("Enrollment ID already exists: " + data.enrollmentID);
    }
    
    // Format date as dd/mm/yyyy
    const today = new Date();
    const formattedDate = `${today.getDate()}/${today.getMonth()+1}/${today.getFullYear()}`;
    
    // Append to sheet
    sheet.appendRow([
      data.enrollmentID,
      data.studentName,
      data.course || "Not Specified",
      formattedDate,
      "Active"
    ]);
    
    // Return success with the enrollment ID
    return {
      success: true,
      message: "Enrollment saved successfully",
      enrollmentID: data.enrollmentID
    };
    
  } catch (e) {
    console.error("Save enrollment error:", e);
    throw new Error("Failed to save enrollment: " + e.message);
  }
}

/************************************************
 * receipt
 ************************************************/




function generateReceiptNumber() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = "Receipts";
  let sheet = ss.getSheetByName(sheetName);

  // If the sheet doesn't exist, create it with headers
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(["Receipt No", "Date", "Full Name", "Propose to Pay", "Total Amount", "Paid", "Balance", "Exam Fees", "Received By"]);
  }

  const lastRow = sheet.getLastRow();

  // Determine next receipt number
  let newReceiptNumber = 1; // Starting number
  if (lastRow > 1) {
    const lastReceipt = sheet.getRange(lastRow, 1).getValue(); // Column A
    if (!isNaN(lastReceipt)) {
      newReceiptNumber = parseInt(lastReceipt) + 1;
    }
  }

  return newReceiptNumber.toString().padStart(4, '0'); // Format: 1001, 1002...
}












/************************************************
 * DUE FEES
 ************************************************/
function getDueFeesData(userRole) {
  if (!userRole || userRole.toLowerCase() !== "admin") {
    return { error: "You don't have permission to view Due Fees." };
  }
  
  var sheetStudents = ss.getSheetByName("STUDENT DATA");
  var sheetFees = ss.getSheetByName("FEES");
  if (!sheetStudents || !sheetFees) {
    return { error: "Sheets not found (STUDENT DATA or FEES missing)." };
  }

  var dataStudents = sheetStudents.getDataRange().getValues();
  var dataFees = sheetFees.getDataRange().getValues();

  var studentMap = {};
  for (var i = 1; i < dataStudents.length; i++) {
    var sId = String(dataStudents[i][0] || "").trim();
    var sName = String(dataStudents[i][2] || "").trim();
    var sFather = String(dataStudents[i][3] || "").trim();
    var sClass = String(dataStudents[i][6] || "").trim();
    var sTotal = parseFloat(dataStudents[i][7]) || 0;
    studentMap[sId] = {
      studentName: sName,
      fatherName: sFather,
      className: sClass,
      totalFees: sTotal,
      sumPaid: 0,
    };
  }

  for (var j = 1; j < dataFees.length; j++) {
    var feeId = String(dataFees[j][0] || "").trim();
    var paidAmount = parseFloat(dataFees[j][8]) || 0;
    if (studentMap[feeId]) {
      studentMap[feeId].sumPaid += paidAmount;
    }
  }

  var results = [];
  var totalOverallFees = 0;
  var totalOverallPaid = 0;
  var fullyPaidCount = 0;
  for (var sid in studentMap) {
    var st = studentMap[sid];
    var due = st.totalFees - st.sumPaid;
    results.push({
      studentId: sid,
      studentName: st.studentName,
      fatherName: st.fatherName,
      className: st.className,
      totalFees: st.totalFees,
      sumPaid: st.sumPaid,
      dueFees: due,
    });
    totalOverallFees += st.totalFees;
    totalOverallPaid += st.sumPaid;
    if (due <= 0) {
      fullyPaidCount++;
    }
  }
  var totalDue = totalOverallFees - totalOverallPaid;

  return {
    data: results,
    summary: {
      totalFees: totalOverallFees,
      totalPaid: totalOverallPaid,
      totalDue: totalDue,
      fullyPaidCount: fullyPaidCount,
      totalStudents: Object.keys(studentMap).length,
    },
  };
}



function createAuditLogEntry(action, userId, additionalDetails = {}) {
  const auditLogSheet = ss.getSheetByName(CONFIG.AUDIT_LOG_SHEET_NAME);
  if (!auditLogSheet) {
    console.error("AuditLog sheet not found.");
    return;
  }

  const timestamp = new Date();
  const logId = `LOG-${timestamp.getTime()}-${Math.floor(Math.random() * 10000)}`;
  const detailsString = JSON.stringify(additionalDetails);
  const logRowData = [logId, userId || "Anonymous", action, timestamp, detailsString];

  try {
    auditLogSheet.appendRow(logRowData);
    console.log(`Log: ${logId}, User: ${userId}, Action: ${action}`);
  } catch (e) {
    console.error("Error appending to AuditLog:", e);
  }
}
function serverSideLogout() {
  const loggedInUser = PropertiesService.getUserProperties().getProperty("loggedInUser");
  if (loggedInUser) {
    createAuditLogEntry("Logout", loggedInUser); // <-- This creates the "Logout" entry!
    PropertiesService.getUserProperties().deleteProperty("loggedInUser");
  } else {
    createAuditLogEntry("Logout Attempt (No User)", "Anonymous"); // Optional: log if someone tries to logout when not logged in
  }
  return { success: true }; // Always return a success response to the client
}

/************************************************
 * COURSE PAYMENT
 ************************************************/
function saveCoursePayment(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("FeeStructure");

  sheet.appendRow([
    data.ID,
    data.Coursepayname,
    data.coursePaySelect,
    data.courseDuration,
    data.coursePayFees,
    data.totalFees,
    data.paySelect
  ]);
}











 



