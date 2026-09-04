import React, { useMemo } from "react";

/*
=========================================================
ADVANCED RESULT TABLE
=========================================================

Compatible with existing AddResult.jsx:

subjects
formData
handleChange

Supported components:

- Theory
- Practical
- Internal
- Project

Features:

- Automatic total
- Automatic percentage
- Automatic PASS / FAIL / PENDING
- INVALID marks detection
- Zero marks supported
- Maximum marks validation
- Passing marks validation
- Live summary
- Responsive table
- Internal / Project ready
- No Firebase
- No navigation
- No PDF
=========================================================
*/


/* ========================================================
   BASIC HELPERS
======================================================== */

const COMPONENTS = [
  "theory",
  "practical",
  "internal",
  "project",
];


function toNumber(value, fallback = 0) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}


function hasValue(value) {
  return (
    value !== undefined &&
    value !== null &&
    value !== ""
  );
}


function formatNumber(value, digits = 2) {
  const number = toNumber(value);

  if (Number.isInteger(number)) {
    return String(number);
  }

  return number.toFixed(digits);
}


/* ========================================================
   COMPONENT CONFIG
======================================================== */

const COMPONENT_CONFIG = {
  theory: {
    label: "Theory",
    maximumKey: "theoryMarks",
    passingKey: "passingTheory",
  },

  practical: {
    label: "Practical",
    maximumKey: "practicalMarks",
    passingKey: "passingPractical",
  },

  internal: {
    label: "Internal",
    maximumKey: "internalMarks",
    passingKey: "passingInternal",
  },

  project: {
    label: "Project",
    maximumKey: "projectMarks",
    passingKey: "passingProject",
  },
};


/* ========================================================
   SUBJECT HELPERS
======================================================== */

function getSubjectCode(subject) {
  return (
    subject?.subjectCode ||
    subject?.code ||
    subject?.id ||
    ""
  );
}


function getSubjectName(subject) {
  return (
    subject?.subjectName ||
    subject?.name ||
    subject?.subject ||
    "Unnamed Subject"
  );
}


function getMaximum(subject, type) {
  const config =
    COMPONENT_CONFIG[type];

  if (!config) {
    return 0;
  }

  return toNumber(
    subject?.[config.maximumKey],
    0
  );
}


function getPassing(subject, type) {
  const config =
    COMPONENT_CONFIG[type];

  if (!config) {
    return 0;
  }

  return toNumber(
    subject?.[config.passingKey],
    0
  );
}


/* ========================================================
   ACTIVE COMPONENT
======================================================== */

function hasComponent(
  subject,
  type
) {
  return (
    getMaximum(
      subject,
      type
    ) > 0
  );
}


function getActiveComponents(subject) {
  return COMPONENTS.filter(
    (type) =>
      hasComponent(
        subject,
        type
      )
  );
}


/* ========================================================
   ENTERED MARKS
======================================================== */

function getMarks(
  subject,
  formData,
  type
) {
  const code =
    getSubjectCode(subject);

  return (
    formData?.[code]?.[type] ??
    ""
  );
}


function isEntered(
  subject,
  formData,
  type
) {
  return hasValue(
    getMarks(
      subject,
      formData,
      type
    )
  );
}


/* ========================================================
   COMPONENT VALIDATION
======================================================== */

function validateComponent(
  subject,
  formData,
  type
) {
  const maximum =
    getMaximum(
      subject,
      type
    );

  const passing =
    getPassing(
      subject,
      type
    );

  const raw =
    getMarks(
      subject,
      formData,
      type
    );

  /*
   * Component not configured
   */
  if (maximum <= 0) {
    return {
      active: false,
      entered: false,
      valid: true,
      passed: true,
      marks: 0,
      maximum: 0,
      passing: 0,
    };
  }

  /*
   * Blank component
   */
  if (!hasValue(raw)) {
    return {
      active: true,
      entered: false,
      valid: true,
      passed: false,
      marks: 0,
      maximum,
      passing,
    };
  }

  const marks =
    toNumber(raw);

  /*
   * Negative marks
   */
  if (marks < 0) {
    return {
      active: true,
      entered: true,
      valid: false,
      passed: false,
      marks,
      maximum,
      passing,
      error: "Marks cannot be negative",
    };
  }

  /*
   * Maximum exceeded
   */
  if (marks > maximum) {
    return {
      active: true,
      entered: true,
      valid: false,
      passed: false,
      marks,
      maximum,
      passing,
      error: `Maximum ${maximum}`,
    };
  }

  /*
   * Passing marks
   */
  return {
    active: true,
    entered: true,
    valid: true,
    passed: marks >= passing,
    marks,
    maximum,
    passing,
  };
}


/* ========================================================
   SUBJECT CALCULATION
======================================================== */

function calculateSubject(
  subject,
  formData
) {
  const components =
    {};

  const activeComponents =
    getActiveComponents(
      subject
    );

  let total = 0;
  let maximum = 0;
  let allEntered = true;
  let allValid = true;
  let allPassed = true;

  activeComponents.forEach(
    (type) => {
      const result =
        validateComponent(
          subject,
          formData,
          type
        );

      components[type] =
        result;

      total += result.marks;
      maximum += result.maximum;

      if (!result.entered) {
        allEntered = false;
      }

      if (!result.valid) {
        allValid = false;
      }

      if (
        result.entered &&
        result.valid &&
        !result.passed
      ) {
        allPassed = false;
      }
    }
  );

  /*
   * No components configured
   */
  if (
    activeComponents.length === 0
  ) {
    return {
      components,
      total: 0,
      maximum: 0,
      percentage: 0,
      status: "PENDING",
      activeComponents,
    };
  }

  /*
   * Invalid marks
   */
  if (!allValid) {
    return {
      components,
      total,
      maximum,
      percentage:
        maximum > 0
          ? (total / maximum) * 100
          : 0,
      status: "INVALID",
      activeComponents,
    };
  }

  /*
   * Some component still blank
   */
  if (!allEntered) {
    return {
      components,
      total,
      maximum,
      percentage:
        maximum > 0
          ? (total / maximum) * 100
          : 0,
      status: "PENDING",
      activeComponents,
    };
  }

  /*
   * All entered
   */
  const percentage =
    maximum > 0
      ? (total / maximum) * 100
      : 0;

  return {
    components,
    total,
    maximum,
    percentage,
    status:
      allPassed
        ? "PASS"
        : "FAIL",
    activeComponents,
  };
}


/* ========================================================
   MAIN COMPONENT
======================================================== */

export default function ResultTable({
  subjects = [],
  formData = {},
  handleChange,

  /*
   * Optional flags
   */
  showTheory = true,
  showPractical = true,
  showInternal = true,
  showProject = true,

  compact = false,
}) {
  const safeSubjects =
    Array.isArray(subjects)
      ? subjects
      : [];


  /* ======================================================
     ENABLED COMPONENTS
  ====================================================== */

  const componentEnabled = {
    theory: showTheory,
    practical: showPractical,
    internal: showInternal,
    project: showProject,
  };


  /* ======================================================
     LIVE CALCULATIONS
  ====================================================== */

  const calculatedSubjects =
    useMemo(() => {
      return safeSubjects.map(
        (subject) => ({
          subject,
          calculation:
            calculateSubject(
              subject,
              formData
            ),
        })
      );
    }, [
      safeSubjects,
      formData,
    ]);


  /* ======================================================
     SUMMARY
  ====================================================== */

  const summary =
    useMemo(() => {
      let entered = 0;
      let pending = 0;
      let passed = 0;
      let failed = 0;
      let invalid = 0;

      let obtained = 0;
      let maximum = 0;

      calculatedSubjects.forEach(
        ({
          calculation,
        }) => {
          obtained +=
            calculation.total;

          maximum +=
            calculation.maximum;

          switch (
            calculation.status
          ) {
            case "PASS":
              entered++;
              passed++;
              break;

            case "FAIL":
              entered++;
              failed++;
              break;

            case "INVALID":
              invalid++;
              break;

            default:
              pending++;
          }
        }
      );

      const percentage =
        maximum > 0
          ? (obtained / maximum) * 100
          : 0;

      return {
        entered,
        pending,
        passed,
        failed,
        invalid,
        obtained,
        maximum,
        percentage,
      };
    }, [
      calculatedSubjects,
    ]);


  /* ======================================================
     AVAILABLE COLUMNS
  ====================================================== */

  const visibleComponents =
    COMPONENTS.filter(
      (type) => {
        if (
          !componentEnabled[type]
        ) {
          return false;
        }

        return safeSubjects.some(
          (subject) =>
            hasComponent(
              subject,
              type
            )
        );
      }
    );


  /* ======================================================
     EMPTY
  ====================================================== */

  if (!safeSubjects.length) {
    return (
      <div className="mb-8 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
          📚
        </div>

        <h2 className="mt-4 text-xl font-black text-slate-800">
          No Subjects Available
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          Subjects for this class have not been
          configured yet. Please configure them
          from Subject Management first.
        </p>

      </div>
    );
  }


  /* ======================================================
     MARKS CHANGE
  ====================================================== */

  const onMarksChange = (
    subject,
    type,
    value
  ) => {
    if (
      typeof handleChange !==
      "function"
    ) {
      return;
    }

    handleChange(
      getSubjectCode(
        subject
      ),
      type,
      value
    );
  };


  /* ======================================================
     RENDER
  ====================================================== */

  return (
    <div className="mb-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">


      {/* ==================================================
         HEADER
      ================================================== */}

      <div className="bg-gradient-to-r from-green-900 via-emerald-800 to-green-700 p-6 text-white">

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <div className="mb-2 inline-flex rounded-full bg-white/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest">
              📝 Result Entry
            </div>

            <h2 className="text-2xl font-black">
              Subject-wise Marks
            </h2>

            <p className="mt-1 max-w-xl text-xs leading-5 text-emerald-100">
              Enter marks for every configured
              component. Total, percentage and
              subject status are calculated
              automatically.
            </p>

          </div>


          <div className="rounded-2xl border border-white/20 bg-white/10 px-6 py-4 backdrop-blur">

            <p className="text-[9px] font-black uppercase tracking-wider text-emerald-100">
              Total Subjects
            </p>

            <p className="mt-1 text-3xl font-black">
              {safeSubjects.length}
            </p>

          </div>

        </div>

      </div>


      {/* ==================================================
         LIVE SUMMARY
      ================================================== */}

      <div className="grid border-b border-slate-200 bg-slate-50 sm:grid-cols-2 lg:grid-cols-6">

        <SummaryItem
          icon="✏️"
          label="Entered"
          value={`${summary.entered}/${safeSubjects.length}`}
        />

        <SummaryItem
          icon="⏳"
          label="Pending"
          value={summary.pending}
          amber
        />

        <SummaryItem
          icon="✓"
          label="Passed"
          value={summary.passed}
          green
        />

        <SummaryItem
          icon="!"
          label="Failed"
          value={summary.failed}
          red
        />

        <SummaryItem
          icon="⚠"
          label="Invalid"
          value={summary.invalid}
          red={summary.invalid > 0}
        />

        <SummaryItem
          icon="%"
          label="Current %"
          value={`${formatNumber(
            summary.percentage
          )}%`}
          blue
        />

      </div>


      {/* ==================================================
         INVALID WARNING
      ================================================== */}

      {summary.invalid > 0 && (
        <div className="mx-5 mt-5 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg">
            ⚠️
          </div>

          <div>

            <p className="text-sm font-black text-red-700">
              Invalid marks detected
            </p>

            <p className="mt-1 text-xs leading-5 text-red-600">
              One or more marks exceed the configured
              maximum or contain an invalid value.
              Correct them before saving the result.
            </p>

          </div>

        </div>
      )}


      {/* ==================================================
         TABLE
      ================================================== */}

      <div className="p-5 sm:p-6">

        <div className="overflow-x-auto rounded-2xl border border-slate-200">

          <table
            className={[
              "w-full border-collapse",
              "min-w-[1100px]",
            ].join(" ")}
          >

            {/* TABLE HEADER */}

            <thead>

              <tr className="bg-slate-950 text-white">

                <th className="px-4 py-4 text-left text-[9px] font-black uppercase tracking-wider">
                  #
                </th>

                <th className="px-4 py-4 text-left text-[9px] font-black uppercase tracking-wider">
                  Subject
                </th>

                <th className="px-4 py-4 text-center text-[9px] font-black uppercase tracking-wider">
                  Code
                </th>

                {visibleComponents.map(
                  (type) => (
                    <th
                      key={type}
                      className="px-4 py-4 text-center text-[9px] font-black uppercase tracking-wider"
                    >
                      {COMPONENT_CONFIG[
                        type
                      ].label}
                    </th>
                  )
                )}

                <th className="px-4 py-4 text-center text-[9px] font-black uppercase tracking-wider">
                  Total
                </th>

                <th className="px-4 py-4 text-center text-[9px] font-black uppercase tracking-wider">
                  %
                </th>

                <th className="px-4 py-4 text-center text-[9px] font-black uppercase tracking-wider">
                  Grade
                </th>

                <th className="px-4 py-4 text-center text-[9px] font-black uppercase tracking-wider">
                  Status
                </th>

              </tr>

            </thead>


            {/* TABLE BODY */}

            <tbody>

              {calculatedSubjects.map(
                ({
                  subject,
                  calculation,
                },
                index) => {

                  const code =
                    getSubjectCode(
                      subject
                    );

                  const name =
                    getSubjectName(
                      subject
                    );

                  const grade =
                    getGrade(
                      calculation
                    );

                  return (
                    <tr
                      key={
                        code ||
                        subject?.id ||
                        index
                      }
                      className={[
                        "border-b border-slate-100 transition",
                        calculation.status ===
                          "FAIL"
                          ? "bg-red-50/40"
                          : calculation.status ===
                            "INVALID"
                          ? "bg-red-50"
                          : "hover:bg-emerald-50/40",
                      ].join(" ")}
                    >

                      {/* NUMBER */}

                      <td className="px-4 py-4">

                        <span className="text-sm font-black text-slate-400">
                          {String(
                            index + 1
                          ).padStart(
                            2,
                            "0"
                          )}
                        </span>

                      </td>


                      {/* SUBJECT */}

                      <td className="px-4 py-4">

                        <div className="min-w-[220px]">

                          <p className="text-sm font-black text-slate-800">
                            {name}
                          </p>

                          <div className="mt-1 flex flex-wrap gap-1.5">

                            {calculation.activeComponents.map(
                              (type) => (
                                <span
                                  key={
                                    type
                                  }
                                  className="rounded-full bg-slate-100 px-2 py-0.5 text-[8px] font-bold text-slate-500"
                                >
                                  {
                                    COMPONENT_CONFIG[
                                      type
                                    ].label
                                  }{" "}
                                  {
                                    getMaximum(
                                      subject,
                                      type
                                    )
                                  }
                                </span>
                              )
                            )}

                          </div>

                        </div>

                      </td>


                      {/* CODE */}

                      <td className="px-4 py-4 text-center">

                        <span className="rounded-lg bg-slate-100 px-3 py-2 font-mono text-[10px] font-black text-slate-600">
                          {code || "—"}
                        </span>

                      </td>


                      {/* COMPONENT INPUTS */}

                      {visibleComponents.map(
                        (type) => {

                          const component =
                            validateComponent(
                              subject,
                              formData,
                              type
                            );

                          if (
                            !hasComponent(
                              subject,
                              type
                            )
                          ) {
                            return (
                              <td
                                key={
                                  type
                                }
                                className="px-4 py-4"
                              >
                                <DisabledInput />
                              </td>
                            );
                          }

                          return (
                            <td
                              key={
                                type
                              }
                              className="px-4 py-4"
                            >

                              <MarksInput
                                value={getMarks(
                                  subject,
                                  formData,
                                  type
                                )}
                                maximum={
                                  component.maximum
                                }
                                passing={
                                  component.passing
                                }
                                invalid={
                                  !component.valid
                                }
                                error={
                                  component.error
                                }
                                onChange={(
                                  value
                                ) =>
                                  onMarksChange(
                                    subject,
                                    type,
                                    value
                                  )
                                }
                              />

                            </td>
                          );
                        }
                      )}


                      {/* TOTAL */}

                      <td className="px-4 py-4 text-center">

                        <p
                          className={[
                            "text-lg font-black",
                            calculation.status ===
                              "FAIL"
                              ? "text-red-600"
                              : calculation.status ===
                                "PASS"
                              ? "text-emerald-700"
                              : calculation.status ===
                                "INVALID"
                              ? "text-red-600"
                              : "text-slate-700",
                          ].join(" ")}
                        >
                          {formatNumber(
                            calculation.total
                          )}
                        </p>

                        <p className="text-[9px] font-bold text-slate-400">
                          /{" "}
                          {formatNumber(
                            calculation.maximum
                          )}
                        </p>

                      </td>


                      {/* PERCENTAGE */}

                      <td className="px-4 py-4 text-center">

                        {calculation.status ===
                        "PENDING" ? (
                          <span className="font-black text-slate-300">
                            —
                          </span>
                        ) : (
                          <span
                            className="font-black"
                            style={{
                              color:
                                calculation.status ===
                                "FAIL"
                                  ? "#dc2626"
                                  : "#047857",
                            }}
                          >
                            {formatNumber(
                              calculation.percentage
                            )}
                            %
                          </span>
                        )}

                      </td>


                      {/* GRADE */}

                      <td className="px-4 py-4 text-center">

                        <span
                          className={[
                            "inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-[10px] font-black",
                            grade ===
                              "F"
                              ? "bg-red-100 text-red-700"
                              : grade ===
                                "—"
                              ? "bg-slate-100 text-slate-400"
                              : "bg-emerald-100 text-emerald-700",
                          ].join(" ")}
                        >
                          {grade}
                        </span>

                      </td>


                      {/* STATUS */}

                      <td className="px-4 py-4 text-center">

                        <StatusBadge
                          status={
                            calculation.status
                          }
                        />

                      </td>

                    </tr>
                  );
                }
              )}

            </tbody>


            {/* =================================================
               GRAND TOTAL
            ================================================= */}

            <tfoot>

              <tr className="bg-emerald-50">

                <td
                  colSpan={
                    3 +
                    visibleComponents.length
                  }
                  className="px-4 py-5 text-left"
                >

                  <span className="text-sm font-black text-emerald-800">
                    GRAND TOTAL
                  </span>

                </td>

                <td className="px-4 py-5 text-center">

                  <p className="font-black text-emerald-800">
                    {formatNumber(
                      summary.obtained
                    )}
                  </p>

                  <p className="text-[9px] font-bold text-slate-400">
                    /{" "}
                    {formatNumber(
                      summary.maximum
                    )}
                  </p>

                </td>

                <td className="px-4 py-5 text-center">

                  <span className="font-black text-emerald-800">
                    {formatNumber(
                      summary.percentage
                    )}
                    %
                  </span>

                </td>

                <td className="px-4 py-5 text-center">

                  <span className="font-black text-emerald-800">
                    {getOverallGrade(
                      summary.percentage
                    )}
                  </span>

                </td>

                <td className="px-4 py-5 text-center">

                  <StatusBadge
                    status={getOverallStatus(
                      summary
                    )}
                  />

                </td>

              </tr>

            </tfoot>

          </table>

        </div>


        <p className="mt-3 text-center text-[10px] text-slate-400 lg:hidden">
          ← Swipe horizontally to view all marks columns →
        </p>

      </div>


      {/* ==================================================
         INFORMATION
      ================================================== */}

      <div className="grid gap-4 border-t border-slate-200 bg-slate-50 p-5 sm:grid-cols-3">

        <InfoCard
          icon="📘"
          title="Maximum Marks"
          text="Maximum marks and passing marks are taken from Subject Management."
        />

        <InfoCard
          icon="⚡"
          title="Live Calculation"
          text="Total, percentage, grade and status update automatically while entering marks."
        />

        <InfoCard
          icon="🛡️"
          title="Validation"
          text="Blank components remain pending and marks above the configured maximum are blocked from being treated as valid."
        />

      </div>


      {/* ==================================================
         GUIDELINES
      ================================================== */}

      <div className="border-t border-slate-200 p-5 sm:p-6">

        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">

          <div className="flex gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white">
              💡
            </div>

            <div>

              <h3 className="text-sm font-black text-amber-800">
                Marks Entry Guidelines
              </h3>

              <ul className="mt-3 space-y-2 text-[11px] leading-5 text-amber-700">

                <li>
                  • Maximum marks come from Subject Management.
                </li>

                <li>
                  • Passing marks are checked separately for each configured component.
                </li>

                <li>
                  • Zero is a valid marks entry.
                </li>

                <li>
                  • Blank components remain PENDING.
                </li>

                <li>
                  • Marks above the maximum are marked INVALID.
                </li>

                <li>
                  • A subject passes only when all configured components meet their passing requirement.
                </li>

                <li>
                  • Final result publication should remain controlled by the Admin.
                </li>

              </ul>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}


/* =========================================================
   GRADE
========================================================= */

function getGrade(
  calculation
) {
  if (
    calculation.status ===
      "PENDING" ||
    calculation.status ===
      "INVALID"
  ) {
    return "—";
  }

  return getGradeFromPercentage(
    calculation.percentage
  );
}


function getGradeFromPercentage(
  percentage
) {
  if (percentage >= 90) {
    return "A+";
  }

  if (percentage >= 80) {
    return "A";
  }

  if (percentage >= 70) {
    return "B+";
  }

  if (percentage >= 60) {
    return "B";
  }

  if (percentage >= 50) {
    return "C";
  }

  if (percentage >= 40) {
    return "D";
  }

  return "F";
}


/* =========================================================
   OVERALL GRADE
========================================================= */

function getOverallGrade(
  percentage
) {
  if (
    percentage <= 0
  ) {
    return "—";
  }

  return getGradeFromPercentage(
    percentage
  );
}


/* =========================================================
   OVERALL STATUS
========================================================= */

function getOverallStatus(
  summary
) {
  if (
    summary.invalid > 0
  ) {
    return "INVALID";
  }

  if (
    summary.pending > 0
  ) {
    return "PENDING";
  }

  if (
    summary.failed > 0
  ) {
    return "FAIL";
  }

  if (
    summary.passed ===
      0
  ) {
    return "PENDING";
  }

  return "PASS";
}


/* =========================================================
   MARKS INPUT
========================================================= */

function MarksInput({
  value,
  maximum,
  passing,
  invalid,
  error,
  onChange,
}) {
  return (
    <div className="min-w-[130px]">

      <input
        type="number"
        min="0"
        max={maximum}
        step="1"
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        onWheel={(event) =>
          event.currentTarget.blur()
        }
        className={[
          "w-full rounded-xl border-2 bg-white px-3 py-2.5 text-center text-sm font-black outline-none transition",
          invalid
            ? "border-red-400 bg-red-50 text-red-700 focus:border-red-500"
            : "border-slate-200 text-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100",
        ].join(" ")}
        placeholder="0"
        aria-label="Marks"
      />

      <div className="mt-1.5 flex justify-between px-1">

        <span className="text-[8px] font-bold text-slate-400">
          Max: {maximum}
        </span>

        <span className="text-[8px] font-bold text-emerald-600">
          Pass: {passing}
        </span>

      </div>

      {invalid && (
        <p className="mt-1 text-center text-[8px] font-black text-red-600">
          {error || "Invalid marks"}
        </p>
      )}

    </div>
  );
}


/* =========================================================
   DISABLED INPUT
========================================================= */

function DisabledInput() {
  return (
    <div className="min-w-[130px]">

      <div className="flex h-[43px] items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-xs font-black text-slate-300">
        N/A
      </div>

      <p className="mt-1.5 text-center text-[8px] font-bold text-slate-400">
        Not configured
      </p>

    </div>
  );
}


/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
  status,
}) {
  const config = {
    PASS: {
      icon: "✓",
      text: "PASS",
      className:
        "border-emerald-200 bg-emerald-100 text-emerald-700",
    },

    FAIL: {
      icon: "!",
      text: "FAIL",
      className:
        "border-red-200 bg-red-100 text-red-700",
    },

    INVALID: {
      icon: "⚠",
      text: "INVALID",
      className:
        "border-red-200 bg-red-100 text-red-700",
    },

    PENDING: {
      icon: "○",
      text: "PENDING",
      className:
        "border-amber-200 bg-amber-50 text-amber-700",
    },
  };

  const current =
    config[status] ||
    config.PENDING;

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[9px] font-black",
        current.className,
      ].join(" ")}
    >
      <span>
        {current.icon}
      </span>

      {current.text}
    </span>
  );
}


/* =========================================================
   SUMMARY ITEM
========================================================= */

function SummaryItem({
  icon,
  label,
  value,
  green,
  red,
  blue,
  amber,
}) {
  let valueClass =
    "text-slate-800";

  if (green) {
    valueClass =
      "text-emerald-700";
  }

  if (red) {
    valueClass =
      "text-red-600";
  }

  if (blue) {
    valueClass =
      "text-blue-700";
  }

  if (amber) {
    valueClass =
      "text-amber-700";
  }

  return (
    <div className="border-b border-slate-200 px-4 py-4 sm:border-r lg:border-b-0">

      <div className="flex items-center gap-2">

        <span className="text-sm">
          {icon}
        </span>

        <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
          {label}
        </p>

      </div>

      <p
        className={[
          "mt-1 text-lg font-black",
          valueClass,
        ].join(" ")}
      >
        {value}
      </p>

    </div>
  );
}


/* =========================================================
   INFO CARD
========================================================= */

function InfoCard({
  icon,
  title,
  text,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">

      <div className="flex items-center gap-3">

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50">
          {icon}
        </div>

        <h3 className="text-xs font-black text-slate-800">
          {title}
        </h3>

      </div>

      <p className="mt-3 text-[10px] leading-5 text-slate-500">
        {text}
      </p>

    </div>
  );
}