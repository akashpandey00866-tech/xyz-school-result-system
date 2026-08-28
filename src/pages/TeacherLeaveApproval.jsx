import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  query,
  limit,
  where,
} from "firebase/firestore";

import {
  onAuthStateChanged,
} from "firebase/auth";

import {
  auth,
  db,
} from "../config/firebase";

import TeacherLayout from "../layouts/TeacherLayout";

/* =========================================================
   THEME
========================================================= */

const THEMES = {
  emerald: {
    primary:
      "#059669",

    dark:
      "#064e3b",

    soft:
      "#ecfdf5",

    light:
      "#d1fae5",
  },

  blue: {
    primary:
      "#2563eb",

    dark:
      "#1e3a8a",

    soft:
      "#eff6ff",

    light:
      "#dbeafe",
  },

  violet: {
    primary:
      "#7c3aed",

    dark:
      "#4c1d95",

    soft:
      "#f5f3ff",

    light:
      "#ede9fe",
  },

  orange: {
    primary:
      "#ea580c",

    dark:
      "#7c2d12",

    soft:
      "#fff7ed",

    light:
      "#ffedd5",
  },

  rose: {
    primary:
      "#e11d48",

    dark:
      "#881337",

    soft:
      "#fff1f2",

    light:
      "#ffe4e6",
  },
};

/* =========================================================
   HELPERS
========================================================= */

function normalize(
  value
) {
  return String(
    value ?? ""
  )
    .trim()
    .toLowerCase();
}

function display(
  value,
  fallback = "—"
) {
  const result =
    String(
      value ??
        ""
    ).trim();

  return result ||
    fallback;
}

function getDate(
  value
) {
  if (!value) {
    return "";
  }

  if (
    value &&
    typeof value.toDate ===
      "function"
  ) {
    return value
      .toDate()
      .toISOString()
      .slice(
        0,
        10
      );
  }

  return String(
    value
  ).slice(
    0,
    10
  );
}

function prettyDate(
  value
) {
  const date =
    new Date(
      getDate(
        value
      )
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return display(
      value
    );
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",
    }
  );
}

function daysBetween(
  from,
  to
) {
  if (
    !from ||
    !to
  ) {
    return 0;
  }

  const start =
    new Date(
      `${from}T00:00:00`
    );

  const end =
    new Date(
      `${to}T00:00:00`
    );

  if (
    Number.isNaN(
      start.getTime()
    ) ||
    Number.isNaN(
      end.getTime()
    )
  ) {
    return 0;
  }

  const diff =
    Math.floor(
      (
        end.getTime() -
        start.getTime()
      ) /
        86400000
    );

  return diff >= 0
    ? diff + 1
    : 0;
}

function timestamp(
  value
) {
  if (!value) {
    return 0;
  }

  if (
    value &&
    typeof value.toMillis ===
      "function"
  ) {
    return value.toMillis();
  }

  if (
    value &&
    typeof value.toDate ===
      "function"
  ) {
    return value
      .toDate()
      .getTime();
  }

  const parsed =
    Date.parse(
      String(
        value
      )
    );

  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;
}

function statusBadge(
  status
) {
  const value =
    normalize(
      status
    );

  if (
    value ===
    "approved"
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    value ===
    "rejected"
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (
    value ===
    "cancelled"
  ) {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function statusText(
  status
) {
  const value =
    normalize(
      status
    );

  return value
    ? value.toUpperCase()
    : "PENDING";
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function TeacherLeaveApproval() {
  const navigate =
    useNavigate();

  const [
    authUser,
    setAuthUser,
  ] = useState(null);

  const [
    teacher,
    setTeacher,
  ] = useState(null);

  const [
    requests,
    setRequests,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    updatingId,
    setUpdatingId,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    filter,
    setFilter,
  ] = useState(
    "PENDING"
  );

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    remarkMap,
    setRemarkMap,
  ] = useState({});

  const [
    themeName,
    setThemeName,
  ] = useState(
    () =>
      localStorage.getItem(
        "teacherPortalTheme"
      ) ||
      "emerald"
  );

  const theme =
    THEMES[
      themeName
    ] ||
    THEMES.emerald;

  /* =======================================================
     THEME
  ======================================================= */

  useEffect(
    () => {
      localStorage.setItem(
        "teacherPortalTheme",
        themeName
      );

      document.documentElement.style.setProperty(
        "--teacher-primary",
        theme.primary
      );

      document.documentElement.style.setProperty(
        "--teacher-dark",
        theme.dark
      );

      document.documentElement.style.setProperty(
        "--teacher-soft",
        theme.soft
      );
    },
    [
      themeName,
      theme,
    ]
  );

  /* =======================================================
     AUTH + TEACHER
  ======================================================= */

  useEffect(
    () => {
      const unsubscribe =
        onAuthStateChanged(
          auth,
          async (
            currentUser
          ) => {
            if (
              !currentUser
            ) {
              setAuthUser(
                null
              );

              setTeacher(
                null
              );

              setLoading(
                false
              );

              navigate(
                "/teacher-login",
                {
                  replace:
                    true,
                }
              );

              return;
            }

            try {
              setLoading(
                true
              );

              setError(
                ""
              );

              const teacherRef =
                doc(
                  db,
                  "teachers",
                  currentUser.uid
                );

              const snapshot =
                await getDoc(
                  teacherRef
                );

              if (
                !snapshot.exists()
              ) {
                setError(
                  "Teacher account not found."
                );

                setLoading(
                  false
                );

                return;
              }

              const teacherData =
                {
                  id:
                    snapshot.id,

                  ...snapshot.data(),
                };

              if (
                normalize(
                  teacherData.role
                ) !==
                "teacher"
              ) {
                setError(
                  "This account is not authorized for the teacher portal."
                );

                setLoading(
                  false
                );

                return;
              }

              if (
                normalize(
                  teacherData.accountStatus
                ) ===
                "disabled"
              ) {
                setError(
                  "Your teacher account is disabled."
                );

                setLoading(
                  false
                );

                return;
              }

              setAuthUser(
                currentUser
              );

              setTeacher(
                teacherData
              );
            } catch (
              authError
            ) {
              console.error(
                "Teacher profile:",
                authError
              );

              setError(
                "Unable to load teacher account."
              );
            } finally {
              setLoading(
                false
              );
            }
          }
        );

      return unsubscribe;
    },
    [
      navigate,
    ]
  );

  /* =======================================================
     LEAVE REQUEST REALTIME LISTENER
  ======================================================= */

  useEffect(
    () => {
      if (
        !authUser?.uid ||
        !teacher
      ) {
        return undefined;
      }

      if (
        !teacher.isClassTeacher
      ) {
        setRequests(
          []
        );

        return undefined;
      }

      const className =
        display(
          teacher.classTeacherClassName ||
            teacher.className,
          ""
        );

      const sectionName =
        display(
          teacher.classTeacherSection ||
            teacher.section,
          ""
        );

      const collectionRef =
        collection(
          db,
          "leaveRequests"
        );

      /*
        Query by class and then perform exact
        client-side teacher-scope validation.
      */

      const requestsQuery =
        className
          ? query(
              collectionRef,
              where(
                "className",
                "==",
                className
              ),
              limit(
                500
              )
            )
          : query(
              collectionRef,
              limit(
                500
              )
            );

      const unsubscribe =
        onSnapshot(
          requestsQuery,
          (
            snapshot
          ) => {
            const scoped =
              snapshot.docs
                .map(
                  (
                    item
                  ) => ({
                    id:
                      item.id,

                    ...item.data(),
                  })
                )
                .filter(
                  (
                    item
                  ) => {
                    const sameClass =
                      normalize(
                        item.className
                      ) ===
                      normalize(
                        className
                      );

                    const sameSection =
                      normalize(
                        item.section
                      ) ===
                      normalize(
                        sectionName
                      );

                    return (
                      sameClass &&
                      sameSection
                    );
                  }
                )
                .sort(
                  (
                    a,
                    b
                  ) =>
                    timestamp(
                      b.createdAt ||
                        b.requestedAt
                    ) -
                    timestamp(
                      a.createdAt ||
                        a.requestedAt
                    )
                );

            setRequests(
              scoped
            );
          },
          (
            listenerError
          ) => {
            console.error(
              "Leave request listener:",
              listenerError
            );

            setError(
              listenerError?.code ===
                "permission-denied"
                ? "Permission denied. Firestore Rules must allow Class Teacher access only to their assigned class."
                : "Unable to load leave requests."
            );
          }
        );

      return unsubscribe;
    },
    [
      authUser?.uid,
      teacher,
    ]
  );

  /* =======================================================
     FILTER
  ======================================================= */

  const filteredRequests =
    useMemo(
      () => {
        const q =
          normalize(
            search
          );

        return requests.filter(
          (
            item
          ) => {
            const statusOk =
              filter ===
                "ALL" ||
              normalize(
                item.status
              ) ===
                normalize(
                  filter
                );

            if (
              !statusOk
            ) {
              return false;
            }

            if (
              !q
            ) {
              return true;
            }

            const haystack =
              [
                item.studentName,
                item.enrollmentNo,
                item.leaveType,
                item.reason,
                item.className,
                item.section,
              ]
                .join(
                  " "
                )
                .toLowerCase();

            return haystack.includes(
              q
            );
          }
        );
      },
      [
        requests,
        filter,
        search,
      ]
    );

  /* =======================================================
     SUMMARY
  ======================================================= */

  const summary =
    useMemo(
      () => {
        const value =
          {
            total:
              requests.length,

            pending:
              0,

            approved:
              0,

            rejected:
              0,

            approvedDays:
              0,
          };

        requests.forEach(
          (
            item
          ) => {
            const status =
              normalize(
                item.status
              );

            if (
              status ===
              "pending"
            ) {
              value.pending++;
            }

            if (
              status ===
              "approved"
            ) {
              value.approved++;

              value.approvedDays +=
                Number(
                  item.totalDays ||
                    daysBetween(
                      item.fromDate,
                      item.toDate
                    )
                );
            }

            if (
              status ===
              "rejected"
            ) {
              value.rejected++;
            }
          }
        );

        return value;
      },
      [
        requests,
      ]
    );

  /* =======================================================
     REMARK
  ======================================================= */

  function getRemark(
    requestId
  ) {
    return (
      remarkMap[
        requestId
      ] ||
      ""
    );
  }

  function setRemark(
    requestId,
    value
  ) {
    setRemarkMap(
      (
        previous
      ) => ({
        ...previous,

        [requestId]:
          value,
      })
    );
  }

  /* =======================================================
     APPROVE / REJECT
  ======================================================= */

  async function processRequest(
    request,
    decision
  ) {
    if (
      !request?.id ||
      !teacher ||
      !authUser
    ) {
      return;
    }

    if (
      !teacher.isClassTeacher
    ) {
      setError(
        "Only the assigned Class Teacher can process leave requests."
      );

      return;
    }

    const currentStatus =
      normalize(
        request.status
      );

    if (
      currentStatus !==
      "pending"
    ) {
      setError(
        "This request has already been processed."
      );

      return;
    }

    const requestedClass =
      normalize(
        request.className
      );

    const teacherClass =
      normalize(
        teacher.classTeacherClassName ||
          teacher.className
      );

    const requestedSection =
      normalize(
        request.section
      );

    const teacherSection =
      normalize(
        teacher.classTeacherSection ||
          teacher.section
      );

    if (
      requestedClass !==
        teacherClass ||
      requestedSection !==
        teacherSection
    ) {
      setError(
        "Security check failed: this leave request is outside your assigned class."
      );

      return;
    }

    const remark =
      getRemark(
        request.id
      ).trim();

    if (
      decision ===
        "REJECTED" &&
      !remark
    ) {
      setError(
        "Please enter a reason before rejecting a leave request."
      );

      return;
    }

    const action =
      decision ===
      "APPROVED"
        ? "approve"
        : "reject";

    const confirmed =
      window.confirm(
        `Are you sure you want to ${action} this leave request for ${display(
          request.studentName
        )}?`
      );

    if (
      !confirmed
    ) {
      return;
    }

    try {
      setUpdatingId(
        request.id
      );

      setError(
        ""
      );

      setSuccess(
        ""
      );

      const update =
        {
          status:
            decision,

          teacherRemark:
            remark,

          processedBy:
            authUser.uid,

          processedByName:
            teacher.name ||
            authUser.displayName ||
            "",

          processedAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        };

      if (
        decision ===
        "APPROVED"
      ) {
        update.approvedBy =
          authUser.uid;

        update.approvedByName =
          teacher.name ||
          authUser.displayName ||
          "";

        update.approvedAt =
          serverTimestamp();
      }

      if (
        decision ===
        "REJECTED"
      ) {
        update.rejectedBy =
          authUser.uid;

        update.rejectedByName =
          teacher.name ||
          authUser.displayName ||
          "";

        update.rejectedAt =
          serverTimestamp();

        update.rejectionReason =
          remark;
      }

      await updateDoc(
        doc(
          db,
          "leaveRequests",
          request.id
        ),
        update
      );

      /*
        Attendance is intentionally NOT auto-created here.
        The teacher should mark the actual attendance record
        as LEAVE for the relevant school day/date.
      */

      setSuccess(
        `${display(
          request.studentName
        )}'s leave request has been ${decision.toLowerCase()}.`
      );

      setRemark(
        request.id,
        ""
      );
    } catch (
      processError
    ) {
      console.error(
        "Process leave request:",
        processError
      );

      setError(
        processError?.code ===
          "permission-denied"
          ? "Permission denied. Firestore Rules must allow this Class Teacher to approve/reject only their own class requests."
          : processError?.message ||
              "Unable to process leave request."
      );
    } finally {
      setUpdatingId(
        ""
      );
    }
  }

  /* =======================================================
     MARK ATTENDANCE LINK
  ======================================================= */

  function openAttendance(
    request
  ) {
    const date =
      getDate(
        request?.fromDate
      );

    navigate(
      `/teacher/attendance?date=${encodeURIComponent(
        date
      )}&student=${encodeURIComponent(
        request?.studentId ||
          ""
      )}`
    );
  }

  /* =======================================================
     NAVIGATION
  ======================================================= */

  function backToDashboard() {
    navigate(
      "/teacher-dashboard"
    );
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    loading
  ) {
    return (
      <TeacherLayout>

        <div className="flex min-h-[75vh] items-center justify-center bg-slate-50">

          <div className="text-center">

            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--teacher-primary)]" />

            <p className="mt-4 text-sm font-black text-slate-800">
              Loading Leave Approval
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Verifying your Class Teacher access…
            </p>

          </div>

        </div>

      </TeacherLayout>
    );
  }

  /* =======================================================
     NON CLASS TEACHER
  ======================================================= */

  if (
    teacher &&
    !teacher.isClassTeacher
  ) {
    return (
      <TeacherLayout>

        <div className="min-h-[75vh] bg-slate-50 p-6">

          <div className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center">

            <div className="text-5xl">
              🔒
            </div>

            <h1 className="mt-4 text-2xl font-black text-amber-900">
              Class Teacher Access Required
            </h1>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-amber-800">
              Leave approval is available only to the Class Teacher
              assigned to a specific class and section.
            </p>

            <button
              type="button"
              onClick={
                backToDashboard
              }
              className="mt-6 rounded-xl bg-[var(--teacher-primary)] px-5 py-3 text-xs font-black text-white"
            >
              ← Back to Teacher Dashboard
            </button>

          </div>

        </div>

      </TeacherLayout>
    );
  }

  /* =======================================================
     MAIN PAGE
  ======================================================= */

  return (
    <TeacherLayout>

      <div className="min-h-screen bg-slate-50">

        <div className="mx-auto max-w-[1450px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">

          {/* =================================================
              HEADER
          ================================================= */}

          <section className="overflow-hidden rounded-[30px] bg-[var(--teacher-dark)] p-6 text-white shadow-xl sm:p-8">

            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">

              <div>

                <span className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.2em]">
                  Class Teacher • Leave Management
                </span>

                <h1 className="mt-4 text-3xl font-black sm:text-4xl">
                  Leave Approval Centre
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-200">
                  Review, approve or reject leave applications
                  submitted by students in your assigned class.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">

                  <span className="rounded-xl bg-white/10 px-3 py-2 text-[10px] font-bold">
                    👨‍🏫{" "}
                    {display(
                      teacher?.name
                    )}
                  </span>

                  <span className="rounded-xl bg-white/10 px-3 py-2 text-[10px] font-bold">
                    🎓{" "}
                    {display(
                      teacher?.classTeacherClassName ||
                        teacher?.className
                    )}
                  </span>

                  <span className="rounded-xl bg-white/10 px-3 py-2 text-[10px] font-bold">
                    📚 Section{" "}
                    {display(
                      teacher?.classTeacherSection ||
                        teacher?.section
                    )}
                  </span>

                </div>

              </div>

              <div className="flex flex-wrap gap-2">

                <select
                  value={
                    themeName
                  }
                  onChange={(
                    event
                  ) =>
                    setThemeName(
                      event.target
                        .value
                    )
                  }
                  className="rounded-xl border border-white/10 bg-white/10 px-3 py-3 text-xs font-black text-white outline-none backdrop-blur"
                >
                  <option
                    value="emerald"
                    className="text-slate-900"
                  >
                    Emerald
                  </option>

                  <option
                    value="blue"
                    className="text-slate-900"
                  >
                    Blue
                  </option>

                  <option
                    value="violet"
                    className="text-slate-900"
                  >
                    Violet
                  </option>

                  <option
                    value="orange"
                    className="text-slate-900"
                  >
                    Orange
                  </option>

                  <option
                    value="rose"
                    className="text-slate-900"
                  >
                    Rose
                  </option>
                </select>

                <button
                  type="button"
                  onClick={
                    backToDashboard
                  }
                  className="rounded-xl bg-white px-5 py-3 text-xs font-black text-slate-900"
                >
                  ← Dashboard
                </button>

              </div>

            </div>

          </section>

          {/* =================================================
              MESSAGES
          ================================================= */}

          {error && (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4">

              <p className="text-sm font-black text-red-800">
                Leave Management
              </p>

              <p className="mt-1 text-xs leading-5 text-red-700">
                {error}
              </p>

            </section>
          )}

          {success && (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">

              <p className="text-sm font-black text-emerald-800">
                Action Completed
              </p>

              <p className="mt-1 text-xs leading-5 text-emerald-700">
                {success}
              </p>

            </section>
          )}

          {/* =================================================
              SUMMARY
          ================================================= */}

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                Total
              </p>

              <p className="mt-2 text-3xl font-black text-slate-900">
                {
                  summary.total
                }
              </p>

            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">

              <p className="text-[9px] font-black uppercase tracking-wider text-amber-600">
                Pending
              </p>

              <p className="mt-2 text-3xl font-black text-amber-900">
                {
                  summary.pending
                }
              </p>

            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">

              <p className="text-[9px] font-black uppercase tracking-wider text-emerald-600">
                Approved
              </p>

              <p className="mt-2 text-3xl font-black text-emerald-900">
                {
                  summary.approved
                }
              </p>

            </div>

            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">

              <p className="text-[9px] font-black uppercase tracking-wider text-red-600">
                Rejected
              </p>

              <p className="mt-2 text-3xl font-black text-red-900">
                {
                  summary.rejected
                }
              </p>

            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">

              <p className="text-[9px] font-black uppercase tracking-wider text-blue-600">
                Approved Days
              </p>

              <p className="mt-2 text-3xl font-black text-blue-900">
                {
                  summary.approvedDays
                }
              </p>

            </div>

          </section>

          {/* =================================================
              FILTER BAR
          ================================================= */}

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

              <div>

                <p className="text-[9px] font-black uppercase tracking-[.2em] text-[var(--teacher-primary)]">
                  Applications
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-900">
                  Student Leave Requests
                </h2>

              </div>

              <div className="flex flex-col gap-2 md:flex-row">

                <input
                  value={
                    search
                  }
                  onChange={(
                    event
                  ) =>
                    setSearch(
                      event.target
                        .value
                    )
                  }
                  placeholder="Search student, enrollment or reason…"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-semibold outline-none focus:border-[var(--teacher-primary)] md:w-72"
                />

                <select
                  value={
                    filter
                  }
                  onChange={(
                    event
                  ) =>
                    setFilter(
                      event.target
                        .value
                    )
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-black outline-none"
                >

                  <option value="PENDING">
                    Pending
                  </option>

                  <option value="APPROVED">
                    Approved
                  </option>

                  <option value="REJECTED">
                    Rejected
                  </option>

                  <option value="ALL">
                    All Requests
                  </option>

                </select>

              </div>

            </div>

          </section>

          {/* =================================================
              REQUEST LIST
          ================================================= */}

          <section className="space-y-4">

            {!filteredRequests.length ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-14 text-center">

                <div className="text-5xl">
                  📅
                </div>

                <h3 className="mt-4 text-xl font-black text-slate-800">
                  No Leave Requests
                </h3>

                <p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-slate-500">
                  There are no applications matching your
                  current filter for this class and section.
                </p>

              </div>
            ) : (
              filteredRequests.map(
                (
                  request
                ) => {

                  const status =
                    normalize(
                      request.status
                    );

                  const totalDays =
                    Number(
                      request.totalDays ||
                        daysBetween(
                          request.fromDate,
                          request.toDate
                        )
                    );

                  const isUpdating =
                    updatingId ===
                    request.id;

                  return (
                    <article
                      key={
                        request.id
                      }
                      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                    >

                      {/* TOP */}

                      <div className="border-b border-slate-100 p-5">

                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                          <div className="min-w-0">

                            <div className="flex flex-wrap items-center gap-2">

                              <h3 className="text-xl font-black text-slate-900">
                                {
                                  display(
                                    request.studentName,
                                    "Student"
                                  )
                                }
                              </h3>

                              <span
                                className={`rounded-full border px-3 py-1.5 text-[9px] font-black ${statusBadge(
                                  status
                                )}`}
                              >
                                {
                                  statusText(
                                    status
                                  )
                                }
                              </span>

                            </div>

                            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-[10px] font-bold text-slate-500">

                              <span>
                                🪪{" "}
                                {
                                  display(
                                    request.enrollmentNo
                                  )
                                }
                              </span>

                              <span>
                                🎓{" "}
                                {
                                  display(
                                    request.className
                                  )
                                }{" "}
                                -{" "}
                                {
                                  display(
                                    request.section
                                  )
                                }
                              </span>

                              <span>
                                📌{" "}
                                {
                                  display(
                                    request.leaveType,
                                    "LEAVE"
                                  )
                                }
                              </span>

                              <span>
                                ⏱{" "}
                                {
                                  totalDays
                                }{" "}
                                day
                                {
                                  totalDays !==
                                  1
                                    ? "s"
                                    : ""
                                }
                              </span>

                            </div>

                          </div>

                          <div className="shrink-0 text-left lg:text-right">

                            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                              Leave Period
                            </p>

                            <p className="mt-1 text-sm font-black text-slate-800">
                              {
                                prettyDate(
                                  request.fromDate
                                )
                              }
                              {" → "}
                              {
                                prettyDate(
                                  request.toDate
                                )
                              }
                            </p>

                          </div>

                        </div>

                      </div>

                      {/* BODY */}

                      <div className="grid gap-4 p-5 lg:grid-cols-[1fr_340px]">

                        <div className="space-y-4">

                          <div className="rounded-2xl bg-slate-50 p-4">

                            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                              Student Reason
                            </p>

                            <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-700">
                              {
                                display(
                                  request.reason
                                )
                              }
                            </p>

                          </div>

                          {request.remarks && (
                            <div className="rounded-2xl bg-blue-50 p-4">

                              <p className="text-[9px] font-black uppercase tracking-wider text-blue-500">
                                Student Remarks
                              </p>

                              <p className="mt-2 whitespace-pre-wrap text-xs font-semibold leading-5 text-blue-900">
                                {
                                  request.remarks
                                }
                              </p>

                            </div>
                          )}

                          {request.teacherRemark && (
                            <div className="rounded-2xl bg-emerald-50 p-4">

                              <p className="text-[9px] font-black uppercase tracking-wider text-emerald-600">
                                Teacher Decision Remark
                              </p>

                              <p className="mt-2 whitespace-pre-wrap text-xs font-semibold leading-5 text-emerald-900">
                                {
                                  request.teacherRemark
                                }
                              </p>

                            </div>
                          )}

                          {status ===
                            "rejected" &&
                            request.rejectionReason && (
                              <div className="rounded-2xl bg-red-50 p-4">

                                <p className="text-[9px] font-black uppercase tracking-wider text-red-600">
                                  Rejection Reason
                                </p>

                                <p className="mt-2 whitespace-pre-wrap text-xs font-semibold leading-5 text-red-900">
                                  {
                                    request.rejectionReason
                                  }
                                </p>

                              </div>
                            )}

                          <div className="grid gap-3 sm:grid-cols-3">

                            <div className="rounded-xl bg-slate-50 p-3">

                              <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                                Requested
                              </p>

                              <p className="mt-1 text-[10px] font-bold text-slate-700">
                                {
                                  request.requestedAt?.toDate
                                    ? request.requestedAt
                                        .toDate()
                                        .toLocaleString(
                                          "en-IN"
                                        )
                                    : request.createdAt?.toDate
                                      ? request.createdAt
                                          .toDate()
                                          .toLocaleString(
                                            "en-IN"
                                          )
                                      : "—"
                                }
                              </p>

                            </div>

                            <div className="rounded-xl bg-slate-50 p-3">

                              <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                                Session
                              </p>

                              <p className="mt-1 text-[10px] font-bold text-slate-700">
                                {
                                  display(
                                    request.session
                                  )
                                }
                              </p>

                            </div>

                            <div className="rounded-xl bg-slate-50 p-3">

                              <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                                Request ID
                              </p>

                              <p className="mt-1 truncate text-[10px] font-bold text-slate-700">
                                {
                                  request.id
                                }
                              </p>

                            </div>

                          </div>

                        </div>

                        {/* ACTION BOX */}

                        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">

                          {status ===
                          "pending" ? (
                            <>

                              <p className="text-[9px] font-black uppercase tracking-[.2em] text-[var(--teacher-primary)]">
                                Decision
                              </p>

                              <h4 className="mt-1 text-lg font-black text-slate-900">
                                Process Application
                              </h4>

                              <textarea
                                value={getRemark(
                                  request.id
                                )}
                                onChange={(
                                  event
                                ) =>
                                  setRemark(
                                    request.id,
                                    event
                                      .target
                                      .value
                                  )
                                }
                                rows={5}
                                maxLength={
                                  500
                                }
                                placeholder="Add a remark. Required when rejecting."
                                className="mt-4 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold outline-none focus:border-[var(--teacher-primary)]"
                              />

                              <p className="mt-1 text-right text-[9px] font-bold text-slate-400">
                                {
                                  getRemark(
                                    request.id
                                  ).length
                                }
                                /500
                              </p>

                              <div className="mt-4 grid gap-2">

                                <button
                                  type="button"
                                  disabled={
                                    isUpdating
                                  }
                                  onClick={() =>
                                    processRequest(
                                      request,
                                      "APPROVED"
                                    )
                                  }
                                  className="rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {isUpdating
                                    ? "Processing…"
                                    : "✓ Approve Leave"}
                                </button>

                                <button
                                  type="button"
                                  disabled={
                                    isUpdating
                                  }
                                  onClick={() =>
                                    processRequest(
                                      request,
                                      "REJECTED"
                                    )
                                  }
                                  className="rounded-xl bg-red-600 px-4 py-3 text-xs font-black text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {isUpdating
                                    ? "Processing…"
                                    : "✕ Reject Leave"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    openAttendance(
                                      request
                                    )
                                  }
                                  className="rounded-xl bg-slate-900 px-4 py-3 text-xs font-black text-white hover:bg-slate-800"
                                >
                                  📅 Open Attendance
                                </button>

                              </div>

                            </>
                          ) : (
                            <>

                              <p className="text-[9px] font-black uppercase tracking-[.2em] text-slate-400">
                                Decision Recorded
                              </p>

                              <div
                                className={`mt-3 rounded-2xl border p-4 ${statusBadge(
                                  status
                                )}`}
                              >

                                <p className="text-lg font-black">
                                  {
                                    statusText(
                                      status
                                    )
                                  }
                                </p>

                                <p className="mt-1 text-[10px] font-semibold">
                                  This request is already processed and can no longer be changed from this screen.
                                </p>

                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  openAttendance(
                                    request
                                  )
                                }
                                className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-xs font-black text-white hover:bg-slate-800"
                              >
                                📅 Open Attendance
                              </button>

                            </>
                          )}

                        </div>

                      </div>

                    </article>
                  );
                }
              )
            )}

          </section>

          {/* =================================================
              SECURITY NOTE
          ================================================= */}

          <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">

            <div className="flex gap-3">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
                🔐
              </div>

              <div>

                <p className="text-xs font-black text-emerald-900">
                  Class-Scoped Leave Approval
                </p>

                <p className="mt-1 text-[10px] leading-5 text-emerald-700">
                  Requests are filtered to the Class Teacher's
                  assigned class and section. Firestore Security Rules
                  should enforce the same restriction on reads and
                  approval updates.
                </p>

              </div>

            </div>

          </section>

        </div>

      </div>

    </TeacherLayout>
  );
}