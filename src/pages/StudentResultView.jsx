import { useMemo } from "react";

import useResultController from "../hooks/useResultController";
import MarksheetPDF from "../components/MarksheetPDF";


/* =========================================================
   STATUS
========================================================= */

const STATUS_META = {
  published: {
    label: "Published",
    icon: "🚀",
  },

  verified: {
    label: "Verified",
    icon: "✓",
  },
};


/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
  label,
  value,
  accent = false,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
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
   SUBJECT CARD
========================================================= */

function SubjectCard({
  subject,
  index,
}) {
  const maximum =
    Number(
      subject?.maximumMarks ??
        subject?.maxMarks ??
        100
    ) || 0;

  const obtained =
    Number(
      subject?.obtainedMarks ??
        0
    ) || 0;

  const percentage =
    maximum > 0
      ? (
          (obtained /
            maximum) *
          100
        ).toFixed(1)
      : "0.0";


  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
            Subject {index + 1}
          </p>

          <h3 className="mt-1 truncate text-sm font-black text-white">
            {subject?.subjectName ||
              subject?.name ||
              subject?.subjectCode ||
              "Subject"}
          </h3>
        </div>

        <span className="rounded-full bg-cyan-400/10 px-2.5 py-1 text-xs font-black text-cyan-300">
          {percentage}%
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-black/20 p-3">
          <p className="text-[10px] font-bold uppercase text-slate-600">
            Maximum
          </p>

          <p className="mt-1 font-black text-slate-200">
            {maximum}
          </p>
        </div>

        <div className="rounded-xl bg-black/20 p-3">
          <p className="text-[10px] font-bold uppercase text-slate-600">
            Obtained
          </p>

          <p className="mt-1 font-black text-cyan-300">
            {obtained}
          </p>
        </div>
      </div>
    </div>
  );
}


/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function StudentResultView({
  actor,
  resultId,
  school = {},
  branding = {},
  onBack,
}) {
  const {
    result,
    loading,
    error,
    refresh,
  } = useResultController({
    actor,

    resultId,

    autoLoad: true,

    includeDrafts: false,
  });


  const subjects =
    Array.isArray(
      result?.subjects
    )
      ? result.subjects
      : [];


  /* =======================================================
     ACCESS GUARD
  ======================================================= */

  const isPublished =
    String(
      result?.status || ""
    ).toLowerCase() ===
    "published";


  /* =======================================================
     SUMMARY
  ======================================================= */

  const summary =
    useMemo(() => {
      let maximum = 0;
      let obtained = 0;


      subjects.forEach(
        (subject) => {
          maximum +=
            Number(
              subject?.maximumMarks ??
                subject?.maxMarks ??
                100
            ) || 0;

          obtained +=
            Number(
              subject?.obtainedMarks ??
                0
            ) || 0;
        }
      );


      return {
        maximum:
          result?.maximumMarks ??
          maximum,

        obtained:
          result?.obtainedMarks ??
          obtained,

        percentage:
          result?.percentage ??
          (
            maximum > 0
              ? (
                  (obtained /
                    maximum) *
                  100
                ).toFixed(2)
              : "0.00"
          ),

        grade:
          result?.grade ||
          "—",

        division:
          result?.division ||
          "—",

        rank:
          result?.rank ??
          "—",
      };
    }, [
      result,
      subjects,
    ]);


  /* =======================================================
     LOADING
  ======================================================= */

  if (
    loading
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-5">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-cyan-400" />

          <p className="mt-5 text-lg font-black text-white">
            Loading your result
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Securing your academic information...
          </p>
        </div>
      </main>
    );
  }


  /* =======================================================
     UNAVAILABLE
  ======================================================= */

  if (
    !result ||
    !isPublished
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-5">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-7 text-center shadow-2xl">
          <div className="text-5xl">
            📄
          </div>

          <h1 className="mt-5 text-2xl font-black text-white">
            Result not available
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Your result has not been published
            yet or is not available for your
            account.
          </p>

          {error && (
            <p className="mt-3 text-xs text-red-300">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={refresh}
              className="min-h-11 rounded-xl border border-white/10 bg-white/5 px-5 text-sm font-black text-white hover:bg-white/10"
            >
              ↻ Check Again
            </button>

            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="min-h-11 rounded-xl bg-white px-5 text-sm font-black text-slate-950"
              >
                Go Back
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-6xl px-3 py-5 sm:px-5 sm:py-7 lg:px-8">
        {/* =================================================
            HEADER
        ================================================= */}

        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/10 via-indigo-500/10 to-fuchsia-500/10 p-5 shadow-2xl sm:p-7">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
                Academic Result
              </p>

              <h1 className="mt-2 truncate text-2xl font-black sm:text-4xl">
                {result.studentName ||
                  "My Result"}
              </h1>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-black text-emerald-300">
                  🚀 Published
                </span>

                {result.examinationName && (
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-400">
                    {
                      result.examinationName
                    }
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={refresh}
              className="min-h-11 rounded-xl border border-white/10 bg-white/10 px-4 text-sm font-black hover:bg-white/15"
            >
              ↻ Refresh
            </button>
          </div>
        </section>


        {/* =================================================
            STUDENT INFORMATION
        ================================================= */}

        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-xl sm:p-6">
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                Admission No.
              </p>

              <p className="mt-1 text-sm font-black text-white">
                {result.admissionNumber ||
                  result.rollNumber ||
                  "—"}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                Class
              </p>

              <p className="mt-1 text-sm font-black text-white">
                {result.className ||
                  "—"}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                Section
              </p>

              <p className="mt-1 text-sm font-black text-white">
                {result.section ||
                  "—"}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                Session
              </p>

              <p className="mt-1 text-sm font-black text-white">
                {result.sessionName ||
                  result.sessionId ||
                  "—"}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                Examination
              </p>

              <p className="mt-1 truncate text-sm font-black text-white">
                {result.examinationName ||
                  "—"}
              </p>
            </div>
          </div>
        </section>


        {/* =================================================
            SUMMARY
        ================================================= */}

        <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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

          <SummaryCard
            label="Division"
            value={
              summary.division
            }
          />

          <SummaryCard
            label="Rank"
            value={
              summary.rank
            }
          />
        </section>


        {/* =================================================
            SUBJECT PERFORMANCE
        ================================================= */}

        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-xl sm:p-6">
          <div className="mb-4">
            <h2 className="text-xl font-black">
              Subject Performance
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Your published subject-wise
              performance.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map(
              (
                subject,
                index
              ) => (
                <SubjectCard
                  key={
                    subject?.id ||
                    subject?.subjectId ||
                    subject?.subjectCode ||
                    index
                  }
                  subject={
                    subject
                  }
                  index={
                    index
                  }
                />
              )
            )}
          </div>
        </section>


        {/* =================================================
            REMARKS
        ================================================= */}

        {(result.teacherRemarks ||
          result.adminRemarks) && (
          <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl">
            <h2 className="text-lg font-black">
              Remarks
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-300">
              {result.adminRemarks ||
                result.teacherRemarks}
            </p>
          </section>
        )}


        {/* =================================================
            MARKSHEET
        ================================================= */}

        <section className="mt-6">
          <MarksheetPDF
            result={
              result
            }
            school={
              school
            }
            branding={
              branding
            }
          />
        </section>
      </div>
    </main>
  );
}