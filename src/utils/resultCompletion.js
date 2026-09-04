/* =========================================================
   RESULT COMPLETION & STATUS ENGINE

   Responsibility:
   - Check whether result data is complete
   - Keep result PENDING until all required marks exist
   - Calculate final PASS / FAIL
   - Calculate grade
   - Detect incomplete subjects
   - Detect missing marks
   - Provide safe status information

   IMPORTANT:
   This file does NOT fetch Firebase data.
   This file does NOT render UI.
   This file does NOT handle navigation.
========================================================= */

import {
  toNumber,
  calculatePercentage,
  calculateGrade,
  calculateGradePoint,
} from "./resultCalculation";


/* =========================================================
   NORMALIZE SUBJECT
========================================================= */

export function normalizeSubject(
  subject = {}
) {
  return {
    ...subject,

    name:
      subject.name ??
      subject.subjectName ??
      subject.subject ??
      "Subject",

    maximumMarks: toNumber(
      subject.maximumMarks ??
        subject.maxMarks ??
        subject.maximum ??
        subject.max ??
        subject.totalMarks ??
        0
    ),

    obtainedMarks:
      subject.obtainedMarks !==
        undefined
        ? toNumber(
            subject.obtainedMarks
          )
        : subject.marksObtained !==
            undefined
        ? toNumber(
            subject.marksObtained
          )
        : subject.marks !==
            undefined
        ? toNumber(
            subject.marks
          )
        : null,
  };
}


/* =========================================================
   CHECK WHETHER MARK EXISTS
========================================================= */

export function hasObtainedMarks(
  subject = {}
) {
  return (
    subject.obtainedMarks !==
      undefined &&
    subject.obtainedMarks !==
      null &&
    subject.obtainedMarks !== ""
  );
}


/* =========================================================
   CHECK MAXIMUM MARKS
========================================================= */

export function hasMaximumMarks(
  subject = {}
) {
  const maximum =
    toNumber(
      subject.maximumMarks ??
        subject.maxMarks ??
        subject.maximum ??
        subject.max ??
        subject.totalMarks ??
        0
    );

  return maximum > 0;
}


/* =========================================================
   CHECK VALID MARK RANGE
========================================================= */

export function hasValidMarks(
  subject = {}
) {
  const normalized =
    normalizeSubject(
      subject
    );

  const maximum =
    normalized.maximumMarks;

  const obtained =
    normalized.obtainedMarks;

  if (
    maximum <= 0 ||
    obtained === null
  ) {
    return false;
  }

  return (
    obtained >= 0 &&
    obtained <= maximum
  );
}


/* =========================================================
   SUBJECT COMPLETION
========================================================= */

export function isSubjectComplete(
  subject = {}
) {
  const normalized =
    normalizeSubject(
      subject
    );

  return (
    hasMaximumMarks(
      normalized
    ) &&
    hasObtainedMarks(
      normalized
    ) &&
    hasValidMarks(
      normalized
    )
  );
}


/* =========================================================
   GET INCOMPLETE SUBJECTS
========================================================= */

export function getIncompleteSubjects(
  subjects = []
) {
  if (
    !Array.isArray(
      subjects
    )
  ) {
    return [];
  }

  return subjects.filter(
    (subject) =>
      !isSubjectComplete(
        subject
      )
  );
}


/* =========================================================
   GET COMPLETE SUBJECTS
========================================================= */

export function getCompleteSubjects(
  subjects = []
) {
  if (
    !Array.isArray(
      subjects
    )
  ) {
    return [];
  }

  return subjects.filter(
    (subject) =>
      isSubjectComplete(
        subject
      )
  );
}


/* =========================================================
   RESULT COMPLETION
========================================================= */

export function isResultComplete(
  subjects = []
) {
  if (
    !Array.isArray(
      subjects
    ) ||
    subjects.length === 0
  ) {
    return false;
  }

  return subjects.every(
    (subject) =>
      isSubjectComplete(
        subject
      )
  );
}


/* =========================================================
   COMPLETION DETAILS
========================================================= */

export function getCompletionDetails(
  subjects = []
) {
  const list =
    Array.isArray(
      subjects
    )
      ? subjects
      : [];

  const incomplete =
    getIncompleteSubjects(
      list
    );

  const complete =
    getCompleteSubjects(
      list
    );

  return {
    totalSubjects:
      list.length,

    completeSubjects:
      complete.length,

    incompleteSubjects:
      incomplete.length,

    isComplete:
      list.length > 0 &&
      incomplete.length === 0,

    missingSubjects:
      incomplete.map(
        (subject) =>
          normalizeSubject(
            subject
          ).name
      ),
  };
}


/* =========================================================
   RESULT STATUS
   ---------------------------------------------------------
   PENDING is always returned when marks are incomplete.
========================================================= */

export function getResultStatus(
  subjects = [],
  options = {}
) {
  const {
    passingPercentage = 33,
  } = options;

  if (
    !isResultComplete(
      subjects
    )
  ) {
    return "PENDING";
  }

  let totalMaximum = 0;
  let totalObtained = 0;

  let failedSubjects = 0;

  subjects.forEach(
    (subject) => {
      const normalized =
        normalizeSubject(
          subject
        );

      const maximum =
        normalized.maximumMarks;

      const obtained =
        normalized.obtainedMarks;

      totalMaximum +=
        maximum;

      totalObtained +=
        obtained;

      const percentage =
        calculatePercentage(
          obtained,
          maximum
        );

      if (
        percentage <
        passingPercentage
      ) {
        failedSubjects++;
      }
    }
  );

  if (
    totalMaximum <= 0
  ) {
    return "PENDING";
  }

  return failedSubjects > 0
    ? "FAIL"
    : "PASS";
}


/* =========================================================
   RESULT PERCENTAGE
========================================================= */

export function getResultPercentage(
  subjects = []
) {
  if (
    !isResultComplete(
      subjects
    )
  ) {
    return null;
  }

  let maximum = 0;
  let obtained = 0;

  subjects.forEach(
    (subject) => {
      const normalized =
        normalizeSubject(
          subject
        );

      maximum +=
        normalized.maximumMarks;

      obtained +=
        normalized.obtainedMarks;
    }
  );

  if (
    maximum <= 0
  ) {
    return null;
  }

  return calculatePercentage(
    obtained,
    maximum
  );
}


/* =========================================================
   RESULT GRADE
========================================================= */

export function getResultGrade(
  subjects = []
) {
  const percentage =
    getResultPercentage(
      subjects
    );

  if (
    percentage === null
  ) {
    return "—";
  }

  return calculateGrade(
    percentage
  );
}


/* =========================================================
   RESULT GRADE POINT
========================================================= */

export function getResultGradePoint(
  subjects = []
) {
  const percentage =
    getResultPercentage(
      subjects
    );

  if (
    percentage === null
  ) {
    return null;
  }

  return calculateGradePoint(
    percentage
  );
}


/* =========================================================
   RESULT SUMMARY
========================================================= */

export function getResultSummary(
  subjects = [],
  options = {}
) {
  const completion =
    getCompletionDetails(
      subjects
    );

  if (
    !completion.isComplete
  ) {
    return {
      status: "PENDING",

      percentage: null,

      grade: "—",

      gradePoint: null,

      totalMaximum: 0,

      totalObtained: 0,

      passedSubjects: 0,

      failedSubjects: 0,

      totalSubjects:
        completion.totalSubjects,

      completeSubjects:
        completion.completeSubjects,

      incompleteSubjects:
        completion.incompleteSubjects,

      missingSubjects:
        completion.missingSubjects,
    };
  }

  let totalMaximum = 0;
  let totalObtained = 0;

  let passedSubjects = 0;
  let failedSubjects = 0;

  const passingPercentage =
    toNumber(
      options.passingPercentage,
      33
    );

  subjects.forEach(
    (subject) => {
      const normalized =
        normalizeSubject(
          subject
        );

      totalMaximum +=
        normalized.maximumMarks;

      totalObtained +=
        normalized.obtainedMarks;

      const percentage =
        calculatePercentage(
          normalized.obtainedMarks,
          normalized.maximumMarks
        );

      if (
        percentage >=
        passingPercentage
      ) {
        passedSubjects++;
      } else {
        failedSubjects++;
      }
    }
  );

  const percentage =
    calculatePercentage(
      totalObtained,
      totalMaximum
    );

  return {
    status:
      failedSubjects > 0
        ? "FAIL"
        : "PASS",

    percentage,

    grade:
      calculateGrade(
        percentage
      ),

    gradePoint:
      calculateGradePoint(
        percentage
      ),

    totalMaximum,

    totalObtained,

    passedSubjects,

    failedSubjects,

    totalSubjects:
      subjects.length,

    completeSubjects:
      subjects.length,

    incompleteSubjects: 0,

    missingSubjects: [],
  };
}


/* =========================================================
   SAFE STATUS FOR UI
========================================================= */

export function getDisplayStatus(
  subjects = [],
  options = {}
) {
  return getResultStatus(
    subjects,
    options
  );
}


/* =========================================================
   PENDING MESSAGE
========================================================= */

export function getPendingMessage(
  subjects = []
) {
  const details =
    getCompletionDetails(
      subjects
    );

  if (
    details.isComplete
  ) {
    return "";
  }

  if (
    details.totalSubjects === 0
  ) {
    return "Result data is not available yet.";
  }

  if (
    details.missingSubjects.length ===
    1
  ) {
    return `Result pending for ${details.missingSubjects[0]}.`;
  }

  return `Result pending for ${details.missingSubjects.length} subjects.`;
}


/* =========================================================
   RESULT READY CHECK
========================================================= */

export function isResultReady(
  subjects = []
) {
  return isResultComplete(
    subjects
  );
}


/* =========================================================
   FINAL STATUS OBJECT
========================================================= */

export function buildResultStatus(
  subjects = [],
  options = {}
) {
  const details =
    getCompletionDetails(
      subjects
    );

  const status =
    getResultStatus(
      subjects,
      options
    );

  return {
    status,

    ready:
      details.isComplete,

    pending:
      !details.isComplete,

    completion:
      details,

    message:
      details.isComplete
        ? status === "PASS"
          ? "Result declared: PASS"
          : "Result declared: FAIL"
        : getPendingMessage(
            subjects
          ),
  };
}


/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default {
  normalizeSubject,

  hasObtainedMarks,

  hasMaximumMarks,

  hasValidMarks,

  isSubjectComplete,

  getIncompleteSubjects,

  getCompleteSubjects,

  isResultComplete,

  getCompletionDetails,

  getResultStatus,

  getResultPercentage,

  getResultGrade,

  getResultGradePoint,

  getResultSummary,

  getDisplayStatus,

  getPendingMessage,

  isResultReady,

  buildResultStatus,
};