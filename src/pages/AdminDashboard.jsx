import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  collection,
  onSnapshot,
  query,
  where,
  limit,
} from "firebase/firestore";

import { signOut } from "firebase/auth";

import {
  Users,
  FileText,
  IndianRupee,
  GraduationCap,
  Settings2,
  Plus,
  ArrowRight,
  RefreshCcw,
  CheckCircle2,
  Clock3,
  AlertCircle,
  BookOpen,
  CalendarDays,
  ChevronRight,
  LogOut,
  WalletCards,
  BookMarked,
  UserPlus,
} from "lucide-react";

import { db, auth } from "../config/firebase";
import AdminLayout from "../layouts/AdminLayout";


/* =========================================================
   HELPERS
========================================================= */

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}


function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}


function getTimestamp(value) {
  if (!value) return 0;

  if (typeof value?.toMillis === "function") {
    return value.toMillis();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "number") {
    return value;
  }

  return 0;
}


/* =========================================================
   CLASS FEE RESOLVER

   Supports:

   1. classFees[classId]
   2. classFees[className]
   3. legacy class1/class2...
   4. student.annualFee fallback
========================================================= */

function resolveClassFee(student, classes, feeSettings) {
  const className = String(
    student?.className ??
      student?.class ??
      ""
  ).trim();

  const classId = String(
    student?.classId ??
      ""
  ).trim();

  const classFees =
    feeSettings?.classFees &&
    typeof feeSettings.classFees === "object"
      ? feeSettings.classFees
      : {};

  /* -----------------------------------------
     Direct classId match
  ----------------------------------------- */

  if (
    classId &&
    classFees[classId] !== undefined
  ) {
    return number(classFees[classId]);
  }


  /* -----------------------------------------
     Find academic class document
  ----------------------------------------- */

  const academicClass =
    classes.find((item) => {

      const itemName = String(
        item?.name ??
          item?.className ??
          ""
      ).trim();

      const itemId = String(
        item?.id ??
          ""
      ).trim();

      return (
        (classId && itemId === classId) ||
        (
          className &&
          normalize(itemName) ===
            normalize(className)
        )
      );
    });


  /* -----------------------------------------
     Match using academic class ID
  ----------------------------------------- */

  if (
    academicClass?.id &&
    classFees[academicClass.id] !== undefined
  ) {
    return number(
      classFees[academicClass.id]
    );
  }


  /* -----------------------------------------
     Match using class name
  ----------------------------------------- */

  if (
    className &&
    classFees[className] !== undefined
  ) {
    return number(
      classFees[className]
    );
  }


  /* -----------------------------------------
     Case-insensitive class name match
  ----------------------------------------- */

  const matchingKey =
    Object.keys(classFees).find(
      (key) =>
        normalize(key) ===
        normalize(className)
    );

  if (
    matchingKey &&
    classFees[matchingKey] !== undefined
  ) {
    return number(
      classFees[matchingKey]
    );
  }


  /* -----------------------------------------
     Legacy Class 1 - Class 12 system
  ----------------------------------------- */

  const numericMatch =
    className.match(/\d+/);

  if (numericMatch) {

    const legacyKey =
      `class${numericMatch[0]}`;

    if (
      feeSettings?.[legacyKey] !== undefined
    ) {
      return number(
        feeSettings[legacyKey]
      );
    }
  }


  /* -----------------------------------------
     Existing student annualFee fallback
  ----------------------------------------- */

  return number(
    student?.annualFee ??
      student?.totalFee ??
      student?.feeAmount ??
      0
  );
}


/* =========================================================
   MAIN DASHBOARD
========================================================= */

function AdminDashboard() {

  const navigate = useNavigate();


  /* =======================================================
     STATE
  ======================================================= */

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [data, setData] = useState({

    students: 0,

    activeStudents: 0,

    results: 0,

    pendingResults: 0,

    publishedResults: 0,

    feeExpected: 0,

    feeCollected: 0,

    feeDue: 0,

    configuredClasses: 0,

    configuredSubjects: 0,

    activeSession: null,

    recentResults: [],

  });


  /* =======================================================
     REALTIME DASHBOARD DATA
  ======================================================= */

  useEffect(() => {

    let students = [];
    let results = [];
    let classes = [];
    let subjects = [];
    let sessions = [];
    let feeSettings = {};

    let firstLoad = true;


    const calculateDashboard = () => {

      try {

        /* =================================================
           STUDENTS
        ================================================= */

        let activeStudents = 0;

        let feeExpected = 0;

        let feeCollected = 0;

        let feeDue = 0;


        students.forEach((student) => {

          const status = String(
            student?.status ??
              student?.accountStatus ??
              "Active"
          ).toUpperCase();


          const isActive =
            !student?.isArchived &&
            status !== "INACTIVE" &&
            status !== "DISABLED";


          if (isActive) {
            activeStudents++;
          }


          /*
             IMPORTANT:

             Annual fee comes from CURRENT
             Fee Settings.

             Paid amount comes from student.
          */

          const annualFee =
            resolveClassFee(
              student,
              classes,
              feeSettings
            );


          const paidFee =
            number(
              student?.paidFee ??
                student?.totalPaid ??
                student?.paidAmount ??
                0
            );


          const dueFee =
            Math.max(
              annualFee - paidFee,
              0
            );


          if (isActive) {

            feeExpected += annualFee;

            feeCollected += paidFee;

            feeDue += dueFee;

          }

        });


        /* =================================================
           RESULTS
        ================================================= */

        const publishedResults =
          results.filter((result) => {

            const status = String(
              result?.publishStatus ??
                result?.resultStatus ??
                ""
            ).toUpperCase();


            return (
              status === "PUBLISHED" ||
              result?.published === true ||
              result?.publish === true
            );

          }).length;


        const recentResults =
          [...results]
            .sort(
              (a, b) =>
                getTimestamp(
                  b?.updatedAt ??
                    b?.createdAt
                ) -
                getTimestamp(
                  a?.updatedAt ??
                    a?.createdAt
                )
            )
            .slice(0, 5);


        /* =================================================
           ACTIVE SESSION
        ================================================= */

        const activeSession =
          sessions.find(
            (session) =>
              session?.active === true
          ) ||
          sessions[0] ||
          null;


        /* =================================================
           SET DASHBOARD
        ================================================= */

        setData({

          students:
            students.length,

          activeStudents,

          results:
            results.length,

          pendingResults:
            Math.max(
              results.length -
                publishedResults,
              0
            ),

          publishedResults,

          feeExpected,

          feeCollected,

          feeDue,

          configuredClasses:
            classes.length,

          configuredSubjects:
            subjects.length,

          activeSession,

          recentResults,

        });


        setLoading(false);

        setRefreshing(false);

        firstLoad = false;

      } catch (error) {

        console.error(
          "Dashboard calculation error:",
          error
        );

        setLoading(false);

        setRefreshing(false);

      }

    };


    /* =====================================================
       STUDENTS REALTIME
    ===================================================== */

    const unsubscribeStudents =
      onSnapshot(
        collection(db, "students"),

        (snapshot) => {

          students =
            snapshot.docs.map(
              (item) => ({
                id: item.id,
                ...item.data(),
              })
            );

          calculateDashboard();

        },

        (error) => {

          console.error(
            "Students realtime error:",
            error
          );

          setLoading(false);

        }
      );


    /* =====================================================
       RESULTS REALTIME
    ===================================================== */

    const unsubscribeResults =
      onSnapshot(
        collection(db, "results"),

        (snapshot) => {

          results =
            snapshot.docs.map(
              (item) => ({
                id: item.id,
                ...item.data(),
              })
            );

          calculateDashboard();

        },

        (error) => {

          console.error(
            "Results realtime error:",
            error
          );

        }
      );


    /* =====================================================
       CLASSES REALTIME
    ===================================================== */

    const unsubscribeClasses =
      onSnapshot(
        collection(db, "classes"),

        (snapshot) => {

          classes =
            snapshot.docs.map(
              (item) => ({
                id: item.id,
                ...item.data(),
              })
            );

          calculateDashboard();

        },

        (error) => {

          console.error(
            "Classes realtime error:",
            error
          );

        }
      );


    /* =====================================================
       SUBJECTS REALTIME
    ===================================================== */

    const unsubscribeSubjects =
      onSnapshot(
        collection(db, "subjects"),

        (snapshot) => {

          subjects =
            snapshot.docs.map(
              (item) => ({
                id: item.id,
                ...item.data(),
              })
            );

          calculateDashboard();

        },

        (error) => {

          console.error(
            "Subjects realtime error:",
            error
          );

        }
      );


    /* =====================================================
       ACADEMIC SESSION REALTIME
    ===================================================== */

    const unsubscribeSessions =
      onSnapshot(
        query(
          collection(
            db,
            "academicSessions"
          ),
          where(
            "active",
            "==",
            true
          ),
          limit(1)
        ),

        (snapshot) => {

          sessions =
            snapshot.docs.map(
              (item) => ({
                id: item.id,
                ...item.data(),
              })
            );

          calculateDashboard();

        },

        (error) => {

          console.error(
            "Academic session realtime error:",
            error
          );

        }
      );


    /* =====================================================
       FEE SETTINGS REALTIME

       This is the important connection.
    ===================================================== */

    const unsubscribeFeeSettings =
      onSnapshot(

        collection(
          db,
          "settings"
        ),

        (snapshot) => {

          const feeDoc =
            snapshot.docs.find(
              (item) =>
                item.id ===
                "feeSettings"
            );


          feeSettings =
            feeDoc
              ? feeDoc.data()
              : {};


          calculateDashboard();

        },

        (error) => {

          console.error(
            "Fee settings realtime error:",
            error
          );

        }

      );


    /* =====================================================
       CLEANUP
    ===================================================== */

    return () => {

      unsubscribeStudents();

      unsubscribeResults();

      unsubscribeClasses();

      unsubscribeSubjects();

      unsubscribeSessions();

      unsubscribeFeeSettings();

    };

  }, []);


  /* =======================================================
     MANUAL REFRESH
  ======================================================= */

  const handleRefresh = () => {

    setRefreshing(true);

    /*
      onSnapshot already keeps the dashboard live.
      This small state update gives the user
      visual confirmation that refresh was requested.
    */

    window.setTimeout(
      () => setRefreshing(false),
      700
    );

  };


  /* =======================================================
     LOGOUT
  ======================================================= */

  async function logout() {

    if (
      !window.confirm(
        "Are you sure you want to logout?"
      )
    ) {
      return;
    }


    try {

      await signOut(auth);

      navigate(
        "/admin-login",
        {
          replace: true,
        }
      );

    } catch (error) {

      console.error(
        "Logout error:",
        error
      );

    }

  }


  /* =======================================================
     CALCULATIONS
  ======================================================= */

  const resultProgress =
    data.results
      ? Math.round(
          (
            data.publishedResults /
            data.results
          ) * 100
        )
      : 0;


  const feeTotal =
    data.feeExpected;


  const feeProgress =
    feeTotal
      ? Math.round(
          (
            data.feeCollected /
            feeTotal
          ) * 100
        )
      : 0;


  const safeFeeProgress =
    Math.min(
      Math.max(
        feeProgress,
        0
      ),
      100
    );


  /* =======================================================
     RESULT STATUS
  ======================================================= */

  const statusOf = (result) => {

    const status =
      String(
        result?.publishStatus ??
          result?.resultStatus ??
          ""
      ).toUpperCase();


    if (
      status === "PUBLISHED" ||
      result?.published === true ||
      result?.publish === true
    ) {

      return [
        "Published",
        "bg-emerald-50 text-emerald-700",
        <CheckCircle2
          size={14}
          key="published"
        />,
      ];

    }


    if (
      status === "VERIFIED"
    ) {

      return [
        "Verified",
        "bg-blue-50 text-blue-700",
        <CheckCircle2
          size={14}
          key="verified"
        />,
      ];

    }


    return [
      "Draft",
      "bg-amber-50 text-amber-700",
      <Clock3
        size={14}
        key="draft"
      />,
    ];

  };


  /* =======================================================
     RESULT TIME
  ======================================================= */

  const resultTime = (result) => {

    const timestamp =
      result?.updatedAt ??
        result?.createdAt;


    if (
      timestamp?.toDate
    ) {

      return timestamp
        .toDate()
        .toLocaleString(
          "en-IN",
          {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          }
        );

    }


    return "Recently updated";

  };


  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {

    return (

      <AdminLayout>

        <div className="min-h-[70vh] flex items-center justify-center">

          <div className="text-center">

            <div className="w-12 h-12 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto" />

            <p className="mt-4 text-sm text-gray-500">

              Connecting live school data...

            </p>

          </div>

        </div>

      </AdminLayout>

    );

  }


  /* =======================================================
     UI
  ======================================================= */

  return (

    <AdminLayout>

      <div className="max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">


        {/* =================================================
           HERO
        ================================================= */}

        <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-slate-950 via-emerald-950 to-green-700 text-white shadow-xl">

          <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-emerald-400/20 blur-3xl" />

          <div className="absolute -left-20 -bottom-32 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl" />


          <div className="relative p-6 sm:p-8">

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

              <div>

                <div className="flex items-center gap-2">

                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-3 py-1 text-xs font-bold">

                    <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />

                    LIVE ERP

                  </span>


                  <span className="text-xs text-emerald-100">

                    Firebase Connected

                  </span>

                </div>


                <h1 className="text-3xl sm:text-4xl font-black mt-4">

                  Good morning, Admin

                </h1>


                <p className="text-emerald-100 mt-2 max-w-2xl">

                  Your school operations are connected
                  to live academic, student, result and
                  fee data.

                </p>


                <div className="flex flex-wrap gap-3 mt-5">

                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm">

                    <CalendarDays size={16} />

                    {data.activeSession?.name ||
                      "No active session"}

                  </span>


                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm">

                    <Users size={16} />

                    {data.activeStudents} active students

                  </span>


                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm">

                    <BookMarked size={16} />

                    {data.configuredClasses} classes

                  </span>

                </div>

              </div>


              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center justify-center gap-2 bg-white text-green-800 px-5 py-3 rounded-xl font-bold hover:bg-green-50 disabled:opacity-60 shadow-lg"
              >

                <RefreshCcw
                  size={18}
                  className={
                    refreshing
                      ? "animate-spin"
                      : ""
                  }
                />

                {refreshing
                  ? "Refreshing..."
                  : "Refresh"}

              </button>

            </div>

          </div>

        </section>


        {/* =================================================
           METRICS
        ================================================= */}

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

          <Metric
            icon={
              <Users size={21} />
            }
            title="Students"
            value={data.students}
            helper={`${data.activeStudents} active`}
            cls="bg-blue-50 text-blue-700"
            onClick={() =>
              navigate("/students")
            }
          />


          <Metric
            icon={
              <FileText size={21} />
            }
            title="Results Pending"
            value={data.pendingResults}
            helper={`${data.publishedResults} published`}
            cls="bg-amber-50 text-amber-700"
            onClick={() =>
              navigate("/view-results")
            }
          />


          <Metric
            icon={
              <GraduationCap
                size={21}
              />
            }
            title="Results Published"
            value={`${resultProgress}%`}
            helper={`${data.publishedResults} of ${data.results}`}
            cls="bg-emerald-50 text-emerald-700"
            onClick={() =>
              navigate("/view-results")
            }
          />


          <Metric
            icon={
              <IndianRupee
                size={21}
              />
            }
            title="Fee Due"
            value={`₹${data.feeDue.toLocaleString("en-IN")}`}
            helper={`₹${data.feeCollected.toLocaleString("en-IN")} collected`}
            cls="bg-red-50 text-red-700"
            onClick={() =>
              navigate("/fee-management")
            }
          />

        </section>


        {/* =================================================
           QUICK OPERATIONS
        ================================================= */}

        <section className="grid lg:grid-cols-[1.35fr_.65fr] gap-6">


          <div className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6">

            <div className="mb-6">

              <p className="text-xs font-bold uppercase tracking-wider text-green-700">

                Daily workflow

              </p>


              <h2 className="text-2xl font-bold text-gray-900 mt-1">

                Complete work in fewer steps

              </h2>


              <p className="text-sm text-gray-500 mt-1">

                Important administrative actions are
                available directly from the dashboard.

              </p>

            </div>


            <div className="grid sm:grid-cols-2 gap-4">


              <Workflow
                n="01"
                icon={
                  <Settings2
                    size={21}
                  />
                }
                title="Academic Setup"
                text="Manage session, classes and subject distribution."
                action="Open Configuration"
                onClick={() =>
                  navigate(
                    "/academic-configuration"
                  )
                }
              />


              <Workflow
                n="02"
                icon={
                  <UserPlus
                    size={21}
                  />
                }
                title="Add Student"
                text="Register a new student record."
                action="Add Student"
                onClick={() =>
                  navigate(
                    "/add-student"
                  )
                }
              />


              <Workflow
                n="03"
                icon={
                  <FileText
                    size={21}
                  />
                }
                title="Enter Results"
                text="Enter marks using the subjects configured for the student's class."
                action="Add Result"
                onClick={() =>
                  navigate(
                    "/add-result"
                  )
                }
              />


              <Workflow
                n="04"
                icon={
                  <WalletCards
                    size={21}
                  />
                }
                title="Manage Fees"
                text="View student dues, collect payments and maintain payment history."
                action="Open Fees"
                onClick={() =>
                  navigate(
                    "/fee-management"
                  )
                }
              />

            </div>

          </div>


          {/* SYSTEM SNAPSHOT */}

          <div className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6">

            <div className="flex items-center gap-3 mb-6">

              <div className="w-10 h-10 rounded-xl bg-green-50 text-green-700 flex items-center justify-center">

                <BookOpen
                  size={20}
                />

              </div>


              <div>

                <h2 className="font-bold text-gray-900">

                  System Snapshot

                </h2>


                <p className="text-xs text-gray-500">

                  Live overview

                </p>

              </div>

            </div>


            <Snapshot
              label="Academic Session"
              value={
                data.activeSession?.name ||
                "Not configured"
              }
              ok={
                !!data.activeSession
              }
            />


            <Snapshot
              label="Classes"
              value={`${data.configuredClasses} configured`}
              ok={
                data.configuredClasses > 0
              }
            />


            <Snapshot
              label="Subjects"
              value={`${data.configuredSubjects} configured`}
              ok={
                data.configuredSubjects > 0
              }
            />


            <Snapshot
              label="Result Workflow"
              value={
                data.pendingResults
                  ? `${data.pendingResults} pending`
                  : "Up to date"
              }
              ok={
                !data.pendingResults
              }
            />


            <Snapshot
              label="Fee Collection"
              value={`${safeFeeProgress}% collected`}
              ok={
                safeFeeProgress >= 80
              }
            />


            <button
              type="button"
              onClick={() =>
                navigate(
                  "/view-results"
                )
              }
              className="mt-5 w-full flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:border-green-300 hover:text-green-700"
            >

              Open Result Center

              <ArrowRight
                size={17}
              />

            </button>

          </div>

        </section>


        {/* =================================================
           RECENT RESULTS + FEE
        ================================================= */}

        <section className="grid lg:grid-cols-[1.35fr_.65fr] gap-6">


          {/* RECENT RESULTS */}

          <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">

            <div className="p-6 flex items-center justify-between gap-4 border-b border-gray-100">

              <div>

                <h2 className="text-xl font-bold text-gray-900">

                  Recent Results

                </h2>


                <p className="text-sm text-gray-500 mt-1">

                  Latest activity from the result center.

                </p>

              </div>


              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/view-results"
                  )
                }
                className="text-sm font-semibold text-green-700 inline-flex items-center gap-1"
              >

                View all

                <ChevronRight
                  size={16}
                />

              </button>

            </div>


            {
              data.recentResults.length ===
              0 ? (

                <div className="p-8 text-center">

                  <FileText
                    size={28}
                    className="mx-auto text-gray-300"
                  />

                  <p className="mt-3 font-semibold text-gray-700">

                    No results yet

                  </p>


                  <p className="text-sm text-gray-500 mt-1">

                    Add the first result to see activity here.

                  </p>

                </div>

              ) : (

                <div className="divide-y divide-gray-100">

                  {
                    data.recentResults.map(
                      (result) => {

                        const [
                          label,
                          cls,
                          icon,
                        ] =
                          statusOf(
                            result
                          );


                        return (

                          <button
                            key={
                              result.id
                            }
                            type="button"
                            onClick={() =>
                              navigate(
                                `/result/${result.id}`
                              )
                            }
                            className="w-full text-left p-5 hover:bg-gray-50 flex items-center justify-between gap-4"
                          >

                            <div className="min-w-0">

                              <p className="font-semibold text-gray-900 truncate">

                                {
                                  result.studentName ||
                                  result.name ||
                                  "Student"
                                }

                              </p>


                              <p className="text-xs text-gray-500 mt-1">

                                {
                                  result.enrollmentNo ||
                                  "No enrollment"
                                }

                                {" • "}

                                {
                                  result.className ||
                                  "Class"
                                }

                                {
                                  result.section
                                    ? `-${result.section}`
                                    : ""
                                }

                              </p>


                              <p className="text-xs text-gray-400 mt-1">

                                {
                                  resultTime(
                                    result
                                  )
                                }

                              </p>

                            </div>


                            <div className="flex items-center gap-3 shrink-0">

                              <span
                                className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${cls}`}
                              >

                                {icon}

                                {label}

                              </span>


                              <ChevronRight
                                size={18}
                                className="text-gray-400"
                              />

                            </div>

                          </button>

                        );

                      }
                    )
                  }

                </div>

              )
            }

          </div>


          {/* FEE CARD */}

          <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 rounded-3xl text-white p-6 shadow-sm">

            <div className="absolute -right-20 -top-20 w-52 h-52 bg-emerald-500/10 rounded-full blur-3xl" />


            <div className="relative">

              <p className="text-emerald-300 text-xs font-bold uppercase tracking-wider">

                Finance overview

              </p>


              <h2 className="text-2xl font-bold mt-2">

                Fee Collection

              </h2>


              <p className="text-xs text-slate-400 mt-1">

                Live calculation from current fee settings

              </p>


              <div className="mt-7">

                <div className="flex justify-between text-sm">

                  <span className="text-slate-300">

                    Collected

                  </span>


                  <span className="font-semibold">

                    {safeFeeProgress}%

                  </span>

                </div>


                <div className="h-2 bg-slate-700 rounded-full mt-3 overflow-hidden">

                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                    style={{
                      width:
                        `${safeFeeProgress}%`,
                    }}
                  />

                </div>

              </div>


              <div className="grid grid-cols-2 gap-3 mt-6">


                <Finance
                  label="Expected"
                  value={`₹${data.feeExpected.toLocaleString("en-IN")}`}
                />


                <Finance
                  label="Collected"
                  value={`₹${data.feeCollected.toLocaleString("en-IN")}`}
                />


                <Finance
                  label="Due"
                  value={`₹${data.feeDue.toLocaleString("en-IN")}`}
                />


                <Finance
                  label="Students"
                  value={data.activeStudents}
                />

              </div>


              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/fee-management"
                  )
                }
                className="mt-5 w-full rounded-xl bg-white text-slate-900 py-3 font-semibold hover:bg-slate-100 inline-flex items-center justify-center gap-2"
              >

                Manage Fees

                <ArrowRight
                  size={17}
                />

              </button>

            </div>

          </div>

        </section>


        {/* =================================================
           FOOTER
        ================================================= */}

        <div className="flex items-center justify-between text-sm text-gray-500 px-1">

          <span>

            School ERP • Live Firebase data

          </span>


          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 hover:text-red-600 font-medium"
          >

            <LogOut
              size={16}
            />

            Logout

          </button>

        </div>


      </div>

    </AdminLayout>

  );

}


/* =========================================================
   METRIC
========================================================= */

function Metric({
  icon,
  title,
  value,
  helper,
  cls,
  onClick,
}) {

  return (

    <button
      type="button"
      onClick={onClick}
      className="text-left bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-green-200 transition group"
    >

      <div className="flex items-start justify-between gap-4">

        <div>

          <p className="text-sm font-medium text-gray-500">

            {title}

          </p>


          <p className="text-2xl font-bold text-gray-900 mt-2">

            {value}

          </p>


          <p className="text-xs text-gray-400 mt-1">

            {helper}

          </p>

        </div>


        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${cls}`}
        >

          {icon}

        </div>

      </div>


      <div className="mt-4 text-xs font-semibold text-gray-400 group-hover:text-green-700 flex items-center gap-1">

        Open

        <ArrowRight
          size={13}
        />

      </div>

    </button>

  );

}


/* =========================================================
   WORKFLOW
========================================================= */

function Workflow({
  n,
  icon,
  title,
  text,
  action,
  onClick,
  alert = false,
}) {

  return (

    <div
      className={`rounded-2xl border p-5 ${
        alert
          ? "border-amber-300 bg-amber-50/50"
          : "border-gray-200 bg-gray-50/50"
      }`}
    >

      <div className="flex items-start justify-between">

        <div className="flex items-center gap-3">

          <span className="text-xs font-bold text-gray-400">

            {n}

          </span>


          <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 text-green-700 flex items-center justify-center">

            {icon}

          </div>

        </div>


        {alert && (

          <span className="text-[11px] font-bold uppercase text-amber-700">

            Action needed

          </span>

        )}

      </div>


      <h3 className="font-bold text-gray-900 mt-4">

        {title}

      </h3>


      <p className="text-sm text-gray-500 mt-1 min-h-[40px]">

        {text}

      </p>


      <button
        type="button"
        onClick={onClick}
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-green-700"
      >

        {action}

        <ArrowRight
          size={15}
        />

      </button>

    </div>

  );

}


/* =========================================================
   SNAPSHOT
========================================================= */

function Snapshot({
  label,
  value,
  ok,
}) {

  return (

    <div className="flex items-center justify-between gap-4 py-4 border-b border-gray-100">

      <div>

        <p className="text-sm font-semibold text-gray-800">

          {label}

        </p>


        <p className="text-xs text-gray-500 mt-1">

          {value}

        </p>

      </div>


      {
        ok ? (

          <CheckCircle2
            size={17}
            className="text-emerald-600"
          />

        ) : (

          <AlertCircle
            size={17}
            className="text-amber-600"
          />

        )
      }

    </div>

  );

}


/* =========================================================
   FINANCE
========================================================= */

function Finance({
  label,
  value,
}) {

  return (

    <div className="rounded-xl bg-white/10 border border-white/10 p-4">

      <p className="text-xs text-slate-400">

        {label}

      </p>


      <p className="font-bold mt-1">

        {value}

      </p>

    </div>

  );

}


export default AdminDashboard;