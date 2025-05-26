/************************************************
 * MAIN HTML ENTRY POINT
 ************************************************/
//Heloooo// i am yoooo
function doGet(e) {
  return HtmlService.createTemplateFromFile('index').evaluate();
}

/************************************************
 * HELPER: Include other .html files if needed
 ************************************************/
function include(filename) { 
  return HtmlService.createTemplateFromFile(filename).getRawContent();
}

/************************************************
 * LOGIN
 ************************************************/
function loginUser(loginData) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('LOGIN');
    if (!sheet) return { success: false, error: "LOGIN sheet not found." };

    var data = sheet.getDataRange().getValues();
    // Header: [ username, password, role ]
    for (var i = 1; i < data.length; i++) {
      var username = String(data[i][0]).trim();
      var password = String(data[i][1]).trim();
      var role = (data[i][2] || "").toLowerCase().trim();

      if (username === loginData.username && password === loginData.password) {
        return { success: true, userName: username, role: role };
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
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('DROPDOWN');
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
      paymentModes: Object.keys(paymentModeSet).sort()
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
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('STUDENT DATA');
  if (!sheet) return { error: "STUDENT DATA sheet not found." };

  var data = sheet.getDataRange().getValues();
  // We'll track something like ST###
  var maxNum = 0;
  for (var i = 1; i < data.length; i++) {
    var id = String(data[i][0] || "").trim();  // column A -> studentId
    var match = id.match(/^ST(\d+)$/i);
    if (match) {
      var num = parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }
  var nextNum = maxNum + 1;
  var nextId = "ST" + String(nextNum).padStart(3, '0'); // e.g. ST001
  return { nextId: nextId };
}

/************************************************
 * AUTO-INCREMENT TRANSACTION ID
 ************************************************/
function getNextTransactionId() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('FEES');
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
  var nextId = "TXN" + String(nextNum).padStart(3, '0'); // e.g. TXN001
  return { nextTxn: nextId };
}

/************************************************
 * FEES: SUBMIT / UPDATE / GET
 ************************************************/
function submitData(formData) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('FEES');
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
      formData.userName
    ];
    sheet.appendRow(rowData);

    return "Data submitted successfully!";
  } catch (error) {
    return "Error: " + error.toString();
  }
}


function submitInquiryData(formData2) {
  try {
    var ss = SpreadsheetApp.openById("1ywNQ0XNgvOsG4nokF800BcfCsCzHvGzENY2Vudf5u90");
    var sheet = ss.getSheetByName('INQUIRY FORM');
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
      new Date(),                         // Timestamp
      formData2.date,                      // Date
      formData2.fullName,                  // Full Name
      formData2.qualification,             // Qualification
      phoneNo,                           // Phone
      formData2.whatsappNo || "",          // WhatsApp
      formData2.parentsNo || "",           // Parents No
      formData2.email || "",               // Email
      formData2.age,                       // Age
      formData2.address,                   // Address
      formData2.interestedCourse,          // Interested Course
      formData2.inquiryTakenBy,
      formData2.branch,            // Inquiry Taken By
      "New Inquiry",                      // Status
      "",                                 // Follow-up Date
      "",                                 // Notes
      "Not Admitted",                     // Admission Status
      "",                                 // Admission Date
      ""                                  // Batch Assigned
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
  if (!userRole || userRole.toLowerCase() !== 'admin') {
    return "Error: You don't have permission to update fee data.";
  }
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('FEES');
    if (!sheet) return "Error: FEES sheet not found.";

    var rowNumber = parseInt(formData.recordRowNumber, 10);
    var sId = formData.studentId.trim();
    var sMonth = (formData.month || "").trim();

    // Check duplicates except the row being updated
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if ((i + 1) === rowNumber) continue;
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
      formData.userName
    ];
    sheet.getRange(rowNumber, 1, 1, updatedValues.length).setValues([updatedValues]);
    return "Data updated successfully!";
  } catch (error) {
    return "Error: " + error.toString();
  }
}

function getStudentSession(studentId) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('STUDENT DATA');
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
          className: data[i][6] || ""
        };
      }
    }
    return { session: "", studentName: "", fatherName: "", instituteName: "", trade: "", className: "" };
  } catch (error) {
    return { error: error.toString() };
  }
}

function getOldFees(studentId) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('FEES');
    if (!sheet) return { error: "FEES sheet not found." };

    var data = sheet.getDataRange().getValues();
    var records = [];
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(studentId).trim()) {
        var dateVal = data[i][1];
        var dateStr = (dateVal instanceof Date)
          ? Utilities.formatDate(dateVal, Session.getScriptTimeZone(), "yyyy-MM-dd")
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
          paidAmount: data[i][8]
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
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('FEES');
    if (!sheet) return { error: "FEES sheet not found." };

    var row = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (row[1] instanceof Date) {
      row[1] = Utilities.formatDate(row[1], Session.getScriptTimeZone(), "yyyy-MM-dd");
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
  if (!userRole || userRole.toLowerCase() !== 'admin') {
    return "Error: You don't have permission to add new student data.";
  }
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('STUDENT DATA');
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
      studentData.totalFees
    ];
    sheet.appendRow(newRow);
    return "Student added successfully!";
  } catch (error) {
    return "Error: " + error.toString();
  }
}

function getStudentList() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('STUDENT DATA');
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
        totalFees: data[i][7]
      });
    }
    return students;
  } catch (error) {
    return { error: error.toString() };
  }
}

function updateStudentData(studentData, userRole) {
  if (!userRole || userRole.toLowerCase() !== 'admin') {
    return "Error: You don't have permission to update student data.";
  }
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('STUDENT DATA');
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
      studentData.totalFees
    ];
    sheet.getRange(rowNumber, 1, 1, updatedValues.length).setValues([updatedValues]);
    return "Student updated successfully!";
  } catch (error) {
    return "Error: " + error.toString();
  }
}

function deleteStudentData(rowNumber, userRole) {
  if (!userRole || userRole.toLowerCase() !== 'admin') {
    return "Error: You don't have permission to delete student data.";
  }
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('STUDENT DATA');
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
function getAnalyticsData(monthFilter, feesTypeFilter, paymentModeFilter, dateFrom, dateTo, userRole) {
  if (!userRole || userRole.toLowerCase() !== 'admin') {
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
    lineData: {}
  };

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetStudents = ss.getSheetByName('STUDENT DATA');
  var sheetFees = ss.getSheetByName('FEES');
  if (!sheetStudents || !sheetFees) {
    return { error: "Sheets not found. Check STUDENT DATA or FEES." };
  }
  var dataStudents = sheetStudents.getDataRange().getValues();
  var dataFees = sheetFees.getDataRange().getValues();

  // Convert dateFrom/dateTo to actual Dates if provided
  var fromDate = null, toDate = null;
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
      var actualDate = (feeDateVal instanceof Date) ? feeDateVal : new Date(feeDateVal + "T00:00:00");
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
      var dateStr = (feeDateVal instanceof Date)
        ? Utilities.formatDate(feeDateVal, Session.getScriptTimeZone(), "yyyy-MM-dd")
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
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('STUDENT DATA');
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
  if (!userRole || userRole.toLowerCase() !== 'admin') {
    return { error: "You don't have permission to view dashboard." };
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetStudents = ss.getSheetByName('STUDENT DATA');
  var sheetFees = ss.getSheetByName('FEES');
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
        hasPaid: false
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
          var dateStr = (feeDateVal instanceof Date)
            ? Utilities.formatDate(feeDateVal, Session.getScriptTimeZone(), "yyyy-MM-dd")
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
      hasPaid: st.hasPaid
    });
  }

  // sort lineData
  var sortedDates = Object.keys(lineData).sort();
  var finalLineData = {};
  sortedDates.forEach(function(d) {
    finalLineData[d] = lineData[d];
  });

  return { students: studentsArray, lineData: finalLineData };
}

/************************************************
 * DUE FEES
 ************************************************/
function getDueFeesData(userRole) {
  if (!userRole || userRole.toLowerCase() !== 'admin') {
    return { error: "You don't have permission to view Due Fees." };
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetStudents = ss.getSheetByName('STUDENT DATA');
  var sheetFees = ss.getSheetByName('FEES');
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
      sumPaid: 0
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
      dueFees: due
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
      totalStudents: Object.keys(studentMap).length
    }
  };
}

/*********************************************
                ADMISSION FORM                
**********************************************/

function submitForm(data) {
  if (!data || typeof data !== 'object') {
    return 'Invalid data received!';
  }

  const spreadsheet = SpreadsheetApp.openById('1yuXuZP9ItyPPqd-WCFHpROUfWML9NX1jzQafkVZVbXY');
  const sheet = spreadsheet.getSheetByName('AdmissionData');
  const sheetName = 'AdmissionData'; // Name of the sheet where data will be stored
  const ss = SpreadsheetApp.openById("1yuXuZP9ItyPPqd-WCFHpROUfWML9NX1jzQafkVZVbXY");
  console.log(JSON.stringify(data, null, 1));

  // Define the headers if the sheet is empty
  if (sheet.getLastRow() === 0) {
const headers = [
  'Receipt Number',
  'Student Name',
  'Course Name',
  'Branch',
  'Course Duration',
  'Admission Fees',
  'Monthly Fees',
  'jan_25', 'feb_25', 'mar_25', 'apr_25', 'may_25', 'jun_25', 'jul_25', 'aug_25', 'sep_25', 'oct_25', 'nov_25', 'dec_25',
  'jan_26', 'feb_26', 'mar_26','apr_26', 'may_26', 'jun_26', 'jul_26', 'aug_26', 'sep_26', 'oct_26', 'nov_26', 'dec_26',
  'jan_27', 'feb_27', 'mar_27','apr_27', 'may_27', 'jun_27', 'jul_27', 'aug_27', 'sep_27', 'oct_27', 'nov_27', 'dec_27',
  'jan_28', 'feb_28', 'mar_28','apr_28', 'may_28', 'jun_28', 'jul_28', 'aug_28', 'sep_28', 'oct_28', 'nov_28', 'dec_28',
  'I Am Mr./Ms.',
  'Mother/Father/Husband/Sister/Brother of',
  'Agree to Terms'
];

    sheet.appendRow(headers);
  }
  // Prepare the row data with proper fallbacks
 const rowData = [
  data?.recipt_number?.[0] || '',
  data?.student_name?.[0] || '',
  data?.course_name?.[0] || '',
  data?.branch?.[0] || '',
  data?.course_duration?.[0] || '',
  data?.admission_fees?.[0] ? Number(data.admission_fees[0]) : 0,
  data?.monthly_fees?.[0] || '',
  data?.jan_25?.[0] || '',
  data?.feb_25?.[0] || '',
  data?.mar_25?.[0] || '',
  data?.apr_25?.[0] || '',
  data?.may_25?.[0] || '',
  data?.jun_25?.[0] || '',
  data?.jul_25?.[0] || '',
  data?.aug_25?.[0] || '',
  data?.sep_25?.[0] || '',
  data?.oct_25?.[0] || '',
  data?.nov_25?.[0] || '',
  data?.dec_25?.[0] || '',
  data?.jan_26?.[0] || '',
  data?.feb_26?.[0] || '',
  data?.mar_26?.[0] || '',
  data?.apr_26?.[0] || '',
  data?.may_26?.[0] || '',
  data?.jun_26?.[0] || '',
  data?.jul_26?.[0] || '',
  data?.aug_26?.[0] || '',
  data?.sep_26?.[0] || '',
  data?.oct_26?.[0] || '',
  data?.nov_26?.[0] || '',
  data?.dec_26?.[0] || '',
  data?.jan_27?.[0] || '',
  data?.feb_27?.[0] || '',
  data?.mar_27?.[0] || '',
  data?.apr_27?.[0] || '',
  data?.may_27?.[0] || '',
  data?.jun_27?.[0] || '',
  data?.jul_27?.[0] || '',
  data?.aug_27?.[0] || '',
  data?.sep_27?.[0] || '',
  data?.oct_27?.[0] || '',
  data?.nov_27?.[0] || '',
  data?.dec_27?.[0] || '',
  data?.jan_28?.[0] || '',
  data?.feb_28?.[0] || '',
  data?.mar_28?.[0] || '',
  data?.apr_28?.[0] || '',
  data?.may_28?.[0] || '',
  data?.jun_28?.[0] || '',
  data?.jul_28?.[0] || '',
  data?.aug_28?.[0] || '',
  data?.sep_28?.[0] || '',
  data?.oct_28?.[0] || '',
  data?.nov_28?.[0] || '',
  data?.dec_28?.[0] || '',
  data?.['I Am Mr./Ms.']?.[0] || '',
  data?.['Mother / Father / Husband / Sister / Brother of']?.[0] || '',
  data?.agree ? 'Yes' : 'No'
];
  // Append the row data to the sheet
  
  try {
  sheet.appendRow(rowData);
  console.log('Row appended successfully');
  generatePDF();
  return 'Data saved successfully!';
} catch (error) {
  console.error('Error saving data:', error);
  return 'Error saving data: ' + error.message;
}
}
function saveAdmissionData(data) {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName('Admissions') || ss.insertSheet('Admissions');
        
        if(sheet.getLastRow() === 0) {
            sheet.appendRow(Object.keys(data));
        }
        
        sheet.appendRow(Object.values(data));
        return "Data saved successfully!";
    } catch(error) {
        throw new Error("Failed to save: " + error.message);
    }
}

function processForm(formData) {

  console.log("workingg....")
  const spreadsheetId = "1ywNQ0XNgvOsG4nokF800BcfCsCzHvGzENY2Vudf5u90"; // replace with your ID
  const ss = SpreadsheetApp.openById(spreadsheetId); // this accesses the spreadsheet
  const sheet = ss.getSheetById(658585387); // access a specific sheet

  try {
    const requiredFields = ['fullName', 'phoneNo', 'whatsappNo', 'parentsNo', 'address'];
    const missingFields = requiredFields.filter(field => !formData[field]);

    if (missingFields.length > 0) {
      return {
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      };
    }

    const data = [
      new Date(), // Timestamp
      formData.date || new Date().toISOString().split('T')[0],
      formData.fullName,
      formData.qualification || '',
      formData.phoneNo,
      formData.whatsappNo,
      formData.parentsNo,
      formData.email || '',
      formData.age || '',
      formData.address,
      formData.interestedCourse || '',
      formData.inquiryTakenBy || '',
      formData.branch || ''
    ];

    sheet.appendRow(data);

    return {
      success: true,
      message: "Inquiry submitted successfully!",
      studentName: formData.fullName
    };

  } catch (e) {
    console.error("Error in processForm:", e);
    return {
      success: false,
      message: "An error occurred while processing your inquiry.",
      error: e.message
    };
  }
}



// function getData() {
//   const spreadsheetId = "1yuXuZP9ItyPPqd-WCFHpROUfWML9NX1jzQafkVZVbXY";
//   const ss = SpreadsheetApp.openById(spreadsheetId);
//   const sheet2 = ss.getSheetByName("F");
  
//   try {
//     const data = sheet2.getDataRange().getValues();
//     return data;
//   } catch (e) {
//     console.error("Error in getData: ", e);
//     return [];
//   }
// }

// function generatePdfFromFormData(formData) {
//   try {
//     const htmlContent = createPdfHtml(formData);
//     const blob = Utilities.newBlob(htmlContent, 'text/html', 'temp.html');
//     const pdfBlob = blob.getAs('application/pdf');
    
//     const pdfFile = DriveApp.createFile(pdfBlob)
//       .setName(`Inquiry_Form_${formData.fullName || 'Unknown'}_${new Date().getTime()}.pdf`);
    
//     return {
//       success: true,
//       pdfUrl: pdfFile.getDownloadUrl(),
//       pdfName: pdfFile.getName()
//     };
    
//   } catch (e) {
//     console.error("Error in generatePdfFromFormData: ", e);
//     return {
//       success: false,
//       message: "Failed to generate PDF",
//       error: e.message
//     };
//   }
// }

// // Helper function for PDF generation
// function createPdfHtml(formData) {
//   return `
//   <!DOCTYPE html>
//   <html>
//     <head>
//       <style>
//         body { font-family: Arial; padding: 20px; }
//         .header { border-bottom: 2px solid #1e3a8a; padding-bottom: 15px; }
//         .flex { display: flex; }
//         .justify-between { justify-content: space-between; }
//         .text-right { text-align: right; }
//         .section { margin: 20px 0; }
//         .section-title { 
//           color: #1e3a8a; 
//           border-bottom: 1px solid #eee; 
//           padding-bottom: 5px;
//           margin-bottom: 10px;
//         }
//         .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
//         .field { margin-bottom: 10px; }
//         .field-label { font-weight: bold; color: #555; }
//         .signature { border-top: 1px dashed #999; width: 200px; margin: 30px auto; }
//         .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #777; }
//       </style>
//     </head>
//     <body>
//       <div class="header">
//         <div class="flex justify-between">
//           <div>
//             <h1>STI SHELAR TRAINING INSTITUTE</h1>
//             <p>C/34, Bunglow, Near Nandikeshwar Mandir, Kamgar Nagar, Kurla(E)</p>
//           </div>
//           <div class="text-right">
//             <h2>INQUIRY FORM</h2>
//             <p>Date: ${formData.date || new Date().toLocaleDateString()}</p>
//           </div>
//         </div>
//       </div>

//       <div class="section">
//         <h3 class="section-title">STUDENT DETAILS</h3>
//         <div class="grid">
//           <div class="field">
//             <div class="field-label">Full Name</div>
//             <div>${formData.fullName || 'N/A'}</div>
//           </div>
//           <div class="field">
//             <div class="field-label">Age</div>
//             <div>${formData.age || 'N/A'}</div>
//           </div>
//           <div class="field">
//             <div class="field-label">Qualification</div>
//             <div>${formData.qualification || 'N/A'}</div>
//           </div>
//           <div class="field">
//             <div class="field-label">Interested Course</div>
//             <div>${formData.interestedCourse || 'N/A'}</div>
//           </div>
//         </div>
//       </div>

//       <div class="section">
//         <h3 class="section-title">CONTACT INFORMATION</h3>
//         <div class="grid">
//           <div class="field">
//             <div class="field-label">Phone</div>
//             <div>${formData.phoneNo || 'N/A'}</div>
//           </div>
//           <div class="field">
//             <div class="field-label">WhatsApp</div>
//             <div>${formData.whatsappNo || 'N/A'}</div>
//           </div>
//           <div class="field">
//             <div class="field-label">Parents Contact</div>
//             <div>${formData.parentsNo || 'N/A'}</div>
//           </div>
//           <div class="field">
//             <div class="field-label">Email</div>
//             <div>${formData.email || 'N/A'}</div>
//           </div>
//           <div class="field" style="grid-column: span 2">
//             <div class="field-label">Address</div>
//             <div>${formData.address || 'N/A'}</div>
//           </div>
//         </div>
//       </div>

//       <div class="section">
//         <h3 class="section-title">ADDITIONAL INFORMATION</h3>
//         <div class="field">
//           <div class="field-label">Inquiry Taken By</div>
//           <div>${formData.inquiryTakenBy || 'N/A'}</div>
//         </div>
//       </div>

//       <div class="signature"></div>
      
//       <div class="footer">
//         <p>Computer generated document - Valid without signature</p>
//         <p>© ${new Date().getFullYear()} STI SHELAR TRAINING INSTITUTE</p>
//       </div>
//     </body>
//   </html>
//   `;
// }

