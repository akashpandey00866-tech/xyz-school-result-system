/* =========================================================
   FILE 14 — RESULT FORMATTERS
   =========================================================

   Central formatting layer for the Result Module.

   Responsibilities:
   ✓ Marks formatting
   ✓ Percentage formatting
   ✓ Grade formatting
   ✓ Grade point formatting
   ✓ Status labels
   ✓ Status messages
   ✓ Division labels
   ✓ Performance labels
   ✓ Subject labels
   ✓ Date formatting
   ✓ Student display information
   ✓ Result document labels
   ✓ Safe text handling

   NOTE:
   This file does NOT calculate marks.
   Calculations belong in resultUtils.js.
========================================================= */


/* =========================================================
   CONSTANTS
========================================================= */

export const FORMAT_DEFAULTS = Object.freeze({
  locale: "en-IN",
  marksDecimals: 0,
  percentageDecimals: 2,
  gradePointDecimals: 2,
  dateStyle: "medium",
});


/* =========================================================
   STATUS
========================================================= */

export const STATUS_LABELS = Object.freeze({
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  VERIFIED: "Verified",
  PUBLISHED: "Published",

  PENDING: "Pending",
  PASS: "Pass",
  FAIL: "Fail",
  INVALID: "Invalid",
  REJECTED: "Rejected",
});


export const STATUS_MESSAGES = Object.freeze({
  DRAFT:
    "This result is currently in draft state.",

  SUBMITTED:
    "This result has been submitted for verification.",

  VERIFIED:
    "This result has been verified by the administrator.",

  PUBLISHED:
    "This result has been officially published.",

  PENDING:
    "Result is incomplete and awaiting remaining marks.",

  PASS:
    "The student has successfully passed all subjects.",

  FAIL:
    "The student has not passed one or more subjects.",

  INVALID:
    "Some marks are invalid and require correction.",

  REJECTED:
    "This result has been rejected and requires correction.",
});


/* =========================================================
   COMPONENT LABELS
========================================================= */

export const COMPONENT_LABELS = Object.freeze({
  theory: "Theory",
  practical: "Practical",
  internal: "Internal",
  project: "Project",
});


/* =========================================================
   BASIC HELPERS
========================================================= */

export function safeString(
  value,
  fallback = "—"
) {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    return fallback;
  }

  return String(value).trim();
}


export function toSafeNumber(
  value,
  fallback = 0
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  const number =
    Number(
      String(value)
        .replace(/,/g, "")
        .replace("%", "")
        .trim()
    );

  return Number.isFinite(
    number
  )
    ? number
    : fallback;
}


/* =========================================================
   MARKS FORMATTER
========================================================= */

export function formatMarks(
  value,
  options = {}
) {
  const {
    decimals =
      FORMAT_DEFAULTS.marksDecimals,
    blank = "—",
  } = options;


  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return blank;
  }


  const number =
    toSafeNumber(
      value,
      NaN
    );


  if (
    !Number.isFinite(
      number
    )
  ) {
    return blank;
  }


  return number.toFixed(
    decimals
  );
}


/* =========================================================
   MARKS WITH MAXIMUM
========================================================= */

export function formatMarksWithMaximum(
  obtained,
  maximum
) {
  const obtainedText =
    formatMarks(
      obtained
    );

  const maximumText =
    formatMarks(
      maximum
    );


  if (
    obtainedText === "—"
  ) {
    return `— / ${maximumText}`;
  }


  return `${obtainedText} / ${maximumText}`;
}


/* =========================================================
   PERCENTAGE
========================================================= */

export function formatPercentage(
  value,
  options = {}
) {
  const {
    decimals =
      FORMAT_DEFAULTS.percentageDecimals,
    includeSymbol = true,
    blank = "—",
  } = options;


  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return blank;
  }


  const number =
    toSafeNumber(
      value,
      NaN
    );


  if (
    !Number.isFinite(
      number
    )
  ) {
    return blank;
  }


  const text =
    number.toFixed(
      decimals
    );


  return includeSymbol
    ? `${text}%`
    : text;
}


/* =========================================================
   GRADE
========================================================= */

export function formatGrade(
  grade
) {
  const value =
    safeString(
      grade
    );


  if (
    value === "—"
  ) {
    return value;
  }


  return value.toUpperCase();
}


/* =========================================================
   GRADE POINT
========================================================= */

export function formatGradePoint(
  value
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }


  const number =
    toSafeNumber(
      value,
      NaN
    );


  if (
    !Number.isFinite(
      number
    )
  ) {
    return "—";
  }


  return number.toFixed(
    FORMAT_DEFAULTS.gradePointDecimals
  );
}


/* =========================================================
   STATUS NORMALIZATION
========================================================= */

export function normalizeStatus(
  status
) {
  return safeString(
    status,
    "PENDING"
  )
    .trim()
    .toUpperCase()
    .replace(
      /[\s-]+/g,
      "_"
    );
}


/* =========================================================
   STATUS LABEL
========================================================= */

export function formatStatus(
  status
) {
  const normalized =
    normalizeStatus(
      status
    );


  return (
    STATUS_LABELS[
      normalized
    ] ||
    normalized
      .replace(
        /_/g,
        " "
      )
      .replace(
        /\b\w/g,
        (char) =>
          char.toUpperCase()
      )
  );
}


/* =========================================================
   STATUS MESSAGE
========================================================= */

export function getStatusMessage(
  status
) {
  const normalized =
    normalizeStatus(
      status
    );


  return (
    STATUS_MESSAGES[
      normalized
    ] ||
    "Result status information is unavailable."
  );
}


/* =========================================================
   STATUS TYPE
========================================================= */

export function getStatusType(
  status
) {
  const normalized =
    normalizeStatus(
      status
    );


  if (
    normalized === "PASS" ||
    normalized === "PUBLISHED" ||
    normalized === "VERIFIED"
  ) {
    return "success";
  }


  if (
    normalized === "FAIL" ||
    normalized === "INVALID" ||
    normalized === "REJECTED"
  ) {
    return "danger";
  }


  if (
    normalized === "PENDING" ||
    normalized === "SUBMITTED"
  ) {
    return "warning";
  }


  return "neutral";
}


/* =========================================================
   STATUS ICON
========================================================= */

export function getStatusIcon(
  status
) {
  const normalized =
    normalizeStatus(
      status
    );


  const icons = {
    PASS: "✓",
    FAIL: "!",
    PENDING: "⏳",
    INVALID: "⚠",
    DRAFT: "📝",
    SUBMITTED: "📤",
    VERIFIED: "✓",
    PUBLISHED: "🌐",
    REJECTED: "✕",
  };


  return (
    icons[
      normalized
    ] || "•"
  );
}


/* =========================================================
   DIVISION
========================================================= */

export function formatDivision(
  division
) {
  const value =
    safeString(
      division
    );


  const aliases = {
    FIRST:
      "First Division",

    SECOND:
      "Second Division",

    THIRD:
      "Third Division",

    FIRST_DIVISION:
      "First Division",

    SECOND_DIVISION:
      "Second Division",

    THIRD_DIVISION:
      "Third Division",

    FAILED:
      "Failed",

    PENDING:
      "Pending",

    INVALID:
      "Invalid",
  };


  const normalized =
    value
      .toUpperCase()
      .replace(
        /[\s-]+/g,
        "_"
      );


  return (
    aliases[
      normalized
    ] || value
  );
}


/* =========================================================
   DIVISION SHORT LABEL
========================================================= */

export function formatDivisionShort(
  division
) {
  const normalized =
    safeString(
      division
    )
      .toUpperCase()
      .replace(
        /[\s-]+/g,
        "_"
      );


  if (
    normalized.includes(
      "FIRST"
    )
  ) {
    return "I";
  }


  if (
    normalized.includes(
      "SECOND"
    )
  ) {
    return "II";
  }


  if (
    normalized.includes(
      "THIRD"
    )
  ) {
    return "III";
  }


  if (
    normalized ===
    "FAILED"
  ) {
    return "—";
  }


  return safeString(
    division
  );
}


/* =========================================================
   PERFORMANCE
========================================================= */

export function formatPerformance(
  performance
) {
  if (
    !performance
  ) {
    return {
      title: "Performance",
      level: "—",
      icon: "📊",
      description: "",
    };
  }


  return {
    title:
      "Overall Performance",

    level:
      safeString(
        performance.level ||
          performance.title
      ),

    icon:
      safeString(
        performance.icon,
        "📊"
      ),

    description:
      safeString(
        performance.description,
        ""
      ),
  };
}


/* =========================================================
   PERFORMANCE BY PERCENTAGE
========================================================= */

export function getPerformanceLabel(
  percentage,
  status = ""
) {
  const normalized =
    normalizeStatus(
      status
    );


  if (
    normalized ===
    "PENDING"
  ) {
    return {
      key: "pending",
      label: "Result Pending",
      icon: "⏳",
    };
  }


  if (
    normalized === "FAIL" ||
    normalized === "INVALID"
  ) {
    return {
      key: "improvement",
      label: "Needs Improvement",
      icon: "📚",
    };
  }


  const value =
    toSafeNumber(
      percentage
    );


  if (value >= 90) {
    return {
      key: "outstanding",
      label: "Outstanding",
      icon: "🏆",
    };
  }


  if (value >= 80) {
    return {
      key: "excellent",
      label: "Excellent",
      icon: "🌟",
    };
  }


  if (value >= 70) {
    return {
      key: "veryGood",
      label: "Very Good",
      icon: "⭐",
    };
  }


  if (value >= 60) {
    return {
      key: "good",
      label: "Good",
      icon: "📈",
    };
  }


  if (value >= 50) {
    return {
      key: "average",
      label: "Average",
      icon: "📊",
    };
  }


  return {
    key: "improvement",
    label: "Needs Improvement",
    icon: "📚",
  };
}


/* =========================================================
   COMPONENT LABEL
========================================================= */

export function formatComponentLabel(
  component
) {
  const normalized =
    safeString(
      component
    )
      .toLowerCase();


  return (
    COMPONENT_LABELS[
      normalized
    ] ||
    normalized
      .replace(
        /[_-]+/g,
        " "
      )
      .replace(
        /\b\w/g,
        (char) =>
          char.toUpperCase()
      )
  );
}


/* =========================================================
   SUBJECT CODE
========================================================= */

export function formatSubjectCode(
  code
) {
  if (
    code === undefined ||
    code === null ||
    code === ""
  ) {
    return "—";
  }


  return String(
    code
  )
    .trim()
    .toUpperCase();
}


/* =========================================================
   SUBJECT NAME
========================================================= */

export function formatSubjectName(
  subject
) {
  if (
    typeof subject ===
    "string"
  ) {
    return safeString(
      subject
    );
  }


  return safeString(
    subject?.subjectName ||
      subject?.name ||
      subject?.subject ||
      subject?.title,
    "Unnamed Subject"
  );
}


/* =========================================================
   SUBJECT DISPLAY
========================================================= */

export function formatSubjectDisplay(
  subject
) {
  return {
    name:
      formatSubjectName(
        subject
      ),

    code:
      formatSubjectCode(
        subject?.subjectCode ||
          subject?.code ||
          subject?.subjectId ||
          subject?.id
      ),
  };
}


/* =========================================================
   DATE FORMATTER
========================================================= */

export function formatDate(
  value,
  options = {}
) {
  const {
    locale =
      FORMAT_DEFAULTS.locale,
    fallback = "—",
    includeTime = false,
  } = options;


  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }


  let date;


  /*
   * Firebase Timestamp
   */

  if (
    typeof value?.toDate ===
    "function"
  ) {
    date =
      value.toDate();
  }


  /*
   * Firestore timestamp-like
   */

  else if (
    value?.seconds !==
      undefined
  ) {
    date =
      new Date(
        value.seconds *
          1000
      );
  }


  else {
    date =
      new Date(value);
  }


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return fallback;
  }


  if (includeTime) {
    return date.toLocaleString(
      locale,
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }


  return date.toLocaleDateString(
    locale,
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}


/* =========================================================
   ACADEMIC YEAR
========================================================= */

export function formatAcademicYear(
  value
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "—";
  }


  const text =
    String(value).trim();


  /*
   * Already formatted:
   * 2026-27
   */

  if (
    /^\d{4}-\d{2}$/.test(
      text
    )
  ) {
    return text;
  }


  /*
   * Full year pair:
   * 2026-2027
   */

  const match =
    text.match(
      /^(\d{4})-(\d{4})$/
    );


  if (match) {
    return `${match[1]}-${match[2].slice(
      -2
    )}`;
  }


  return text;
}


/* =========================================================
   EXAMINATION NAME
========================================================= */

export function formatExaminationName(
  value
) {
  return safeString(
    value,
    "Annual Examination"
  );
}


/* =========================================================
   STUDENT NAME
========================================================= */

export function formatStudentName(
  student
) {
  if (
    typeof student ===
    "string"
  ) {
    return safeString(
      student
    );
  }


  return safeString(
    student?.name ||
      student?.studentName ||
      student?.displayName,
    "Student"
  );
}


/* =========================================================
   ADMISSION NUMBER
========================================================= */

export function formatAdmissionNumber(
  student
) {
  return safeString(
    student?.admissionNumber ||
      student?.admissionNo ||
      student?.admission_id
  );
}


/* =========================================================
   ROLL NUMBER
========================================================= */

export function formatRollNumber(
  student
) {
  return safeString(
    student?.rollNumber ||
      student?.rollNo ||
      student?.roll
  );
}


/* =========================================================
   CLASS NAME
========================================================= */

export function formatClassName(
  student
) {
  return safeString(
    student?.className ||
      student?.class ||
      student?.standard
  );
}


/* =========================================================
   SECTION
========================================================= */

export function formatSection(
  student
) {
  return safeString(
    student?.section
  );
}


/* =========================================================
   FATHER NAME
========================================================= */

export function formatFatherName(
  student
) {
  return safeString(
    student?.fatherName ||
      student?.father
  );
}


/* =========================================================
   MOTHER NAME
========================================================= */

export function formatMotherName(
  student
) {
  return safeString(
    student?.motherName ||
      student?.mother
  );
}


/* =========================================================
   GENDER
========================================================= */

export function formatGender(
  gender
) {
  const value =
    safeString(
      gender
    );


  if (
    value === "—"
  ) {
    return value;
  }


  return (
    value
      .charAt(0)
      .toUpperCase() +
    value
      .slice(1)
      .toLowerCase()
  );
}


/* =========================================================
   DATE OF BIRTH
========================================================= */

export function formatDateOfBirth(
  student
) {
  return formatDate(
    student?.dateOfBirth ||
      student?.dob
  );
}


/* =========================================================
   RESULT DOCUMENT ID
========================================================= */

export function formatResultId(
  result
) {
  return safeString(
    result?.resultId ||
      result?.id ||
      result?.resultID
  );
}


/* =========================================================
   VERIFICATION CODE
========================================================= */

export function formatVerificationCode(
  result
) {
  return safeString(
    result?.verificationCode ||
      result?.verificationId ||
      result?.verificationId
  );
}


/* =========================================================
   RANK
========================================================= */

export function formatRank(
  rank
) {
  if (
    rank === undefined ||
    rank === null ||
    rank === "" ||
    rank === "-" ||
    rank === "—"
  ) {
    return "—";
  }


  const number =
    toSafeNumber(
      rank,
      NaN
    );


  if (
    !Number.isFinite(
      number
    ) ||
    number <= 0
  ) {
    return "—";
  }


  const lastTwo =
    number % 100;


  if (
    lastTwo >= 11 &&
    lastTwo <= 13
  ) {
    return `${number}th`;
  }


  switch (
    number % 10
  ) {
    case 1:
      return `${number}st`;

    case 2:
      return `${number}nd`;

    case 3:
      return `${number}rd`;

    default:
      return `${number}th`;
  }
}


/* =========================================================
   TOTAL SUBJECTS
========================================================= */

export function formatSubjectCount(
  count
) {
  const number =
    toSafeNumber(
      count,
      0
    );


  return `${number} ${
    number === 1
      ? "Subject"
      : "Subjects"
  }`;
}


/* =========================================================
   PASS / FAIL COUNT
========================================================= */

export function formatPassCount(
  count
) {
  const number =
    toSafeNumber(
      count,
      0
    );


  return `${number} ${
    number === 1
      ? "Passed"
      : "Passed"
  }`;
}


export function formatFailCount(
  count
) {
  const number =
    toSafeNumber(
      count,
      0
    );


  return `${number} ${
    number === 1
      ? "Failed"
      : "Failed"
  }`;
}


/* =========================================================
   RESULT SUMMARY TEXT
========================================================= */

export function formatResultSummary(
  result = {}
) {
  const status =
    formatStatus(
      result.status
    );


  const percentage =
    formatPercentage(
      result.percentage
    );


  const grade =
    formatGrade(
      result.grade
    );


  return `${status} • ${percentage} • Grade ${grade}`;
}


/* =========================================================
   RESULT TITLE
========================================================= */

export function formatResultTitle({
  examinationName,
  academicYear,
} = {}) {
  const exam =
    formatExaminationName(
      examinationName
    );

  const year =
    formatAcademicYear(
      academicYear
    );


  if (
    year === "—"
  ) {
    return exam;
  }


  return `${exam} — ${year}`;
}


/* =========================================================
   RESULT BADGE
========================================================= */

export function getResultBadge(
  status
) {
  const normalized =
    normalizeStatus(
      status
    );


  return {
    label:
      formatStatus(
        normalized
      ),

    icon:
      getStatusIcon(
        normalized
      ),

    type:
      getStatusType(
        normalized
      ),

    message:
      getStatusMessage(
        normalized
      ),
  };
}


/* =========================================================
   STUDENT DISPLAY OBJECT
========================================================= */

export function formatStudentDisplay(
  student = {}
) {
  return {
    name:
      formatStudentName(
        student
      ),

    admissionNumber:
      formatAdmissionNumber(
        student
      ),

    rollNumber:
      formatRollNumber(
        student
      ),

    className:
      formatClassName(
        student
      ),

    section:
      formatSection(
        student
      ),

    fatherName:
      formatFatherName(
        student
      ),

    motherName:
      formatMotherName(
        student
      ),

    gender:
      formatGender(
        student?.gender
      ),

    dateOfBirth:
      formatDateOfBirth(
        student
      ),

    photo:
      safeString(
        student?.photo ||
          student?.photoURL ||
          student?.photoUrl,
        ""
      ),
  };
}


/* =========================================================
   RESULT DISPLAY OBJECT
========================================================= */

export function formatResultDisplay(
  result = {}
) {
  const badge =
    getResultBadge(
      result.status
    );


  const performance =
    getPerformanceLabel(
      result.percentage,
      result.status
    );


  return {
    obtainedMarks:
      formatMarks(
        result.obtainedMarks
      ),

    maximumMarks:
      formatMarks(
        result.maximumMarks
      ),

    marks:
      formatMarksWithMaximum(
        result.obtainedMarks,
        result.maximumMarks
      ),

    percentage:
      formatPercentage(
        result.percentage
      ),

    grade:
      formatGrade(
        result.grade
      ),

    gradePoint:
      formatGradePoint(
        result.gradePoint
      ),

    division:
      formatDivision(
        result.division
      ),

    rank:
      formatRank(
        result.rank
      ),

    status:
      badge.label,

    statusIcon:
      badge.icon,

    statusType:
      badge.type,

    statusMessage:
      badge.message,

    performance:
      performance.label,

    performanceIcon:
      performance.icon,
  };
}


/* =========================================================
   SUBJECT DISPLAY RESULT
========================================================= */

export function formatSubjectResult(
  subjectResult = {}
) {
  const subject =
    formatSubjectDisplay(
      subjectResult
    );


  return {
    ...subject,

    obtainedMarks:
      formatMarks(
        subjectResult.obtainedMarks
      ),

    maximumMarks:
      formatMarks(
        subjectResult.maximumMarks
      ),

    marks:
      formatMarksWithMaximum(
        subjectResult.obtainedMarks,
        subjectResult.maximumMarks
      ),

    percentage:
      formatPercentage(
        subjectResult.percentage
      ),

    grade:
      formatGrade(
        subjectResult.grade
      ),

    gradePoint:
      formatGradePoint(
        subjectResult.gradePoint
      ),

    division:
      formatDivision(
        subjectResult.division
      ),

    status:
      formatStatus(
        subjectResult.status
      ),
  };
}


/* =========================================================
   COMPONENT DISPLAY
========================================================= */

export function formatComponentResult(
  componentResult = {}
) {
  return {
    component:
      safeString(
        componentResult.component
      ),

    label:
      formatComponentLabel(
        componentResult.component
      ),

    marks:
      formatMarks(
        componentResult.marks
      ),

    maximum:
      formatMarks(
        componentResult.maximum
      ),

    passing:
      formatMarks(
        componentResult.passing
      ),

    percentage:
      formatPercentage(
        componentResult.percentage
      ),

    status:
      componentResult.entered
        ? componentResult.passed
          ? "Pass"
          : "Fail"
        : "Pending",

    entered:
      !!componentResult.entered,

    valid:
      componentResult.valid !==
      false,

    passed:
      !!componentResult.passed,
  };
}


/* =========================================================
   RESULT DATE DISPLAY
========================================================= */

export function formatResultDates(
  result = {}
) {
  return {
    createdAt:
      formatDate(
        result.createdAt
      ),

    updatedAt:
      formatDate(
        result.updatedAt
      ),

    submittedAt:
      formatDate(
        result.submittedAt
      ),

    verifiedAt:
      formatDate(
        result.verifiedAt
      ),

    publishedAt:
      formatDate(
        result.publishedAt
      ),

    generatedAt:
      formatDate(
        result.generatedAt,
        {
          includeTime:
            true,
        }
      ),
  };
}


/* =========================================================
   DOCUMENT FOOTER
========================================================= */

export function formatDocumentFooter({
  generatedAt,
  documentType =
    "Official Student Result",
} = {}) {
  return {
    documentType:
      safeString(
        documentType
      ),

    generatedAt:
      formatDate(
        generatedAt ||
          new Date(),
        {
          includeTime:
            true,
        }
      ),

    officialText:
      "This document is system generated.",
  };
}


/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default {
  FORMAT_DEFAULTS,

  STATUS_LABELS,
  STATUS_MESSAGES,
  COMPONENT_LABELS,

  safeString,
  toSafeNumber,

  formatMarks,
  formatMarksWithMaximum,
  formatPercentage,

  formatGrade,
  formatGradePoint,

  normalizeStatus,
  formatStatus,
  getStatusMessage,
  getStatusType,
  getStatusIcon,
  getResultBadge,

  formatDivision,
  formatDivisionShort,

  formatPerformance,
  getPerformanceLabel,

  formatComponentLabel,

  formatSubjectCode,
  formatSubjectName,
  formatSubjectDisplay,

  formatDate,
  formatAcademicYear,
  formatExaminationName,

  formatStudentName,
  formatAdmissionNumber,
  formatRollNumber,
  formatClassName,
  formatSection,
  formatFatherName,
  formatMotherName,
  formatGender,
  formatDateOfBirth,

  formatResultId,
  formatVerificationCode,

  formatRank,
  formatSubjectCount,
  formatPassCount,
  formatFailCount,

  formatResultSummary,
  formatResultTitle,

  formatStudentDisplay,
  formatResultDisplay,
  formatSubjectResult,
  formatComponentResult,

  formatResultDates,
  formatDocumentFooter,
};