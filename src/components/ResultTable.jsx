import { useMemo } from "react";

/* =========================================================
   RESULT TABLE
   Smart subject-wise marks entry

   IMPORTANT:
   Props remain compatible with existing AddResult.jsx:
   - subjects
   - formData
   - handleChange
========================================================= */

function ResultTable({
  subjects = [],
  formData = {},
  handleChange,
}) {
  /* =======================================================
     HELPERS
  ======================================================= */

  const getMarks = (
    subject,
    type
  ) => {
    const value =
      formData?.[
        subject.subjectCode
      ]?.[type];

    if (
      value === "" ||
      value === null ||
      value === undefined
    ) {
      return 0;
    }

    return Number(value);
  };

  const getTheory = (
    subject
  ) => {
    return getMarks(
      subject,
      "theory"
    );
  };

  const getPractical = (
    subject
  ) => {
    return getMarks(
      subject,
      "practical"
    );
  };

  const getTotal = (
    subject
  ) => {
    return (
      getTheory(subject) +
      getPractical(subject)
    );
  };

  const getMaximum = (
    subject
  ) => {
    return Number(
      subject.totalMarks || 0
    );
  };

  const getPercentage = (
    subject
  ) => {
    const maximum =
      getMaximum(subject);

    if (!maximum) return 0;

    return Number(
      (
        (getTotal(subject) /
          maximum) *
        100
      ).toFixed(1)
    );
  };

  const hasTheory =
    (subject) =>
      Number(
        subject.theoryMarks || 0
      ) > 0;

  const hasPractical =
    (subject) =>
      Number(
        subject.practicalMarks || 0
      ) > 0;

  const getStatus = (
    subject
  ) => {
    const theory =
      getTheory(subject);

    const practical =
      getPractical(subject);

    const theoryMaximum =
      Number(
        subject.theoryMarks || 0
      );

    const practicalMaximum =
      Number(
        subject.practicalMarks || 0
      );

    const passingTheory =
      Number(
        subject.passingTheory || 0
      );

    const passingPractical =
      Number(
        subject.passingPractical || 0
      );

    const theoryEntered =
      formData?.[
        subject.subjectCode
      ]?.theory !== "" &&
      formData?.[
        subject.subjectCode
      ]?.theory !== undefined;

    const practicalEntered =
      formData?.[
        subject.subjectCode
      ]?.practical !== "" &&
      formData?.[
        subject.subjectCode
      ]?.practical !== undefined;

    /* Nothing entered */

    if (
      !theoryEntered &&
      !practicalEntered
    ) {
      return "PENDING";
    }

    /* Maximum exceeded */

    if (
      theory > theoryMaximum ||
      practical > practicalMaximum
    ) {
      return "INVALID";
    }

    /* Theory passing requirement */

    if (
      hasTheory(subject) &&
      theory < passingTheory
    ) {
      return "FAIL";
    }

    /* Practical passing requirement */

    if (
      hasPractical(subject) &&
      practical < passingPractical
    ) {
      return "FAIL";
    }

    return "PASS";
  };

  /* =======================================================
     INPUT VALIDATION
  ======================================================= */

  const isExceeded = (
    subject,
    type
  ) => {
    const value =
      getMarks(
        subject,
        type
      );

    const maximum =
      Number(
        subject[
          type === "theory"
            ? "theoryMarks"
            : "practicalMarks"
        ] || 0
      );

    return value > maximum;
  };

  const handleMarksChange = (
    subject,
    type,
    value
  ) => {
    /*
      Do not silently modify the value here.
      AddResult.jsx remains the source of truth for
      updating formData.
    */

    handleChange(
      subject.subjectCode,
      type,
      value
    );
  };

  /* =======================================================
     SUMMARY
  ======================================================= */

  const summary = useMemo(() => {
    let entered = 0;
    let passed = 0;
    let failed = 0;
    let invalid = 0;
    let obtained = 0;
    let maximum = 0;

    subjects.forEach(
      (subject) => {
        const status =
          getStatus(subject);

        const total =
          getTotal(subject);

        obtained += total;

        maximum +=
          getMaximum(subject);

        if (
          status !== "PENDING"
        ) {
          entered++;
        }

        if (
          status === "PASS"
        ) {
          passed++;
        }

        if (
          status === "FAIL"
        ) {
          failed++;
        }

        if (
          status === "INVALID"
        ) {
          invalid++;
        }
      }
    );

    const percentage =
      maximum > 0
        ? Number(
            (
              (obtained /
                maximum) *
              100
            ).toFixed(2)
          )
        : 0;

    return {
      entered,
      passed,
      failed,
      invalid,
      obtained,
      maximum,
      percentage,
    };
  }, [
    subjects,
    formData,
  ]);

  /* =======================================================
     EMPTY STATE
  ======================================================= */

  if (!subjects.length) {
    return (
      <div className="mb-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
          📚
        </div>

        <h2 className="mt-4 text-xl font-extrabold text-slate-800">
          No Subjects Available
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          Subjects for this student's class have not
          been configured yet. Please configure subjects
          from Subject Management first.
        </p>

      </div>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="mb-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="border-b border-slate-200 bg-gradient-to-r from-green-800 to-emerald-700 p-6 text-white">

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold">
              📝 RESULT ENTRY
            </div>

            <h2 className="text-2xl font-extrabold">
              Subject-wise Marks
            </h2>

            <p className="mt-1 max-w-xl text-xs leading-5 text-green-100">
              Enter marks carefully. Total marks and
              subject status are calculated automatically.
            </p>

          </div>

          {/* SUBJECT COUNT */}

          <div className="rounded-2xl border border-white/20 bg-white/10 px-6 py-4 backdrop-blur">

            <p className="text-[10px] font-bold uppercase tracking-wider text-green-100">
              Total Subjects
            </p>

            <p className="mt-1 text-3xl font-extrabold">
              {subjects.length}
            </p>

          </div>

        </div>

      </div>

      {/* =================================================
          LIVE SUMMARY
      ================================================= */}

      <div className="grid border-b border-slate-200 bg-slate-50 sm:grid-cols-2 lg:grid-cols-5">

        <SummaryItem
          label="Entered"
          value={`${summary.entered}/${subjects.length}`}
          icon="✏️"
        />

        <SummaryItem
          label="Passed"
          value={summary.passed}
          icon="✅"
          green
        />

        <SummaryItem
          label="Failed"
          value={summary.failed}
          icon="❌"
          red
        />

        <SummaryItem
          label="Marks"
          value={`${summary.obtained}/${summary.maximum}`}
          icon="📊"
        />

        <SummaryItem
          label="Current %"
          value={`${summary.percentage}%`}
          icon="📈"
          blue
        />

      </div>

      {/* =================================================
          INVALID WARNING
      ================================================= */}

      {summary.invalid > 0 && (
        <div className="mx-5 mt-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4">

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white">
            ⚠️
          </div>

          <div>

            <p className="text-xs font-extrabold text-red-700">
              Marks need attention
            </p>

            <p className="mt-1 text-[11px] leading-5 text-red-600">
              One or more entered marks are greater than
              the maximum marks configured for that subject.
              Correct them before saving the result.
            </p>

          </div>

        </div>
      )}

      {/* =================================================
          TABLE
      ================================================= */}

      <div className="p-5 sm:p-6">

        <div className="overflow-x-auto rounded-2xl border border-slate-200">

          <table className="min-w-[1050px] w-full border-collapse">

            {/* TABLE HEADER */}

            <thead>

              <tr className="bg-slate-900 text-white">

                <th className="px-4 py-4 text-left text-[10px] font-extrabold uppercase tracking-wider">
                  #
                </th>

                <th className="px-4 py-4 text-left text-[10px] font-extrabold uppercase tracking-wider">
                  Subject
                </th>

                <th className="px-4 py-4 text-center text-[10px] font-extrabold uppercase tracking-wider">
                  Code
                </th>

                <th className="px-4 py-4 text-center text-[10px] font-extrabold uppercase tracking-wider">
                  Theory
                </th>

                <th className="px-4 py-4 text-center text-[10px] font-extrabold uppercase tracking-wider">
                  Practical
                </th>

                <th className="px-4 py-4 text-center text-[10px] font-extrabold uppercase tracking-wider">
                  Total
                </th>

                <th className="px-4 py-4 text-center text-[10px] font-extrabold uppercase tracking-wider">
                  %
                </th>

                <th className="px-4 py-4 text-center text-[10px] font-extrabold uppercase tracking-wider">
                  Status
                </th>

              </tr>

            </thead>

            {/* TABLE BODY */}

            <tbody className="divide-y divide-slate-100">

              {subjects.map(
                (subject, index) => {

                  const theory =
                    getTheory(
                      subject
                    );

                  const practical =
                    getPractical(
                      subject
                    );

                  const total =
                    getTotal(
                      subject
                    );

                  const maximum =
                    getMaximum(
                      subject
                    );

                  const percentage =
                    getPercentage(
                      subject
                    );

                  const status =
                    getStatus(
                      subject
                    );

                  const theoryInvalid =
                    isExceeded(
                      subject,
                      "theory"
                    );

                  const practicalInvalid =
                    isExceeded(
                      subject,
                      "practical"
                    );

                  return (
                    <tr
                      key={
                        subject.id ||
                        subject.subjectCode ||
                        index
                      }
                      className={`transition ${
                        status ===
                        "FAIL"
                          ? "bg-red-50/40"
                          : status ===
                            "INVALID"
                          ? "bg-red-50"
                          : "hover:bg-green-50/40"
                      }`}
                    >

                      {/* NUMBER */}

                      <td className="px-4 py-4 text-sm font-bold text-slate-400">
                        {String(
                          index + 1
                        ).padStart(
                          2,
                          "0"
                        )}
                      </td>

                      {/* SUBJECT */}

                      <td className="px-4 py-4">

                        <div className="min-w-[220px]">

                          <p className="text-sm font-extrabold text-slate-800">
                            {
                              subject.subjectName
                            }
                          </p>

                          <div className="mt-1 flex flex-wrap gap-2">

                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-500">
                              Max{" "}
                              {maximum}
                            </span>

                            {hasTheory(
                              subject
                            ) && (
                              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-600">
                                Theory{" "}
                                {
                                  subject.theoryMarks
                                }
                              </span>
                            )}

                            {hasPractical(
                              subject
                            ) && (
                              <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[9px] font-bold text-purple-600">
                                Practical{" "}
                                {
                                  subject.practicalMarks
                                }
                              </span>
                            )}

                          </div>

                        </div>

                      </td>

                      {/* CODE */}

                      <td className="px-4 py-4 text-center">

                        <span className="rounded-lg bg-slate-100 px-3 py-2 font-mono text-xs font-bold text-slate-600">
                          {
                            subject.subjectCode
                          }
                        </span>

                      </td>

                      {/* THEORY */}

                      <td className="px-4 py-4">

                        {hasTheory(
                          subject
                        ) ? (
                          <MarksInput
                            value={
                              formData?.[
                                subject
                                  .subjectCode
                              ]?.theory ??
                              ""
                            }
                            maximum={
                              subject.theoryMarks
                            }
                            passing={
                              subject.passingTheory
                            }
                            invalid={
                              theoryInvalid
                            }
                            onChange={(
                              value
                            ) =>
                              handleMarksChange(
                                subject,
                                "theory",
                                value
                              )
                            }
                          />
                        ) : (
                          <DisabledInput />
                        )}

                      </td>

                      {/* PRACTICAL */}

                      <td className="px-4 py-4">

                        {hasPractical(
                          subject
                        ) ? (
                          <MarksInput
                            value={
                              formData?.[
                                subject
                                  .subjectCode
                              ]?.practical ??
                              ""
                            }
                            maximum={
                              subject.practicalMarks
                            }
                            passing={
                              subject.passingPractical
                            }
                            invalid={
                              practicalInvalid
                            }
                            onChange={(
                              value
                            ) =>
                              handleMarksChange(
                                subject,
                                "practical",
                                value
                              )
                            }
                          />
                        ) : (
                          <DisabledInput />
                        )}

                      </td>

                      {/* TOTAL */}

                      <td className="px-4 py-4 text-center">

                        <p
                          className={`text-xl font-extrabold ${
                            status ===
                            "FAIL"
                              ? "text-red-600"
                              : status ===
                                "PASS"
                              ? "text-green-700"
                              : "text-slate-700"
                          }`}
                        >
                          {total}
                        </p>

                        <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                          / {maximum}
                        </p>

                      </td>

                      {/* PERCENTAGE */}

                      <td className="px-4 py-4 text-center">

                        <span className="text-sm font-extrabold text-slate-700">
                          {percentage}%
                        </span>

                      </td>

                      {/* STATUS */}

                      <td className="px-4 py-4 text-center">

                        <StatusBadge
                          status={
                            status
                          }
                        />

                      </td>

                    </tr>
                  );
                }
              )}

            </tbody>

          </table>

        </div>

        {/* =================================================
            MOBILE TABLE NOTE
        ================================================= */}

        <p className="mt-3 text-center text-[10px] text-slate-400 lg:hidden">
          ← Swipe horizontally to view all marks columns →
        </p>

      </div>

      {/* =================================================
          INFORMATION CARDS
      ================================================= */}

      <div className="grid gap-4 border-t border-slate-200 bg-slate-50 p-5 sm:grid-cols-3 sm:p-6">

        <InfoCard
          icon="📘"
          title="Theory"
          text="Enter theory marks according to the maximum marks configured for the subject."
          className="border-blue-100 bg-blue-50/60"
        />

        <InfoCard
          icon="🧪"
          title="Practical"
          text="Subjects without practical marks are automatically shown as unavailable."
          className="border-purple-100 bg-purple-50/60"
        />

        <InfoCard
          icon="⚡"
          title="Automatic"
          text="Total, percentage and subject status update instantly while entering marks."
          className="border-green-100 bg-green-50/60"
        />

      </div>

      {/* =================================================
          INSTRUCTIONS
      ================================================= */}

      <div className="border-t border-slate-200 p-5 sm:p-6">

        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">

          <div className="flex gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white">
              💡
            </div>

            <div>

              <h3 className="text-sm font-extrabold text-amber-800">
                Marks Entry Guidelines
              </h3>

              <ul className="mt-3 space-y-2 text-[11px] leading-5 text-amber-700">

                <li>
                  • Maximum marks are taken from Subject Management.
                </li>

                <li>
                  • Passing marks are used for automatic PASS/FAIL calculation.
                </li>

                <li>
                  • Marks above the configured maximum will be flagged.
                </li>

                <li>
                  • Empty subjects remain in PENDING status.
                </li>

                <li>
                  • Overall percentage, grade and final result are generated separately.
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
   MARKS INPUT
========================================================= */

function MarksInput({
  value,
  maximum,
  passing,
  invalid,
  onChange,
}) {
  return (
    <div className="min-w-[135px]">

      <div className="relative">

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
          className={`w-full rounded-xl border-2 bg-white px-3 py-2.5 text-center text-sm font-bold outline-none transition ${
            invalid
              ? "border-red-400 bg-red-50 text-red-700 focus:border-red-500"
              : "border-slate-200 text-slate-700 focus:border-green-500 focus:ring-2 focus:ring-green-100"
          }`}
          placeholder="0"
          aria-label="Marks"
        />

      </div>

      <div className="mt-1.5 flex justify-between px-1">

        <span className="text-[9px] font-semibold text-slate-400">
          Max: {maximum}
        </span>

        <span className="text-[9px] font-semibold text-green-600">
          Pass: {passing || 0}
        </span>

      </div>

      {invalid && (
        <p className="mt-1 text-center text-[9px] font-bold text-red-600">
          Exceeds maximum
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
    <div className="min-w-[135px]">

      <div className="flex h-[43px] items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-xs font-bold text-slate-300">
        N/A
      </div>

      <p className="mt-1.5 text-center text-[9px] text-slate-400">
        Not applicable
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
        "bg-green-100 text-green-700 border-green-200",
    },

    FAIL: {
      icon: "!",
      text: "FAIL",
      className:
        "bg-red-100 text-red-700 border-red-200",
    },

    INVALID: {
      icon: "⚠",
      text: "INVALID",
      className:
        "bg-red-100 text-red-700 border-red-200",
    },

    PENDING: {
      icon: "○",
      text: "PENDING",
      className:
        "bg-slate-100 text-slate-500 border-slate-200",
    },
  };

  const current =
    config[status] ||
    config.PENDING;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-extrabold ${current.className}`}
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
  label,
  value,
  icon,
  green,
  red,
  blue,
}) {
  let valueClass =
    "text-slate-800";

  if (green) {
    valueClass =
      "text-green-700";
  }

  if (red) {
    valueClass =
      "text-red-600";
  }

  if (blue) {
    valueClass =
      "text-blue-700";
  }

  return (
    <div className="border-b border-slate-200 px-4 py-4 last:border-b-0 sm:border-r lg:border-b-0">

      <div className="flex items-center gap-2">

        <span className="text-sm">
          {icon}
        </span>

        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
          {label}
        </p>

      </div>

      <p
        className={`mt-1 text-lg font-extrabold ${valueClass}`}
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
  className = "",
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${className}`}
    >

      <div className="flex items-center gap-3">

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white">
          {icon}
        </div>

        <h3 className="text-xs font-extrabold text-slate-800">
          {title}
        </h3>

      </div>

      <p className="mt-3 text-[10px] leading-5 text-slate-500">
        {text}
      </p>

    </div>
  );
}

export default ResultTable;