import React from "react";

/* =========================================================
   RESULT SUMMARY - ADVANCED VERSION

   Features:
   - PASS / FAIL / PENDING status
   - Subjects count
   - Passed / Failed subjects
   - Obtained / Maximum marks
   - Percentage
   - Grade
   - Grade Point
   - Division
   - Circular performance indicator
   - Marks progress bar
   - Performance level
   - Rank
   - Teacher remarks
   - Signature
   - Fully responsive
   - Theme support

   UI ONLY
   No Firebase
   No navigation
   No PDF
   No QR
========================================================= */


/* =========================================================
   HELPERS
========================================================= */

function toNumber(value, fallback = 0) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  const number = Number(
    String(value)
      .replace(/,/g, "")
      .replace("%", "")
      .trim()
  );

  return Number.isFinite(number)
    ? number
    : fallback;
}


function formatNumber(value) {
  const number = toNumber(value);

  if (
    Number.isInteger(number)
  ) {
    return String(number);
  }

  return number.toFixed(2);
}


function getValue(
  source = {},
  keys = [],
  fallback = null
) {
  for (const key of keys) {
    if (
      source[key] !== undefined &&
      source[key] !== null &&
      source[key] !== ""
    ) {
      return source[key];
    }
  }

  return fallback;
}


/* =========================================================
   STATUS
========================================================= */

function getStatus(data = {}) {
  const raw =
    getValue(
      data,
      [
        "status",
        "resultStatus",
        "resultState",
      ],
      "PENDING"
    );

  const status =
    String(raw)
      .trim()
      .toUpperCase();

  if (
    status === "PASS" ||
    status === "FAIL" ||
    status === "PENDING"
  ) {
    return status;
  }

  return "PENDING";
}


/* =========================================================
   STATUS CONFIG
========================================================= */

function getStatusConfig(status) {
  switch (status) {
    case "PASS":
      return {
        label: "PASS",
        icon: "✓",
        color: "#059669",
        background: "#ecfdf5",
        border: "#a7f3d0",
        message:
          "The student has successfully cleared the examination.",
      };

    case "FAIL":
      return {
        label: "FAIL",
        icon: "!",
        color: "#dc2626",
        background: "#fef2f2",
        border: "#fecaca",
        message:
          "The result has been declared. Please review the subject-wise performance.",
      };

    default:
      return {
        label: "PENDING",
        icon: "…",
        color: "#d97706",
        background: "#fffbeb",
        border: "#fde68a",
        message:
          "Result is pending. Final status will appear after all required marks are available.",
      };
  }
}


/* =========================================================
   DIVISION
========================================================= */

function getDivision(
  percentage,
  status
) {
  if (
    status === "PENDING"
  ) {
    return "—";
  }

  if (
    status === "FAIL"
  ) {
    return "—";
  }

  const value =
    toNumber(
      percentage
    );

  if (value >= 60) {
    return "First Division";
  }

  if (value >= 45) {
    return "Second Division";
  }

  if (value >= 33) {
    return "Third Division";
  }

  return "—";
}


/* =========================================================
   PERFORMANCE LEVEL
========================================================= */

function getPerformance(
  percentage,
  status
) {
  if (
    status === "PENDING"
  ) {
    return {
      title: "Result Pending",
      description:
        "Academic performance will be available after the result is completed.",
      icon: "⏳",
    };
  }

  if (
    status === "FAIL"
  ) {
    return {
      title: "Needs Improvement",
      description:
        "Review the subjects carefully and focus on areas that need improvement.",
      icon: "📘",
    };
  }

  const value =
    toNumber(
      percentage
    );

  if (value >= 90) {
    return {
      title: "Outstanding Performance",
      description:
        "Exceptional academic performance. Keep maintaining this excellent standard.",
      icon: "🏆",
    };
  }

  if (value >= 75) {
    return {
      title: "Excellent Performance",
      description:
        "Excellent performance with strong academic consistency.",
      icon: "🌟",
    };
  }

  if (value >= 60) {
    return {
      title: "Good Performance",
      description:
        "Good academic performance. Continue working consistently.",
      icon: "⭐",
    };
  }

  if (value >= 45) {
    return {
      title: "Satisfactory Performance",
      description:
        "A satisfactory result. More consistent preparation can improve performance.",
      icon: "📈",
    };
  }

  return {
    title: "Needs Improvement",
    description:
      "Additional academic practice is recommended.",
    icon: "📚",
  };
}


/* =========================================================
   CIRCULAR PROGRESS
========================================================= */

function CircularProgress({
  percentage,
  primary,
  status,
}) {
  const value =
    status === "PENDING"
      ? 0
      : Math.min(
          100,
          Math.max(
            0,
            toNumber(
              percentage
            )
          )
        );

  const radius = 48;
  const circumference =
    2 *
    Math.PI *
    radius;

  const offset =
    circumference -
    (value /
      100) *
      circumference;

  return (
    <div className="relative mx-auto h-36 w-36">

      <svg
        viewBox="0 0 120 120"
        className="h-full w-full -rotate-90"
      >
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="10"
        />

        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={
            status === "FAIL"
              ? "#dc2626"
              : status === "PENDING"
              ? "#f59e0b"
              : primary
          }
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={
            circumference
          }
          strokeDashoffset={
            offset
          }
          className="transition-all duration-700"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">

        <span
          className="text-2xl font-black"
          style={{
            color:
              status === "FAIL"
                ? "#dc2626"
                : status === "PENDING"
                ? "#d97706"
                : primary,
          }}
        >
          {status === "PENDING"
            ? "—"
            : `${formatNumber(
                percentage
              )}%`}
        </span>

        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
          Overall
        </span>

      </div>

    </div>
  );
}


/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function ResultSummary({
  result = {},
  summary = null,
  theme = {},
  student = {},
}) {
  const data =
    summary || result || {};

  const primary =
    theme.primary ||
    "#059669";

  const soft =
    theme.soft ||
    "#ecfdf5";

  const dark =
    theme.dark ||
    "#064e3b";

  /* -------------------------------------------------------
     MARKS
  ------------------------------------------------------- */

  const maximumMarks =
    getValue(
      data,
      [
        "maximumMarks",
        "maxMarks",
        "totalMaximum",
        "totalMaxMarks",
      ],
      0
    );

  const obtainedMarks =
    getValue(
      data,
      [
        "obtainedMarks",
        "marksObtained",
        "totalObtained",
        "totalMarksObtained",
      ],
      0
    );

  const percentage =
    getValue(
      data,
      [
        "percentage",
        "overallPercentage",
        "percent",
      ],
      null
    );

  const grade =
    getValue(
      data,
      [
        "grade",
        "overallGrade",
      ],
      "—"
    );

  const gradePoint =
    getValue(
      data,
      [
        "gradePoint",
        "overallGradePoint",
      ],
      null
    );

  /* -------------------------------------------------------
     SUBJECTS
  ------------------------------------------------------- */

  const totalSubjects =
    getValue(
      data,
      [
        "totalSubjects",
        "subjectCount",
      ],
      0
    );

  const passedSubjects =
    getValue(
      data,
      [
        "passedSubjects",
      ],
      0
    );

  const failedSubjects =
    getValue(
      data,
      [
        "failedSubjects",
      ],
      0
    );

  /* -------------------------------------------------------
     STATUS
  ------------------------------------------------------- */

  const status =
    getStatus(data);

  const statusConfig =
    getStatusConfig(
      status
    );

  const division =
    getDivision(
      percentage,
      status
    );

  const performance =
    getPerformance(
      percentage,
      status
    );

  /* -------------------------------------------------------
     RANK
  ------------------------------------------------------- */

  const rank =
    getValue(
      data,
      [
        "rank",
        "classRank",
        "overallRank",
      ],
      null
    );

  const totalStudents =
    getValue(
      data,
      [
        "totalStudents",
        "classStrength",
        "totalClassStudents",
      ],
      null
    );

  /* -------------------------------------------------------
     REMARKS
  ------------------------------------------------------- */

  const remarks =
    getValue(
      data,
      [
        "teacherRemarks",
        "remarks",
        "remark",
        "teacherComment",
      ],
      ""
    );

  const teacherName =
    getValue(
      data,
      [
        "teacherName",
        "classTeacher",
        "teacher",
      ],
      ""
    );

  const signature =
    getValue(
      data,
      [
        "teacherSignature",
        "signature",
        "signatureUrl",
      ],
      ""
    );

  /* -------------------------------------------------------
     MARKS PERCENT
  ------------------------------------------------------- */

  const marksProgress =
    maximumMarks > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (toNumber(
              obtainedMarks
            ) /
              toNumber(
                maximumMarks
              )) *
              100
          )
        )
      : 0;

  return (
    <section className="space-y-5">

      {/* =====================================================
          HERO
      ===================================================== */}

      <div
        className="overflow-hidden rounded-[28px] p-5 text-white shadow-sm sm:p-7"
        style={{
          background: `linear-gradient(135deg, ${dark}, ${primary})`,
        }}
      >

        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

          {/* LEFT */}

          <div className="flex items-center gap-4">

            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-3xl backdrop-blur">
              🎓
            </div>

            <div>

              <div className="mb-2 inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em]">
                📊 Result Preview
              </div>

              <h2 className="text-2xl font-black sm:text-3xl">
                Result Summary
              </h2>

              <p className="mt-1 max-w-xl text-xs leading-5 text-white/75">
                Review the student's complete academic performance before final publication.
              </p>

            </div>

          </div>

          {/* STATUS */}

          <div
            className="flex items-center gap-4 rounded-2xl bg-white/95 p-4 text-slate-900 shadow-lg"
          >

            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl font-black"
              style={{
                background:
                  statusConfig.background,
                color:
                  statusConfig.color,
              }}
            >
              {statusConfig.icon}
            </div>

            <div>

              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                Final Status
              </p>

              <p
                className="mt-1 text-2xl font-black"
                style={{
                  color:
                    statusConfig.color,
                }}
              >
                {statusConfig.label}
              </p>

              <p className="mt-1 max-w-xs text-[10px] leading-4 text-slate-500">
                {statusConfig.message}
              </p>

            </div>

          </div>

        </div>

      </div>


      {/* =====================================================
          QUICK STATS
      ===================================================== */}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">

        <StatCard
          icon="📖"
          label="Subjects"
          value={
            status === "PENDING"
              ? "—"
              : totalSubjects
          }
          subtitle="Total subjects"
          color="#2563eb"
          background="#eff6ff"
        />

        <StatCard
          icon="✓"
          label="Passed"
          value={
            status === "PENDING"
              ? "—"
              : passedSubjects
          }
          subtitle="Subjects cleared"
          color="#059669"
          background="#ecfdf5"
        />

        <StatCard
          icon="!"
          label="Failed"
          value={
            status === "PENDING"
              ? "—"
              : failedSubjects
          }
          subtitle="Subjects failed"
          color="#dc2626"
          background="#fef2f2"
        />

        <StatCard
          icon="▣"
          label="Obtained"
          value={
            status === "PENDING"
              ? "—"
              : formatNumber(
                  obtainedMarks
                )
          }
          subtitle="Marks obtained"
          color="#7c3aed"
          background="#f5f3ff"
        />

        <StatCard
          icon="◎"
          label="Maximum"
          value={
            status === "PENDING"
              ? "—"
              : formatNumber(
                  maximumMarks
                )
          }
          subtitle="Total marks"
          color="#ea580c"
          background="#fff7ed"
        />

        <StatCard
          icon="%"
          label="Percentage"
          value={
            status === "PENDING" ||
            percentage === null
              ? "—"
              : `${formatNumber(
                  percentage
                )}%`
          }
          subtitle="Overall percentage"
          color="#2563eb"
          background="#eff6ff"
        />

      </div>


      {/* =====================================================
          PERFORMANCE ANALYSIS
      ===================================================== */}

      <div className="grid gap-5 lg:grid-cols-[0.85fr_1.5fr_0.85fr]">

        {/* CIRCLE */}

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">

          <p
            className="text-[9px] font-black uppercase tracking-[0.2em]"
            style={{
              color: primary,
            }}
          >
            Marks Analysis
          </p>

          <h3 className="mt-1 text-lg font-black text-slate-900">
            Overall Performance
          </h3>

          <div className="mt-5">

            <CircularProgress
              percentage={
                percentage
              }
              primary={
                primary
              }
              status={
                status
              }
            />

          </div>

          <div className="mt-4 text-center">

            <span
              className="inline-flex rounded-full px-3 py-1.5 text-[9px] font-black uppercase"
              style={{
                background:
                  statusConfig.background,
                color:
                  statusConfig.color,
              }}
            >
              {performance.title}
            </span>

          </div>

        </div>


        {/* MARKS OVERVIEW */}

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">

          <p
            className="text-[9px] font-black uppercase tracking-[0.2em]"
            style={{
              color: primary,
            }}
          >
            Marks Overview
          </p>

          <h3 className="mt-1 text-lg font-black text-slate-900">
            Academic Score
          </h3>

          {/* OBTAINED */}

          <div className="mt-7">

            <div className="flex items-center justify-between gap-3">

              <span
                className="text-sm font-black"
                style={{
                  color:
                    "#7c3aed",
                }}
              >
                Obtained Marks
              </span>

              <span className="text-sm font-black text-slate-600">
                {status === "PENDING"
                  ? "—"
                  : `${formatNumber(
                      obtainedMarks
                    )} / ${formatNumber(
                      maximumMarks
                    )}`}
              </span>

            </div>

            <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">

              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width:
                    status ===
                    "PENDING"
                      ? "0%"
                      : `${marksProgress}%`,
                  background:
                    "#7c3aed",
                }}
              />

            </div>

            <p className="mt-2 text-xs font-bold text-slate-400">
              {status === "PENDING"
                ? "Marks pending"
                : `${formatNumber(
                    marksProgress
                  )}% of total marks`}
            </p>

          </div>


          {/* PERCENTAGE */}

          <div className="mt-7">

            <div className="flex items-center justify-between gap-3">

              <span
                className="text-sm font-black"
                style={{
                  color:
                    "#2563eb",
                }}
              >
                Percentage
              </span>

              <span className="text-sm font-black text-slate-600">
                {status === "PENDING" ||
                percentage === null
                  ? "—"
                  : `${formatNumber(
                      percentage
                    )}% / 100%`}
              </span>

            </div>

            <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">

              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width:
                    status ===
                    "PENDING"
                      ? "0%"
                      : `${Math.min(
                          100,
                          toNumber(
                            percentage
                          )
                        )}%`,
                  background:
                    "#2563eb",
                }}
              />

            </div>

            <p className="mt-2 text-xs font-bold text-blue-600">
              {status === "PENDING"
                ? "Percentage pending"
                : `${formatNumber(
                    percentage
                  )}% overall`}
            </p>

          </div>

        </div>


        {/* GRADE */}

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">

          <p
            className="text-[9px] font-black uppercase tracking-[0.2em]"
            style={{
              color: primary,
            }}
          >
            Grade & Division
          </p>

          <div
            className="mt-5 rounded-2xl border p-6 text-center"
            style={{
              background:
                soft,
              borderColor:
                `${primary}35`,
            }}
          >

            <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">
              Grade
            </p>

            <p
              className="mt-2 text-5xl font-black"
              style={{
                color: primary,
              }}
            >
              {status === "PENDING"
                ? "—"
                : grade}
            </p>

            <p className="mt-2 text-xs font-bold text-slate-500">
              {status === "PENDING"
                ? "Awaiting result"
                : "Overall Grade"}
            </p>

          </div>

          <div className="mt-5 text-center">

            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
              Division
            </p>

            <p
              className="mt-1 text-base font-black"
              style={{
                color:
                  status ===
                  "PENDING"
                    ? "#94a3b8"
                    : primary,
              }}
            >
              {division}
            </p>

          </div>

          {gradePoint !==
            null && (
            <div className="mt-5 rounded-2xl bg-slate-50 p-3 text-center">

              <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                Grade Point
              </p>

              <p className="mt-1 text-lg font-black text-slate-800">
                {status === "PENDING"
                  ? "—"
                  : formatNumber(
                      gradePoint
                    )}
              </p>

            </div>
          )}

        </div>

      </div>


      {/* =====================================================
          PERFORMANCE + RANK
      ===================================================== */}

      <div className="grid gap-5 lg:grid-cols-2">

        {/* PERFORMANCE */}

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">

          <div className="flex items-center gap-4">

            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-3xl"
              style={{
                background:
                  soft,
              }}
            >
              {performance.icon}
            </div>

            <div>

              <p
                className="text-[9px] font-black uppercase tracking-[0.2em]"
                style={{
                  color: primary,
                }}
              >
                Performance Level
              </p>

              <h3 className="mt-1 text-lg font-black text-slate-900">
                {performance.title}
              </h3>

              <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">
                {performance.description}
              </p>

            </div>

          </div>

        </div>


        {/* RANK */}

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">

          <div className="flex items-center gap-4">

            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-3xl"
              style={{
                background:
                  "#fff7ed",
              }}
            >
              🏆
            </div>

            <div>

              <p
                className="text-[9px] font-black uppercase tracking-[0.2em]"
                style={{
                  color:
                    "#ea580c",
                }}
              >
                Rank
              </p>

              {rank !== null ? (
                <>
                  <h3 className="mt-1 text-2xl font-black text-slate-900">
                    {rank}
                    {totalStudents !==
                      null && (
                      <span className="text-base font-bold text-slate-400">
                        {" "}
                        /{" "}
                        {
                          totalStudents
                        }
                      </span>
                    )}
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Class Rank
                  </p>
                </>
              ) : (
                <>
                  <h3 className="mt-1 text-xl font-black text-slate-400">
                    Not Available
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Rank has not been published.
                  </p>
                </>
              )}

            </div>

          </div>

        </div>

      </div>


      {/* =====================================================
          TEACHER REMARKS
      ===================================================== */}

      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">

        <div className="mb-4">

          <p
            className="text-[9px] font-black uppercase tracking-[0.2em]"
            style={{
              color: primary,
            }}
          >
            Teacher Remarks
          </p>

          <h3 className="mt-1 text-lg font-black text-slate-900">
            Academic Feedback
          </h3>

        </div>

        <div
          className="rounded-2xl border p-5"
          style={{
            background:
              "#f8fafc",
            borderColor:
              `${primary}30`,
          }}
        >

          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">

            <div className="flex gap-4">

              <div
                className="text-4xl font-black leading-none"
                style={{
                  color:
                    "#2563eb",
                }}
              >
                “
              </div>

              <div>

                <p className="max-w-3xl text-sm font-medium leading-6 text-slate-600">
                  {remarks ||
                    "No teacher remarks have been added for this result."}
                </p>

                {teacherName && (
                  <p
                    className="mt-4 text-xs font-black"
                    style={{
                      color:
                        primary,
                    }}
                  >
                    {teacherName}
                  </p>
                )}

                <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Class Teacher
                </p>

              </div>

            </div>

            {/* SIGNATURE */}

            <div className="shrink-0 text-center">

              {signature ? (
                <img
                  src={signature}
                  alt="Teacher signature"
                  className="mx-auto h-14 w-32 object-contain"
                />
              ) : (
                <div className="mx-auto h-14 w-32 border-b border-dashed border-slate-300" />
              )}

              <p className="mt-2 text-[9px] font-bold text-slate-500">
                Signature
              </p>

            </div>

          </div>

        </div>

        <div className="mt-4 flex items-center justify-center gap-2 text-center text-[9px] font-medium text-slate-400">

          <span>ⓘ</span>

          <span>
            This is a system-generated result
            summary. Verify all details before
            final publication.
          </span>

        </div>

      </div>

    </section>
  );
}


/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  icon,
  label,
  value,
  subtitle,
  color,
  background,
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">

      <div className="flex items-start justify-between gap-3">

        <div className="min-w-0">

          <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
            {label}
          </p>

          <p
            className="mt-2 text-2xl font-black"
            style={{
              color,
            }}
          >
            {value}
          </p>

          <p className="mt-1 text-[9px] font-medium text-slate-400">
            {subtitle}
          </p>

        </div>

        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black"
          style={{
            background,
            color,
          }}
        >
          {icon}
        </div>

      </div>

    </div>
  );
}