/* ==========================================================
   RESULT UTILS
   Dynamic Result Management System
========================================================== */

export const DEFAULT_SETTINGS = {

  passingPercentage: 33,

  graceMarks: 0,

};

/* ==========================================================
   VALIDATE MARKS
========================================================== */

export function validateMarks(

  value,

  maximumMarks

) {

  value = Number(value);

  maximumMarks = Number(maximumMarks || 0);

  if (isNaN(value)) return 0;

  if (value < 0) return 0;

  if (value > maximumMarks)

    return maximumMarks;

  return value;

}

/* ==========================================================
   SUBJECT TOTAL
========================================================== */

export function calculateSubjectTotal(

  theory,

  practical

) {

  theory = Number(theory || 0);

  practical = Number(practical || 0);

  return theory + practical;

}

/* ==========================================================
   SUBJECT STATUS
========================================================== */

export function calculateSubjectStatus(

  subject,

  theory,

  practical

) {

  theory = validateMarks(

    theory,

    subject.theoryMarks

  );

  practical = validateMarks(

    practical,

    subject.practicalMarks

  );

  const passTheory =

    Number(subject.passingTheory || 0);

  const passPractical =

    Number(subject.passingPractical || 0);

  if (

    theory >= passTheory &&

    practical >= passPractical

  ) {

    return "PASS";

  }

  return "FAIL";

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

    const status = calculateSubjectStatus(

      subject,

      theory,

      practical

    );

    if (status === "FAIL") {

      failedSubjects.push({

        subjectCode:

          subject.subjectCode,

        subjectName:

          subject.subjectName,

        theory,

        practical,

      });

    }

  });

  return failedSubjects;

}

/* ==========================================================
   TOTAL MARKS
========================================================== */

export function calculateTotals(

  subjects,

  formData

) {

  let obtainedMarks = 0;

  let maximumMarks = 0;

  subjects.forEach((subject) => {

    const theory = Number(

      formData[subject.subjectCode]?.theory || 0

    );

    const practical = Number(

      formData[subject.subjectCode]?.practical || 0

    );

    obtainedMarks +=

      calculateSubjectTotal(

        theory,

        practical

      );

    maximumMarks += Number(

      subject.totalMarks || 0

    );

  });

  return {

    totalSubjects:

      subjects.length,

    obtainedMarks,

    maximumMarks,

  };

}
/* ==========================================================
   PERCENTAGE
========================================================== */

export function calculatePercentage(

  obtainedMarks,

  maximumMarks

) {

  if (Number(maximumMarks) === 0)

    return 0;

  return Number(

    (

      (Number(obtainedMarks) /

        Number(maximumMarks)) *

      100

    ).toFixed(2)

  );

}

/* ==========================================================
   GRADE
========================================================== */

export function calculateGrade(

  percentage

) {

  percentage = Number(percentage);

  if (percentage >= 90) return "A+";

  if (percentage >= 80) return "A";

  if (percentage >= 70) return "B+";

  if (percentage >= 60) return "B";

  if (percentage >= 50) return "C";

  if (percentage >= 40) return "D";

  return "F";

}

/* ==========================================================
   DIVISION
========================================================== */

export function calculateDivision(

  percentage

) {

  percentage = Number(percentage);

  if (percentage >= 60)

    return "First Division";

  if (percentage >= 45)

    return "Second Division";

  if (percentage >= 33)

    return "Third Division";

  return "Failed";

}

/* ==========================================================
   RESULT STATUS
========================================================== */

export function calculateResultStatus(

  failedSubjects

) {

  return failedSubjects.length === 0

    ? "PASS"

    : "FAIL";

}

/* ==========================================================
   PERFORMANCE
========================================================== */

export function calculatePerformance(

  percentage

) {

  percentage = Number(percentage);

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
   GENERATE COMPLETE RESULT
========================================================== */

export function generateResult(

  subjects,

  formData

){

  const totals = calculateTotals(

    subjects,

    formData

  );

  const percentage = calculatePercentage(

    totals.obtainedMarks,

    totals.maximumMarks

  );

  const failedSubjects =

    calculateFailedSubjects(

      subjects,

      formData

    );

  const status =

    calculateResultStatus(

      failedSubjects

    );

  const grade =

    calculateGrade(

      percentage

    );

  const division =

    calculateDivision(

      percentage

    );

  const performance =

    calculatePerformance(

      percentage

    );

  return {

    ...totals,

    percentage,

    grade,

    division,

    status,

    performance,

    failedSubjects,

    failedCount:

      failedSubjects.length,

  };

}

/* ==========================================================
   RESET FORM
========================================================== */

export function resetResultForm(

  subjects

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

      result.failedCount,

    performance:

      result.performance,

  };

}
/* ==========================================================
   TEACHER REMARKS
========================================================== */

export function generateTeacherRemarks(

  result

) {

  if (result.status === "FAIL") {

    if (result.failedCount >= 3) {

      return "Needs Immediate Academic Improvement.";

    }

    return "Work harder in weak subjects.";

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
   RANK CALCULATION
========================================================== */

export function calculateRanks(

  results = []

) {

  const list = [...results];

  list.sort((a, b) => {

    if (b.percentage !== a.percentage)

      return b.percentage - a.percentage;

    return b.obtainedMarks - a.obtainedMarks;

  });

  let rank = 1;

  list.forEach((student, index) => {

    if (student.status === "FAIL") {

      student.rank = "-";

      return;

    }

    if (index > 0) {

      if (

        list[index].percentage !==

        list[index - 1].percentage ||

        list[index].obtainedMarks !==

        list[index - 1].obtainedMarks

      ) {

        rank = index + 1;

      }

    }

    student.rank = rank;

  });

  return list;

}

/* ==========================================================
   MERIT LIST
========================================================== */

export function generateMeritList(

  results = []

) {

  const ranked = calculateRanks(results);

  const passStudents = ranked.filter(

    (student) =>

      student.status === "PASS"

  );

  return {

    topper:

      passStudents[0] || null,

    topThree:

      passStudents.slice(0, 3),

    topTen:

      passStudents.slice(0, 10),

    totalStudents:

      ranked.length,

    totalPass:

      passStudents.length,

    totalFail:

      ranked.length -

      passStudents.length,

  };

}
/* ==========================================================
   CLASS STATISTICS
========================================================== */

export function generateClassStatistics(

  results = []

) {

  if (!results.length) {

    return {

      totalStudents: 0,

      totalPass: 0,

      totalFail: 0,

      highestPercentage: 0,

      lowestPercentage: 0,

      averagePercentage: 0,

      topper: null,

    };

  }

  const passStudents = results.filter(

    (student) =>

      student.status === "PASS"

  );

  const percentages = results.map(

    (student) =>

      Number(student.percentage || 0)

  );

  const topper = [...results].sort(

    (a, b) =>

      b.percentage - a.percentage

  )[0];

  return {

    totalStudents:

      results.length,

    totalPass:

      passStudents.length,

    totalFail:

      results.length -

      passStudents.length,

    highestPercentage:

      Math.max(...percentages),

    lowestPercentage:

      Math.min(...percentages),

    averagePercentage: Number(

      (

        percentages.reduce(

          (a, b) => a + b,

          0

        ) / results.length

      ).toFixed(2)

    ),

    topper,

  };

}

/* ==========================================================
   SUBJECT STATISTICS
========================================================== */

export function generateSubjectStatistics(

  subjects,

  results

) {

  const statistics = {};

  subjects.forEach((subject) => {

    const totals = [];

    results.forEach((student) => {

      const marks =

        Number(

          student.formData?.[subject.subjectCode]?.theory || 0

        ) +

        Number(

          student.formData?.[subject.subjectCode]?.practical || 0

        );

      totals.push(marks);

    });

    statistics[subject.subjectCode] = {

      subjectName:

        subject.subjectName,

      highest:

        totals.length

          ? Math.max(...totals)

          : 0,

      lowest:

        totals.length

          ? Math.min(...totals)

          : 0,

      average:

        totals.length

          ? Number(

              (

                totals.reduce(

                  (a, b) => a + b,

                  0

                ) / totals.length

              ).toFixed(2)

            )

          : 0,

    };

  });

  return statistics;

}
/* ==========================================================
   RESULT VALIDATION
========================================================== */

export function validateResult(

  subjects,

  formData

) {

  const errors = [];

  subjects.forEach((subject) => {

    const theory = Number(

      formData[subject.subjectCode]?.theory || 0

    );

    const practical = Number(

      formData[subject.subjectCode]?.practical || 0

    );

    if (theory > Number(subject.theoryMarks || 0)) {

      errors.push(

        `${subject.subjectName} Theory Marks Exceeded`

      );

    }

    if (

      practical >

      Number(subject.practicalMarks || 0)

    ) {

      errors.push(

        `${subject.subjectName} Practical Marks Exceeded`

      );

    }

  });

  return {

    valid: errors.length === 0,

    errors,

  };

}

/* ==========================================================
   PUBLISH READY CHECK
========================================================== */

export function canPublishResult(

  result

) {

  if (!result) return false;

  if (!result.totalSubjects) return false;

  if (result.maximumMarks === 0)

    return false;

  if (result.obtainedMarks > result.maximumMarks)

    return false;

  return true;

}

/* ==========================================================
   PDF DATA
========================================================== */

export function preparePdfData(

  student,

  subjects,

  formData,

  result

) {

  return {

    student,

    subjects,

    marks: formData,

    result,

    generatedAt:

      new Date().toLocaleString(),

  };

}

/* ==========================================================
   EXPORTS
========================================================== */

export default {

  validateMarks,

  calculateSubjectTotal,

  calculateSubjectStatus,

  calculateFailedSubjects,

  calculateTotals,

  calculatePercentage,

  calculateGrade,

  calculateDivision,

  calculateResultStatus,

  calculatePerformance,

  generateResult,
  

  resetResultForm,

  generateResultSummary,

  generateTeacherRemarks,

  calculateRanks,

  generateMeritList,

  generateClassStatistics,

  generateSubjectStatistics,

  validateResult,

  canPublishResult,

  preparePdfData,

};

  