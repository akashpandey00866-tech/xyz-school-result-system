function ResultSummary({
  result,
  performance,
  remarks,
}) {
  if (!result) return null;

  const percentage = Number(
    result.percentage || 0
  );

  const obtained = Number(
    result.obtainedMarks || 0
  );

  const maximum = Number(
    result.maximumMarks || 0
  );

  const totalSubjects = Number(
    result.totalSubjects || 0
  );

  const failedSubjects =
    result.failedSubjects || [];

  const passedSubjects = Math.max(
    totalSubjects -
      failedSubjects.length,
    0
  );

  const isPass =
    result.status === "PASS";

  const percentageWidth =
    Math.min(
      Math.max(percentage, 0),
      100
    );

  const marksWidth =
    maximum > 0
      ? Math.min(
          Math.max(
            (obtained / maximum) *
              100,
            0
          ),
          100
        )
      : 0;

  /* =======================================================
     RESULT STATUS CONFIG
  ======================================================= */

  const statusConfig = isPass
    ? {
        label: "PASS",
        icon: "✓",
        wrapper:
          "bg-green-50 border-green-200",
        text:
          "text-green-700",
        badge:
          "bg-green-600 text-white",
        message:
          "The student has successfully cleared the examination.",
      }
    : {
        label:
          result.status ||
          "FAIL",
        icon: "!",
        wrapper:
          "bg-red-50 border-red-200",
        text:
          "text-red-700",
        badge:
          "bg-red-600 text-white",
        message:
          "The result requires attention before final publication.",
      };

  return (
    <div className="mb-8 space-y-6">

      {/* =================================================
          MAIN RESULT HEADER
      ================================================= */}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

        <div
          className={`border-b p-6 ${
            isPass
              ? "bg-gradient-to-r from-green-800 to-emerald-700"
              : "bg-gradient-to-r from-red-800 to-rose-700"
          } text-white`}
        >

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold">
                📊 RESULT PREVIEW
              </div>

              <h2 className="text-2xl font-extrabold sm:text-3xl">
                Result Summary
              </h2>

              <p className="mt-1 max-w-xl text-xs leading-5 text-white/80">
                Review the student's complete academic
                performance before saving or publishing.
              </p>

            </div>

            {/* STATUS */}

            <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur">

              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-xl text-slate-800">
                {statusConfig.icon}
              </div>

              <div>

                <p className="text-[9px] font-bold uppercase tracking-wider text-white/70">
                  Final Status
                </p>

                <p className="mt-0.5 text-xl font-extrabold">
                  {statusConfig.label}
                </p>

              </div>

            </div>

          </div>

        </div>

        {/* =================================================
            MAIN STATS
        ================================================= */}

        <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">

          <StatCard
            icon="📚"
            label="Subjects"
            value={totalSubjects}
            className="text-blue-700"
          />

          <StatCard
            icon="✓"
            label="Passed"
            value={passedSubjects}
            className="text-green-700"
          />

          <StatCard
            icon="!"
            label="Failed"
            value={failedSubjects.length}
            className="text-red-600"
          />

          <StatCard
            icon="📊"
            label="Obtained"
            value={obtained}
            className="text-indigo-700"
          />

          <StatCard
            icon="🎯"
            label="Maximum"
            value={maximum}
            className="text-orange-700"
          />

          <StatCard
            icon="📈"
            label="Percentage"
            value={`${percentage}%`}
            className="text-purple-700"
          />

        </div>

      </section>

      {/* =================================================
          PERFORMANCE + GRADE + DIVISION
      ================================================= */}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <MiniCard
          icon="🏆"
          title="Grade"
          value={
            result.grade || "-"
          }
          description="Overall grade"
          className="bg-purple-50 border-purple-100 text-purple-700"
        />

        <MiniCard
          icon="🏅"
          title="Division"
          value={
            result.division || "-"
          }
          description="Overall division"
          className="bg-green-50 border-green-100 text-green-700"
        />

        <MiniCard
          icon="📈"
          title="Performance"
          value={
            performance?.level ||
            "-"
          }
          description="Performance level"
          className="bg-blue-50 border-blue-100 text-blue-700"
        />

        <MiniCard
          icon="📚"
          title="Subjects"
          value={`${passedSubjects}/${totalSubjects}`}
          description="Subjects cleared"
          className="bg-orange-50 border-orange-100 text-orange-700"
        />

      </section>

      {/* =================================================
          PERFORMANCE ANALYSIS
      ================================================= */}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <h2 className="text-xl font-extrabold text-slate-900">
              📈 Performance Analysis
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Visual overview of the student's current result.
            </p>

          </div>

          <div
            className={`rounded-full px-4 py-2 text-xs font-extrabold ${
              isPass
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {statusConfig.label}
          </div>

        </div>

        {/* PERCENTAGE */}

        <div className="mt-7">

          <div className="mb-2 flex items-center justify-between">

            <div>

              <p className="text-xs font-bold text-slate-700">
                Percentage
              </p>

              <p className="mt-0.5 text-[10px] text-slate-400">
                Overall academic percentage
              </p>

            </div>

            <p className="text-lg font-extrabold text-slate-900">
              {percentage}%
            </p>

          </div>

          <div className="h-3 overflow-hidden rounded-full bg-slate-100">

            <div
              className={`h-full rounded-full transition-all duration-700 ${
                isPass
                  ? "bg-green-600"
                  : "bg-red-600"
              }`}
              style={{
                width:
                  `${percentageWidth}%`,
              }}
            />

          </div>

        </div>

        {/* MARKS */}

        <div className="mt-7">

          <div className="mb-2 flex items-center justify-between">

            <div>

              <p className="text-xs font-bold text-slate-700">
                Marks Obtained
              </p>

              <p className="mt-0.5 text-[10px] text-slate-400">
                Total marks achieved
              </p>

            </div>

            <p className="text-sm font-extrabold text-slate-900">
              {obtained} /{" "}
              {maximum}
            </p>

          </div>

          <div className="h-3 overflow-hidden rounded-full bg-slate-100">

            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-700"
              style={{
                width:
                  `${marksWidth}%`,
              }}
            />

          </div>

        </div>

        {/* PERFORMANCE MESSAGE */}

        <div
          className={`mt-6 rounded-2xl border p-4 ${statusConfig.wrapper}`}
        >

          <div className="flex gap-3">

            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white ${statusConfig.text}`}
            >
              {statusConfig.icon}
            </div>

            <div>

              <p
                className={`text-xs font-extrabold ${statusConfig.text}`}
              >
                {isPass
                  ? "Result looks good"
                  : "Result requires attention"}
              </p>

              <p className="mt-1 text-[11px] leading-5 text-slate-600">
                {statusConfig.message}
              </p>

            </div>

          </div>

        </div>

      </section>

      {/* =================================================
          FAILED SUBJECTS
      ================================================= */}

      {failedSubjects.length >
        0 && (
        <section className="rounded-3xl border border-red-200 bg-red-50 p-6">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="text-xl font-extrabold text-red-700">
                ⚠️ Failed Subjects
              </h2>

              <p className="mt-1 text-xs text-red-600">
                These subjects require attention.
              </p>

            </div>

            <span className="rounded-full bg-red-600 px-4 py-2 text-xs font-extrabold text-white">
              {failedSubjects.length}{" "}
              Subject
              {failedSubjects.length !==
              1
                ? "s"
                : ""}
            </span>

          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

            {failedSubjects.map(
              (item, index) => (
                <div
                  key={
                    item.subjectCode ||
                    index
                  }
                  className="rounded-2xl border border-red-100 bg-white p-4"
                >

                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                      !
                    </div>

                    <div className="min-w-0">

                      <p className="truncate text-sm font-extrabold text-slate-800">
                        {
                          item.subjectName ||
                          "Subject"
                        }
                      </p>

                      {item.subjectCode && (
                        <p className="mt-1 font-mono text-[10px] font-bold text-slate-400">
                          {
                            item.subjectCode
                          }
                        </p>
                      )}

                    </div>

                  </div>

                </div>
              )
            )}

          </div>

        </section>
      )}

      {/* =================================================
          TEACHER REMARKS
      ================================================= */}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="flex items-center gap-3">

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-xl">
            📝
          </div>

          <div>

            <h2 className="text-xl font-extrabold text-slate-900">
              Teacher Remarks
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Remarks generated for this result.
            </p>

          </div>

        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">

          {remarks ? (
            <p className="text-sm leading-7 text-slate-700">
              {remarks}
            </p>
          ) : (
            <p className="text-sm italic text-slate-400">
              No teacher remarks available.
            </p>
          )}

        </div>

      </section>

      {/* =================================================
          RESULT READINESS
      ================================================= */}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="flex items-center justify-between">

          <div>

            <h2 className="text-lg font-extrabold text-slate-900">
              🔐 Result Readiness
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Quick verification before saving or publishing.
            </p>

          </div>

          <div
            className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold ${
              isPass
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {isPass
              ? "READY"
              : "REVIEW"}
          </div>

        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

          <ReadinessItem
            label="Subjects"
            ok={
              totalSubjects > 0
            }
            text={
              totalSubjects > 0
                ? `${totalSubjects} loaded`
                : "No subjects"
            }
          />

          <ReadinessItem
            label="Marks"
            ok={
              maximum > 0
            }
            text={
              maximum > 0
                ? "Calculated"
                : "Not available"
            }
          />

          <ReadinessItem
            label="Status"
            ok={
              Boolean(
                result.status
              )
            }
            text={
              result.status ||
              "Pending"
            }
          />

          <ReadinessItem
            label="Performance"
            ok={
              Boolean(
                performance?.level
              )
            }
            text={
              performance?.level ||
              "Pending"
            }
          />

        </div>

      </section>

    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  icon,
  label,
  value,
  className = "",
}) {
  return (
    <div className="p-5">

      <div className="flex items-center gap-2">

        <span className="text-sm">
          {icon}
        </span>

        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>

      </div>

      <p
        className={`mt-2 text-xl font-extrabold ${className}`}
      >
        {value}
      </p>

    </div>
  );
}

/* =========================================================
   MINI CARD
========================================================= */

function MiniCard({
  icon,
  title,
  value,
  description,
  className = "",
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${className}`}
    >

      <div className="flex items-center gap-3">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
          {icon}
        </div>

        <div className="min-w-0">

          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
            {title}
          </p>

          <p className="mt-1 truncate text-lg font-extrabold">
            {value}
          </p>

        </div>

      </div>

      <p className="mt-3 text-[10px] text-slate-500">
        {description}
      </p>

    </div>
  );
}

/* =========================================================
   READINESS ITEM
========================================================= */

function ReadinessItem({
  label,
  ok,
  text,
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">

      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          ok
            ? "bg-green-100 text-green-700"
            : "bg-amber-100 text-amber-700"
        }`}
      >
        {ok ? "✓" : "!"}
      </div>

      <div className="min-w-0">

        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
          {label}
        </p>

        <p className="mt-0.5 truncate text-xs font-bold text-slate-700">
          {text}
        </p>

      </div>

    </div>
  );
}

export default ResultSummary;