import { useNavigate } from "react-router-dom";
import {
  Save,
  RotateCcw,
  Printer,
  XCircle,
  FileText,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

/* =========================================================
   RESULT ACTION BUTTONS

   Existing props intentionally preserved:
   - saving
   - onGenerate
   - onSaveDraft
   - onReset
   - draftSaved

   Publishing remains inside PublishResults.jsx.
========================================================= */

function ActionButtons({
  saving = false,
  onGenerate,
  onSaveDraft,
  onReset,
  draftSaved = false,
}) {
  const navigate = useNavigate();

  /* =======================================================
     PRINT
  ======================================================= */

  function handlePrint() {
    if (!draftSaved) {
      alert(
        "Please generate and save the result before printing."
      );

      return;
    }

    window.print();
  }

  /* =======================================================
     GENERATE
  ======================================================= */

  function handleGenerate() {
    if (saving) return;

    if (
      typeof onGenerate ===
      "function"
    ) {
      onGenerate();
    }
  }

  /* =======================================================
     SAVE
  ======================================================= */

  function handleSave() {
    if (saving) return;

    if (
      typeof onSaveDraft ===
      "function"
    ) {
      onSaveDraft();
    }
  }

  /* =======================================================
     RESET CONFIRMATION
  ======================================================= */

  function handleReset() {
    const message = draftSaved
      ? "A saved draft already exists. Resetting may clear the current form data. Do you want to continue?"
      : "Are you sure you want to reset the current result form?";

    const confirmed =
      window.confirm(
        message
      );

    if (!confirmed) return;

    if (
      typeof onReset ===
      "function"
    ) {
      onReset();
    }
  }

  /* =======================================================
     CANCEL
  ======================================================= */

  function handleCancel() {
    const confirmed =
      window.confirm(
        "Leave Result Entry? Any unsaved changes may be lost."
      );

    if (!confirmed) return;

    navigate(
      "/admin-dashboard"
    );
  }

  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold">
              ⚙ RESULT WORKFLOW
            </div>

            <h2 className="text-2xl font-extrabold">
              Result Actions
            </h2>

            <p className="mt-1 text-xs text-slate-300">
              Generate, review and save the student's result.
              Publishing is handled separately.
            </p>

          </div>

          {/* DRAFT STATUS */}

          <div
            className={`inline-flex items-center gap-2 self-start rounded-full px-4 py-2 text-xs font-extrabold sm:self-auto ${
              draftSaved
                ? "bg-green-500/20 text-green-200"
                : "bg-amber-500/20 text-amber-200"
            }`}
          >

            {draftSaved ? (
              <CheckCircle2
                size={15}
              />
            ) : (
              <AlertCircle
                size={15}
              />
            )}

            {draftSaved
              ? "DRAFT SAVED"
              : "NOT SAVED"}

          </div>

        </div>

      </div>

      {/* =================================================
          MAIN ACTIONS
      ================================================= */}

      <div className="p-5 sm:p-6">

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">

          {/* =============================================
              GENERATE
          ============================================= */}

          <ActionButton
            icon={
              <FileText
                size={21}
              />
            }
            title="Generate"
            description="Calculate result"
            onClick={
              handleGenerate
            }
            disabled={saving}
            className="bg-blue-700 text-white hover:bg-blue-800"
          />

          {/* =============================================
              SAVE
          ============================================= */}

          <ActionButton
            icon={
              saving ? (
                <LoadingSpinner />
              ) : (
                <Save
                  size={21}
                />
              )
            }
            title={
              saving
                ? "Saving..."
                : "Save Draft"
            }
            description={
              saving
                ? "Please wait"
                : "Save current result"
            }
            onClick={handleSave}
            disabled={saving}
            className="bg-green-700 text-white hover:bg-green-800 disabled:bg-slate-400"
          />

          {/* =============================================
              PRINT
          ============================================= */}

          <ActionButton
            icon={
              <Printer
                size={21}
              />
            }
            title="Print"
            description={
              draftSaved
                ? "Print result"
                : "Save draft first"
            }
            onClick={
              handlePrint
            }
            disabled={
              !draftSaved ||
              saving
            }
            className="bg-orange-600 text-white hover:bg-orange-700 disabled:bg-slate-300"
          />

          {/* =============================================
              RESET
          ============================================= */}

          <ActionButton
            icon={
              <RotateCcw
                size={21}
              />
            }
            title="Reset"
            description="Clear current form"
            onClick={handleReset}
            disabled={saving}
            className="bg-amber-500 text-white hover:bg-amber-600 disabled:bg-slate-300"
          />

          {/* =============================================
              CANCEL
          ============================================= */}

          <ActionButton
            icon={
              <XCircle
                size={21}
              />
            }
            title="Cancel"
            description="Return dashboard"
            onClick={handleCancel}
            disabled={saving}
            className="bg-slate-700 text-white hover:bg-slate-900 disabled:bg-slate-300"
          />

        </div>

      </div>

      {/* =================================================
          WORKFLOW
      ================================================= */}

      <div className="border-t border-slate-200 bg-slate-50 p-5 sm:p-6">

        <div className="mb-5">

          <h3 className="text-sm font-extrabold text-slate-800">
            Result Workflow
          </h3>

          <p className="mt-1 text-[10px] text-slate-500">
            Follow these steps before the result is published.
          </p>

        </div>

        <div className="grid gap-3 md:grid-cols-3">

          {/* STEP 1 */}

          <WorkflowStep
            number="01"
            icon="📊"
            title="Generate Result"
            description="Calculate total, percentage, grade and final status."
            active={!draftSaved}
            complete={draftSaved}
            color="blue"
          />

          {/* STEP 2 */}

          <WorkflowStep
            number="02"
            icon="💾"
            title="Save Draft"
            description="Store the calculated result safely in the system."
            active={
              draftSaved
            }
            complete={
              draftSaved
            }
            color="green"
          />

          {/* STEP 3 */}

          <WorkflowStep
            number="03"
            icon="🚀"
            title="Publish Result"
            description="Final publication is controlled from Publish Results."
            active={false}
            complete={false}
            color="purple"
          />

        </div>

      </div>

      {/* =================================================
          SAFETY NOTICE
      ================================================= */}

      <div className="border-t border-slate-200 p-5 sm:p-6">

        <div className="flex gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600">
            🔐
          </div>

          <div>

            <p className="text-xs font-extrabold text-blue-800">
              Result Safety
            </p>

            <p className="mt-1 text-[10px] leading-5 text-blue-700">
              Publishing is intentionally kept separate from
              result entry. Review the generated result and
              save the draft before moving to the Publish
              Results module.
            </p>

          </div>

        </div>

      </div>

    </section>
  );
}

/* =========================================================
   ACTION BUTTON
========================================================= */

function ActionButton({
  icon,
  title,
  description,
  onClick,
  disabled = false,
  className = "",
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group rounded-2xl p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-sm ${className}`}
    >

      <div className="flex items-center gap-3">

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
          {icon}
        </div>

        <div className="min-w-0">

          <p className="text-sm font-extrabold">
            {title}
          </p>

          <p className="mt-0.5 truncate text-[9px] opacity-80">
            {description}
          </p>

        </div>

      </div>

    </button>
  );
}

/* =========================================================
   WORKFLOW STEP
========================================================= */

function WorkflowStep({
  number,
  icon,
  title,
  description,
  active,
  complete,
  color,
}) {
  const colorMap = {
    blue: {
      wrapper:
        "border-blue-100 bg-blue-50",
      number:
        "bg-blue-600 text-white",
      icon:
        "bg-white text-blue-700",
    },

    green: {
      wrapper:
        "border-green-100 bg-green-50",
      number:
        "bg-green-600 text-white",
      icon:
        "bg-white text-green-700",
    },

    purple: {
      wrapper:
        "border-purple-100 bg-purple-50",
      number:
        "bg-purple-600 text-white",
      icon:
        "bg-white text-purple-700",
    },
  };

  const theme =
    colorMap[color] ||
    colorMap.blue;

  return (
    <div
      className={`rounded-2xl border p-4 transition ${
        theme.wrapper
      } ${
        active
          ? "ring-2 ring-offset-1 ring-green-100"
          : ""
      }`}
    >

      <div className="flex items-start gap-3">

        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold ${theme.number}`}
        >
          {complete
            ? "✓"
            : number}
        </div>

        <div className="min-w-0 flex-1">

          <div className="flex items-center gap-2">

            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${theme.icon}`}
            >
              {icon}
            </div>

            <h4 className="text-xs font-extrabold text-slate-800">
              {title}
            </h4>

          </div>

          <p className="mt-3 text-[10px] leading-5 text-slate-500">
            {description}
          </p>

          {complete && (
            <p className="mt-2 text-[9px] font-extrabold text-green-600">
              ✓ Completed
            </p>
          )}

        </div>

      </div>

    </div>
  );
}

/* =========================================================
   LOADING SPINNER
========================================================= */

function LoadingSpinner() {
  return (
    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
  );
}

export default ActionButtons;