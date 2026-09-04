/* =========================================================
   ANNUAL RESULT CONSOLIDATION ENGINE

   Responsibility:
   - Published exam selection
   - Maximum 3 exam consolidation
   - Annual result readiness
   - Subject-wise aggregation
   - Overall marks / percentage
   - PASS / FAIL
   - Grade
   - Pending state

   This file does NOT:
   - fetch Firebase
   - render UI
   - navigate
   - generate PDF
   - generate QR

========================================================= */

import {
  toNumber,
  roundNumber,
  calculatePercentage,
  calculateGrade,
  calculateGradePoint,
} from "./resultCalculation";

import {
  isResultComplete,
  normalizeSubject,
} from "./resultCompletion";


/* =========================================================
   CONSTANTS
========================================================= */

export const MAX_ANNUAL_EXAMS = 3;

export const ANNUAL_STATUS = {
  PENDING: "PENDING",
  READY: "READY",
  PASS: "PASS",
  FAIL: "FAIL",
};


/* =========================================================
   TEXT NORMALIZATION
========================================================= */

export function normalizeText(value) {
  return String(
    value ?? ""
  )
    .trim()
    .toLowerCase();
}


/* =========================================================
   EXAM TYPE
========================================================= */

export function getExamType(
  result = {}
) {
  return normalizeText(
    result.examType ??
      result.resultType ??
      result.type ??
      ""
  ).toUpperCase();
}


/* =========================================================
   CHECK OFFICIAL ANNUAL RESULT
========================================================= */

export function isOfficialAnnualResult(
  result = {}
) {
  const type =
    getExamType(
      result
    );

  return (
    type === "ANNUAL" ||
    type === "FINAL"
  );
}


/* =========================================================
   PUBLISHED CHECK
========================================================= */

export function isPublishedResult(
  result = {}
) {
  if (
    result.published === true ||
    result.isPublished === true
  ) {
    return true;
  }

  const status =
    normalizeText(
      result.status
    );

  return (
    status === "published" ||
    status === "declared" ||
    status === "active"
  );
}


/* =========================================================
   EXAM ID
========================================================= */

export function getExamKey(
  result = {}
) {
  return normalizeText(
    result.examId ??
      result.examID ??
      result.examName ??
      result.examinationName ??
      result.name ??
      result.id ??
      ""
  );
}


/* =========================================================
   EXAM NAME
========================================================= */

export function getExamName(
  result = {}
) {
  return (
    result.examName ??
    result.examinationName ??
    result.name ??
    result.title ??
    "Examination"
  );
}


/* =========================================================
   DATE / TIME
========================================================= */

export function getResultTime(
  result = {}
) {
  const value =
    result.publishedAt ??
    result.declaredAt ??
    result.updatedAt ??
    result.createdAt ??
    0;

  if (
    value &&
    typeof value.toMillis ===
      "function"
  ) {
    return value.toMillis();
  }

  if (
    value &&
    typeof value.toDate ===
      "function"
  ) {
    return value.toDate().getTime();
  }

  const date =
    new Date(value);

  const time =
    date.getTime();

  return Number.isFinite(time)
    ? time
    : 0;
}


/* =========================================================
   SORT RESULTS
========================================================= */

export function sortResults(
  results = []
) {
  return [...results].sort(
    (a, b) =>
      getResultTime(a) -
      getResultTime(b)
  );
}


/* =========================================================
   UNIQUE PUBLISHED EXAMS
========================================================= */

export function getPublishedExams(
  results = []
) {
  if (
    !Array.isArray(results)
  ) {
    return [];
  }

  const seen =
    new Set();

  const output =
    [];

  sortResults(
    results
  ).forEach(
    (result) => {
      if (
        !isPublishedResult(
          result
        )
      ) {
        return;
      }

      if (
        isOfficialAnnualResult(
          result
        )
      ) {
        return;
      }

      const key =
        getExamKey(
          result
        );

      if (!key) {
        return;
      }

      if (
        seen.has(key)
      ) {
        return;
      }

      seen.add(key);

      output.push(
        result
      );
    }
  );

  return output.slice(
    0,
    MAX_ANNUAL_EXAMS
  );
}


/* =========================================================
   OFFICIAL ANNUAL RESULT
========================================================= */

export function getOfficialAnnualResult(
  results = []
) {
  if (
    !Array.isArray(results)
  ) {
    return null;
  }

  const annual =
    results.find(
      (result) =>
        isPublishedResult(
          result
        ) &&
        isOfficialAnnualResult(
          result
        )
    );

  return annual || null;
}


/* =========================================================
   SUBJECT LIST EXTRACTION
========================================================= */

export function getSubjects(
  result = {}
) {
  const possible =
    result.subjects ??
    result.subjectMarks ??
    result.marks ??
    result.results ??
    [];

  if (
    Array.isArray(
      possible
    )
  ) {
    return possible;
  }

  if (
    possible &&
    typeof possible ===
      "object"
  ) {
    return Object.entries(
      possible
    ).map(
      ([key, value]) => ({
        ...(value || {}),
        subjectName:
          value?.subjectName ??
          value?.name ??
          key,
      })
    );
  }

  return [];
}


/* =========================================================
   SUBJECT KEY
========================================================= */

export function getSubjectKey(
  subject = {}
) {
  return normalizeText(
    subject.subjectId ??
      subject.subjectID ??
      subject.code ??
      subject.subjectCode ??
      subject.subjectName ??
      subject.name ??
      subject.subject ??
      ""
  );
}


/* =========================================================
   SUBJECT NAME
========================================================= */

export function getSubjectName(
  subject = {}
) {
  return (
    subject.subjectName ??
    subject.name ??
    subject.subject ??
    "Subject"
  );
}


/* =========================================================
   GET SUBJECT MARKS
========================================================= */

export function getSubjectMarks(
  subject = {}
) {
  const normalized =
    normalizeSubject(
      subject
    );

  return {
    maximum:
      normalized.maximumMarks,

    obtained:
      normalized.obtainedMarks,

    name:
      getSubjectName(
        normalized
      ),

    key:
      getSubjectKey(
        normalized
      ),
  };
}


/* =========================================================
   CHECK ALL EXAMS COMPLETE
========================================================= */

export function areAllExamsComplete(
  exams = []
) {
  if (
    !Array.isArray(
      exams
    ) ||
    exams.length !==
      MAX_ANNUAL_EXAMS
  ) {
    return false;
  }

  return exams.every(
    (exam) =>
      isResultComplete(
        getSubjects(
          exam
        )
      )
  );
}


/* =========================================================
   COLLECT SUBJECTS
========================================================= */

export function collectSubjectKeys(
  exams = []
) {
  const keys =
    new Set();

  exams.forEach(
    (exam) => {
      getSubjects(
        exam
      ).forEach(
        (subject) => {
          const key =
            getSubjectKey(
              subject
            );

          if (key) {
            keys.add(
              key
            );
          }
        }
      );
    }
  );

  return [
    ...keys,
  ];
}


/* =========================================================
   FIND SUBJECT FROM EXAM
========================================================= */

export function findSubject(
  exam,
  subjectKey
) {
  return getSubjects(
    exam
  ).find(
    (subject) =>
      getSubjectKey(
        subject
      ) === subjectKey
  );
}


/* =========================================================
   CONSOLIDATE SUBJECT
   ---------------------------------------------------------
   Annual marks are calculated by adding the corresponding
   subject marks from each of the 3 exams.

   Example:

   Exam 1 Maths = 70/100
   Exam 2 Maths = 75/100
   Exam 3 Maths = 80/100

   Annual Maths =
   225 / 300
========================================================= */

export function consolidateSubject(
  subjectKey,
  exams = []
) {
  let maximum = 0;
  let obtained = 0;

  let subjectName =
    "Subject";

  const examBreakdown =
    [];

  exams.forEach(
    (exam) => {
      const subject =
        findSubject(
          exam,
          subjectKey
        );

      if (!subject) {
        return;
      }

      const marks =
        getSubjectMarks(
          subject
        );

      subjectName =
        marks.name;

      maximum +=
        marks.maximum;

      obtained +=
        marks.obtained;

      examBreakdown.push(
        {
          examId:
            exam.examId ??
            exam.id ??
            null,

          examName:
            getExamName(
              exam
            ),

          maximumMarks:
            marks.maximum,

          obtainedMarks:
            marks.obtained,
        }
      );
    }
  );

  const percentage =
    calculatePercentage(
      obtained,
      maximum
    );

  return {
    subjectId:
      subjectKey,

    subjectName,

    name:
      subjectName,

    maximumMarks:
      maximum,

    maxMarks:
      maximum,

    obtainedMarks:
      obtained,

    marksObtained:
      obtained,

    percentage,

    grade:
      calculateGrade(
        percentage
      ),

    gradePoint:
      calculateGradePoint(
        percentage
      ),

    pass:
      percentage >= 33,

    status:
      percentage >= 33
        ? "PASS"
        : "FAIL",

    examBreakdown,
  };
}


/* =========================================================
   CONSOLIDATE ALL SUBJECTS
========================================================= */

export function consolidateSubjects(
  exams = []
) {
  const keys =
    collectSubjectKeys(
      exams
    );

  return keys.map(
    (key) =>
      consolidateSubject(
        key,
        exams
      )
  );
}


/* =========================================================
   TOTAL ANNUAL MARKS
========================================================= */

export function calculateAnnualTotals(
  subjects = []
) {
  let maximum = 0;
  let obtained = 0;

  subjects.forEach(
    (subject) => {
      maximum +=
        toNumber(
          subject.maximumMarks
        );

      obtained +=
        toNumber(
          subject.obtainedMarks
        );
    }
  );

  const percentage =
    calculatePercentage(
      obtained,
      maximum
    );

  const failedSubjects =
    subjects.filter(
      (subject) =>
        !subject.pass
    ).length;

  return {
    maximumMarks:
      roundNumber(
        maximum
      ),

    obtainedMarks:
      roundNumber(
        obtained
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

    totalSubjects:
      subjects.length,

    passedSubjects:
      subjects.length -
      failedSubjects,

    failedSubjects,
  };
}


/* =========================================================
   BUILD ANNUAL RESULT
========================================================= */

export function buildAnnualResult(
  exams = []
) {
  if (
    !Array.isArray(
      exams
    ) ||
    exams.length !==
      MAX_ANNUAL_EXAMS
  ) {
    return {
      ready: false,

      status:
        ANNUAL_STATUS.PENDING,

      exams,

      subjects: [],

      message:
        `Annual result will be available after all ${MAX_ANNUAL_EXAMS} exams are declared.`,
    };
  }

  if (
    !areAllExamsComplete(
      exams
    )
  ) {
    return {
      ready: false,

      status:
        ANNUAL_STATUS.PENDING,

      exams,

      subjects: [],

      message:
        "Annual result is pending because one or more exam results are incomplete.",
    };
  }

  const subjects =
    consolidateSubjects(
      exams
    );

  const totals =
    calculateAnnualTotals(
      subjects
    );

  const status =
    totals.failedSubjects >
    0
      ? ANNUAL_STATUS.FAIL
      : ANNUAL_STATUS.PASS;

  return {
    ready: true,

    status,

    exams,

    subjects,

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

    totalSubjects:
      totals.totalSubjects,

    passedSubjects:
      totals.passedSubjects,

    failedSubjects:
      totals.failedSubjects,

    message:
      status ===
      ANNUAL_STATUS.PASS
        ? "Annual result declared: PASS."
        : "Annual result declared: FAIL.",
  };
}


/* =========================================================
   COMPLETE CONSOLIDATION PIPELINE
========================================================= */

export function consolidateResults(
  results = []
) {
  const officialAnnual =
    getOfficialAnnualResult(
      results
    );

  /* -------------------------------------------------------
     Admin has already published an official Annual/Final
     result. Use that as the official result.
  ------------------------------------------------------- */

  if (
    officialAnnual
  ) {
    const subjects =
      getSubjects(
        officialAnnual
      );

    const complete =
      isResultComplete(
        subjects
      );

    return {
      ready: complete,

      official: true,

      status: complete
        ? "READY"
        : "PENDING",

      result:
        officialAnnual,

      exams: [],

      message:
        complete
          ? "Official annual result is available."
          : "Official annual result is incomplete.",
    };
  }

  /* -------------------------------------------------------
     Otherwise use the first 3 published examinations.
  ------------------------------------------------------- */

  const exams =
    getPublishedExams(
      results
    );

  if (
    exams.length <
    MAX_ANNUAL_EXAMS
  ) {
    return {
      ready: false,

      official: false,

      status:
        ANNUAL_STATUS.PENDING,

      result: null,

      exams,

      message:
        `Annual result pending: ${exams.length}/${MAX_ANNUAL_EXAMS} exams declared.`,
    };
  }

  const annual =
    buildAnnualResult(
      exams
    );

  return {
    ready:
      annual.ready,

    official: false,

    status:
      annual.status,

    result:
      annual.ready
        ? annual
        : null,

    exams,

    message:
      annual.message,
  };
}


/* =========================================================
   ANNUAL PROGRESS
========================================================= */

export function getAnnualProgress(
  results = []
) {
  const exams =
    getPublishedExams(
      results
    );

  const completeExams =
    exams.filter(
      (exam) =>
        isResultComplete(
          getSubjects(
            exam
          )
        )
    );

  return {
    declared:
      exams.length,

    required:
      MAX_ANNUAL_EXAMS,

    complete:
      completeExams.length,

    remaining:
      Math.max(
        0,
        MAX_ANNUAL_EXAMS -
          exams.length
      ),

    percentage:
      Math.round(
        (exams.length /
          MAX_ANNUAL_EXAMS) *
          100
      ),

    ready:
      exams.length ===
        MAX_ANNUAL_EXAMS &&
      completeExams.length ===
        MAX_ANNUAL_EXAMS,
  };
}


/* =========================================================
   EXPORT DEFAULT
========================================================= */

export default {
  MAX_ANNUAL_EXAMS,

  ANNUAL_STATUS,

  normalizeText,

  getExamType,

  isOfficialAnnualResult,

  isPublishedResult,

  getExamKey,

  getExamName,

  getResultTime,

  sortResults,

  getPublishedExams,

  getOfficialAnnualResult,

  getSubjects,

  getSubjectKey,

  getSubjectName,

  getSubjectMarks,

  areAllExamsComplete,

  collectSubjectKeys,

  findSubject,

  consolidateSubject,

  consolidateSubjects,

  calculateAnnualTotals,

  buildAnnualResult,

  consolidateResults,

  getAnnualProgress,
};