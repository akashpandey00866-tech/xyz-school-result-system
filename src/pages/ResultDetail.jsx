import { useMemo, useState } from "react";

import useResultController from "../hooks/useResultController";


/* =========================================================
   STATUS CONFIG
========================================================= */

const STATUS_CONFIG = {
  draft: {
    label: "Draft",
    icon: "📝",
  },

  submitted: {
    label: "Submitted",
    icon: "📤",
  },

  verified: {
    label: "Verified",
    icon: "✓",
  },

  rejected: {
    label: "Rejected",
    icon: "↩",
  },

  published: {
    label: "Published",
    icon: "🚀",
  },
};


/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
  status,
}) {
  const config =
    STATUS_CONFIG[
      String(
        status || ""
      ).toLowerCase()
    ] || {
      label:
        status || "Unknown",

      icon: "•",
    };


  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black text-slate-200">
      <span>
        {config.icon}
      </span>

      {config.label}
    </span>
  );
}


/* =========================================================
   INFO ITEM
========================================================= */

function InfoItem({
  label,
  value,
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-bold text-slate-200">
        {value || "—"}
      </p>
    </div>
  );
}


/* =========================================================
   MARKS TABLE
========================================================= */

function MarksTable({
  subjects,
}) {
  if (
    !subjects?.length
  ) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
        No subject marks available.
      </div>
    );
  }


  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <div className="hidden grid-cols-[1fr_120px_140px_100px] gap-3 bg-white/[0.06] px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-500 sm:grid">
        <span>
          Subject
        </span>

        <span>
          Maximum
        </span>

        <span>
          Obtained
        </span>

        <span>
          %
        </span>
      </div>

      <div className="divide-y divide-white/5">
        {subjects.map(
          (
            subject,
            index
          ) => {
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
              <div
                key={
                  subject?.id ||
                  subject?.subjectId ||
                  subject?.subjectCode ||
                  index
                }
                className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-[1fr_120px_140px_100px] sm:items-center"
              >
                <div className="col-span-2 min-w-0 sm:col-span-1">
                  <p className="text-sm font-black text-white">
                    {subject?.subjectName ||
                      subject?.name ||
                      subject?.subjectCode ||
                      `Subject ${
                        index + 1
                      }`}
                  </p>

                  {subject?.subjectCode && (
                    <p className="mt-1 text-xs text-slate-600">
                      {subject.subjectCode}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-600 sm:hidden">
                    Maximum
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-300 sm:mt-0">
                    {maximum}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-600 sm:hidden">
                    Obtained
                  </p>

                  <p className="mt-1 text-sm font-black text-cyan-300 sm:mt-0">
                    {obtained}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-600 sm:hidden">
                    Percentage
                  </p>

                  <p className="mt-1 text-sm font-black text-white sm:mt-0">
                    {percentage}%
                  </p>
                </div>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}


/* =========================================================
   WORKFLOW TIMELINE
========================================================= */

function WorkflowTimeline({
  result,
}) {
  const steps = [
    {
      key: "draft",
      label: "Draft",
      description:
        "Result created or returned for correction.",
    },

    {
      key: "submitted",
      label: "Submitted",
      description:
        "Result submitted for administrative review.",
    },

    {
      key: "verified",
      label: "Verified",
      description:
        "Admin verified the result.",
    },

    {
      key: "published",
      label: "Published",
      description:
        "Result is available to the student.",
    },
  ];


  const status =
    String(
      result?.status || ""
    ).toLowerCase();


  const statusIndex =
    steps.findIndex(
      (step) =>
        step.key ===
        status
    );


  return (
    <div className="space-y-4">
      {steps.map(
        (
          step,
          index
        ) => {
          const completed =
            statusIndex >=
            index;

          const current =
            step.key ===
            status;


          return (
            <div
              key={
                step.key
              }
              className="flex gap-3"
            >
              <div className="flex flex-col items-center">
                <div
                  className={[
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-black",
                    completed
                      ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
                      : "border-white/10 bg-white/5 text-slate-600",
                  ].join(" ")}
                >
                  {completed
                    ? "✓"
                    : index + 1}
                </div>

                {index <
                  steps.length -
                    1 && (
                  <div className="mt-1 h-full min-h-8 w-px bg-white/10" />
                )}
              </div>

              <div className="pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={
                      completed
                        ? "text-sm font-black text-white"
                        : "text-sm font-bold text-slate-600"
                    }
                  >
                    {step.label}
                  </p>

                  {current && (
                    <span className="rounded-full bg-cyan-400/10 px-2 py-0.5 text-[10px] font-black text-cyan-300">
                      CURRENT
                    </span>
                  )}
                </div>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {step.description}
                </p>
              </div>
            </div>
          );
        }
      )}

      {status ===
        "rejected" && (
        <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3">
          <p className="text-xs font-black text-red-300">
            Result Rejected
          </p>

          <p className="mt-1 text-sm text-red-200">
            {result?.rejectionReason ||
              "No rejection reason provided."}
          </p>
        </div>
      )}
    </div>
  );
}


/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function ResultDetail({
  actor,
  resultId,
  onBack,
  onEdit,
}) {
  const {
    result,
    loading,
    error,
    success,

    permissions,

    verify,
    reject,
    publish,
    unpublish,

    refresh,
  } = useResultController({
    actor,

    resultId,

    autoLoad: true,

    includeDrafts: true,
  });


  const [
    rejectionReason,
    setRejectionReason,
  ] = useState("");


  const [
    showReject,
    setShowReject,
  ] = useState(false);


  const [
    actionLoading,
    setActionLoading,
  ] = useState(false);


  const average =
    useMemo(() => {
      const subjects =
        Array.isArray(
          result?.subjects
        )
          ? result.subjects
          : [];


      if (
        !subjects.length
      ) {
        return 0;
      }


      let total = 0;
      let maximum = 0;


      subjects.forEach(
        (subject) => {
          total +=
            Number(
              subject?.obtainedMarks ??
              0
            ) || 0;

          maximum +=
            Number(
              subject?.maximumMarks ??
              subject?.maxMarks ??
              100
            ) || 0;
        }
      );


      return maximum
        ? (
            (total /
              maximum) *
            100
          ).toFixed(2)
        : "0.00";
    }, [
      result,
    ]);


  async function handleVerify() {
    setActionLoading(
      true
    );

    try {
      await verify();
    } finally {
      setActionLoading(
        false
      );
    }
  }


  async function handleReject() {
    if (
      !rejectionReason.trim()
    ) {
      return;
    }


    setActionLoading(
      true
    );

    try {
      await reject(
        rejectionReason
      );

      setShowReject(
        false
      );

      setRejectionReason(
        ""
      );
    } finally {
      setActionLoading(
        false
      );
    }
  }


  async function handlePublish() {
    setActionLoading(
      true
    );

    try {
      await publish();
    } finally {
      setActionLoading(
        false
      );
    }
  }


  async function handleUnpublish() {
    setActionLoading(
      true
    );

    try {
      await unpublish(
        "Result unpublished by administrator."
      );
    } finally {
      setActionLoading(
        false
      );
    }
  }


  /* =======================================================
     LOADING
  ======================================================= */

  if (
    loading
  ) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-white/10 border-t-cyan-400" />

          <p className="mt-4 font-black text-white">
            Loading result...
          </p>
        </div>
      </div>
    );
  }


  /* =======================================================
     ERROR / NOT FOUND
  ======================================================= */

  if (
    !result
  ) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-950 p-5">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-7 text-center">
          <div className="text-4xl">
            ⚠️
          </div>

          <h2 className="mt-4 text-xl font-black text-white">
            Result unavailable
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            {error ||
              "The requested result could not be loaded."}
          </p>

          <button
            type="button"
            onClick={onBack}
            className="mt-5 min-h-11 rounded-xl bg-white px-5 text-sm font-black text-slate-950"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }


  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-7xl px-3 py-5 sm:px-5 lg:px-8">
        {/* HEADER */}

        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/10 via-indigo-500/10 to-fuchsia-500/10 p-5 shadow-2xl sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <button
                type="button"
                onClick={onBack}
                className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-lg transition hover:bg-white/10"
                aria-label="Go back"
              >
                ←
              </button>

              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
                  Result Details
                </p>

                <h1 className="mt-1 truncate text-2xl font-black sm:text-4xl">
                  {result.studentName ||
                    "Student Result"}
                </h1>

                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusBadge
                    status={
                      result.status
                    }
                  />

                  {result.examinationName && (
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-400">
                      {
                        result.examinationName
                      }
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={refresh}
              className="min-h-11 rounded-xl border border-white/10 bg-white/10 px-4 text-sm font-bold hover:bg-white/15"
            >
              ↻ Refresh
            </button>
          </div>
        </section>


        {/* STUDENT INFO */}

        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-xl sm:p-6">
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
            <InfoItem
              label="Admission No."
              value={
                result.admissionNumber ||
                result.rollNumber
              }
            />

            <InfoItem
              label="Class"
              value={
                result.className
              }
            />

            <InfoItem
              label="Section"
              value={
                result.section
              }
            />

            <InfoItem
              label="Session"
              value={
                result.sessionName ||
                result.sessionId
              }
            />

            <InfoItem
              label="Maximum"
              value={
                result.maximumMarks
              }
            />

            <InfoItem
              label="Obtained"
              value={
                result.obtainedMarks
              }
            />
          </div>
        </section>


        {/* MAIN GRID */}

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
          {/* MARKS */}

          <section className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-xl sm:p-6">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">
                  Subject Performance
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Complete subject-wise marks
                  breakdown.
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-slate-500">
                  Average
                </p>

                <p className="text-lg font-black text-cyan-300">
                  {average}%
                </p>
              </div>
            </div>

            <MarksTable
              subjects={
                result.subjects
              }
            />


            {/* SUMMARY */}

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <InfoItem
                label="Percentage"
                value={`${result.percentage ?? 0}%`}
              />

              <InfoItem
                label="Grade"
                value={
                  result.grade
                }
              />

              <InfoItem
                label="Division"
                value={
                  result.division
                }
              />

              <InfoItem
                label="Rank"
                value={
                  result.rank ??
                  "—"
                }
              />
            </div>
          </section>


          {/* SIDE PANEL */}

          <aside className="space-y-5">
            {/* WORKFLOW */}

            <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl">
              <h2 className="text-lg font-black">
                Workflow
              </h2>

              <p className="mt-1 mb-5 text-xs text-slate-500">
                Current result lifecycle.
              </p>

              <WorkflowTimeline
                result={
                  result
                }
              />
            </section>


            {/* ACTIONS */}

            <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl">
              <h2 className="text-lg font-black">
                Actions
              </h2>

              <div className="mt-4 space-y-2">
                {permissions?.visibility?.edit && (
                  <button
                    type="button"
                    onClick={() =>
                      onEdit?.(
                        result
                      )
                    }
                    className="min-h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-black hover:bg-white/10"
                  >
                    ✏️ Edit Result
                  </button>
                )}


                {permissions?.visibility?.verify && (
                  <button
                    type="button"
                    onClick={
                      handleVerify
                    }
                    disabled={
                      actionLoading
                    }
                    className="min-h-11 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-4 text-sm font-black disabled:opacity-50"
                  >
                    {actionLoading
                      ? "Processing..."
                      : "✓ Verify Result"}
                  </button>
                )}


                {permissions?.visibility?.reject && (
                  <button
                    type="button"
                    onClick={() =>
                      setShowReject(
                        true
                      )
                    }
                    disabled={
                      actionLoading
                    }
                    className="min-h-11 w-full rounded-xl border border-red-400/20 bg-red-500/10 px-4 text-sm font-black text-red-200 hover:bg-red-500/15"
                  >
                    ↩ Reject Result
                  </button>
                )}


                {permissions?.visibility?.publish && (
                  <button
                    type="button"
                    onClick={
                      handlePublish
                    }
                    disabled={
                      actionLoading
                    }
                    className="min-h-11 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 text-sm font-black disabled:opacity-50"
                  >
                    {actionLoading
                      ? "Publishing..."
                      : "🚀 Publish Result"}
                  </button>
                )}


                {permissions?.visibility?.unpublish && (
                  <button
                    type="button"
                    onClick={
                      handleUnpublish
                    }
                    disabled={
                      actionLoading
                    }
                    className="min-h-11 w-full rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 text-sm font-black text-amber-200 disabled:opacity-50"
                  >
                    Unpublish Result
                  </button>
                )}


                {permissions?.visibility?.download && (
                  <button
                    type="button"
                    className="min-h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-black hover:bg-white/10"
                  >
                    ↓ Download Marksheet
                  </button>
                )}


                {permissions?.visibility?.print && (
                  <button
                    type="button"
                    onClick={() =>
                      window.print()
                    }
                    className="min-h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-black hover:bg-white/10"
                  >
                    🖨 Print
                  </button>
                )}
              </div>
            </section>
          </aside>
        </div>


        {/* REMARKS */}

        {(result.teacherRemarks ||
          result.adminRemarks ||
          result.rejectionReason) && (
          <section className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
            {result.teacherRemarks && (
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Teacher Remarks
                </p>

                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {
                    result.teacherRemarks
                  }
                </p>
              </div>
            )}

            {result.adminRemarks && (
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Admin Remarks
                </p>

                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {
                    result.adminRemarks
                  }
                </p>
              </div>
            )}
          </section>
        )}


        {/* REJECT MODAL */}

        {showReject && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:p-5">
            <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-5 shadow-2xl sm:p-6">
              <h2 className="text-xl font-black">
                Reject Result
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Enter a reason so the teacher
                knows what needs correction.
              </p>

              <textarea
                value={
                  rejectionReason
                }
                onChange={(event) =>
                  setRejectionReason(
                    event.target
                      .value
                  )
                }
                rows={5}
                maxLength={1000}
                autoFocus
                placeholder="Enter rejection reason..."
                className="mt-4 w-full resize-none rounded-2xl border border-white/10 bg-slate-950 p-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-red-400/50"
              />

              <p className="mt-1 text-right text-xs text-slate-600">
                {
                  rejectionReason.length
                }
                /1000
              </p>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setShowReject(
                      false
                    )
                  }
                  className="min-h-11 rounded-xl border border-white/10 px-5 text-sm font-black text-slate-300 hover:bg-white/5"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    handleReject
                  }
                  disabled={
                    actionLoading ||
                    !rejectionReason.trim()
                  }
                  className="min-h-11 rounded-xl bg-red-500 px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoading
                    ? "Rejecting..."
                    : "Confirm Rejection"}
                </button>
              </div>
            </div>
          </div>
        )}


        {/* FEEDBACK */}

        {(error ||
          success) && (
          <div className="fixed bottom-4 left-3 right-3 z-40 sm:left-auto sm:right-5 sm:max-w-md">
            <div
              className={
                error
                  ? "rounded-2xl border border-red-400/20 bg-red-950/95 p-4 text-sm text-red-200 shadow-2xl backdrop-blur-xl"
                  : "rounded-2xl border border-emerald-400/20 bg-emerald-950/95 p-4 text-sm text-emerald-200 shadow-2xl backdrop-blur-xl"
              }
            >
              {error ||
                success}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}