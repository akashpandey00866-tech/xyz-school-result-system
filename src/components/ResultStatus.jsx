import React from "react";

/* =========================================================
   RESULT STATUS
   =========================================================

   Supported statuses:

   DRAFT
   SUBMITTED
   VERIFIED
   PUBLISHED
   PENDING
   REJECTED

   This component ONLY displays status.
   It does not change Firebase data.
   It does not publish results.
   It does not verify results.
========================================================= */


/* =========================================================
   STATUS CONFIG
========================================================= */

const STATUS_CONFIG = {
  DRAFT: {
    label: "Draft",
    shortLabel: "DRAFT",
    icon: "📝",
    color: "#64748b",
    background: "#f8fafc",
    border: "#cbd5e1",
    description:
      "Result is still being prepared.",
  },

  SUBMITTED: {
    label: "Submitted",
    shortLabel: "SUBMITTED",
    icon: "📤",
    color: "#2563eb",
    background: "#eff6ff",
    border: "#bfdbfe",
    description:
      "Result has been submitted for verification.",
  },

  VERIFIED: {
    label: "Verified",
    shortLabel: "VERIFIED",
    icon: "✓",
    color: "#7c3aed",
    background: "#f5f3ff",
    border: "#ddd6fe",
    description:
      "Result has been verified by an authorized administrator.",
  },

  PUBLISHED: {
    label: "Published",
    shortLabel: "PUBLISHED",
    icon: "🌐",
    color: "#059669",
    background: "#ecfdf5",
    border: "#a7f3d0",
    description:
      "Result is officially published and visible to the student.",
  },

  PENDING: {
    label: "Pending",
    shortLabel: "PENDING",
    icon: "⏳",
    color: "#d97706",
    background: "#fffbeb",
    border: "#fde68a",
    description:
      "Result is incomplete or awaiting further processing.",
  },

  REJECTED: {
    label: "Rejected",
    shortLabel: "REJECTED",
    icon: "!",
    color: "#dc2626",
    background: "#fef2f2",
    border: "#fecaca",
    description:
      "Result requires correction before it can proceed.",
  },
};


/* =========================================================
   NORMALIZE STATUS
========================================================= */

function normalizeStatus(value) {
  const status = String(
    value ?? ""
  )
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  if (
    STATUS_CONFIG[status]
  ) {
    return status;
  }

  /*
   * Compatibility with older result data.
   */

  if (
    status === "DECLARED" ||
    status === "ACTIVE"
  ) {
    return "PUBLISHED";
  }

  if (
    status === "PUBLISH"
  ) {
    return "PUBLISHED";
  }

  if (
    status === "VERIFY"
  ) {
    return "VERIFIED";
  }

  if (
    status === "SUBMIT"
  ) {
    return "SUBMITTED";
  }

  return "PENDING";
}


/* =========================================================
   GET STATUS FROM RESULT
========================================================= */

export function getResultStatus(
  result = {}
) {
  return normalizeStatus(
    result.status ??
      result.resultStatus ??
      result.workflowStatus ??
      result.publicationStatus
  );
}


/* =========================================================
   STATUS ORDER
========================================================= */

const STATUS_ORDER = [
  "DRAFT",
  "SUBMITTED",
  "VERIFIED",
  "PUBLISHED",
];


/* =========================================================
   GET PROGRESS
========================================================= */

function getProgress(
  status
) {
  const index =
    STATUS_ORDER.indexOf(
      status
    );

  if (index < 0) {
    return 0;
  }

  return (
    (index /
      (STATUS_ORDER.length - 1)) *
    100
  );
}


/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function ResultStatus({
  result = {},
  status: statusProp,
  variant = "full",
  theme = {},
  showDescription = true,
  showProgress = true,
}) {
  const status =
    normalizeStatus(
      statusProp ??
        getResultStatus(
          result
        )
    );

  const config =
    STATUS_CONFIG[
      status
    ];

  const primary =
    theme.primary ||
    "#059669";

  const progress =
    getProgress(
      status
    );


  /* =======================================================
     COMPACT
  ======================================================= */

  if (
    variant === "compact"
  ) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-wide"
        style={{
          color:
            config.color,
          background:
            config.background,
          borderColor:
            config.border,
        }}
      >
        <span>
          {config.icon}
        </span>

        {config.shortLabel}
      </span>
    );
  }


  /* =======================================================
     BADGE
  ======================================================= */

  if (
    variant === "badge"
  ) {
    return (
      <div
        className="inline-flex items-center gap-3 rounded-2xl border px-4 py-3"
        style={{
          color:
            config.color,
          background:
            config.background,
          borderColor:
            config.border,
        }}
      >

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-base shadow-sm">
          {config.icon}
        </div>

        <div>

          <p className="text-[8px] font-black uppercase tracking-wider opacity-70">
            Result Status
          </p>

          <p className="mt-0.5 text-xs font-black">
            {config.label}
          </p>

        </div>

      </div>
    );
  }


  /* =======================================================
     FULL
  ======================================================= */

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

        <div className="flex items-center gap-4">

          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl"
            style={{
              background:
                config.background,
              color:
                config.color,
              border:
                `1px solid ${config.border}`,
            }}
          >
            {config.icon}
          </div>

          <div>

            <p
              className="text-[9px] font-black uppercase tracking-[0.2em]"
              style={{
                color:
                  primary,
              }}
            >
              Result Workflow
            </p>

            <h2 className="mt-1 text-xl font-black text-slate-900">
              {config.label}
            </h2>

            {showDescription && (
              <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">
                {config.description}
              </p>
            )}

          </div>

        </div>


        {/* CURRENT STATUS */}

        <div
          className="rounded-2xl border px-5 py-3 text-center"
          style={{
            background:
              config.background,
            borderColor:
              config.border,
          }}
        >

          <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
            Current Status
          </p>

          <p
            className="mt-1 text-sm font-black"
            style={{
              color:
                config.color,
            }}
          >
            {config.shortLabel}
          </p>

        </div>

      </div>


      {/* ===================================================
          WORKFLOW PROGRESS
      =================================================== */}

      {showProgress && (
        <div className="mt-7">

          <div className="mb-3 flex items-center justify-between">

            <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">
              Publication Workflow
            </p>

            <p
              className="text-[9px] font-black"
              style={{
                color:
                  config.color,
              }}
            >
              {status ===
              "PUBLISHED"
                ? "Complete"
                : status ===
                  "VERIFIED"
                ? "Verification Complete"
                : status ===
                  "SUBMITTED"
                ? "Awaiting Verification"
                : status ===
                  "DRAFT"
                ? "In Preparation"
                : "Action Required"}
            </p>

          </div>


          <div className="relative">

            {/* LINE */}

            <div className="absolute left-0 right-0 top-4 h-1 rounded-full bg-slate-100">

              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width:
                    `${progress}%`,
                  background:
                    config.color,
                }}
              />

            </div>


            {/* STEPS */}

            <div className="relative grid grid-cols-4">

              {STATUS_ORDER.map(
                (
                  step,
                  index
                ) => {

                  const stepConfig =
                    STATUS_CONFIG[
                      step
                    ];

                  const currentIndex =
                    STATUS_ORDER.indexOf(
                      status
                    );

                  const completed =
                    index <=
                    currentIndex;

                  const active =
                    step ===
                    status;

                  return (
                    <div
                      key={step}
                      className="flex flex-col items-center"
                    >

                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full border-2 text-[9px] font-black transition-all"
                        style={{
                          background:
                            completed
                              ? stepConfig.color
                              : "#ffffff",

                          color:
                            completed
                              ? "#ffffff"
                              : "#94a3b8",

                          borderColor:
                            completed
                              ? stepConfig.color
                              : "#e2e8f0",

                          boxShadow:
                            active
                              ? `0 0 0 4px ${stepConfig.background}`
                              : "none",
                        }}
                      >
                        {completed
                          ? "✓"
                          : index +
                            1}
                      </div>

                      <p
                        className={[
                          "mt-2 text-center text-[8px] font-black uppercase tracking-wide",
                          completed
                            ? "text-slate-700"
                            : "text-slate-400",
                        ].join(
                          " "
                        )}
                      >
                        {
                          stepConfig.shortLabel
                        }
                      </p>

                    </div>
                  );
                }
              )}

            </div>

          </div>

        </div>
      )}


      {/* ===================================================
          STATUS INFORMATION
      =================================================== */}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">

        <StatusInfo
          title="Student Visibility"
          value={
            status ===
            "PUBLISHED"
              ? "Visible"
              : "Hidden"
          }
          positive={
            status ===
            "PUBLISHED"
          }
        />

        <StatusInfo
          title="Official Result"
          value={
            status ===
            "PUBLISHED"
              ? "Published"
              : "Not Published"
          }
          positive={
            status ===
            "PUBLISHED"
          }
        />

      </div>

    </section>
  );
}


/* =========================================================
   STATUS INFO
========================================================= */

function StatusInfo({
  title,
  value,
  positive,
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">

      <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
        {title}
      </p>

      <div className="mt-2 flex items-center gap-2">

        <span
          className={[
            "h-2 w-2 rounded-full",
            positive
              ? "bg-emerald-500"
              : "bg-slate-300",
          ].join(" ")}
        />

        <p
          className={[
            "text-xs font-black",
            positive
              ? "text-emerald-700"
              : "text-slate-500",
          ].join(" ")}
        >
          {value}
        </p>

      </div>

    </div>
  );
}


/* =========================================================
   EXPORTS
========================================================= */

export {
  STATUS_CONFIG,
  STATUS_ORDER,
  normalizeStatus,
};