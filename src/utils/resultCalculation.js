/* =========================================================
   STUDENT RESULT CALCULATION ENGINE
   ---------------------------------------------------------
   Responsibility:
   - Marks normalization
   - Maximum marks
   - Obtained marks
   - Percentage
   - Grade
   - Pass / Fail
   - Subject calculations
   - Overall calculations

   This file contains calculation logic only.
   UI, Firebase, PDF, QR and navigation are NOT handled here.
========================================================= */


/* =========================================================
   BASIC NUMBER HELPERS
========================================================= */

export function toNumber(value, fallback = 0) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : fallback;
  }

  const cleaned = String(value)
    .replace(/,/g, "")
    .replace(/[₹$€£\s]/g, "")
    .trim();

  if (!cleaned) {
    return fallback;
  }

  const number = Number(cleaned);

  return Number.isFinite(number)
    ? number
    : fallback;
}


/* =========================================================
   ROUNDING
========================================================= */

export function roundNumber(
  value,
  decimals = 2
) {
  const number = toNumber(value);

  const factor =
    10 ** decimals;

  return (
    Math.round(
      (number + Number.EPSILON) *
        factor
    ) / factor
  );
}


/* =========================================================
   PERCENTAGE
========================================================= */

export function calculatePercentage(
  obtained,
  maximum
) {
  const obtainedMarks =
    toNumber(obtained);

  const maximumMarks =
    toNumber(maximum);

  if (
    maximumMarks <= 0
  ) {
    return 0;
  }

  return roundNumber(
    (obtainedMarks /
      maximumMarks) *
      100,
    2
  );
}


/* =========================================================
   GRADE
   ---------------------------------------------------------
   Standard school grading bands.
========================================================= */

export function calculateGrade(
  percentage
) {
  const value =
    toNumber(percentage);

  if (value >= 90) return "A+";
  if (value >= 80) return "A";
  if (value >= 70) return "B+";
  if (value >= 60) return "B";
  if (value >= 50) return "C";
  if (value >= 40) return "D";

  return "F";
}


/* =========================================================
   GRADE POINT
========================================================= */

export function calculateGradePoint(
  percentage
) {
  const value =
    toNumber(percentage);

  if (value >= 90) return 10;
  if (value >= 80) return 9;
  if (value >= 70) return 8;
  if (value >= 60) return 7;
  if (value >= 50) return 6;
  if (value >= 40) return 5;

  return 0;
}


/* =========================================================
   PASS / FAIL
   ---------------------------------------------------------
   Default passing percentage = 33%.
   A custom threshold can be supplied.
========================================================= */

export function isPassing(
  percentage,
  passingPercentage = 33
) {
  return (
    toNumber(percentage) >=
    toNumber(
      passingPercentage,
      33
    )
  );
}


/* =========================================================
   SUBJECT MARKS
========================================================= */

export function calculateSubjectMarks(
  subject = {},
  options = {}
) {
  const passingPercentage =
    toNumber(
      options.passingPercentage,
      33
    );

  const maximum =
    toNumber(
      subject.maxMarks ??
        subject.maximumMarks ??
        subject.max ??
        subject.totalMarks ??
        0
    );

  const obtained =
    toNumber(
      subject.obtainedMarks ??
        subject.marksObtained ??
        subject.marks ??
        subject.score ??
        subject.total ??
        0
    );

  const percentage =
    calculatePercentage(
      obtained,
      maximum
    );

  const grade =
    calculateGrade(
      percentage
    );

  const gradePoint =
    calculateGradePoint(
      percentage
    );

  const pass =
    isPassing(
      percentage,
      passingPercentage
    );

  return {
    ...subject,

    maximumMarks: maximum,
    maxMarks: maximum,

    obtainedMarks: obtained,
    marksObtained: obtained,

    percentage,

    grade,

    gradePoint,

    status: pass
      ? "PASS"
      : "FAIL",

    pass,
  };
}


/* =========================================================
   TOTAL MARKS
========================================================= */

export function calculateTotals(
  subjects = []
) {
  let maximumMarks = 0;
  let obtainedMarks = 0;

  subjects.forEach(
    (subject) => {
      maximumMarks +=
        toNumber(
          subject.maximumMarks ??
            subject.maxMarks ??
            subject.maximum ??
            subject.max ??
            0
        );

      obtainedMarks +=
        toNumber(
          subject.obtainedMarks ??
            subject.marksObtained ??
            subject.obtained ??
            subject.marks ??
            0
        );
    }
  );

  const percentage =
    calculatePercentage(
      obtainedMarks,
      maximumMarks
    );

  return {
    maximumMarks:
      roundNumber(
        maximumMarks
      ),

    obtainedMarks:
      roundNumber(
        obtainedMarks
      ),

    percentage,

    grade:
      calculateGrade(
        percentage
      ),

    gradePoint:
      calculateGradePoint(
        percentage
      ),
  };
}


/* =========================================================
   COMPLETE RESULT CALCULATION
========================================================= */

export function calculateResult(
  subjects = [],
  options = {}
) {
  const passingPercentage =
    toNumber(
      options.passingPercentage,
      33
    );

  const calculatedSubjects =
    subjects.map(
      (subject) =>
        calculateSubjectMarks(
          subject,
          {
            passingPercentage,
          }
        )
    );

  const totals =
    calculateTotals(
      calculatedSubjects
    );

  const failedSubjects =
    calculatedSubjects.filter(
      (subject) =>
        !subject.pass
    );

  const passedSubjects =
    calculatedSubjects.filter(
      (subject) =>
        subject.pass
    );

  return {
    subjects:
      calculatedSubjects,

    maximumMarks:
      totals.maximumMarks,

    obtainedMarks:
      totals.obtainedMarks,

    percentage:
      totals.percentage,

    grade:
      totals.grade,

    gradePoint:
      totals.gradePoint,

    passedSubjects:
      passedSubjects.length,

    failedSubjects:
      failedSubjects.length,

    totalSubjects:
      calculatedSubjects.length,

    status:
      failedSubjects.length > 0
        ? "FAIL"
        : "PASS",

    pass:
      failedSubjects.length === 0,
  };
}


/* =========================================================
   RESULT COMPLETION
   ---------------------------------------------------------
   Used to prevent showing PASS/FAIL before actual marks
   are available.
========================================================= */

export function isMarksAvailable(
  subject = {}
) {
  const hasMaximum =
    subject.maxMarks !==
      undefined ||
    subject.maximumMarks !==
      undefined ||
    subject.totalMarks !==
      undefined;

  const hasObtained =
    subject.obtainedMarks !==
      undefined ||
    subject.marksObtained !==
      undefined ||
    subject.marks !==
      undefined;

  return (
    hasMaximum &&
    hasObtained
  );
}


/* =========================================================
   CHECK COMPLETE RESULT
========================================================= */

export function isResultComplete(
  subjects = []
) {
  if (
    !Array.isArray(subjects) ||
    subjects.length === 0
  ) {
    return false;
  }

  return subjects.every(
    (subject) =>
      isMarksAvailable(
        subject
      )
  );
}


/* =========================================================
   SAFE RESULT STATUS
   ---------------------------------------------------------
   Incomplete result = PENDING
========================================================= */

export function calculateResultStatus(
  subjects = [],
  options = {}
) {
  if (
    !isResultComplete(
      subjects
    )
  ) {
    return "PENDING";
  }

  const result =
    calculateResult(
      subjects,
      options
    );

  return result.status;
}


/* =========================================================
   SAFE OVERALL GRADE
========================================================= */

export function calculateOverallGrade(
  subjects = [],
  options = {}
) {
  if (
    !isResultComplete(
      subjects
    )
  ) {
    return "—";
  }

  return calculateResult(
    subjects,
    options
  ).grade;
}


/* =========================================================
   SAFE OVERALL PERCENTAGE
========================================================= */

export function calculateOverallPercentage(
  subjects = []
) {
  if (
    !isResultComplete(
      subjects
    )
  ) {
    return 0;
  }

  return calculateTotals(
    subjects
  ).percentage;
}


/* =========================================================
   FORMAT MARKS
========================================================= */

export function formatMarks(
  obtained,
  maximum
) {
  return `${toNumber(
    obtained
  )}/${toNumber(
    maximum
  )}`;
}


/* =========================================================
   FORMAT PERCENTAGE
========================================================= */

export function formatPercentage(
  value
) {
  return `${roundNumber(
    value,
    2
  ).toFixed(2)}%`;
}


/* =========================================================
   EXPORT DEFAULT
========================================================= */

export default {
  toNumber,
  roundNumber,
  calculatePercentage,
  calculateGrade,
  calculateGradePoint,
  isPassing,
  calculateSubjectMarks,
  calculateTotals,
  calculateResult,
  isMarksAvailable,
  isResultComplete,
  calculateResultStatus,
  calculateOverallGrade,
  calculateOverallPercentage,
  formatMarks,
  formatPercentage,
};