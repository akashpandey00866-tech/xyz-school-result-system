/* =========================================================
   RESULT UTILS
   Advanced Dynamic Result Management Engine

   FEATURES
   ---------------------------------------------------------
   • Safe marks validation
   • Theory + Practical calculation
   • Subject pass/fail
   • Overall result calculation
   • Percentage / Grade / Division
   • Performance analysis
   • Teacher remarks
   • Ranking
   • Merit list
   • Class statistics
   • Subject statistics
   • Publish-readiness validation
   • PDF preparation
   • Backward-compatible exports
========================================================= */


/* =========================================================
   DEFAULT SETTINGS
========================================================= */

export const DEFAULT_SETTINGS = Object.freeze({
  passingPercentage: 33,
  graceMarks: 0,
});


/* =========================================================
   CONSTANTS
========================================================= */

const MAX_PERCENTAGE = 100;
const MIN_PERCENTAGE = 0;

const MAX_REMARK_LENGTH = 1000;


/* =========================================================
   INTERNAL HELPERS
========================================================= */

function toNumber(
  value,
  fallback = 0
) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}


function clamp(
  value,
  min,
  max
) {
  return Math.min(
    max,
    Math.max(min, value)
  );
}


function cleanString(
  value
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
}


function round(
  value,
  decimals = 2
) {
  const factor =
    10 ** decimals;

  return (
    Math.round(
      (
        toNumber(value) *
        factor
      ) +
        Number.EPSILON
    ) /
    factor
  );
}


function getSubjectCode(
  subject
) {
  return cleanString(
    subject?.subjectCode ||
    subject?.code ||
    subject?.id
  );
}


function getSubjectName(
  subject
) {
  return cleanString(
    subject?.subjectName ||
    subject?.name ||
    subject?.label ||
    getSubjectCode(subject)
  );
}


function getFormMarks(
  formData,
  subject
) {
  const code =
    getSubjectCode(
      subject
    );

  return (
    formData?.[code] ||
    {}
  );
}


/* =========================================================
   VALIDATE SINGLE MARK
========================================================= */

export function validateMarks(
  value,
  maximumMarks
) {
  const max =
    Math.max(
      0,
      toNumber(
        maximumMarks
      )
    );

  /*
   * Empty input is treated as 0.
   */

  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return 0;
  }


  const number =
    Number(value);


  /*
   * Invalid number.
   */

  if (
    !Number.isFinite(number)
  ) {
    return 0;
  }


  /*
   * Negative marks are not allowed.
   */

  if (
    number < 0
  ) {
    return 0;
  }


  /*
   * Never allow marks above maximum.
   */

  if (
    number > max
  ) {
    return max;
  }


  return number;
}


/* =========================================================
   SUBJECT TOTAL
========================================================= */

export function calculateSubjectTotal(
  theory,
  practical
) {
  return (
    toNumber(theory) +
    toNumber(practical)
  );
}


/* =========================================================
   SUBJECT STATUS
========================================================= */

export function calculateSubjectStatus(
  subject,
  theory,
  practical
) {
  if (!subject) {
    return "FAIL";
  }


  const theoryMaximum =
    Math.max(
      0,
      toNumber(
        subject.theoryMarks
      )
    );


  const practicalMaximum =
    Math.max(
      0,
      toNumber(
        subject.practicalMarks
      )
    );


  const safeTheory =
    validateMarks(
      theory,
      theoryMaximum
    );


  const safePractical =
    validateMarks(
      practical,
      practicalMaximum
    );


  /*
   * Passing thresholds.
   *
   * If a component does not exist,
   * it should not become a mandatory
   * zero-mark component.
   */

  const theoryPass =
    theoryMaximum > 0
      ? Math.max(
          0,
          toNumber(
            subject.passingTheory
          )
        )
      : 0;


  const practicalPass =
    practicalMaximum > 0
      ? Math.max(
          0,
          toNumber(
            subject.passingPractical
          )
        )
      : 0;


  const theoryPassed =
    theoryMaximum <= 0 ||
    safeTheory >= theoryPass;


  const practicalPassed =
    practicalMaximum <= 0 ||
    safePractical >= practicalPass;


  return (
    theoryPassed &&
    practicalPassed
  )
    ? "PASS"
    : "FAIL";
}


/* =========================================================
   FAILED SUBJECTS
========================================================= */

export function calculateFailedSubjects(
  subjects = [],
  formData = {}
) {
  if (
    !Array.isArray(subjects)
  ) {
    return [];
  }


  const failedSubjects = [];


  subjects.forEach(
    (subject) => {

      const marks =
        getFormMarks(
          formData,
          subject
        );


      const theory =
        validateMarks(
          marks.theory,
          subject.theoryMarks
        );


      const practical =
        validateMarks(
          marks.practical,
          subject.practicalMarks
        );


      const status =
        calculateSubjectStatus(
          subject,
          theory,
          practical
        );


      if (
        status === "FAIL"
      ) {
        failedSubjects.push({
          subjectCode:
            getSubjectCode(
              subject
            ),

          subjectName:
            getSubjectName(
              subject
            ),

          theory,

          practical,

          total:
            calculateSubjectTotal(
              theory,
              practical
            ),

          maximumMarks:
            toNumber(
              subject.totalMarks
            ),

          status,
        });
      }
    }
  );


  return failedSubjects;
}


/* =========================================================
   TOTAL MARKS
========================================================= */

export function calculateTotals(
  subjects = [],
  formData = {}
) {
  if (
    !Array.isArray(subjects)
  ) {
    return {
      totalSubjects: 0,
      obtainedMarks: 0,
      maximumMarks: 0,
    };
  }


  let obtainedMarks = 0;

  let maximumMarks = 0;


  subjects.forEach(
    (subject) => {

      const marks =
        getFormMarks(
          formData,
          subject
        );


      const theory =
        validateMarks(
          marks.theory,
          subject.theoryMarks
        );


      const practical =
        validateMarks(
          marks.practical,
          subject.practicalMarks
        );


      obtainedMarks +=
        calculateSubjectTotal(
          theory,
          practical
        );


      /*
       * Prefer configured totalMarks.
       *
       * Fallback:
       * theory + practical.
       */

      const configuredMaximum =
        toNumber(
          subject.totalMarks
        );


      const calculatedMaximum =
        toNumber(
          subject.theoryMarks
        ) +
        toNumber(
          subject.practicalMarks
        );


      maximumMarks +=
        configuredMaximum > 0
          ? configuredMaximum
          : calculatedMaximum;
    }
  );


  return {
    totalSubjects:
      subjects.length,

    obtainedMarks:
      round(
        obtainedMarks
      ),

    maximumMarks:
      round(
        maximumMarks
      ),
  };
}


/* =========================================================
   PERCENTAGE
========================================================= */

export function calculatePercentage(
  obtainedMarks,
  maximumMarks
) {
  const obtained =
    toNumber(
      obtainedMarks
    );


  const maximum =
    toNumber(
      maximumMarks
    );


  if (
    maximum <= 0
  ) {
    return 0;
  }


  const percentage =
    (
      obtained /
      maximum
    ) *
    100;


  return round(
    clamp(
      percentage,
      MIN_PERCENTAGE,
      MAX_PERCENTAGE
    )
  );
}


/* =========================================================
   GRADE
========================================================= */

export function calculateGrade(
  percentage
) {
  const value =
    clamp(
      toNumber(
        percentage
      ),
      0,
      100
    );


  if (value >= 90)
    return "A+";

  if (value >= 80)
    return "A";

  if (value >= 70)
    return "B+";

  if (value >= 60)
    return "B";

  if (value >= 50)
    return "C";

  if (value >= 40)
    return "D";

  return "F";
}


/* =========================================================
   DIVISION
========================================================= */

export function calculateDivision(
  percentage
) {
  const value =
    clamp(
      toNumber(
        percentage
      ),
      0,
      100
    );


  if (value >= 60)
    return "First Division";

  if (value >= 45)
    return "Second Division";

  if (value >= 33)
    return "Third Division";

  return "Failed";
}


/* =========================================================
   RESULT STATUS
========================================================= */

export function calculateResultStatus(
  failedSubjects = []
) {
  return (
    Array.isArray(
      failedSubjects
    ) &&
    failedSubjects.length === 0
  )
    ? "PASS"
    : "FAIL";
}


/* =========================================================
   PERFORMANCE
========================================================= */

export function calculatePerformance(
  percentage
) {
  let value =
    Number(
      percentage
    );


  /*
   * Protect against:
   * NaN
   * Infinity
   * undefined
   * null
   */

  if (
    !Number.isFinite(value)
  ) {
    value = 0;
  }


  /*
   * Keep percentage valid.
   */

  value =
    clamp(
      value,
      0,
      100
    );


  value =
    round(
      value
    );


  if (value >= 90) {
    return {
      level: "Outstanding",
      color: "green",
      percentage: value,
      score: 5,
      badge: "TOP PERFORMANCE",
    };
  }


  if (value >= 80) {
    return {
      level: "Excellent",
      color: "green",
      percentage: value,
      score: 4,
      badge: "EXCELLENT",
    };
  }


  if (value >= 70) {
    return {
      level: "Very Good",
      color: "blue",
      percentage: value,
      score: 4,
      badge: "VERY GOOD",
    };
  }


  if (value >= 60) {
    return {
      level: "Good",
      color: "blue",
      percentage: value,
      score: 3,
      badge: "GOOD",
    };
  }


  if (value >= 50) {
    return {
      level: "Average",
      color: "orange",
      percentage: value,
      score: 2,
      badge: "AVERAGE",
    };
  }


  if (value >= 33) {
    return {
      level: "Needs Improvement",
      color: "yellow",
      percentage: value,
      score: 1,
      badge: "IMPROVEMENT NEEDED",
    };
  }


  return {
    level: "Poor",
    color: "red",
    percentage: value,
    score: 0,
    badge: "NEEDS ATTENTION",
  };
}


/* =========================================================
   GENERATE COMPLETE RESULT
========================================================= */

export function generateResult(
  subjects = [],
  formData = {}
) {
  const safeSubjects =
    Array.isArray(
      subjects
    )
      ? subjects
      : [];


  const totals =
    calculateTotals(
      safeSubjects,
      formData
    );


  const percentage =
    calculatePercentage(
      totals.obtainedMarks,
      totals.maximumMarks
    );


  const failedSubjects =
    calculateFailedSubjects(
      safeSubjects,
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


/* =========================================================
   RESET RESULT FORM
========================================================= */

export function resetResultForm(
  subjects = []
) {
  const form = {};


  if (
    !Array.isArray(subjects)
  ) {
    return form;
  }


  subjects.forEach(
    (subject) => {

      const code =
        getSubjectCode(
          subject
        );


      if (!code) {
        return;
      }


      form[code] = {
        theory: "",
        practical: "",
      };
    }
  );


  return form;
}


/* =========================================================
   RESULT SUMMARY
========================================================= */

export function generateResultSummary(
  result = {}
) {
  return {
    totalSubjects:
      toNumber(
        result.totalSubjects
      ),

    obtainedMarks:
      toNumber(
        result.obtainedMarks
      ),

    maximumMarks:
      toNumber(
        result.maximumMarks
      ),

    percentage:
      round(
        result.percentage
      ),

    grade:
      result.grade ||
      "F",

    division:
      result.division ||
      "Failed",

    status:
      result.status ||
      "FAIL",

    failedSubjects:
      Array.isArray(
        result.failedSubjects
      )
        ? result.failedSubjects
        : [],

    failedCount:
      toNumber(
        result.failedCount
      ),

    performance:
      result.performance ||
      calculatePerformance(
        result.percentage
      ),
  };
}


/* =========================================================
   TEACHER REMARKS
========================================================= */

export function generateTeacherRemarks(
  result = {}
) {
  const status =
    cleanString(
      result.status
    ).toUpperCase();


  const percentage =
    toNumber(
      result.percentage
    );


  const failedCount =
    toNumber(
      result.failedCount
    );


  if (
    status === "FAIL"
  ) {

    if (
      failedCount >= 3
    ) {
      return "Needs Immediate Academic Improvement.";
    }


    if (
      failedCount === 2
    ) {
      return "Needs focused improvement in weak subjects.";
    }


    return "Work harder in weak subjects.";
  }


  if (
    percentage >= 90
  ) {
    return "Outstanding Performance.";
  }


  if (
    percentage >= 80
  ) {
    return "Excellent Performance.";
  }


  if (
    percentage >= 70
  ) {
    return "Very Good Performance.";
  }


  if (
    percentage >= 60
  ) {
    return "Good Performance.";
  }


  if (
    percentage >= 50
  ) {
    return "Average Performance.";
  }


  return "Needs Improvement.";
}


/* =========================================================
   RANK CALCULATION
========================================================= */

export function calculateRanks(
  results = []
) {
  if (
    !Array.isArray(results)
  ) {
    return [];
  }


  /*
   * Clone objects so the original
   * Firestore/UI array is not mutated.
   */

  const list =
    results.map(
      (item) => ({
        ...item,
      })
    );


  list.sort(
    (a, b) => {

      const percentageA =
        toNumber(
          a.percentage
        );

      const percentageB =
        toNumber(
          b.percentage
        );


      if (
        percentageB !==
        percentageA
      ) {
        return (
          percentageB -
          percentageA
        );
      }


      const obtainedA =
        toNumber(
          a.obtainedMarks
        );

      const obtainedB =
        toNumber(
          b.obtainedMarks
        );


      return (
        obtainedB -
        obtainedA
      );
    }
  );


  let rank = 1;


  list.forEach(
    (student, index) => {

      const status =
        cleanString(
          student.status
        ).toUpperCase();


      /*
       * Failed students do not receive
       * a merit rank.
       */

      if (
        status === "FAIL"
      ) {
        student.rank = "-";
        return;
      }


      if (
        index > 0
      ) {

        const previous =
          list[index - 1];


        const currentPercentage =
          toNumber(
            student.percentage
          );

        const previousPercentage =
          toNumber(
            previous.percentage
          );


        const currentObtained =
          toNumber(
            student.obtainedMarks
          );

        const previousObtained =
          toNumber(
            previous.obtainedMarks
          );


        if (
          currentPercentage !==
            previousPercentage ||
          currentObtained !==
            previousObtained
        ) {
          rank =
            index + 1;
        }
      }


      student.rank =
        rank;
    }
  );


  return list;
}


/* =========================================================
   MERIT LIST
========================================================= */

export function generateMeritList(
  results = []
) {
  const ranked =
    calculateRanks(
      results
    );


  const passStudents =
    ranked.filter(
      (student) =>
        cleanString(
          student.status
        ).toUpperCase() ===
        "PASS"
    );


  return {
    topper:
      passStudents[0] ||
      null,

    topThree:
      passStudents.slice(
        0,
        3
      ),

    topTen:
      passStudents.slice(
        0,
        10
      ),

    totalStudents:
      ranked.length,

    totalPass:
      passStudents.length,

    totalFail:
      ranked.length -
      passStudents.length,
  };
}


/* =========================================================
   CLASS STATISTICS
========================================================= */

export function generateClassStatistics(
  results = []
) {
  if (
    !Array.isArray(results) ||
    results.length === 0
  ) {
    return {
      totalStudents: 0,
      totalPass: 0,
      totalFail: 0,
      highestPercentage: 0,
      lowestPercentage: 0,
      averagePercentage: 0,
      passPercentage: 0,
      topper: null,
    };
  }


  const normalized =
    results.map(
      (student) => ({
        ...student,

        percentage:
          toNumber(
            student.percentage
          ),

        obtainedMarks:
          toNumber(
            student.obtainedMarks
          ),
      })
    );


  const passStudents =
    normalized.filter(
      (student) =>
        cleanString(
          student.status
        ).toUpperCase() ===
        "PASS"
    );


  const percentages =
    normalized.map(
      (student) =>
        student.percentage
    );


  const topper =
    [...passStudents].sort(
      (a, b) => {

        if (
          b.percentage !==
          a.percentage
        ) {
          return (
            b.percentage -
            a.percentage
          );
        }


        return (
          b.obtainedMarks -
          a.obtainedMarks
        );
      }
    )[0] ||
    null;


  const totalStudents =
    normalized.length;


  const totalPass =
    passStudents.length;


  const totalFail =
    totalStudents -
    totalPass;


  const averagePercentage =
    percentages.reduce(
      (sum, value) =>
        sum + value,
      0
    ) /
    totalStudents;


  const passPercentage =
    totalStudents > 0
      ? (
          totalPass /
          totalStudents
        ) *
        100
      : 0;


  return {
    totalStudents,

    totalPass,

    totalFail,

    highestPercentage:
      Math.max(
        ...percentages
      ),

    lowestPercentage:
      Math.min(
        ...percentages
      ),

    averagePercentage:
      round(
        averagePercentage
      ),

    passPercentage:
      round(
        passPercentage
      ),

    topper,
  };
}


/* =========================================================
   SUBJECT STATISTICS
========================================================= */

export function generateSubjectStatistics(
  subjects = [],
  results = []
) {
  const statistics = {};


  if (
    !Array.isArray(subjects)
  ) {
    return statistics;
  }


  const safeResults =
    Array.isArray(
      results
    )
      ? results
      : [];


  subjects.forEach(
    (subject) => {

      const code =
        getSubjectCode(
          subject
        );


      if (!code) {
        return;
      }


      const totals = [];


      safeResults.forEach(
        (student) => {

          /*
           * New result structure.
           */

          const directMarks =
            student?.subjects?.find?.(
              (item) =>
                getSubjectCode(
                  item
                ) === code
            );


          if (
            directMarks
          ) {
            const total =
              toNumber(
                directMarks.obtainedMarks ??
                directMarks.total
              );


            totals.push(
              total
            );

            return;
          }


          /*
           * Existing formData structure.
           */

          const marks =
            student?.formData?.[code] ||
            {};


          const total =
            calculateSubjectTotal(
              marks.theory,
              marks.practical
            );


          totals.push(
            total
          );
        }
      );


      const highest =
        totals.length
          ? Math.max(
              ...totals
            )
          : 0;


      const lowest =
        totals.length
          ? Math.min(
              ...totals
            )
          : 0;


      const average =
        totals.length
          ? totals.reduce(
              (sum, value) =>
                sum + value,
              0
            ) /
            totals.length
          : 0;


      statistics[code] = {
        subjectCode:
          code,

        subjectName:
          getSubjectName(
            subject
          ),

        highest,

        lowest,

        average:
          round(
            average
          ),

        studentCount:
          totals.length,
      };
    }
  );


  return statistics;
}


/* =========================================================
   RESULT VALIDATION
========================================================= */

export function validateResult(
  subjects = [],
  formData = {}
) {
  const errors = [];


  if (
    !Array.isArray(subjects)
  ) {
    return {
      valid: false,
      errors: [
        "Subjects data is invalid.",
      ],
    };
  }


  let hasEnteredMarks =
    false;


  subjects.forEach(
    (subject) => {

      const code =
        getSubjectCode(
          subject
        );


      const name =
        getSubjectName(
          subject
        );


      const marks =
        formData?.[code] ||
        {};


      const theoryValue =
        marks.theory;


      const practicalValue =
        marks.practical;


      const theoryEntered =
        theoryValue !== "" &&
        theoryValue !== null &&
        theoryValue !== undefined;


      const practicalEntered =
        practicalValue !== "" &&
        practicalValue !== null &&
        practicalValue !== undefined;


      if (
        theoryEntered ||
        practicalEntered
      ) {
        hasEnteredMarks = true;
      }


      const theory =
        Number(
          theoryValue || 0
        );


      const practical =
        Number(
          practicalValue || 0
        );


      /*
       * Invalid numeric input.
       */

      if (
        !Number.isFinite(
          theory
        )
      ) {
        errors.push(
          `${name}: Invalid theory marks.`
        );
      }


      if (
        !Number.isFinite(
          practical
        )
      ) {
        errors.push(
          `${name}: Invalid practical marks.`
        );
      }


      /*
       * Negative marks.
       */

      if (
        theory < 0
      ) {
        errors.push(
          `${name}: Theory marks cannot be negative.`
        );
      }


      if (
        practical < 0
      ) {
        errors.push(
          `${name}: Practical marks cannot be negative.`
        );
      }


      /*
       * Maximum marks.
       */

      const theoryMaximum =
        toNumber(
          subject.theoryMarks
        );


      const practicalMaximum =
        toNumber(
          subject.practicalMarks
        );


      if (
        theoryMaximum > 0 &&
        theory > theoryMaximum
      ) {
        errors.push(
          `${name}: Theory marks exceeded maximum ${theoryMaximum}.`
        );
      }


      if (
        practicalMaximum > 0 &&
        practical > practicalMaximum
      ) {
        errors.push(
          `${name}: Practical marks exceeded maximum ${practicalMaximum}.`
        );
      }


      /*
       * Required component marks.
       */

      if (
        theoryMaximum > 0 &&
        !theoryEntered
      ) {
        errors.push(
          `${name}: Theory marks required.`
        );
      }


      if (
        practicalMaximum > 0 &&
        !practicalEntered
      ) {
        errors.push(
          `${name}: Practical marks required.`
        );
      }
    }
  );


  if (
    !hasEnteredMarks
  ) {
    errors.unshift(
      "Enter marks before generating the result."
    );
  }


  return {
    valid:
      errors.length === 0,

    errors,
  };
}


/* =========================================================
   PUBLISH READY CHECK
========================================================= */

export function canPublishResult(
  result
) {
  if (
    !result ||
    typeof result !==
      "object"
  ) {
    return false;
  }


  const totalSubjects =
    toNumber(
      result.totalSubjects
    );


  const maximumMarks =
    toNumber(
      result.maximumMarks
    );


  const obtainedMarks =
    toNumber(
      result.obtainedMarks
    );


  const percentage =
    toNumber(
      result.percentage
    );


  /*
   * Basic completeness.
   */

  if (
    totalSubjects <= 0
  ) {
    return false;
  }


  if (
    maximumMarks <= 0
  ) {
    return false;
  }


  /*
   * Impossible marks.
   */

  if (
    obtainedMarks < 0 ||
    obtainedMarks >
      maximumMarks
  ) {
    return false;
  }


  /*
   * Invalid percentage.
   */

  if (
    percentage < 0 ||
    percentage > 100
  ) {
    return false;
  }


  /*
   * Failed results should not
   * normally be publish-ready.
   */

  if (
    cleanString(
      result.status
    ).toUpperCase() ===
    "FAIL"
  ) {
    return false;
  }


  return true;
}


/* =========================================================
   PDF DATA
========================================================= */

export function preparePdfData(
  student,
  subjects,
  formData,
  result
) {
  return {
    student:
      student || null,

    subjects:
      Array.isArray(
        subjects
      )
        ? subjects
        : [],

    marks:
      formData || {},

    result:
      result || null,

    generatedAt:
      new Date().toISOString(),

    generatedAtLocal:
      new Date().toLocaleString(),
  };
}


/* =========================================================
   EXTRA: RESULT QUALITY SCORE
========================================================= */

export function calculateResultQuality(
  result
) {
  if (!result) {
    return {
      score: 0,
      level: "INVALID",
      valid: false,
    };
  }


  const checks = [
    toNumber(
      result.totalSubjects
    ) > 0,

    toNumber(
      result.maximumMarks
    ) > 0,

    toNumber(
      result.obtainedMarks
    ) >= 0,

    toNumber(
      result.obtainedMarks
    ) <=
      toNumber(
        result.maximumMarks
      ),

    toNumber(
      result.percentage
    ) >= 0,

    toNumber(
      result.percentage
    ) <= 100,
  ];


  const passedChecks =
    checks.filter(
      Boolean
    ).length;


  const score =
    Math.round(
      (
        passedChecks /
        checks.length
      ) *
      100
    );


  let level =
    "INVALID";


  if (
    score === 100
  ) {
    level = "VALID";
  } else if (
    score >= 80
  ) {
    level = "WARNING";
  }


  return {
    score,
    level,
    valid:
      score === 100,
  };
}


/* =========================================================
   EXTRA: PERFORMANCE COLORS
========================================================= */

export function getPerformanceClass(
  performance
) {
  const color =
    cleanString(
      performance?.color
    ).toLowerCase();


  const classes = {
    green:
      "text-emerald-600 bg-emerald-50",

    blue:
      "text-blue-600 bg-blue-50",

    orange:
      "text-orange-600 bg-orange-50",

    yellow:
      "text-yellow-700 bg-yellow-50",

    red:
      "text-red-600 bg-red-50",
  };


  return (
    classes[color] ||
    "text-slate-600 bg-slate-50"
  );
}


/* =========================================================
   EXPORTS
========================================================= */

export default {
  DEFAULT_SETTINGS,

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

  calculateResultQuality,

  getPerformanceClass,
};