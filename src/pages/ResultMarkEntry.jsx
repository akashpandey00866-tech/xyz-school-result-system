import { useEffect, useMemo, useState } from "react";

import useResultController from "../hooks/useResultController";


/* =========================================================
   HELPERS
========================================================= */

function toNumber(value) {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return 0;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}


function calculateGrade(
  percentage
) {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";

  return "F";
}


function calculateDivision(
  percentage
) {
  if (percentage >= 60) {
    return "First";
  }

  if (percentage >= 45) {
    return "Second";
  }

  if (percentage >= 33) {
    return "Third";
  }

  return "Fail";
}


/* =========================================================
   SUBJECT ROW
========================================================= */

function SubjectRow({
  subject,
  index,
  disabled,
  onChange,
}) {
  const maximumMarks =
    toNumber(
      subject.maximumMarks ??
      subject.maxMarks ??
      100
    );

  const obtainedMarks =
    subject.obtainedMarks ?? "";


  const percentage =
    maximumMarks > 0
      ? (
          (toNumber(
            obtainedMarks
          ) /
            maximumMarks) *
          100
        ).toFixed(1)
      : "0.0";


  const invalid =
    obtainedMarks !== "" &&
    (
      toNumber(
        obtainedMarks
      ) < 0 ||
      toNumber(
        obtainedMarks
      ) >
        maximumMarks
    );


  return (
    <div
      className={[
        "rounded-2xl border p-4",
        "bg-white/[0.035]",
        "border-white/10",
        "transition",
        invalid
          ? "border-red-400/40 bg-red-500/5"
          : "hover:bg-white/[0.055]",
      ].join(" ")}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Subject {index + 1}
          </p>

          <h3 className="mt-1 truncate text-base font-black text-white">
            {subject.subjectName ||
              subject.name ||
              subject.subjectCode ||
              "Unnamed Subject"}
          </h3>

          {subject.subjectCode && (
            <p className="mt-1 text-xs text-slate-500">
              Code:{" "}
              {subject.subjectCode}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">
            Max
          </span>

          <span className="font-black text-slate-200">
            {maximumMarks}
          </span>
        </div>

        <div className="w-full sm:w-32">
          <label className="mb-1 block text-xs font-bold text-slate-400">
            Obtained Marks
          </label>

          <input
            type="number"
            min="0"
            max={maximumMarks}
            step="0.01"
            value={obtainedMarks}
            disabled={disabled}
            onChange={(event) =>
              onChange(
                event.target.value
              )
            }
            className={[
              "min-h-11 w-full rounded-xl border",
              "bg-slate-950/70 px-3 text-center",
              "text-base font-black text-white",
              "outline-none",
              "disabled:cursor-not-allowed disabled:opacity-50",
              invalid
                ? "border-red-400/60"
                : "border-white/10 focus:border-cyan-400/60",
            ].join(" ")}
            aria-label={`Marks for ${
              subject.subjectName ||
              subject.name ||
              subject.subjectCode ||
              "subject"
            }`}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3 text-xs">
        <span className="text-slate-500">
          Subject Percentage
        </span>

        <span
          className={
            invalid
              ? "font-black text-red-300"
              : "font-black text-cyan-300"
          }
        >
          {percentage}%
        </span>
      </div>

      {invalid && (
        <p className="mt-2 text-xs font-bold text-red-300">
          Marks cannot be greater than the
          maximum marks.
        </p>
      )}
    </div>
  );
}


/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
  label,
  value,
  accent = false,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p
        className={
          accent
            ? "mt-2 text-2xl font-black text-cyan-300"
            : "mt-2 text-2xl font-black text-white"
        }
      >
        {value}
      </p>
    </div>
  );
}


/* =========================================================
   MAIN PAGE
========================================================= */

export default function ResultMarkEntry({
  actor,
  resultId,
  initialResult = null,
  onSaved,
  onSubmitted,
}) {
  const {
    result,
    loading,
    saving,
    submitting,
    error,
    success,

    permissions,

    save,
    submit,
    refresh,

    clearFeedback,
  } = useResultController({
    actor,

    resultId,

    autoLoad:
      Boolean(
        resultId
      ),

    includeDrafts: true,
  });


  const sourceResult =
    result ||
    initialResult;


  const [
    form,
    setForm,
  ] = useState(
    sourceResult || {
      studentId: "",
      studentName: "",
      admissionNumber: "",
      classId: "",
      className: "",
      section: "",
      sessionId: "",
      sessionName: "",
      examinationId: "",
      examinationName: "",
      subjects: [],
      teacherRemarks: "",
    }
  );


  /* =======================================================
     SYNC RESULT
  ======================================================= */

  useEffect(
    () => {
      if (
        sourceResult
      ) {
        setForm(
          sourceResult
        );
      }
    },
    [sourceResult]
  );


  /* =======================================================
     SUBJECTS
  ======================================================= */

  const subjects =
    Array.isArray(
      form.subjects
    )
      ? form.subjects
      : [];


  /* =======================================================
     CALCULATIONS
  ======================================================= */

  const summary =
    useMemo(() => {
      let maximum = 0;
      let obtained = 0;
      let invalid = false;


      subjects.forEach(
        (subject) => {
          const max =
            toNumber(
              subject.maximumMarks ??
              subject.maxMarks ??
              100
            );

          const marks =
            toNumber(
              subject.obtainedMarks
            );


          maximum += max;
          obtained += marks;


          if (
            marks < 0 ||
            marks > max
          ) {
            invalid = true;
          }
        }
      );


      const percentage =
        maximum > 0
          ? (
              (obtained /
                maximum) *
              100
            )
          : 0;


      return {
        maximum,

        obtained,

        percentage:

          Number(
            percentage.toFixed(
              2
            )
          ),

        grade:
          calculateGrade(
            percentage
          ),

        division:
          calculateDivision(
            percentage
          ),

        invalid,
      };
    }, [
      subjects,
    ]);


  /* =======================================================
     EDITABILITY
  ======================================================= */

  const canEdit =
    permissions?.visibility?.edit !==
      false;


  const canSubmit =
    permissions?.visibility?.submit !==
      false;


  /* =======================================================
     SUBJECT UPDATE
  ======================================================= */

  function updateSubjectMarks(
    index,
    value
  ) {
    setForm(
      (previous) => {
        const nextSubjects =
          [...(
            previous.subjects ||
            []
          )];


        nextSubjects[index] = {
          ...nextSubjects[index],

          obtainedMarks:
            value,
        };


        return {
          ...previous,

          subjects:
            nextSubjects,
        };
      }
    );


    clearFeedback();
  }


  /* =======================================================
     SAVE
  ======================================================= */

  async function handleSave() {
    if (
      summary.invalid
    ) {
      return;
    }


    const payload = {
      ...form,

      subjects,

      maximumMarks:
        summary.maximum,

      obtainedMarks:
        summary.obtained,

      percentage:
        summary.percentage,

      grade:
        summary.grade,

      division:
        summary.division,

      status:
        form.status ||
        "draft",
    };


    try {
      const saved =
        await save(
          payload
        );

      onSaved?.(
        saved
      );
    } catch {
      /*
       * Controller already stores
       * the error.
       */
    }
  }


  /* =======================================================
     SUBMIT
  ======================================================= */

  async function handleSubmit() {
    if (
      summary.invalid
    ) {
      return;
    }


    try {
      /*
       * Save latest changes before
       * submitting an existing result.
       */

      if (
        form.id &&
        canEdit
      ) {
        await save({
          ...form,

          subjects,

          maximumMarks:
            summary.maximum,

          obtainedMarks:
            summary.obtained,

          percentage:
            summary.percentage,

          grade:
            summary.grade,

          division:
            summary.division,
        });
      }


      const submitted =
        await submit();


      onSubmitted?.(
        submitted
      );
    } catch {
      /*
       * Controller already handles
       * user-facing error state.
       */
    }
  }


  /* =======================================================
     LOADING
  ======================================================= */

  if (
    loading
  ) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-950 p-5">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-white/10 border-t-cyan-400" />

          <p className="mt-4 text-sm font-black text-white">
            Loading result...
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Please wait while the result is
            being secured.
          </p>
        </div>
      </div>
    );
  }


  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-6xl px-3 py-5 sm:px-5 sm:py-7 lg:px-8">
        {/* =================================================
            HEADER
        ================================================= */}

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/10 via-indigo-500/10 to-fuchsia-500/10 p-5 shadow-2xl sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
                Academic Result
              </p>

              <h1 className="mt-2 text-2xl font-black sm:text-4xl">
                Marks Entry
              </h1>

              <div className="mt-3 flex flex-wrap gap-2">
                {form.status && (
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-slate-300">
                    Status:{" "}
                    {String(
                      form.status
                    ).toUpperCase()}
                  </span>
                )}

                {form.examinationName && (
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-slate-300">
                    {form.examinationName}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="min-h-11 rounded-xl border border-white/10 bg-white/10 px-4 text-sm font-bold transition hover:bg-white/15 disabled:opacity-50"
            >
              ↻ Refresh
            </button>
          </div>
        </section>


        {/* =================================================
            STUDENT INFORMATION
        ================================================= */}

        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-xl sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Student
              </p>

              <p className="mt-1 truncate text-base font-black text-white">
                {form.studentName ||
                  "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Admission No.
              </p>

              <p className="mt-1 font-bold text-slate-200">
                {form.admissionNumber ||
                  "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Class / Section
              </p>

              <p className="mt-1 font-bold text-slate-200">
                {form.className ||
                  "—"}{" "}
                {form.section
                  ? `/ ${form.section}`
                  : ""}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Session
              </p>

              <p className="mt-1 font-bold text-slate-200">
                {form.sessionName ||
                  form.sessionId ||
                  "—"}
              </p>
            </div>
          </div>
        </section>


        {/* =================================================
            SUMMARY
        ================================================= */}

        <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard
            label="Maximum"
            value={
              summary.maximum
            }
          />

          <SummaryCard
            label="Obtained"
            value={
              summary.obtained
            }
          />

          <SummaryCard
            label="Percentage"
            value={`${summary.percentage}%`}
            accent
          />

          <SummaryCard
            label="Grade"
            value={
              summary.grade
            }
            accent
          />
        </section>


        {/* =================================================
            SUBJECTS
        ================================================= */}

        <section className="mt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-white">
                Subject Marks
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Enter marks obtained for
                each subject.
              </p>
            </div>

            <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-slate-400">
              {subjects.length} Subjects
            </span>
          </div>

          {subjects.length ===
          0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-slate-500">
              No subjects configured for
              this result.
            </div>
          ) : (
            <div className="space-y-3">
              {subjects.map(
                (
                  subject,
                  index
                ) => (
                  <SubjectRow
                    key={
                      subject.id ||
                      subject.subjectId ||
                      subject.subjectCode ||
                      index
                    }
                    subject={
                      subject
                    }
                    index={
                      index
                    }
                    disabled={
                      !canEdit ||
                      saving ||
                      submitting
                    }
                    onChange={(
                      value
                    ) =>
                      updateSubjectMarks(
                        index,
                        value
                      )
                    }
                  />
                )
              )}
            </div>
          )}
        </section>


        {/* =================================================
            REMARKS
        ================================================= */}

        {canEdit && (
          <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-4 sm:p-6">
            <label className="text-sm font-black text-white">
              Teacher Remarks
            </label>

            <textarea
              value={
                form.teacherRemarks ||
                ""
              }
              onChange={(
                event
              ) =>
                setForm(
                  (previous) => ({
                    ...previous,

                    teacherRemarks:
                      event.target
                        .value,
                  })
                )
              }
              rows={4}
              maxLength={1000}
              placeholder="Add an optional remark..."
              className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/50"
            />

            <p className="mt-2 text-right text-xs text-slate-600">
              {(
                form.teacherRemarks ||
                ""
              ).length}
              /1000
            </p>
          </section>
        )}


        {/* =================================================
            VALIDATION
        ================================================= */}

        {summary.invalid && (
          <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
            <b>Invalid marks detected.</b>{" "}
            Obtained marks cannot be less
            than 0 or greater than the
            maximum marks.
          </div>
        )}


        {/* =================================================
            FEEDBACK
        ================================================= */}

        {error && (
          <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            {success}
          </div>
        )}


        {/* =================================================
            ACTION BAR
        ================================================= */}

        <section className="sticky bottom-3 z-20 mt-6 rounded-2xl border border-white/10 bg-slate-900/90 p-3 shadow-2xl backdrop-blur-xl sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            {canEdit && (
              <button
                type="button"
                onClick={
                  handleSave
                }
                disabled={
                  saving ||
                  submitting ||
                  summary.invalid
                }
                className="min-h-11 w-full rounded-xl bg-white px-5 text-sm font-black text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {saving
                  ? "Saving..."
                  : "Save Draft"}
              </button>
            )}

            {canSubmit && (
              <button
                type="button"
                onClick={
                  handleSubmit
                }
                disabled={
                  saving ||
                  submitting ||
                  summary.invalid
                }
                className="min-h-11 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-5 text-sm font-black text-white shadow-lg shadow-cyan-500/10 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {submitting
                  ? "Submitting..."
                  : "Submit for Verification"}
              </button>
            )}
          </div>
        </section>


        {/* =================================================
            DIVISION
        ================================================= */}

        <p className="mt-5 text-center text-xs text-slate-600">
          Calculated Division:{" "}
          <span className="font-bold text-slate-400">
            {summary.division}
          </span>
        </p>
      </div>
    </main>
  );
}