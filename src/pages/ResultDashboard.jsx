import { useMemo, useState } from "react";

import useResultController from "../hooks/useResultController";

const STATUS_META = {
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

function StatusBadge({ status }) {
  const meta =
    STATUS_META[status] || {
      label: status || "Unknown",
      icon: "•",
    };

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-slate-200">
      <span>{meta.icon}</span>
      {meta.label}
    </span>
  );
}

function StatCard({
  title,
  value,
  description,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 shadow-lg backdrop-blur-xl sm:p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {title}
      </p>

      <p className="mt-2 text-2xl font-black text-white sm:text-3xl">
        {value}
      </p>

      {description && (
        <p className="mt-1 text-xs text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
}

function ResultRow({
  result,
  permissions,
  onOpen,
}) {
  const status =
    String(result?.status || "")
      .toLowerCase();

  return (
    <div className="group rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.07]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-black text-white">
              {result?.studentName ||
                "Unnamed Student"}
            </h3>

            <StatusBadge
              status={status}
            />
          </div>

          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-400 sm:grid-cols-4">
            <span>
              Roll:{" "}
              <b className="text-slate-300">
                {result?.admissionNumber ||
                  result?.rollNumber ||
                  "—"}
              </b>
            </span>

            <span>
              Class:{" "}
              <b className="text-slate-300">
                {result?.className ||
                  "—"}
              </b>
            </span>

            <span>
              Section:{" "}
              <b className="text-slate-300">
                {result?.section ||
                  "—"}
              </b>
            </span>

            <span>
              Percentage:{" "}
              <b className="text-cyan-300">
                {result?.percentage ?? 0}%
              </b>
            </span>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          {permissions?.view && (
            <button
              type="button"
              onClick={() =>
                onOpen?.(result)
              }
              className="min-h-11 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10 sm:flex-none"
            >
              View
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-5 py-12 text-center">
      <div className="text-4xl">
        📊
      </div>

      <h3 className="mt-4 text-lg font-black text-white">
        No results found
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
        Try changing your search text or
        filters.
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      {Array.from({
        length: 5,
      }).map((_, index) => (
        <div
          key={index}
          className="h-24 animate-pulse rounded-2xl border border-white/5 bg-white/5"
        />
      ))}
    </div>
  );
}

export default function ResultDashboard({
  actor,
  resultId = null,
  studentId = null,
  classId = null,
  sessionId = null,
  examinationId = null,
  onOpenResult,
}) {
  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");


  const {
    results,
    loadingList,
    error,
    refresh,
  } = useResultController({
    actor,

    resultId,

    studentId,

    classId,

    sessionId,

    examinationId,

    autoLoad: true,

    includeDrafts:
      actor?.role === "admin" ||
      actor?.role === "teacher",
  });


  const filteredResults =
    useMemo(() => {
      const searchText =
        search
          .trim()
          .toLowerCase();

      return results.filter(
        (result) => {
          const status =
            String(
              result?.status || ""
            ).toLowerCase();

          if (
            statusFilter !==
              "all" &&
            status !==
              statusFilter
          ) {
            return false;
          }

          if (!searchText) {
            return true;
          }

          const searchable = [
            result?.studentName,
            result?.admissionNumber,
            result?.rollNumber,
            result?.className,
            result?.section,
            result?.examinationName,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchable.includes(
            searchText
          );
        }
      );
    }, [
      results,
      search,
      statusFilter,
    ]);


  const stats =
    useMemo(() => {
      const total =
        results.length;

      const draft =
        results.filter(
          (item) =>
            item?.status ===
            "draft"
        ).length;

      const submitted =
        results.filter(
          (item) =>
            item?.status ===
            "submitted"
        ).length;

      const verified =
        results.filter(
          (item) =>
            item?.status ===
            "verified"
        ).length;

      const published =
        results.filter(
          (item) =>
            item?.status ===
            "published"
        ).length;

      return {
        total,
        draft,
        submitted,
        verified,
        published,
      };
    }, [results]);


  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-7xl px-3 py-5 sm:px-5 sm:py-7 lg:px-8">
        {/* HEADER */}

        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/10 via-indigo-500/10 to-fuchsia-500/10 p-5 shadow-2xl sm:p-7">
          <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
                  Academic Management
                </p>

                <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-4xl">
                  Result Dashboard
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Manage, review and monitor
                  academic results from one
                  responsive workspace.
                </p>
              </div>

              <button
                type="button"
                onClick={refresh}
                disabled={loadingList}
                className="min-h-11 w-full rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {loadingList
                  ? "Refreshing..."
                  : "↻ Refresh"}
              </button>
            </div>
          </div>
        </section>


        {/* STATS */}

        <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            title="Total"
            value={stats.total}
            description="All accessible results"
          />

          <StatCard
            title="Draft"
            value={stats.draft}
            description="Needs completion"
          />

          <StatCard
            title="Submitted"
            value={stats.submitted}
            description="Waiting for review"
          />

          <StatCard
            title="Verified"
            value={stats.verified}
            description="Ready to publish"
          />

          <StatCard
            title="Published"
            value={stats.published}
            description="Visible to students"
          />
        </section>


        {/* FILTER BAR */}

        <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-xl backdrop-blur-xl sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative min-w-0 flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                🔎
              </span>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search student, roll number, class..."
                className="min-h-11 w-full rounded-xl border border-white/10 bg-slate-900/70 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/50"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
              className="min-h-11 w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 text-sm font-semibold text-white outline-none lg:w-48"
            >
              <option value="all">
                All Status
              </option>

              <option value="draft">
                Draft
              </option>

              <option value="submitted">
                Submitted
              </option>

              <option value="verified">
                Verified
              </option>

              <option value="rejected">
                Rejected
              </option>

              <option value="published">
                Published
              </option>
            </select>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              Showing{" "}
              <b className="text-slate-300">
                {filteredResults.length}
              </b>{" "}
              of{" "}
              <b className="text-slate-300">
                {results.length}
              </b>{" "}
              results
            </span>

            {(search ||
              statusFilter !==
                "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter(
                    "all"
                  );
                }}
                className="font-bold text-cyan-300 hover:text-cyan-200"
              >
                Clear filters
              </button>
            )}
          </div>
        </section>


        {/* ERROR */}

        {error && (
          <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
            <b>Unable to load results:</b>{" "}
            {error}
          </div>
        )}


        {/* RESULT LIST */}

        <section className="mt-5">
          {loadingList ? (
            <LoadingState />
          ) : filteredResults.length ===
            0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {filteredResults.map(
                (result) => (
                  <ResultRow
                    key={
                      result.id
                    }
                    result={
                      result
                    }
                    permissions={{
                      view: true,
                    }}
                    onOpen={
                      onOpenResult
                    }
                  />
                )
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}