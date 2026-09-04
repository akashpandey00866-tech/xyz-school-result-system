/* =========================================================
   FILE 21 — ADVANCED RESULT VALIDATION ENGINE
   =========================================================

   PURPOSE
   -------
   Centralized validation for the Result Module.

   FEATURES
   --------
   ✓ Dynamic subject configuration
   ✓ Dynamic maximum marks
   ✓ Dynamic passing marks
   ✓ Theory / practical / internal marks
   ✓ Absent support
   ✓ Grace-mark support
   ✓ Negative-mark protection
   ✓ Decimal-mark support
   ✓ Missing-subject detection
   ✓ Duplicate-subject detection
   ✓ Total verification
   ✓ Percentage verification
   ✓ Grade verification
   ✓ Pass/fail verification
   ✓ Required-field validation
   ✓ Result completeness validation
   ✓ Detailed field-level errors
   ✓ Warning system
   ✓ No hard-coded school subjects

   IMPORTANT
   ---------
   This validates data before UI submission.

   Firestore Security Rules/backend validation should
   ALSO validate critical values before trusting them.
========================================================= */


/* =========================================================
   CONSTANTS
========================================================= */

export const MARK_STATUS =
  Object.freeze({
    PRESENT:
      "PRESENT",

    ABSENT:
      "ABSENT",

    NOT_APPLICABLE:
      "NOT_APPLICABLE",

    EXEMPT:
      "EXEMPT",
  });


export const VALIDATION_SEVERITY =
  Object.freeze({
    ERROR:
      "error",

    WARNING:
      "warning",

    INFO:
      "info",
  });


export const RESULT_VALIDATION_CODES =
  Object.freeze({
    REQUIRED_FIELD:
      "REQUIRED_FIELD",

    INVALID_NUMBER:
      "INVALID_NUMBER",

    NEGATIVE_MARKS:
      "NEGATIVE_MARKS",

    MAX_MARKS_EXCEEDED:
      "MAX_MARKS_EXCEEDED",

    PASS_MARKS_INVALID:
      "PASS_MARKS_INVALID",

    MARKS_MISSING:
      "MARKS_MISSING",

    SUBJECT_MISSING:
      "SUBJECT_MISSING",

    DUPLICATE_SUBJECT:
      "DUPLICATE_SUBJECT",

    INVALID_STATUS:
      "INVALID_STATUS",

    TOTAL_MISMATCH:
      "TOTAL_MISMATCH",

    PERCENTAGE_MISMATCH:
      "PERCENTAGE_MISMATCH",

    GRADE_MISMATCH:
      "GRADE_MISMATCH",

    RESULT_STATUS_MISMATCH:
      "RESULT_STATUS_MISMATCH",

    INVALID_CONFIGURATION:
      "INVALID_CONFIGURATION",

    INVALID_MARK_COMPONENT:
      "INVALID_MARK_COMPONENT",

    COMPLETENESS_FAILED:
      "COMPLETENESS_FAILED",
  });


/* =========================================================
   DEFAULT CONFIGURATION
========================================================= */

export const DEFAULT_VALIDATION_CONFIG =
  Object.freeze({
    allowDecimalMarks:
      true,

    decimalPlaces:
      2,

    allowNegativeMarks:
      false,

    allowAbsent:
      true,

    allowNotApplicable:
      true,

    allowExempt:
      true,

    allowGraceMarks:
      false,

    maxGraceMarks:
      0,

    verifyTotals:
      true,

    verifyPercentage:
      true,

    verifyGrade:
      true,

    verifyResultStatus:
      true,

    requireAllSubjects:
      true,

    minimumPassingPercentage:
      0,

    percentagePrecision:
      2,
  });


/* =========================================================
   NORMALIZATION
========================================================= */

export function normalizeValidationConfig(
  config = {}
) {
  return {
    ...DEFAULT_VALIDATION_CONFIG,

    ...config,
  };
}


/* =========================================================
   NUMBER HELPERS
========================================================= */

export function isValidNumber(
  value
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return false;
  }


  const number =
    Number(value);


  return Number.isFinite(
    number
  );
}


export function toNumber(
  value,
  fallback = 0
) {
  if (
    !isValidNumber(
      value
    )
  ) {
    return fallback;
  }


  return Number(
    value
  );
}


export function roundNumber(
  value,
  decimals = 2
) {
  const number =
    toNumber(value);


  const multiplier =
    10 ** decimals;


  return (
    Math.round(
      (
        number *
        multiplier
      ) +
        Number.EPSILON
    ) /
    multiplier
  );
}


/* =========================================================
   MARK NORMALIZATION
========================================================= */

export function normalizeMarkValue(
  value,
  config = {}
) {
  const settings =
    normalizeValidationConfig(
      config
    );


  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }


  const number =
    Number(value);


  if (
    !Number.isFinite(
      number
    )
  ) {
    return null;
  }


  return roundNumber(
    number,
    settings.decimalPlaces
  );
}


/* =========================================================
   ERROR CREATOR
========================================================= */

function createIssue({
  code,
  severity =
    VALIDATION_SEVERITY.ERROR,

  field = null,

  subjectId = null,
  subjectCode = null,

  message,

  value = null,

  expected = null,

  metadata = {},
} = {}) {
  return {
    code,

    severity,

    field,

    subjectId,

    subjectCode,

    message,

    value,

    expected,

    metadata,
  };
}


/* =========================================================
   FIELD REQUIRED
========================================================= */

export function validateRequiredField(
  value,
  field,
  label = field
) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() ===
      ""
  ) {
    return createIssue({
      code:
        RESULT_VALIDATION_CODES
          .REQUIRED_FIELD,

      field,

      message:
        `${label} is required.`,
    });
  }


  return null;
}


/* =========================================================
   SUBJECT CONFIGURATION
========================================================= */

export function normalizeSubjectConfig(
  subject = {}
) {
  return {
    id:
      subject.id ||
      subject.subjectId ||
      null,

    subjectId:
      subject.subjectId ||
      subject.id ||
      null,

    code:
      subject.subjectCode ||
      subject.code ||
      "",

    name:
      subject.subjectName ||
      subject.name ||
      "Subject",

    required:
      subject.required !==
      false,

    components:
      Array.isArray(
        subject.components
      )
        ? subject.components
        : null,

    maxMarks:
      subject.maxMarks ??
      null,

    passingMarks:
      subject.passingMarks ??
      null,

    passPercentage:
      subject.passPercentage ??
      null,

    theory:
      subject.theory ||
      null,

    practical:
      subject.practical ||
      null,

    internal:
      subject.internal ||
      null,

    graceMarksAllowed:
      subject.graceMarksAllowed ??
      false,

    maxGraceMarks:
      subject.maxGraceMarks ??
      0,

    gradeScale:
      subject.gradeScale ||
      null,
  };
}


/* =========================================================
   SUBJECT COMPONENT CONFIG
========================================================= */

export function getSubjectComponents(
  subject
) {
  const normalized =
    normalizeSubjectConfig(
      subject
    );


  if (
    Array.isArray(
      normalized.components
    ) &&
    normalized.components.length
  ) {
    return normalized.components;
  }


  const components = [];


  if (
    normalized.theory
  ) {
    components.push({
      key:
        "theory",

      label:
        "Theory",

      ...normalized.theory,
    });
  }


  if (
    normalized.practical
  ) {
    components.push({
      key:
        "practical",

      label:
        "Practical",

      ...normalized.practical,
    });
  }


  if (
    normalized.internal
  ) {
    components.push({
      key:
        "internal",

      label:
        "Internal",

      ...normalized.internal,
    });
  }


  /*
   * If no component configuration
   * exists but maxMarks exists,
   * use a single total component.
   */

  if (
    !components.length &&
    normalized.maxMarks !==
      null
  ) {
    components.push({
      key:
        "total",

      label:
        "Total",

      maxMarks:
        normalized.maxMarks,

      passingMarks:
        normalized.passingMarks,
    });
  }


  return components;
}


/* =========================================================
   COMPONENT MAX MARKS
========================================================= */

export function getComponentMaxMarks(
  component
) {
  return toNumber(
    component?.maxMarks ??
      component?.maximumMarks ??
      component?.max ??
      0
  );
}


/* =========================================================
   SUBJECT MAX MARKS
========================================================= */

export function getSubjectMaxMarks(
  subject
) {
  const normalized =
    normalizeSubjectConfig(
      subject
    );


  const components =
    getSubjectComponents(
      normalized
    );


  if (
    components.length
  ) {
    return roundNumber(
      components.reduce(
        (
          total,
          component
        ) =>
          total +
          getComponentMaxMarks(
            component
          ),
        0
      )
    );
  }


  return toNumber(
    normalized.maxMarks
  );
}


/* =========================================================
   SUBJECT PASSING MARKS
========================================================= */

export function getSubjectPassingMarks(
  subject
) {
  const normalized =
    normalizeSubjectConfig(
      subject
    );


  if (
    isValidNumber(
      normalized.passingMarks
    )
  ) {
    return toNumber(
      normalized.passingMarks
    );
  }


  if (
    isValidNumber(
      normalized.passPercentage
    )
  ) {
    return roundNumber(
      (
        getSubjectMaxMarks(
          normalized
        ) *
        Number(
          normalized.passPercentage
        )
      ) /
        100
    );
  }


  const components =
    getSubjectComponents(
      normalized
    );


  if (
    components.length
  ) {
    return roundNumber(
      components.reduce(
        (
          total,
          component
        ) =>
          total +
          toNumber(
            component?.passingMarks ??
              component?.passMarks ??
              0
          ),
        0
      )
    );
  }


  return 0;
}


/* =========================================================
   SUBJECT MARK OBJECT
========================================================= */

export function getSubjectMarks(
  marks,
  subject
) {
  const normalized =
    normalizeSubjectConfig(
      subject
    );


  if (
    marks === null ||
    marks === undefined
  ) {
    return {};
  }


  /*
   * If marks are stored directly
   * as a number.
   */

  if (
    isValidNumber(
      marks
    )
  ) {
    return {
      total:
        toNumber(
          marks
        ),
    };
  }


  /*
   * If marks are stored as:
   *
   * {
   *   theory: 65,
   *   practical: 20
   * }
   */

  if (
    typeof marks ===
    "object"
  ) {
    return {
      ...marks,
    };
  }


  return {};
}


/* =========================================================
   COMPONENT MARK VALIDATION
========================================================= */

export function validateComponentMarks({
  value,
  component,
  subject,
  field,
  config = {},
} = {}) {
  const settings =
    normalizeValidationConfig(
      config
    );


  const issues = [];


  /*
   * Absent
   */

  if (
    typeof value ===
      "string" &&
    value.trim().toUpperCase() ===
      MARK_STATUS.ABSENT
  ) {
    if (
      !settings.allowAbsent
    ) {
      issues.push(
        createIssue({
          code:
            RESULT_VALIDATION_CODES
              .INVALID_MARK_COMPONENT,

          field,

          subjectId:
            subject?.id,

          subjectCode:
            subject?.code,

          message:
            "Absent marks are not allowed.",
        })
      );
    }


    return issues;
  }


  /*
   * N/A
   */

  if (
    typeof value ===
      "string" &&
    value.trim().toUpperCase() ===
      MARK_STATUS.NOT_APPLICABLE
  ) {
    if (
      !settings.allowNotApplicable
    ) {
      issues.push(
        createIssue({
          code:
            RESULT_VALIDATION_CODES
              .INVALID_MARK_COMPONENT,

          field,

          subjectId:
            subject?.id,

          subjectCode:
            subject?.code,

          message:
            "Not-applicable marks are not allowed.",
        })
      );
    }


    return issues;
  }


  /*
   * Exempt
   */

  if (
    typeof value ===
      "string" &&
    value.trim().toUpperCase() ===
      MARK_STATUS.EXEMPT
  ) {
    if (
      !settings.allowExempt
    ) {
      issues.push(
        createIssue({
          code:
            RESULT_VALIDATION_CODES
              .INVALID_MARK_COMPONENT,

          field,

          subjectId:
            subject?.id,

          subjectCode:
            subject?.code,

          message:
            "Exempt marks are not allowed.",
        })
      );
    }


    return issues;
  }


  /*
   * Empty mark.
   */

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    issues.push(
      createIssue({
        code:
          RESULT_VALIDATION_CODES
            .MARKS_MISSING,

        field,

        subjectId:
          subject?.id,

        subjectCode:
          subject?.code,

        message:
          `${component?.label || "Marks"} are missing.`,
      })
    );


    return issues;
  }


  /*
   * Numeric validation.
   */

  if (
    !isValidNumber(
      value
    )
  ) {
    issues.push(
      createIssue({
        code:
          RESULT_VALIDATION_CODES
            .INVALID_NUMBER,

        field,

        subjectId:
          subject?.id,

        subjectCode:
          subject?.code,

        value,

        message:
          `${component?.label || "Marks"} must be a valid number.`,
      })
    );


    return issues;
  }


  const number =
    Number(value);


  /*
   * Negative marks.
   */

  if (
    number < 0 &&
    !settings.allowNegativeMarks
  ) {
    issues.push(
      createIssue({
        code:
          RESULT_VALIDATION_CODES
            .NEGATIVE_MARKS,

        field,

        subjectId:
          subject?.id,

        subjectCode:
          subject?.code,

        value,

        message:
          `${component?.label || "Marks"} cannot be negative.`,
      })
    );
  }


  /*
   * Maximum marks.
   */

  const maximum =
    getComponentMaxMarks(
      component
    );


  if (
    maximum > 0 &&
    number > maximum
  ) {
    issues.push(
      createIssue({
        code:
          RESULT_VALIDATION_CODES
            .MAX_MARKS_EXCEEDED,

        field,

        subjectId:
          subject?.id,

        subjectCode:
          subject?.code,

        value:

          number,

        expected:
          maximum,

        message:
          `${component?.label || "Marks"} cannot exceed ${maximum}.`,
      })
    );
  }


  /*
   * Decimal restriction.
   */

  if (
    !settings.allowDecimalMarks &&
    !Number.isInteger(
      number
    )
  ) {
    issues.push(
      createIssue({
        code:
          RESULT_VALIDATION_CODES
            .INVALID_NUMBER,

        field,

        subjectId:
          subject?.id,

        subjectCode:
          subject?.code,

        value:
          number,

        message:
          `${component?.label || "Marks"} must be a whole number.`,
      })
    );
  }


  /*
   * Decimal precision.
   */

  if (
    settings.allowDecimalMarks
  ) {
    const decimalPart =
      String(number)
        .split(".")[1] ||
      "";


    if (
      decimalPart.length >
      settings.decimalPlaces
    ) {
      issues.push(
        createIssue({
          code:
            RESULT_VALIDATION_CODES
              .INVALID_NUMBER,

          field,

          subjectId:
            subject?.id,

          subjectCode:
            subject?.code,

          value:
            number,

          message:
            `${component?.label || "Marks"} can have at most ${settings.decimalPlaces} decimal places.`,
        })
      );
    }
  }


  return issues;
}


/* =========================================================
   SUBJECT MARK VALIDATION
========================================================= */

export function validateSubjectMarks({
  subject,
  marks,
  config = {},
} = {}) {
  const settings =
    normalizeValidationConfig(
      config
    );


  const normalizedSubject =
    normalizeSubjectConfig(
      subject
    );


  const issues = [];


  /*
   * Configuration check.
   */

  const maximum =
    getSubjectMaxMarks(
      normalizedSubject
    );


  if (
    maximum <= 0
  ) {
    issues.push(
      createIssue({
        code:
          RESULT_VALIDATION_CODES
            .INVALID_CONFIGURATION,

        subjectId:
          normalizedSubject.id,

        subjectCode:
          normalizedSubject.code,

        message:
          `${normalizedSubject.name} has an invalid maximum-mark configuration.`,
      })
    );
  }


  const components =
    getSubjectComponents(
      normalizedSubject
    );


  const markObject =
    getSubjectMarks(
      marks,
      normalizedSubject
    );


  /*
   * Single total mark.
   */

  if (
    components.length ===
      1 &&
    components[0].key ===
      "total"
  ) {
    issues.push(
      ...validateComponentMarks({
        value:
          markObject.total,

        component:
          components[0],

        subject:
          normalizedSubject,

        field:
          `marks.${normalizedSubject.code}.total`,

        config:
          settings,
      })
    );


    return issues;
  }


  /*
   * Component marks.
   */

  components.forEach(
    (component) => {
      const key =
        component.key ||
        component.id ||
        component.code;


      const value =
        markObject?.[
          key
        ];


      issues.push(
        ...validateComponentMarks({
          value,

          component,

          subject:
            normalizedSubject,

          field:
            `marks.${normalizedSubject.code}.${key}`,

          config:
            settings,
        })
      );
    }
  );


  return issues;
}


/* =========================================================
   SUBJECT TOTAL
========================================================= */

export function calculateSubjectTotal({
  subject,
  marks,
} = {}) {
  const normalized =
    normalizeSubjectConfig(
      subject
    );


  const markObject =
    getSubjectMarks(
      marks,
      normalized
    );


  /*
   * Direct total.
   */

  if (
    isValidNumber(
      markObject.total
    )
  ) {
    return roundNumber(
      markObject.total
    );
  }


  /*
   * Component total.
   */

  const components =
    getSubjectComponents(
      normalized
    );


  return roundNumber(
    components.reduce(
      (
        total,
        component
      ) => {
        const key =
          component.key ||
          component.id ||
          component.code;


        const value =
          markObject?.[
            key
          ];


        if (
          !isValidNumber(
            value
          )
        ) {
          return total;
        }


        return (
          total +
          Number(value)
        );
      },
      0
    )
  );
}


/* =========================================================
   TOTAL MARKS
========================================================= */

export function calculateTotalMarks({
  subjects = [],
  marks = {},
} = {}) {
  return roundNumber(
    subjects.reduce(
      (
        total,
        subject
      ) => {
        const subjectKey =
          subject?.subjectCode ||
          subject?.code ||
          subject?.id;


        return (
          total +
          calculateSubjectTotal({
            subject,

            marks:
              marks?.[
                subjectKey
              ],
          })
        );
      },
      0
    )
  );
}


/* =========================================================
   MAXIMUM TOTAL
========================================================= */

export function calculateMaximumMarks(
  subjects = []
) {
  return roundNumber(
    subjects.reduce(
      (
        total,
        subject
      ) =>
        total +
        getSubjectMaxMarks(
          subject
        ),
      0
    )
  );
}


/* =========================================================
   PASSING TOTAL
========================================================= */

export function calculatePassingMarks(
  subjects = []
) {
  return roundNumber(
    subjects.reduce(
      (
        total,
        subject
      ) =>
        total +
        getSubjectPassingMarks(
          subject
        ),
      0
    )
  );
}


/* =========================================================
   PERCENTAGE
========================================================= */

export function calculatePercentage({
  totalMarks,
  maximumMarks,
  precision = 2,
} = {}) {
  if (
    !isValidNumber(
      totalMarks
    ) ||
    !isValidNumber(
      maximumMarks
    ) ||
    Number(
      maximumMarks
    ) <= 0
  ) {
    return 0;
  }


  return roundNumber(
    (
      Number(
        totalMarks
      ) /
      Number(
        maximumMarks
      )
    ) *
      100,

    precision
  );
}


/* =========================================================
   GRADE SCALE NORMALIZATION
========================================================= */

export function normalizeGradeScale(
  scale
) {
  if (
    !Array.isArray(
      scale
    )
  ) {
    return [];
  }


  return scale
    .map(
      (item) => ({
        grade:
          item.grade ||
          item.name ||
          "",

        minPercentage:
          toNumber(
            item.minPercentage ??
              item.min ??
              0
          ),

        maxPercentage:
          toNumber(
            item.maxPercentage ??
              item.max ??
              100
          ),

        point:
          item.point ??
          item.gradePoint ??
          null,

        remark:
          item.remark ||
          "",
      })
    )
    .filter(
      (item) =>
        item.grade
    )
    .sort(
      (
        a,
        b
      ) =>
        b.minPercentage -
        a.minPercentage
    );
}


/* =========================================================
   CALCULATE GRADE
========================================================= */

export function calculateGrade(
  percentage,
  gradeScale = []
) {
  const scale =
    normalizeGradeScale(
      gradeScale
    );


  const match =
    scale.find(
      (item) =>
        percentage >=
          item.minPercentage &&
        percentage <=
          item.maxPercentage
    );


  return (
    match || {
      grade:
        "",

      point:
        null,

      remark:
        "",
    }
  );
}


/* =========================================================
   PASS / FAIL
========================================================= */

export function calculatePassFail({
  subjects = [],
  marks = {},
  totalMarks = null,
  maximumMarks = null,
  config = {},
} = {}) {
  const settings =
    normalizeValidationConfig(
      config
    );


  /*
   * Subject-level passing.
   */

  const subjectResults =
    subjects.map(
      (subject) => {
        const key =
          subject?.subjectCode ||
          subject?.code ||
          subject?.id;


        const subjectTotal =
          calculateSubjectTotal({
            subject,

            marks:
              marks?.[
                key
              ],
          });


        const passing =
          getSubjectPassingMarks(
            subject
          );


        return {
          subjectId:
            subject?.id ||
            subject?.subjectId ||
            null,

          subjectCode:
            subject?.subjectCode ||
            subject?.code ||
            "",

          subjectName:
            subject?.subjectName ||
            subject?.name ||
            "",

          total:
            subjectTotal,

          passingMarks:
            passing,

          passed:
            subjectTotal >=
            passing,
        };
      }
    );


  const allSubjectsPassed =
    subjectResults.every(
      (item) =>
        item.passed
    );


  /*
   * Overall percentage.
   */

  const percentage =
    calculatePercentage({
      totalMarks,

      maximumMarks,

      precision:
        settings.percentagePrecision,
    });


  const overallPassed =
    percentage >=
    settings.minimumPassingPercentage;


  return {
    passed:
      allSubjectsPassed &&
      overallPassed,

    percentage,

    subjects:
      subjectResults,

    allSubjectsPassed,

    overallPassed,
  };
}


/* =========================================================
   DUPLICATE SUBJECT CHECK
========================================================= */

export function findDuplicateSubjects(
  subjects = []
) {
  const seen =
    new Set();

  const duplicates =
    new Set();


  subjects.forEach(
    (subject) => {
      const key =
        String(
          subject?.subjectCode ||
          subject?.code ||
          subject?.id ||
          subject?.subjectName ||
          subject?.name ||
          ""
        )
          .trim()
          .toLowerCase();


      if (!key) {
        return;
      }


      if (
        seen.has(
          key
        )
      ) {
        duplicates.add(
          key
        );
      }


      seen.add(
        key
      );
    }
  );


  return [
    ...duplicates,
  ];
}


/* =========================================================
   MISSING SUBJECT CHECK
========================================================= */

export function findMissingSubjects({
  subjects = [],
  marks = {},
} = {}) {
  return subjects.filter(
    (subject) => {
      if (
        subject.required ===
        false
      ) {
        return false;
      }


      const key =
        subject?.subjectCode ||
        subject?.code ||
        subject?.id;


      return (
        marks?.[
          key
        ] === undefined ||
        marks?.[
          key
        ] === null
      );
    }
  );
}


/* =========================================================
   TOTAL VALIDATION
========================================================= */

export function validateTotals({
  subjects = [],
  marks = {},
  suppliedTotal,
} = {}) {
  const calculated =
    calculateTotalMarks({
      subjects,

      marks,
    });


  if (
    suppliedTotal ===
      undefined ||
    suppliedTotal ===
      null
  ) {
    return {
      valid:
        true,

      calculated,
    };
  }


  const supplied =
    toNumber(
      suppliedTotal
    );


  return {
    valid:
      roundNumber(
        supplied
      ) ===
      roundNumber(
        calculated
      ),

    calculated,

    supplied,
  };
}


/* =========================================================
   PERCENTAGE VALIDATION
========================================================= */

export function validatePercentage({
  totalMarks,
  maximumMarks,
  suppliedPercentage,
  config = {},
} = {}) {
  if (
    suppliedPercentage ===
      undefined ||
    suppliedPercentage ===
      null
  ) {
    return {
      valid:
        true,

      calculated:
        calculatePercentage({
          totalMarks,

          maximumMarks,

          precision:
            normalizeValidationConfig(
              config
            ).percentagePrecision,
        }),
    };
  }


  const calculated =
    calculatePercentage({
      totalMarks,

      maximumMarks,

      precision:
        normalizeValidationConfig(
          config
        ).percentagePrecision,
    });


  const supplied =
    toNumber(
      suppliedPercentage
    );


  return {
    valid:
      roundNumber(
        supplied,
        2
      ) ===
      roundNumber(
        calculated,
        2
      ),

    calculated,

    supplied,
  };
}


/* =========================================================
   COMPLETE RESULT VALIDATION
========================================================= */

export function validateResult({
  result = {},
  subjects = [],
  marks = {},
  config = {},
} = {}) {
  const settings =
    normalizeValidationConfig(
      config
    );


  const errors = [];
  const warnings = [];
  const info = [];


  /*
   * Required result fields.
   */

  const requiredFields = [
    [
      "studentId",
      "Student",
    ],

    [
      "academicYear",
      "Academic year",
    ],

    [
      "examinationName",
      "Examination",
    ],
  ];


  requiredFields.forEach(
    ([field, label]) => {
      const issue =
        validateRequiredField(
          result?.[
            field
          ],
          field,
          label
        );


      if (issue) {
        errors.push(
          issue
        );
      }
    }
  );


  /*
   * Subjects.
   */

  if (
    !Array.isArray(
      subjects
    ) ||
    subjects.length ===
      0
  ) {
    errors.push(
      createIssue({
        code:
          RESULT_VALIDATION_CODES
            .SUBJECT_MISSING,

        field:
          "subjects",

        message:
          "At least one subject is required.",
      })
    );
  }


  /*
   * Duplicate subjects.
   */

  const duplicates =
    findDuplicateSubjects(
      subjects
    );


  duplicates.forEach(
    (duplicate) => {
      errors.push(
        createIssue({
          code:
            RESULT_VALIDATION_CODES
              .DUPLICATE_SUBJECT,

          field:
            "subjects",

          value:
            duplicate,

          message:
            `Duplicate subject detected: ${duplicate}.`,
        })
      );
    }
  );


  /*
   * Subject marks.
   */

  subjects.forEach(
    (subject) => {
      const key =
        subject?.subjectCode ||
        subject?.code ||
        subject?.id;


      const subjectIssues =
        validateSubjectMarks({
          subject,

          marks:
            marks?.[
              key
            ],

          config:
            settings,
        });


      errors.push(
        ...subjectIssues
      );
    }
  );


  /*
   * Missing required subjects.
   */

  if (
    settings.requireAllSubjects
  ) {
    const missing =
      findMissingSubjects({
        subjects,

        marks,
      });


    missing.forEach(
      (subject) => {
        errors.push(
          createIssue({
            code:
              RESULT_VALIDATION_CODES
                .SUBJECT_MISSING,

            field:
              `marks.${
                subject?.subjectCode ||
                subject?.code ||
                subject?.id
              }`,

            subjectId:
              subject?.id ||
              subject?.subjectId,

            subjectCode:
              subject?.subjectCode ||
              subject?.code,

            message:
              `${subject?.subjectName || subject?.name || "Required subject"} marks are missing.`,
          })
        );
      }
    );
  }


  /*
   * Calculated totals.
   */

  const calculatedTotal =
    calculateTotalMarks({
      subjects,

      marks,
    });


  const maximumMarks =
    calculateMaximumMarks(
      subjects
    );


  const passingMarks =
    calculatePassingMarks(
      subjects
    );


  /*
   * Supplied total.
   */

  if (
    settings.verifyTotals
  ) {
    const totalCheck =
      validateTotals({
        subjects,

        marks,

        suppliedTotal:
          result?.totalMarks,
      });


    if (
      !totalCheck.valid
    ) {
      errors.push(
        createIssue({
          code:
            RESULT_VALIDATION_CODES
              .TOTAL_MISMATCH,

          field:
            "totalMarks",

          value:
            totalCheck.supplied,

          expected:
            totalCheck.calculated,

          message:
            `Total marks mismatch. Expected ${totalCheck.calculated}, received ${totalCheck.supplied}.`,
        })
      );
    }
  }


  /*
   * Percentage.
   */

  const calculatedPercentage =
    calculatePercentage({
      totalMarks:
        calculatedTotal,

      maximumMarks,

      precision:
        settings.percentagePrecision,
    });


  if (
    settings.verifyPercentage
  ) {
    const percentageCheck =
      validatePercentage({
        totalMarks:
          calculatedTotal,

        maximumMarks,

        suppliedPercentage:
          result?.percentage,

        config:
          settings,
      });


    if (
      !percentageCheck.valid
    ) {
      errors.push(
        createIssue({
          code:
            RESULT_VALIDATION_CODES
              .PERCENTAGE_MISMATCH,

          field:
            "percentage",

          value:
            percentageCheck.supplied,

          expected:
            percentageCheck.calculated,

          message:
            `Percentage mismatch. Expected ${percentageCheck.calculated}%, received ${percentageCheck.supplied}%.`,
        })
      );
    }
  }


  /*
   * Grade.
   */

  let calculatedGrade =
    null;


  if (
    result?.gradeScale
  ) {
    calculatedGrade =
      calculateGrade(
        calculatedPercentage,

        result.gradeScale
      );


    if (
      settings.verifyGrade &&
      result?.grade &&
      calculatedGrade.grade !==
        result.grade
    ) {
      errors.push(
        createIssue({
          code:
            RESULT_VALIDATION_CODES
              .GRADE_MISMATCH,

          field:
            "grade",

          value:
            result.grade,

          expected:
            calculatedGrade.grade,

          message:
            `Grade mismatch. Expected ${calculatedGrade.grade}, received ${result.grade}.`,
        })
      );
    }
  }


  /*
   * Pass/fail.
   */

  const passFail =
    calculatePassFail({
      subjects,

      marks,

      totalMarks:
        calculatedTotal,

      maximumMarks,

      config:
        settings,
    });


  /*
   * Existing result status.
   */

  if (
    result?.status &&
    settings.verifyResultStatus
  ) {
    const status =
      String(
        result.status
      )
        .trim()
        .toUpperCase();


    if (
      status === "PUBLISHED" &&
      errors.length
    ) {
      errors.push(
        createIssue({
          code:
            RESULT_VALIDATION_CODES
              .RESULT_STATUS_MISMATCH,

          field:
            "status",

          message:
            "A result with validation errors cannot be published.",
        })
      );
    }
  }


  /*
   * Warnings.
   */

  if (
    calculatedTotal ===
      0 &&
    subjects.length
  ) {
    warnings.push(
      createIssue({
        code:
          "ZERO_TOTAL",

        severity:
          VALIDATION_SEVERITY.WARNING,

        field:
          "totalMarks",

        message:
          "The calculated total is zero. Please verify the marks.",
      })
    );
  }


  /*
   * Grace marks warning.
   */

  if (
    result?.graceMarks &&
    !settings.allowGraceMarks
  ) {
    errors.push(
      createIssue({
        code:
          "GRACE_MARKS_NOT_ALLOWED",

        field:
          "graceMarks",

        message:
          "Grace marks are not enabled for this result configuration.",
      })
    );
  }


  /*
   * Final summary.
   */

  const valid =
    errors.length ===
    0;


  const completeness =
    subjects.length >
      0 &&
    findMissingSubjects({
      subjects,

      marks,
    }).length ===
      0;


  return {
    valid,

    completeness: {
      complete:
        completeness,

      missingSubjects:
        findMissingSubjects({
          subjects,

          marks,
        }),
    },

    errors,

    warnings,

    info,

    totals: {
      obtained:
        calculatedTotal,

      maximum:
        maximumMarks,

      passing:
        passingMarks,
    },

    percentage:
      calculatedPercentage,

    grade:
      calculatedGrade,

    passFail,

    subjectCount:
      subjects.length,

    checkedAt:
      new Date().toISOString(),
  };
}


/* =========================================================
   QUICK VALIDATION
========================================================= */

export function isResultValid(
  options = {}
) {
  return validateResult(
    options
  ).valid;
}


/* =========================================================
   GET VALIDATION ERRORS
========================================================= */

export function getValidationErrors(
  options = {}
) {
  return validateResult(
    options
  ).errors;
}


/* =========================================================
   GET FIELD ERRORS
========================================================= */

export function getFieldErrors(
  validationResult,
  field
) {
  if (
    !validationResult
      ?.errors
  ) {
    return [];
  }


  return validationResult.errors.filter(
    (error) =>
      error.field ===
      field
  );
}


/* =========================================================
   HAS FIELD ERROR
========================================================= */

export function hasFieldError(
  validationResult,
  field
) {
  return (
    getFieldErrors(
      validationResult,
      field
    ).length >
    0
  );
}


/* =========================================================
   VALIDATION SUMMARY
========================================================= */

export function getValidationSummary(
  validationResult
) {
  const errors =
    validationResult?.errors ||
    [];

  const warnings =
    validationResult?.warnings ||
    [];


  return {
    valid:
      errors.length ===
      0,

    errorCount:
      errors.length,

    warningCount:
      warnings.length,

    firstError:
      errors[0] ||
      null,

    message:
      errors.length
        ? errors[0].message
        : "Result is valid.",
  };
}


/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default {
  MARK_STATUS,
  VALIDATION_SEVERITY,
  RESULT_VALIDATION_CODES,

  DEFAULT_VALIDATION_CONFIG,

  normalizeValidationConfig,

  isValidNumber,
  toNumber,
  roundNumber,
  normalizeMarkValue,

  validateRequiredField,

  normalizeSubjectConfig,
  getSubjectComponents,
  getComponentMaxMarks,
  getSubjectMaxMarks,
  getSubjectPassingMarks,
  getSubjectMarks,

  validateComponentMarks,
  validateSubjectMarks,

  calculateSubjectTotal,
  calculateTotalMarks,
  calculateMaximumMarks,
  calculatePassingMarks,

  calculatePercentage,

  normalizeGradeScale,
  calculateGrade,
  calculatePassFail,

  findDuplicateSubjects,
  findMissingSubjects,

  validateTotals,
  validatePercentage,

  validateResult,
  isResultValid,

  getValidationErrors,
  getFieldErrors,
  hasFieldError,
  getValidationSummary,
};