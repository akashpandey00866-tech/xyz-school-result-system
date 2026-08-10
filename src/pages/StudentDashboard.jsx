import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

/* =========================================================
   STUDENT DASHBOARD
   Main dashboard only.
   Navigation/header are handled by StudentLayout.
========================================================= */

function StudentDashboard() {
  const navigate = useNavigate();

  /* =======================================================
     STUDENT SESSION
  ======================================================= */

  const student = useMemo(() => {
    try {
      const localStudent =
        localStorage.getItem("student");

      const sessionStudent =
        sessionStorage.getItem("student");

      return JSON.parse(
        localStudent ||
          sessionStudent ||
          "{}"
      );
    } catch (error) {
      console.error(
        "Student Session Error:",
        error
      );

      return {};
    }
  }, []);

  /* =======================================================
     STUDENT DETAILS
  ======================================================= */

  const studentName =
    student.name ||
    student.fullName ||
    student.studentName ||
    "Student";

  const enrollmentNo =
    student.enrollmentNo ||
    student.enrollmentNumber ||
    "-";

  const className =
    student.className ||
    student.class ||
    "-";

  const section =
    student.section ||
    "-";

  const session =
    student.session ||
    "2026 - 2027";

  const accountStatus =
    student.accountStatus ||
    "ACTIVE";

  /* =======================================================
     FEES
  ======================================================= */

  const annualFee = Number(
    student.annualFee || 0
  );

  const paidFee = Number(
    student.paidFee || 0
  );

  const calculatedDue =
    Math.max(
      annualFee - paidFee,
      0
    );

  const dueFee =
    student.dueFee !== undefined
      ? Number(student.dueFee)
      : calculatedDue;

  const feePercentage =
    annualFee > 0
      ? Math.min(
          Math.round(
            (paidFee /
              annualFee) *
              100
          ),
          100
        )
      : 0;

  /* =======================================================
     RESULT DATA
     
     We don't show fake marks.
     Real result will come from Firebase later.
  ======================================================= */

  const resultPublished =
    student.resultPublished === true;

  /* =======================================================
     QUICK ACTIONS
  ======================================================= */

  const openResult = () => {
    navigate(
      "/student/result"
    );
  };

  const openFees = () => {
    navigate(
      "/student/fees"
    );
  };

  const openRechecking = () => {
    navigate(
      "/student/rechecking"
    );
  };

  const openProfile = () => {
    navigate(
      "/student/profile"
    );
  };

  /* =======================================================
     DASHBOARD
  ======================================================= */

  return (
    <div className="space-y-6">

      {/* ===================================================
          WELCOME HERO
      =================================================== */}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-green-800 via-green-700 to-emerald-600 p-6 text-white shadow-lg sm:p-8">

        {/* Decorative shapes */}

        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10" />

        <div className="absolute -bottom-28 right-24 h-64 w-64 rounded-full bg-white/5" />

        <div className="absolute right-8 top-8 hidden text-7xl opacity-10 sm:block">
          🎓
        </div>

        <div className="relative z-10">

          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold backdrop-blur">

            <span className="h-2 w-2 rounded-full bg-green-300" />

            Academic Session {session}

          </div>

          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">

            Welcome back,{" "}
            {studentName.split(" ")[0]} 👋

          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-green-50 sm:text-base">

            Manage your academic information, examination
            results and fee details from your student portal.

          </p>

          {/* STUDENT BASIC INFO */}

          <div className="mt-5 flex flex-wrap gap-2">

            <span className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold backdrop-blur">

              🎓 Class {className}

            </span>

            <span className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold backdrop-blur">

              📚 Section {section}

            </span>

            <span className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold backdrop-blur">

              🪪 {enrollmentNo}

            </span>

          </div>

          {/* ACTIONS */}

          <div className="mt-6 flex flex-wrap gap-3">

            <button
              onClick={openResult}
              className="rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-green-800 shadow-sm transition hover:bg-green-50"
            >
              📊 View Result
            </button>

            <button
              onClick={openFees}
              className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-extrabold text-white backdrop-blur transition hover:bg-white/20"
            >
              💰 Check Fees
            </button>

          </div>

        </div>

      </section>

      {/* ===================================================
          OVERVIEW CARDS
      =================================================== */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <OverviewCard
          icon="📊"
          title="Result"
          value={
            resultPublished
              ? "Published"
              : "Not Published"
          }
          description={
            resultPublished
              ? "Latest result available"
              : "No published result"
          }
          iconBg="bg-green-50"
          iconText="text-green-700"
          onClick={openResult}
        />

        <OverviewCard
          icon="💰"
          title="Fee Due"
          value={`₹${dueFee.toLocaleString()}`}
          description={
            dueFee > 0
              ? "Payment pending"
              : "All fees cleared"
          }
          iconBg="bg-blue-50"
          iconText="text-blue-700"
          onClick={openFees}
        />

        <OverviewCard
          icon="🔍"
          title="Rechecking"
          value="Available"
          description="Apply after result"
          iconBg="bg-purple-50"
          iconText="text-purple-700"
          onClick={openRechecking}
        />

        <OverviewCard
          icon="👤"
          title="Profile"
          value={accountStatus.toUpperCase()}
          description="View student details"
          iconBg="bg-orange-50"
          iconText="text-orange-700"
          onClick={openProfile}
        />

      </section>

      {/* ===================================================
          RESULT + FEES
      =================================================== */}

      <section className="grid gap-6 lg:grid-cols-5">

        {/* =================================================
            RESULT
        ================================================= */}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-3">

          <div className="flex items-start justify-between">

            <div className="flex items-center gap-3">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-2xl">
                📊
              </div>

              <div>

                <h2 className="font-extrabold text-slate-900">
                  Academic Result
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Your examination performance
                </p>

              </div>

            </div>

            <span
              className={`rounded-full px-3 py-1 text-[10px] font-bold ${
                resultPublished
                  ? "bg-green-50 text-green-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {resultPublished
                ? "PUBLISHED"
                : "PENDING"}
            </span>

          </div>

          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5">

            <div className="flex items-center gap-4">

              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                📝
              </div>

              <div className="min-w-0 flex-1">

                <p className="text-sm font-bold text-slate-800">
                  {resultPublished
                    ? "Latest result is available"
                    : "Result has not been published yet"}
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {resultPublished
                    ? "Open the result section to view subject-wise marks, total, percentage and download your result."
                    : "Once the school publishes your result, it will automatically become available in your Result section."}
                </p>

              </div>

            </div>

          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">

            <button
              onClick={openResult}
              className="rounded-xl bg-green-700 py-3 text-sm font-bold text-white transition hover:bg-green-800"
            >
              📊 Open Result
            </button>

            <button
              onClick={openRechecking}
              className="rounded-xl border border-purple-200 bg-purple-50 py-3 text-sm font-bold text-purple-700 transition hover:bg-purple-100"
            >
              🔍 Rechecking
            </button>

          </div>

        </div>

        {/* =================================================
            FEES
        ================================================= */}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">

          <div className="flex items-center gap-3">

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">
              💰
            </div>

            <div>

              <h2 className="font-extrabold text-slate-900">
                Fee Summary
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Current academic fee status
              </p>

            </div>

          </div>

          {/* TOTAL */}

          <div className="mt-6 flex items-end justify-between">

            <div>

              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Total Fee
              </p>

              <p className="mt-1 text-2xl font-extrabold text-slate-900">
                ₹{annualFee.toLocaleString()}
              </p>

            </div>

            <div className="text-right">

              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Paid
              </p>

              <p className="mt-1 text-lg font-extrabold text-blue-700">
                ₹{paidFee.toLocaleString()}
              </p>

            </div>

          </div>

          {/* PROGRESS */}

          <div className="mt-6">

            <div className="mb-2 flex justify-between">

              <span className="text-[11px] font-bold text-slate-500">
                Payment Progress
              </span>

              <span className="text-[11px] font-extrabold text-blue-700">
                {feePercentage}%
              </span>

            </div>

            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">

              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-700"
                style={{
                  width:
                    `${feePercentage}%`,
                }}
              />

            </div>

          </div>

          {/* DUE */}

          <div className="mt-5 flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3">

            <span className="text-xs font-bold text-blue-700">
              Pending Amount
            </span>

            <span className="text-sm font-extrabold text-blue-900">
              ₹{dueFee.toLocaleString()}
            </span>

          </div>

          <button
            onClick={openFees}
            className="mt-5 w-full rounded-xl border border-blue-200 bg-blue-50 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
          >
            💰 View Fee Details →
          </button>

        </div>

      </section>

      {/* ===================================================
          ACADEMIC PROGRESS
      =================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="flex flex-wrap items-center justify-between gap-3">

          <div>

            <h2 className="font-extrabold text-slate-900">
              Academic Progress
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Your academic performance overview
            </p>

          </div>

          <button
            onClick={() =>
              navigate(
                "/student/progress"
              )
            }
            className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
          >
            View Details →
          </button>

        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <ProgressItem
            icon="📚"
            title="Subjects"
            value="Available"
            description="View subjects"
          />

          <ProgressItem
            icon="📝"
            title="Examinations"
            value="Academic"
            description="Exam information"
          />

          <ProgressItem
            icon="🏆"
            title="Performance"
            value="Coming Soon"
            description="Performance analysis"
          />

          <ProgressItem
            icon="🥇"
            title="Class Position"
            value="Coming Soon"
            description="Rank information"
          />

        </div>

        <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">

          <div className="flex gap-3">

            <span className="text-xl">
              💡
            </span>

            <div>

              <p className="text-xs font-bold text-slate-700">
                Academic analytics
              </p>

              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                Subject performance, previous examination
                comparison, overall percentage and class
                position will be calculated once the required
                academic data is available.
              </p>

            </div>

          </div>

        </div>

      </section>

      {/* ===================================================
          SCHOOL UPDATES + GUARDIAN
      =================================================== */}

      <section className="grid gap-6 lg:grid-cols-3">

        {/* SCHOOL UPDATES */}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">

          <div className="flex items-center justify-between">

            <div>

              <h2 className="font-extrabold text-slate-900">
                School Updates
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Important information for students
              </p>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-xl">
              📢
            </div>

          </div>

          <div className="mt-5 space-y-3">

            <NoticeItem
              icon="📚"
              title="Academic Session"
              text={`Current academic session is ${session}.`}
              tag="Academic"
            />

            <NoticeItem
              icon="📊"
              title="Result Updates"
              text="Check the Result section whenever a new result is published."
              tag="Result"
            />

            <NoticeItem
              icon="💳"
              title="Fee Updates"
              text="Check your Fee section for payment details and receipts."
              tag="Fees"
            />

          </div>

          <button
            onClick={() =>
              navigate(
                "/student/notices"
              )
            }
            className="mt-4 text-xs font-bold text-green-700 hover:underline"
          >
            View all notices →
          </button>

        </div>

        {/* GUARDIAN CONNECT */}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="flex items-center gap-3">

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-2xl">
              👨‍👩‍👦
            </div>

            <div>

              <h2 className="font-extrabold text-slate-900">
                Guardian Connect
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Stay connected with school
              </p>

            </div>

          </div>

          <div className="mt-5 space-y-3">

            <button
              onClick={() =>
                navigate(
                  "/student/complaint"
                )
              }
              className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-left transition hover:bg-purple-50"
            >

              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white">
                📝
              </span>

              <span>

                <span className="block text-xs font-bold text-slate-700">
                  Complaint
                </span>

                <span className="block text-[10px] text-slate-400">
                  Report an issue
                </span>

              </span>

            </button>

            <button
              onClick={() =>
                navigate(
                  "/student/suggestion"
                )
              }
              className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-left transition hover:bg-purple-50"
            >

              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white">
                💡
              </span>

              <span>

                <span className="block text-xs font-bold text-slate-700">
                  Suggestion
                </span>

                <span className="block text-[10px] text-slate-400">
                  Share your idea
                </span>

              </span>

            </button>

            <button
              onClick={() =>
                navigate(
                  "/student/guardian"
                )
              }
              className="w-full rounded-xl bg-purple-700 py-3 text-xs font-bold text-white transition hover:bg-purple-800"
            >
              Open Guardian Connect →
            </button>

          </div>

        </div>

      </section>

      {/* ===================================================
          STUDENT SERVICES
      =================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div>

          <h2 className="font-extrabold text-slate-900">
            Student Services
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Everything you may need during your academic journey
          </p>

        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

          <ServiceCard
            icon="👤"
            title="My Profile"
            description="Personal & academic details"
            onClick={openProfile}
          />

          <ServiceCard
            icon="📅"
            title="Academic Calendar"
            description="Events & important dates"
            onClick={() =>
              navigate(
                "/student/calendar"
              )
            }
          />

          <ServiceCard
            icon="📚"
            title="Subjects"
            description="Class subject information"
            onClick={() =>
              navigate(
                "/student/subjects"
              )
            }
          />

          <ServiceCard
            icon="📄"
            title="Documents"
            description="Academic documents"
            onClick={() =>
              navigate(
                "/student/documents"
              )
            }
          />

          <ServiceCard
            icon="🔔"
            title="Notifications"
            description="Important alerts"
            onClick={() =>
              navigate(
                "/student/notifications"
              )
            }
          />

          <ServiceCard
            icon="📝"
            title="Examination"
            description="Exam information"
            onClick={() =>
              navigate(
                "/student/examination"
              )
            }
          />

          <ServiceCard
            icon="📢"
            title="School Notices"
            description="Latest announcements"
            onClick={() =>
              navigate(
                "/student/notices"
              )
            }
          />

          <ServiceCard
            icon="🆘"
            title="Help & Support"
            description="Get school assistance"
            onClick={() =>
              navigate(
                "/student/settings"
              )
            }
          />

        </div>

      </section>

      {/* ===================================================
          SECURITY / SESSION INFO
      =================================================== */}

      <section className="rounded-2xl border border-green-100 bg-green-50 p-5">

        <div className="flex gap-3">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white">
            🔐
          </div>

          <div>

            <p className="text-xs font-extrabold text-green-800">
              Secure Student Portal
            </p>

            <p className="mt-1 text-[11px] leading-5 text-green-700">
              Your student account provides access only to
              your academic and fee information. Passwords
              are not displayed on the dashboard.
            </p>

          </div>

        </div>

      </section>

      {/* ===================================================
          FOOTER
      =================================================== */}

      <footer className="py-5 text-center">

        <p className="text-xs font-semibold text-slate-500">
          © 2026 XYZ PUBLIC SCHOOL
        </p>

        <p className="mt-1 text-[10px] text-slate-400">
          Student ERP Portal • Secure Academic Access
        </p>

      </footer>

    </div>
  );
}

/* =========================================================
   OVERVIEW CARD
========================================================= */

function OverviewCard({
  icon,
  title,
  value,
  description,
  iconBg,
  iconText,
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
    >

      <div className="flex items-center justify-between">

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg} ${iconText} text-xl`}
        >
          {icon}
        </div>

        <span className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-green-600">
          →
        </span>

      </div>

      <p className="mt-4 text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {title}
      </p>

      <p className="mt-1 truncate text-lg font-extrabold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-[10px] text-slate-500">
        {description}
      </p>

    </button>
  );
}

/* =========================================================
   PROGRESS ITEM
========================================================= */

function ProgressItem({
  icon,
  title,
  value,
  description,
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">

      <div className="flex items-center gap-3">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
          {icon}
        </div>

        <div className="min-w-0">

          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            {title}
          </p>

          <p className="mt-1 truncate text-xs font-extrabold text-slate-700">
            {value}
          </p>

        </div>

      </div>

      <p className="mt-3 text-[10px] text-slate-400">
        {description}
      </p>

    </div>
  );
}

/* =========================================================
   NOTICE ITEM
========================================================= */

function NoticeItem({
  icon,
  title,
  text,
  tag,
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
        {icon}
      </div>

      <div className="min-w-0 flex-1">

        <div className="flex flex-wrap items-center gap-2">

          <h3 className="text-xs font-bold text-slate-800">
            {title}
          </h3>

          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[8px] font-bold text-slate-500">
            {tag}
          </span>

        </div>

        <p className="mt-1 text-[11px] leading-5 text-slate-500">
          {text}
        </p>

      </div>

    </div>
  );
}

/* =========================================================
   SERVICE CARD
========================================================= */

function ServiceCard({
  icon,
  title,
  description,
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 text-left transition hover:border-green-100 hover:bg-green-50"
    >

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
        {icon}
      </div>

      <div className="min-w-0 flex-1">

        <p className="truncate text-xs font-bold text-slate-700">
          {title}
        </p>

        <p className="mt-0.5 truncate text-[10px] text-slate-400">
          {description}
        </p>

      </div>

      <span className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-green-600">
        →
      </span>

    </button>
  );
}

export default StudentDashboard;