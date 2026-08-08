/* ==========================================================
   DYNAMIC RESULT UTILS
   ========================================================== */

export function calculateGrade(percentage) {

  percentage = Number(percentage || 0);

  if (percentage >= 90) return "A+";

  if (percentage >= 80) return "A";

  if (percentage >= 70) return "B+";

  if (percentage >= 60) return "B";

  if (percentage >= 50) return "C";

  if (percentage >= 40) return "D";

  return "F";

}

export function calculateDivision(percentage) {

  percentage = Number(percentage || 0);

  if (percentage >= 60) return "First";

  if (percentage >= 45) return "Second";

  if (percentage >= 33) return "Third";

  return "Fail";

}

export function calculatePerformance(percentage) {

  percentage = Number(percentage || 0);

  if (percentage >= 90) {

    return {

      level: "Outstanding",

      color: "green",

    };

  }

  if (percentage >= 80) {

    return {

      level: "Excellent",

      color: "green",

    };

  }

  if (percentage >= 70) {

    return {

      level: "Very Good",

      color: "blue",

    };

  }

  if (percentage >= 60) {

    return {

      level: "Good",

      color: "blue",

    };

  }

  if (percentage >= 50) {

    return {

      level: "Average",

      color: "orange",

    };

  }

  if (percentage >= 33) {

    return {

      level: "Needs Improvement",

      color: "yellow",

    };

  }

  return {

    level: "Poor",

    color: "red",

  };

}
/* ==========================================================
   FAILED SUBJECTS
========================================================== */

export function calculateFailedSubjects(

  subjects,

  formData

) {

  const failedSubjects = [];

  subjects.forEach((subject) => {

    const theory = Number(

      formData[subject.subjectCode]?.theory || 0

    );

    const practical = Number(

      formData[subject.subjectCode]?.practical || 0

    );

    if (

      theory < Number(subject.passingTheory || 0) ||

      practical < Number(subject.passingPractical || 0)

    ) {

      failedSubjects.push(subject.subjectName);

    }

  });

  return failedSubjects;

}

/* ==========================================================
   GENERATE RESULT
========================================================== */

export function generateDynamicResult(

  subjects,

  formData

) {

  let obtainedMarks = 0;

  let maximumMarks = 0;

  let totalSubjects = subjects.length;

  subjects.forEach((subject) => {

    const theory = Number(

      formData[subject.subjectCode]?.theory || 0

    );

    const practical = Number(

      formData[subject.subjectCode]?.practical || 0

    );

    obtainedMarks += theory + practical;

    maximumMarks += Number(subject.totalMarks || 0);

  });

  const percentage = Number(

    (

      (obtainedMarks /

        (maximumMarks || 1)) *

      100

    ).toFixed(2)

  );

  const failedSubjects = calculateFailedSubjects(

    subjects,

    formData

  );

  const status =

    failedSubjects.length === 0

      ? "PASS"

      : "FAIL";

  return {

    totalSubjects,

    obtainedMarks,

    maximumMarks,

    percentage,

    grade: calculateGrade(percentage),

    division:

      calculateDivision(percentage),

    performance:

      calculatePerformance(percentage),

    failedSubjects,

    status,

  };

}
/* ==========================================================
   RESULT SUMMARY
========================================================== */

export function generateResultSummary(

  result

) {

  return {

    totalSubjects:

      result.totalSubjects,

    obtainedMarks:

      result.obtainedMarks,

    maximumMarks:

      result.maximumMarks,

    percentage:

      result.percentage,

    grade:

      result.grade,

    division:

      result.division,

    status:

      result.status,

    failedSubjects:

      result.failedSubjects,

    failedCount:

      result.failedSubjects.length,

    performance:

      result.performance,

  };

}

/* ==========================================================
   DEFAULT TEACHER REMARKS
========================================================== */

export function generateTeacherRemarks(

  result

) {

  if (result.status === "FAIL") {

    return "Student needs improvement in failed subjects.";

  }

  if (result.percentage >= 90) {

    return "Outstanding Performance.";

  }

  if (result.percentage >= 80) {

    return "Excellent Performance.";

  }

  if (result.percentage >= 70) {

    return "Very Good Performance.";

  }

  if (result.percentage >= 60) {

    return "Good Performance.";

  }

  if (result.percentage >= 50) {

    return "Average Performance.";

  }

  return "Needs Improvement.";

}

/* ==========================================================
   DEFAULT PRINCIPAL REMARKS
========================================================== */

export function generatePrincipalRemarks(

  result

) {

  if (result.status === "PASS") {

    return "Promoted to the next class.";

  }

  return "Not Promoted.";

}
/* ==========================================================
   VALIDATE MARKS
========================================================== */

export function validateMarks(

  value,

  maxMarks

) {

  const marks = Number(value || 0);

  if (marks < 0) return 0;

  if (marks > Number(maxMarks || 0))

    return Number(maxMarks || 0);

  return marks;

}

/* ==========================================================
   RESET RESULT FORM
========================================================== */

export function resetResultForm(

  subjects = []

) {

  const form = {};

  subjects.forEach((subject) => {

    form[subject.subjectCode] = {

      theory: "",

      practical: "",

    };

  });

  return form;

}

/* ==========================================================
   CALCULATE SUBJECT TOTAL
========================================================== */

export function calculateSubjectTotal(

  theory,

  practical

) {

  return (

    Number(theory || 0) +

    Number(practical || 0)

  );

}

/* ==========================================================
   SUBJECT STATUS
========================================================== */

export function calculateSubjectStatus(

  subject,

  theory,

  practical

) {

  theory = Number(theory || 0);

  practical = Number(practical || 0);

  if (

    theory >= Number(subject.passingTheory || 0) &&

    practical >= Number(subject.passingPractical || 0)

  ) {

    return "PASS";

  }

  return "FAIL";

}

/* ==========================================================
   EXPORTS
========================================================== */

export default {

  generateDynamicResult,

  generateResultSummary,

  generateTeacherRemarks,

  generatePrincipalRemarks,

  calculatePerformance,

  calculateDivision,

  calculateGrade,

  calculateFailedSubjects,

  calculateSubjectStatus,

  calculateSubjectTotal,

  validateMarks,

  resetResultForm,

};