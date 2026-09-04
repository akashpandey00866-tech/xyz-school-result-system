import { useMemo, useState } from "react";

import useResultController from "../hooks/useResultController";
import { createResultActions } from "../actions/resultActions";


/* =========================================================
   STATUS
========================================================= */

const STATUS = Object.freeze({
  DRAFT: "draft",
  SUBMITTED: "submitted",
  VERIFIED: "verified",
  REJECTED: "rejected",
  PUBLISHED: "published",
});


/* =========================================================
   STATUS META
========================================================= */

const STATUS_META = Object.freeze({
  draft: {
    title: "Draft",
    description:
      "Result is being prepared and can be edited.",
    icon: "📝",
  },

  submitted: {
    title: "Awaiting Verification",
    description:
      "Result has been submitted to Admin.",
    icon: "📤",
  },

  verified: {
    title: "Verified",
    description:
      "Admin has verified the result.",
    icon: "✓",
  },

  rejected: {
    title: "Needs Correction",
    description:
      "Admin returned this result for correction.",
    icon: "↩",
  },

  published: {
    title: "Published",
    description:
      "Result is visible to the student.",
    icon: "🚀",
  },
});


/* =========================================================
   STATUS NORMALIZER
========================================================= */

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}


/* =========================================================
   STATUS HEADER
========================================================= */

function StatusHeader({ status }) {
  const normalized = normalizeStatus(status);

  const meta =
    STATUS_META[normalized] ||
    STATUS_META.draft;

  return (
    <div className="flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xl">
        {meta.icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-wider text-slate-500">
          Current Status
        </p>

        <h3 className="mt-1 text-lg font-black text-white">
          {meta.title}
        </h3>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          {meta.description}
        </p>
      </div>
    </div>
  );
}


/* =========================================================
   WORKFLOW STEP
========================================================= */

function WorkflowStep({
  number,
  title,
  active,
  completed,
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div
        className={[
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-black",
          completed || active
            ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
            : "border-white/10 bg-white/5 text-slate-600",
        ].join(" ")}
      >
        {completed ? "✓" : number}
      </div>

      <span
        className={[
          "truncate",
          active || completed
            ? "text-xs font-black text-slate-200"
            : "text-xs font-bold text-slate-600",
        ].join(" ")}
      >
        {title}
      </span>
    </div>
  );
}


/* =========================================================
   ACTION BUTTON
========================================================= */

function ActionButton({
  children,
  onClick,
  disabled,
  variant = "primary",
}) {
  const variants = {
    primary:
      "bg-gradient-to-r from-cyan-500 to-indigo-500 text-white shadow-lg hover:brightness-110",

    success:
      "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg hover:brightness-110",

    danger:
      "border border-red-400/20 bg-red-500/10 text-red-200 hover:bg-red-500/15",

    warning:
      "border border-amber-400/20 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "min-h-11 rounded-xl px-4 text-sm font-black transition",
        variants[variant] || variants.primary,
        "disabled:cursor-not-allowed disabled:opacity-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}


/* =========================================================
   MAIN
========================================================= */

export default function ResultWorkflow({
  actor,
  resultId,
  onComplete,
}) {
  /* =======================================================
     CONTROLLER
  ======================================================= */

  const controller = useResultController({
    actor,
    resultId,
    autoLoad: true,
    includeDrafts: true,
  });


  /* =======================================================
     ACTION PERMISSIONS ADAPTER
     
     FILE 47 supports flattened permissions while the
     existing permission system also exposes visibility.
  ======================================================= */

  const actionController = useMemo(() => {
    const source =
      controller?.permissions || {};

    const visibility =
      source.visibility || {};

    return {
      ...controller,

      permissions: {
        ...source,

        view:
          source.view ??
          visibility.view ??
          true,

        edit:
          source.edit ??
          visibility.edit ??
          false,

        delete:
          source.delete ??
          visibility.delete ??
          false,

        submit:
          source.submit ??
          visibility.submit ??
          false,

        verify:
          source.verify ??
          visibility.verify ??
          false,

        reject:
          source.reject ??
          visibility.reject ??
          false,

        publish:
          source.publish ??
          visibility.publish ??
          false,

        unpublish:
          source.unpublish ??
          visibility.unpublish ??
          false,

        download:
          source.download ??
          visibility.download ??
          false,

        print:
          source.print ??
          visibility.print ??
          false,
      },
    };
  }, [
    controller,
  ]);


  /* =======================================================
     CENTRALIZED ACTIONS
  ======================================================= */

  const actions =
    createResultActions({
      controller:
        actionController,
    });


  const {
    result,
    loading,
    error,
    success,

    permissions,

    verifying,
    rejecting,
    publishing,
    unpublishing,
  } = controller;


  /* =======================================================
     LOCAL UI STATE
  ======================================================= */

  const [
    showReject,
    setShowReject,
  ] = useState(false);

  const [
    rejectReason,
    setRejectReason,
  ] = useState("");


  /* =======================================================
     STATUS
  ======================================================= */

  const status = normalizeStatus(
    result?.status ||
      STATUS.DRAFT
  );


  /* =======================================================
     BUSY
  ======================================================= */

  const actionLoading =
    verifying ||
    rejecting ||
    publishing ||
    unpublishing ||
    actions.isBusy;


  /* =======================================================
     WORKFLOW STEPS
  ======================================================= */

  const steps = [
    STATUS.DRAFT,
    STATUS.SUBMITTED,
    STATUS.VERIFIED,
    STATUS.PUBLISHED,
  ];

  const statusIndex =
    steps.indexOf(status);


  /* =======================================================
     PERMISSION VISIBILITY
  ======================================================= */

  const visibility =
    permissions?.visibility ||
    {};


  const canVerify =
    actions.can.verify ||
    Boolean(visibility.verify);

  const canReject =
    actions.can.reject ||
    Boolean(visibility.reject);

  const canPublish =
    actions.can.publish ||
    Boolean(visibility.publish);

  const canUnpublish =
    actions.can.unpublish ||
    Boolean(visibility.unpublish);


  /* =======================================================
     VERIFY
  ======================================================= */

  async function handleVerify() {
    try {
      await actions.verify();

      onComplete?.(
        STATUS.VERIFIED
      );
    } catch {
      // Controller/action layer handles error.
    }
  }


  /* =======================================================
     REJECT
  ======================================================= */

  async function handleReject() {
    const reason =
      rejectReason.trim();

    if (!reason) {
      return;
    }

    try {
      await actions.reject(
        reason
      );

      setShowReject(false);
      setRejectReason("");

      onComplete?.(
        STATUS.REJECTED
      );
    } catch {
      // Controller/action layer handles error.
    }
  }


  /* =======================================================
     PUBLISH
  ======================================================= */

  async function handlePublish() {
    try {
      await actions.publish();

      onComplete?.(
        STATUS.PUBLISHED
      );
    } catch {
      // Controller/action layer handles error.
    }
  }


  /* =======================================================
     UNPUBLISH
  ======================================================= */

  async function handleUnpublish() {
    try {
      await actions.unpublish(
        "Result unpublished by administrator."
      );

      onComplete?.(
        STATUS.VERIFIED
      );
    } catch {
      // Controller/action layer handles error.
    }
  }


  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl backdrop-blur-xl sm:p-6">
        <div className="animate-pulse">
          <div className="h-5 w-32 rounded bg-white/10" />

          <div className="mt-4 h-11 rounded-xl bg-white/5" />

          <div className="mt-2 h-11 rounded-xl bg-white/5" />

          <div className="mt-5 h-24 rounded-2xl bg-white/5" />
        </div>
      </section>
    );
  }


  /* =======================================================
     NO RESULT
  ======================================================= */

  if (!result) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl backdrop-blur-xl sm:p-6">
        <div className="rounded-2xl border border-amber-400/10 bg-amber-500/5 p-5 text-center">
          <div className="text-3xl">
            📄
          </div>

          <p className="mt-3 text-sm font-black text-slate-300">
            No result selected
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Select a result to manage its workflow.
          </p>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        )}
      </section>
    );
  }


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl backdrop-blur-xl sm:p-6">

        {/* =================================================
            HEADER
        ================================================== */}

        <StatusHeader
          status={status}
        />


        {/* =================================================
            PROGRESS
        ================================================== */}

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {steps.map(
            (step, index) => (
              <WorkflowStep
                key={step}
                number={index + 1}
                title={
                  STATUS_META[
                    step
                  ]?.title ||
                  step
                }
                active={
                  step === status
                }
                completed={
                  statusIndex >= index &&
                  status !== STATUS.REJECTED
                }
              />
            )
          )}
        </div>


        {/* =================================================
            REJECTION MESSAGE
        ================================================== */}

        {status === STATUS.REJECTED && (
          <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
                ↩
              </div>

              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wider text-red-300">
                  Correction Required
                </p>

                <p className="mt-2 break-words text-sm leading-6 text-red-100">
                  {result.rejectionReason ||
                    "Admin requested correction."}
                </p>
              </div>
            </div>
          </div>
        )}


        {/* =================================================
            RESULT INFORMATION
        ================================================== */}

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
              Student
            </p>

            <p className="mt-1 break-words text-sm font-black text-slate-300">
              {result.studentName ||
                result.studentId ||
                "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
              Examination
            </p>

            <p className="mt-1 break-words text-sm font-black text-slate-300">
              {result.examinationName ||
                result.examName ||
                result.examinationId ||
                "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
              Class
            </p>

            <p className="mt-1 break-words text-sm font-black text-slate-300">
              {result.className ||
                result.classId ||
                "—"}
            </p>
          </div>
        </div>


        {/* =================================================
            ACTIONS
        ================================================== */}

        <div className="mt-6 border-t border-white/5 pt-5">

          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">
              Available Actions
            </p>

            {actionLoading && (
              <span className="text-[10px] font-bold text-cyan-400">
                Processing securely...
              </span>
            )}
          </div>


          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">

            {/* =============================================
                VERIFY
            ============================================== */}

            {canVerify && (
              <ActionButton
                onClick={handleVerify}
                disabled={actionLoading}
                variant="primary"
              >
                {verifying
                  ? "Verifying..."
                  : "✓ Verify Result"}
              </ActionButton>
            )}


            {/* =============================================
                REJECT
            ============================================== */}

            {canReject && (
              <ActionButton
                onClick={() =>
                  setShowReject(true)
                }
                disabled={actionLoading}
                variant="danger"
              >
                ↩ Reject Result
              </ActionButton>
            )}


            {/* =============================================
                PUBLISH
            ============================================== */}

            {canPublish && (
              <ActionButton
                onClick={handlePublish}
                disabled={actionLoading}
                variant="success"
              >
                {publishing
                  ? "Publishing..."
                  : "🚀 Publish Result"}
              </ActionButton>
            )}


            {/* =============================================
                UNPUBLISH
            ============================================== */}

            {canUnpublish && (
              <ActionButton
                onClick={handleUnpublish}
                disabled={actionLoading}
                variant="warning"
              >
                {unpublishing
                  ? "Unpublishing..."
                  : "↩ Unpublish Result"}
              </ActionButton>
            )}

          </div>


          {/* ===============================================
              NO ADMIN ACTION
          ================================================ */}

          {!canVerify &&
            !canReject &&
            !canPublish &&
            !canUnpublish && (
              <div className="rounded-xl border border-white/5 bg-white/[0.025] p-4 text-center">
                <div className="text-2xl">
                  🔒
                </div>

                <p className="mt-2 text-xs font-bold text-slate-500">
                  No administrative workflow actions
                  are available for your account.
                </p>

                <p className="mt-1 text-[10px] text-slate-700">
                  Permissions are enforced by the
                  result workflow and backend security.
                </p>
              </div>
            )}
        </div>


        {/* =================================================
            SECURITY STATUS
        ================================================== */}

        <div className="mt-5 rounded-2xl border border-cyan-400/10 bg-cyan-500/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10">
              🔐
            </div>

            <div>
              <p className="text-xs font-black text-cyan-300">
                Secure Result Workflow
              </p>

              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                Actions are permission-controlled.
                Frontend visibility does not replace
                backend authorization.
              </p>
            </div>
          </div>
        </div>


        {/* =================================================
            FEEDBACK
        ================================================== */}

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-200"
          >
            {success}
          </div>
        )}

      </section>


      {/* ===================================================
          REJECT MODAL
      ==================================================== */}

      {showReject && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm sm:items-center sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-result-title"
        >

          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-5 shadow-2xl sm:p-6">

            {/* =============================================
                MODAL HEADER
            ============================================== */}

            <div className="flex items-start justify-between gap-4">

              <div>
                <p className="text-xs font-black uppercase tracking-wider text-red-300">
                  Admin Review
                </p>

                <h2
                  id="reject-result-title"
                  className="mt-1 text-xl font-black text-white"
                >
                  Reject Result
                </h2>
              </div>


              <button
                type="button"
                onClick={() => {
                  setShowReject(false);
                  setRejectReason("");
                }}
                disabled={rejecting}
                aria-label="Close rejection dialog"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-slate-400 transition hover:bg-white/10 disabled:opacity-50"
              >
                ×
              </button>

            </div>


            {/* =============================================
                DESCRIPTION
            ============================================== */}

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Provide a clear reason for rejection.
              The teacher will see this reason and
              can correct the result.
            </p>


            {/* =============================================
                REASON
            ============================================== */}

            <textarea
              value={rejectReason}
              onChange={(event) =>
                setRejectReason(
                  event.target.value
                )
              }
              rows={5}
              maxLength={1000}
              autoFocus
              disabled={rejecting}
              placeholder="Example: Mathematics marks need to be corrected."
              className="mt-4 w-full resize-none rounded-2xl border border-white/10 bg-slate-950 p-4 text-sm text-white outline-none placeholder:text-slate-600 transition focus:border-red-400/50 disabled:cursor-not-allowed disabled:opacity-60"
            />


            {/* =============================================
                CHARACTER COUNT
            ============================================== */}

            <div className="mt-2 flex justify-between text-xs">
              <span className="text-slate-600">
                Rejection reason is required
              </span>

              <span
                className={
                  rejectReason.length >= 900
                    ? "text-amber-400"
                    : "text-slate-600"
                }
              >
                {rejectReason.length}/1000
              </span>
            </div>


            {/* =============================================
                MODAL ACTIONS
            ============================================== */}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">

              <button
                type="button"
                onClick={() => {
                  setShowReject(false);
                  setRejectReason("");
                }}
                disabled={rejecting}
                className="min-h-11 rounded-xl border border-white/10 px-5 text-sm font-black text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
              >
                Cancel
              </button>


              <button
                type="button"
                onClick={handleReject}
                disabled={
                  rejecting ||
                  !rejectReason.trim()
                }
                className="min-h-11 rounded-xl bg-red-500 px-5 text-sm font-black text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {rejecting
                  ? "Rejecting..."
                  : "Confirm Rejection"}
              </button>

            </div>

          </div>
        </div>
      )}
    </>
  );
}