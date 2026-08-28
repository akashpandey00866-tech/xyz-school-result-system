import { useEffect, useMemo, useRef, useState } from "react";
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
  CalendarCheck2,
  Download,
  Search,
  X,
  ClipboardList,
  TrendingUp,
  ShieldCheck,
  UserCheck,
  UserX,
  Clock4,
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
     ADVANCED DASHBOARD SCROLL MEMORY
     -------------------------------------------------------
     Keeps the user's position when opening another screen
     and coming back with browser Back / app navigation.
  ======================================================= */

  const dashboardScrollKey = "admin-dashboard-scroll-y";

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    let restored = false;

    const restoreScroll = () => {
      if (restored) return;

      const saved = Number(
        window.sessionStorage.getItem(dashboardScrollKey) || 0
      );

      if (Number.isFinite(saved) && saved > 0) {
        window.scrollTo({
          top: saved,
          behavior: "auto",
        });
      }

      restored = true;
    };

    const saveScroll = () => {
      window.sessionStorage.setItem(
        dashboardScrollKey,
        String(Math.max(0, Math.round(window.scrollY)))
      );
    };

    const firstFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(restoreScroll);
    });

    window.addEventListener("scroll", saveScroll, {
      passive: true,
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      saveScroll();
      window.removeEventListener("scroll", saveScroll);
    };
  }, []);

  /* -------------------------------------------------------
     Stable in-page navigation.
     No /attendance route is required.
  ------------------------------------------------------- */

  const openAttendanceOverview = () => {
    const section = document.getElementById(
      "admin-attendance-section"
    );

    if (!section) return;

    window.sessionStorage.setItem(
      dashboardScrollKey,
      String(Math.max(0, Math.round(window.scrollY)))
    );

    section.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const openRoute = (path) => {
    window.sessionStorage.setItem(
      dashboardScrollKey,
      String(Math.max(0, Math.round(window.scrollY)))
    );

    navigate(path);
  };


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
    attendance: {
      totalRecords: 0,
      present: 0,
      absent: 0,
      leave: 0,
      percentage: 0,
      todayRecords: 0,
      todayPresent: 0,
      todayAbsent: 0,
      todayLeave: 0,
      recentActivity: [],
      byClass: [],
      students: [],
    },
    teachers: [],
    attendanceAccess: [],
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
    let attendance = [];
    let teachers = [];
    let attendanceAccess = [];

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
           ATTENDANCE
        ================================================= */

        const attendanceStatus = (item) =>
          String(
            item?.status ??
              item?.attendanceStatus ??
              item?.value ??
              ""
          ).trim().toUpperCase();

        const attendancePresent = attendance.filter(
          (item) => attendanceStatus(item) === "PRESENT"
        ).length;

        const attendanceAbsent = attendance.filter(
          (item) => attendanceStatus(item) === "ABSENT"
        ).length;

        const attendanceLeave = attendance.filter(
          (item) =>
            attendanceStatus(item) === "LEAVE" ||
            attendanceStatus(item) === "L"
        ).length;

        const attendanceCounted =
          attendancePresent + attendanceAbsent + attendanceLeave;

        const attendancePercentage = attendanceCounted
          ? Math.round((attendancePresent / attendanceCounted) * 10000) / 100
          : 0;

        const todayKey = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date());

        const isTodayAttendance = (item) => {
          const raw =
            item?.date ??
            item?.attendanceDate ??
            item?.dayDate ??
            item?.markedDate;

          if (!raw) return false;

          if (typeof raw?.toDate === "function") {
            return new Intl.DateTimeFormat("en-CA", {
              timeZone: "Asia/Kolkata",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }).format(raw.toDate()) === todayKey;
          }

          const parsed = new Date(raw);
          if (!Number.isNaN(parsed.getTime())) {
            return new Intl.DateTimeFormat("en-CA", {
              timeZone: "Asia/Kolkata",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }).format(parsed) === todayKey;
          }

          // Attendance records currently store dates as YYYY-MM-DD.
          return String(raw).slice(0, 10) === todayKey;
        };

        const todayAttendance = attendance.filter(isTodayAttendance);

        const todayPresent = todayAttendance.filter(
          (item) => attendanceStatus(item) === "PRESENT"
        ).length;

        const todayAbsent = todayAttendance.filter(
          (item) => attendanceStatus(item) === "ABSENT"
        ).length;

        const todayLeave = todayAttendance.filter(
          (item) =>
            attendanceStatus(item) === "LEAVE" ||
            attendanceStatus(item) === "L"
        ).length;

        const teacherMap = new Map(
          teachers.map((teacher) => [
            teacher.authUid ?? teacher.id,
            teacher.name ?? teacher.email ?? "Teacher",
          ])
        );

        const recentAttendance = [...attendance]
          .sort(
            (a, b) =>
              getTimestamp(b?.updatedAt ?? b?.createdAt ?? b?.timestamp) -
              getTimestamp(a?.updatedAt ?? a?.createdAt ?? a?.timestamp)
          )
          .slice(0, 10)
          .map((item) => ({
            ...item,
            displayTeacher:
              item.markedByName ??
              item.teacherName ??
              teacherMap.get(item.markedBy) ??
              teacherMap.get(item.teacherUid) ??
              "Teacher",
          }));

        const classAttendanceMap = new Map();

        attendance.forEach((item) => {
          const className = String(
            item?.className ?? item?.class ?? "Unknown"
          ).trim();

          const section = String(item?.section ?? "").trim();
          const key = `${className}|||${section}`;

          if (!classAttendanceMap.has(key)) {
            classAttendanceMap.set(key, {
              className,
              section,
              present: 0,
              absent: 0,
              leave: 0,
              total: 0,
            });
          }

          const row = classAttendanceMap.get(key);
          const status = attendanceStatus(item);

          if (status === "PRESENT") row.present++;
          else if (status === "ABSENT") row.absent++;
          else if (status === "LEAVE" || status === "L") row.leave++;

          row.total++;
        });

        const attendanceByClass = [...classAttendanceMap.values()]
          .map((row) => ({
            ...row,
            percentage: row.total
              ? Math.round((row.present / row.total) * 10000) / 100
              : 0,
          }))
          .sort((a, b) =>
            `${a.className}-${a.section}`.localeCompare(
              `${b.className}-${b.section}`
            )
          );

        const studentAttendanceMap = new Map();

        attendance.forEach((item) => {
          const studentId =
            item?.studentId ??
            item?.studentUid ??
            item?.studentAccountId ??
            item?.enrollmentNo ??
            item?.studentName;

          if (!studentId) return;

          if (!studentAttendanceMap.has(String(studentId))) {
            studentAttendanceMap.set(String(studentId), {
              studentId,
              studentName: item?.studentName ?? "Student",
              enrollmentNo: item?.enrollmentNo ?? "",
              className: item?.className ?? item?.class ?? "",
              section: item?.section ?? "",
              present: 0,
              absent: 0,
              leave: 0,
              total: 0,
            });
          }

          const row = studentAttendanceMap.get(String(studentId));
          const status = attendanceStatus(item);

          if (status === "PRESENT") row.present++;
          else if (status === "ABSENT") row.absent++;
          else if (status === "LEAVE" || status === "L") row.leave++;

          row.total++;
        });

        const attendanceStudents = [...studentAttendanceMap.values()]
          .map((row) => ({
            ...row,
            percentage: row.total
              ? Math.round((row.present / row.total) * 10000) / 100
              : 0,
          }))
          .sort((a, b) =>
            String(a.studentName).localeCompare(String(b.studentName))
          );

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

          // Attendance — keep the calculated values in the main
          // dashboard state so the Admin UI receives realtime data.
          attendance: {
            totalRecords: attendanceCounted,
            present: attendancePresent,
            absent: attendanceAbsent,
            leave: attendanceLeave,
            percentage: attendancePercentage,
            todayRecords: todayAttendance.length,
            todayPresent,
            todayAbsent,
            todayLeave,
            recentActivity: recentAttendance,
            byClass: attendanceByClass,
            students: attendanceStudents,
          },

          // These were being listened to in realtime but were not being
          // copied into state, which made the Admin attendance panel see
          // empty/default data.
          teachers: [...teachers],
          attendanceAccess: [...attendanceAccess],

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
       TEACHERS REALTIME
    ===================================================== */

    const unsubscribeTeachers =
      onSnapshot(
        collection(db, "teachers"),
        (snapshot) => {
          teachers = snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }));
          calculateDashboard();
        },
        (error) => {
          console.error("Teachers realtime error:", error);
        }
      );

    /* =====================================================
       ATTENDANCE REALTIME
    ===================================================== */

    const unsubscribeAttendance =
      onSnapshot(
        collection(db, "attendance"),
        (snapshot) => {
          attendance = snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }));
          calculateDashboard();
        },
        (error) => {
          console.error("Attendance realtime error:", error);
        }
      );

    /* =====================================================
       ATTENDANCE ACCESS REALTIME
    ===================================================== */

    const unsubscribeAttendanceAccess =
      onSnapshot(
        collection(db, "attendanceAccess"),
        (snapshot) => {
          attendanceAccess = snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }));
          calculateDashboard();
        },
        (error) => {
          console.error("Attendance access realtime error:", error);
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
      unsubscribeTeachers();
      unsubscribeAttendance();
      unsubscribeAttendanceAccess();

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

  const attendanceData = data?.attendance ?? {
    totalRecords: 0,
    present: 0,
    absent: 0,
    leave: 0,
    percentage: 0,
    todayRecords: 0,
    todayPresent: 0,
    todayAbsent: 0,
    todayLeave: 0,
    recentActivity: [],
    byClass: [],
    students: [],
  };

  const teachersData = Array.isArray(data?.teachers) ? data.teachers : [];
  const attendanceAccessData = Array.isArray(data?.attendanceAccess)
    ? data.attendanceAccess
    : [];

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
            onClick={() => openRoute("/students")}
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
              openRoute("/view-results")
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
              openRoute("/view-results")
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
              openRoute("/fee-management")
            }
          />

        </section>

        {/* =================================================
           ATTENDANCE OVERVIEW
        ================================================= */}

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Metric
            icon={<CalendarCheck2 size={21} />}
            title="Attendance Today"
            value={attendanceData.todayRecords}
            helper={`${attendanceData.todayPresent} present • ${attendanceData.todayAbsent} absent`}
            cls="bg-indigo-50 text-indigo-700"
            onClick={openAttendanceOverview}
          />

          <Metric
  icon={<UserCheck size={21} />}
  title="Present"
  value={attendanceData.present}
  helper={`${attendanceData.percentage}% overall attendance`}
  cls="bg-emerald-50 text-emerald-700"
  onClick={() => {
    document
      .getElementById("admin-attendance-section")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }}
/>

          <Metric
            icon={<UserX size={21} />}
            title="Absent"
            value={attendanceData.absent}
            helper={`${attendanceData.leave} leave`}
            cls="bg-red-50 text-red-700"
            onClick={openAttendanceOverview}
          />

          <Metric
            icon={<TrendingUp size={21} />}
            title="Attendance %"
            value={`${attendanceData.percentage}%`}
            helper={`${attendanceData.totalRecords} recorded entries`}
            cls="bg-purple-50 text-purple-700"
            onClick={openAttendanceOverview}
          />
        </section>
<div id="admin-attendance-section" className="scroll-mt-28">
  <AttendanceAdminPanel
    attendance={attendanceData}
    teachers={teachersData}
    attendanceAccess={attendanceAccessData}
    onOpenAttendance={openAttendanceOverview}
  />
</div>

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
                  openRoute("/academic-configuration")
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
                  openRoute("/add-student")
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
                  openRoute("/add-result")
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
                  openRoute("/fee-management")
                }
              />

              {/* =================================================
                 TEACHER MANAGEMENT
                 Added only — existing code remains unchanged
              ================================================= */}
              <Workflow
                n="05"
                icon={
                  <Users
                    size={21}
                  />
                }
                title="Teacher Management"
                text="Add, approve and manage school teachers."
                action="Open Teacher Management"
                onClick={() =>
                  openRoute("/teacher-management")
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
                openRoute("/view-results")
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

          <div className="bg-white border border-gray-200 rounded-[28px] shadow-sm overflow-hidden scroll-mt-28">

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
                  openRoute("/view-results")
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
                  openRoute("/fee-management")
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
   ADMIN ATTENDANCE PANEL
========================================================= */

function AttendanceAdminPanel({
  attendance = {
    totalRecords: 0,
    present: 0,
    absent: 0,
    leave: 0,
    percentage: 0,
    todayRecords: 0,
    todayPresent: 0,
    todayAbsent: 0,
    todayLeave: 0,
    recentActivity: [],
    byClass: [],
    students: [],
  },
  teachers = [],
  attendanceAccess = [],
  onOpenAttendance,
}) {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("ALL");

  const classes = useMemo(() => {
    const values = new Set(
      (attendance.byClass ?? []).map(
        (row) =>
          `${row.className}${row.section ? `-${row.section}` : ""}`
      )
    );

    return [...values].sort((a, b) => a.localeCompare(b));
  }, [attendance.byClass]);

  const filteredClasses = useMemo(() => {
    const q = normalize(search);

    return (attendance.byClass ?? []).filter((row) => {
      const label =
        `${row.className}${row.section ? `-${row.section}` : ""}`;

      const matchesClass =
        classFilter === "ALL" || label === classFilter;

      const matchesSearch =
        !q ||
        normalize(row.className).includes(q) ||
        normalize(row.section).includes(q);

      return matchesClass && matchesSearch;
    });
  }, [attendance.byClass, classFilter, search]);

  const filteredStudents = useMemo(() => {
    const q = normalize(search);

    return (attendance.students ?? []).filter((student) => {
      if (!q) return true;

      return (
        normalize(student.studentName).includes(q) ||
        normalize(student.enrollmentNo).includes(q) ||
        normalize(student.className).includes(q) ||
        normalize(student.section).includes(q)
      );
    });
  }, [attendance.students, search]);

  const downloadCsv = (rows, filename) => {
    if (!rows.length) {
      window.alert("No attendance data available for export.");
      return;
    }

    const headers = [
      "Student Name",
      "Enrollment No",
      "Class",
      "Section",
      "Total Records",
      "Present",
      "Absent",
      "Leave",
      "Attendance %",
    ];

    const csvRows = [
      headers,
      ...rows.map((row) => [
        row.studentName,
        row.enrollmentNo,
        row.className,
        row.section,
        row.total,
        row.present,
        row.absent,
        row.leave,
        `${row.percentage}%`,
      ]),
    ];

    const csv = csvRows
      .map((row) =>
        row
          .map((value) => {
            const text = String(value ?? "");
            return `"${text.replaceAll('"', '""')}"`;
          })
          .join(",")
      )
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  };

  return (
    <section className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CalendarCheck2 size={21} className="text-indigo-600" />
              <h2 className="text-xl font-bold text-gray-900">
                Live Attendance Overview
              </h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                REAL-TIME
              </span>
            </div>

            <p className="text-sm text-gray-500 mt-1">
              Attendance updates from teachers appear here automatically.
              Use the search/filter tools below for class and student-level review.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                downloadCsv(
                  filteredStudents,
                  `school-attendance-overall-${new Date()
                    .toISOString()
                    .slice(0, 10)}.csv`
                )
              }
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700"
            >
              <Download size={16} />
              Overall Excel / CSV
            </button>

            <button
              type="button"
              onClick={onOpenAttendance}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-100 bg-indigo-50/50 text-indigo-700 text-sm font-bold hover:bg-indigo-100 hover:border-indigo-200 transition-colors"
            >
              <ClipboardList size={16} />
              Open Attendance Center
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-[1fr_220px] gap-3 mt-5">
          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search student, enrollment, class or section..."
              className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <select
            value={classFilter}
            onChange={(event) => setClassFilter(event.target.value)}
            className="w-full py-3 px-3 rounded-xl border border-gray-200 bg-white outline-none"
          >
            <option value="ALL">All Classes</option>
            {classes.map((className) => (
              <option key={className} value={className}>
                Class {className}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniAttendance
          label="Today Present"
          value={attendance.todayPresent}
          cls="bg-emerald-50 text-emerald-700"
        />

        <MiniAttendance
          label="Today Absent"
          value={attendance.todayAbsent}
          cls="bg-red-50 text-red-700"
        />

        <MiniAttendance
          label="Today Leave"
          value={attendance.todayLeave}
          cls="bg-amber-50 text-amber-700"
        />

        <MiniAttendance
          label="Overall"
          value={`${attendance.percentage}%`}
          cls="bg-indigo-50 text-indigo-700"
        />
      </div>

      <div className="px-6 pb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-gray-900">
              Class-wise Attendance
            </h3>
            <p className="text-xs text-gray-500">
              {filteredClasses.length} class/section records
            </p>
          </div>

          {search && (
            <span className="text-xs font-semibold text-gray-500">
              Searching: {search}
            </span>
          )}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-100">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-bold text-gray-600">
                  Class
                </th>
                <th className="text-center px-4 py-3 font-bold text-gray-600">
                  Present
                </th>
                <th className="text-center px-4 py-3 font-bold text-gray-600">
                  Absent
                </th>
                <th className="text-center px-4 py-3 font-bold text-gray-600">
                  Leave
                </th>
                <th className="text-center px-4 py-3 font-bold text-gray-600">
                  %
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredClasses.length ? (
                filteredClasses.map((row) => (
                  <tr key={`${row.className}-${row.section}`}>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {row.className}
                      {row.section ? `-${row.section}` : ""}
                    </td>
                    <td className="px-4 py-3 text-center text-emerald-700 font-semibold">
                      {row.present}
                    </td>
                    <td className="px-4 py-3 text-center text-red-700 font-semibold">
                      {row.absent}
                    </td>
                    <td className="px-4 py-3 text-center text-amber-700 font-semibold">
                      {row.leave}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-indigo-700">
                      {row.percentage}%
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-gray-500"
                  >
                    No attendance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="px-6 pb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-gray-900">
              Student Overall Attendance
            </h3>
            <p className="text-xs text-gray-500">
              Searchable student-level calculation
            </p>
          </div>

          <span className="text-xs font-semibold text-gray-500">
            {filteredStudents.length} students
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-100">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-bold text-gray-600">
                  Student
                </th>
                <th className="text-left px-4 py-3 font-bold text-gray-600">
                  Class
                </th>
                <th className="text-center px-4 py-3 font-bold text-gray-600">
                  Total
                </th>
                <th className="text-center px-4 py-3 font-bold text-gray-600">
                  P
                </th>
                <th className="text-center px-4 py-3 font-bold text-gray-600">
                  A
                </th>
                <th className="text-center px-4 py-3 font-bold text-gray-600">
                  L
                </th>
                <th className="text-center px-4 py-3 font-bold text-gray-600">
                  %
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredStudents.slice(0, 100).map((student) => (
                <tr key={String(student.studentId)}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">
                      {student.studentName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {student.enrollmentNo || "No enrollment"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {student.className}
                    {student.section ? `-${student.section}` : ""}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {student.total}
                  </td>
                  <td className="px-4 py-3 text-center text-emerald-700 font-semibold">
                    {student.present}
                  </td>
                  <td className="px-4 py-3 text-center text-red-700 font-semibold">
                    {student.absent}
                  </td>
                  <td className="px-4 py-3 text-center text-amber-700 font-semibold">
                    {student.leave}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-indigo-700">
                    {student.percentage}%
                  </td>
                </tr>
              ))}

              {!filteredStudents.length && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-gray-500"
                  >
                    No student attendance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredStudents.length > 100 && (
          <p className="text-xs text-gray-400 mt-3">
            Showing first 100 students. Use the search field to narrow the list
            before exporting.
          </p>
        )}
      </div>

      <div className="px-6 pb-6">
        <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-600" />
            <h3 className="font-bold text-gray-900">
              Attendance Access Activity
            </h3>
          </div>

          <p className="text-xs text-gray-500 mt-1">
            {attendanceAccess.length} access records currently available.
          </p>

          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                label: "Teachers",
                value: teachers.length,
                icon: <Users size={16} />,
              },
              {
                label: "Class Teachers",
                value: teachers.filter(
                  (teacher) =>
                    teacher.isClassTeacher === true
                ).length,
                icon: <UserCheck size={16} />,
              },
              {
                label: "Active Access",
                value: attendanceAccess.filter(
                  (access) =>
                    String(access.status ?? "").toUpperCase() ===
                    "ACTIVE"
                ).length,
                icon: <ShieldCheck size={16} />,
              },
              {
                label: "Revoked",
                value: attendanceAccess.filter(
                  (access) =>
                    String(access.status ?? "").toUpperCase() ===
                    "REVOKED"
                ).length,
                icon: <Clock4 size={16} />,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-white rounded-xl border border-gray-100 p-4"
              >
                <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold">
                  {item.icon}
                  {item.label}
                </div>
                <p className="text-xl font-black text-gray-900 mt-2">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MiniAttendance({ label, value, cls }) {
  return (
    <div className={`rounded-2xl p-4 ${cls}`}>
      <p className="text-xs font-semibold opacity-75">
        {label}
      </p>
      <p className="text-2xl font-black mt-1">
        {value}
      </p>
    </div>
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
  const accentText =
    String(cls || "").match(/text-[a-z]+-\\d+/)?.[0] ||
    "text-green-700";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open ${title}`}
      className="group relative w-full text-left overflow-hidden bg-gradient-to-br from-white via-white to-gray-50 border border-gray-200 rounded-3xl p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-green-300 active:scale-[0.985] transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-200"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-green-100/50 blur-2xl transition-transform duration-500 group-hover:scale-150" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={`text-sm font-bold ${accentText}`}>
            {title}
          </p>

          <p className="text-2xl font-black text-gray-900 mt-2">
            {value}
          </p>

          <p className="text-xs text-gray-500 mt-1">
            {helper}
          </p>
        </div>

        <div
          className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${cls} shadow-sm ring-1 ring-black/5 transition-transform duration-300 group-hover:scale-110`}
        >
          {icon}
        </div>
      </div>

      <div className={`mt-4 text-xs font-bold ${accentText} flex items-center gap-1`}>
        Open {title}
        <ArrowRight
          size={14}
          className="transition-transform duration-200 group-hover:translate-x-1"
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
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open ${title}`}
      className={`group w-full text-left rounded-2xl border p-5 transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-green-200 ${
        alert
          ? "border-amber-300 bg-amber-50/50 hover:border-amber-400"
          : "border-gray-200 bg-gray-50/50 hover:border-green-300 hover:bg-white"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black text-gray-400">
            {n}
          </span>

          <div
            className={`w-11 h-11 rounded-xl bg-white border flex items-center justify-center shadow-sm ${
              alert
                ? "border-amber-200 text-amber-700"
                : "border-green-100 text-green-700"
            }`}
          >
            {icon}
          </div>
        </div>

        {alert && (
          <span className="text-[11px] font-black uppercase tracking-wide text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
            Action needed
          </span>
        )}
      </div>

      <h3
        className={`font-black mt-4 ${
          alert ? "text-amber-800" : "text-green-800"
        }`}
      >
        {title}
      </h3>

      <p className="text-sm text-gray-500 mt-1 min-h-[40px]">
        {text}
      </p>

      <div
        className={`mt-4 inline-flex items-center gap-2 text-sm font-bold ${
          alert ? "text-amber-700" : "text-green-700"
        }`}
      >
        {action}
        <ArrowRight
          size={15}
          className="transition-transform duration-200 group-hover:translate-x-1"
        />
      </div>
    </button>
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