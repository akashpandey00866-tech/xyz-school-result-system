import React from "react";

/* =========================================================
   RESULT SELECTOR
   ---------------------------------------------------------
   Responsibility:
   - Individual exam selection
   - Annual Result selection
   - Dynamic exam list
   - Published / Pending indicator
   - Clean responsive UI

   No Firebase
   No calculation
   No navigation
========================================================= */

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function getExamName(result = {}) {
  return (
    result.examName ||
    result.examinationName ||
    result.exam ||
    result.title ||
    result.name ||
    "Examination"
  );
}

function getExamType(result = {}) {
  return (
    result.examType ||
    result.resultType ||
    result.type ||
    "EXAM"
  );
}

function isPublished(result = {}) {
  if (
    result.published === true ||
    result.isPublished === true
  ) {
    return true;
  }

  const status = normalizeText(
    result.status
  );

  return (
    status === "published" ||
    status === "declared" ||
    status === "active"
  );
}

function getExamKey(result = {}, index) {
  return (
    result.id ||
    result.examId ||
    result.examID ||
    result.examName ||
    result.examinationName ||
    `exam-${index}`
  );
}

function getResultDate(result = {}) {
  const value =
    result.publishedAt ||
    result.declaredAt ||
    result.updatedAt ||
    result.createdAt ||
    result.date;

  if (!value) {
    return "";
  }

  let date;

  if (
    value &&
    typeof value.toDate === "function"
  ) {
    date = value.toDate();
  } else if (value instanceof Date) {
    date = value;
  } else {
    date = new Date(value);
  }

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

export default function ResultSelector({
  results = [],
  selectedKey = "",
  onSelect,
  annualReady = false,
  annualProgress = null,
  disabled = false,
  theme = {},
}) {
  const primary =
    theme.primary ||
    "var(--student-primary, #059669)";

  const soft =
    theme.soft ||
    "var(--student-soft, #ecfdf5)";

  const safeResults =
    Array.isArray(results)
      ? results
      : [];

  const publishedResults =
    safeResults.filter(
      isPublished
    );

  const annualDisabled =
    !annualReady;

  const progressDeclared =
    annualProgress?.declared ??
    publishedResults.length;

  const progressRequired =
    annualProgress?.required ??
    3;

  const annualProgressPercent =
    Math.min(
      100,
      Math.round(
        (progressDeclared /
          progressRequired) *
          100
      )
    );

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <p
            className="text-[9px] font-black uppercase tracking-[0.2em]"
            style={{
              color: primary,
            }}
          >
            Academic Results
          </p>

          <h2 className="mt-1 text-xl font-black text-slate-900">
            Select Result
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Choose an examination to view its
            detailed result.
          </p>
        </div>

        <div
          className="w-fit rounded-full px-3 py-1.5 text-[9px] font-black"
          style={{
            background: soft,
            color: primary,
          }}
        >
          {publishedResults.length} Published
        </div>

      </div>

      {/* =====================================================
          RESULT OPTIONS
      ===================================================== */}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

        {publishedResults.map(
          (result, index) => {
            const key =
              getExamKey(
                result,
                index
              );

            const selected =
              String(
                selectedKey
              ) ===
              String(key);

            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                onClick={() =>
                  onSelect?.(
                    result,
                    key
                  )
                }
                className={[
                  "group rounded-2xl border p-4 text-left transition-all",
                  "focus:outline-none focus:ring-2",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                  selected
                    ? "shadow-md"
                    : "border-slate-200 hover:-translate-y-0.5 hover:shadow-sm",
                ].join(" ")}
                style={
                  selected
                    ? {
                        borderColor:
                          primary,
                        background:
                          soft,
                      }
                    : undefined
                }
              >

                <div className="flex items-start justify-between gap-3">

                  <div className="min-w-0">

                    <p
                      className="text-[8px] font-black uppercase tracking-wider"
                      style={{
                        color: primary,
                      }}
                    >
                      {getExamType(
                        result
                      )}
                    </p>

                    <h3 className="mt-1 break-words text-sm font-black text-slate-900">
                      {getExamName(
                        result
                      )}
                    </h3>

                  </div>

                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black"
                    style={{
                      background: selected
                        ? primary
                        : "#f1f5f9",
                      color: selected
                        ? "#ffffff"
                        : "#64748b",
                    }}
                  >
                    {selected
                      ? "✓"
                      : "→"}
                  </span>

                </div>

                <div className="mt-4 flex items-center justify-between gap-2">

                  <span className="text-[9px] font-bold text-slate-400">
                    {getResultDate(
                      result
                    ) ||
                      "Date not available"}
                  </span>

                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[8px] font-black text-emerald-700">
                    PUBLISHED
                  </span>

                </div>

              </button>
            );
          }
        )}

        {/* ===================================================
            NO EXAMS
        =================================================== */}

        {publishedResults.length ===
          0 && (
          <div className="sm:col-span-2 lg:col-span-3 rounded-2xl border border-dashed border-slate-200 p-8 text-center">

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl">
              📋
            </div>

            <h3 className="mt-4 text-sm font-black text-slate-800">
              No Result Declared Yet
            </h3>

            <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
              Your examination result will
              appear here after the school
              declares it.
            </p>

          </div>
        )}

      </div>

      {/* =====================================================
          ANNUAL RESULT
      ===================================================== */}

      <div className="mt-5 border-t border-slate-100 pt-5">

        <div
          className={[
            "rounded-2xl border p-4",
            annualDisabled
              ? "border-amber-200 bg-amber-50/50"
              : "border-emerald-200 bg-emerald-50/50",
          ].join(" ")}
        >

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex min-w-0 items-start gap-3">

              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg"
                style={{
                  background:
                    annualDisabled
                      ? "#fef3c7"
                      : soft,
                  color:
                    annualDisabled
                      ? "#b45309"
                      : primary,
                }}
              >
                🏆
              </div>

              <div className="min-w-0">

                <p
                  className="text-[8px] font-black uppercase tracking-wider"
                  style={{
                    color:
                      annualDisabled
                        ? "#b45309"
                        : primary,
                  }}
                >
                  Consolidated Result
                </p>

                <h3 className="mt-1 text-sm font-black text-slate-900">
                  Annual Result
                </h3>

                <p className="mt-1 text-[10px] leading-5 text-slate-500">
                  {annualDisabled
                    ? `Available after ${progressRequired} examinations are declared and complete.`
                    : "Your complete annual examination result is ready to view."}
                </p>

              </div>

            </div>

            <button
              type="button"
              disabled={
                disabled ||
                annualDisabled
              }
              onClick={() =>
                onSelect?.(
                  {
                    id: "annual-result",
                    type: "ANNUAL",
                    examType: "ANNUAL",
                    examName:
                      "Annual Result",
                  },
                  "annual-result"
                )
              }
              className="shrink-0 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-white transition disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background:
                  annualDisabled
                    ? "#94a3b8"
                    : primary,
              }}
            >
              {annualDisabled
                ? "Pending"
                : "View Annual Result"}
            </button>

          </div>

          {/* =================================================
              ANNUAL PROGRESS
          ================================================= */}

          <div className="mt-4">

            <div className="mb-1.5 flex items-center justify-between">

              <span className="text-[9px] font-black text-slate-500">
                Exam Progress
              </span>

              <span className="text-[9px] font-black text-slate-600">
                {progressDeclared}/
                {progressRequired}
              </span>

            </div>

            <div className="h-2 overflow-hidden rounded-full bg-slate-200">

              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width:
                    `${annualProgressPercent}%`,
                  background:
                    annualDisabled
                      ? "#f59e0b"
                      : primary,
                }}
              />

            </div>

          </div>

        </div>

      </div>

    </section>
  );
}