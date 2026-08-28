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
  addDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

import {
  onAuthStateChanged,
} from "firebase/auth";

import {
  auth,
  db,
} from "../config/firebase";

import StudentLayout from "../layouts/StudentLayout";

/* =========================================================
   HELPERS
========================================================= */

const text = (
  value,
  fallback = "—"
) =>
  String(
    value ??
      fallback
  ).trim() || fallback;

const normalize = (
  value
) =>
  String(
    value ?? ""
  )
    .trim()
    .toLowerCase();

const dateOnly = (
  value
) => {
  if (!value) return "";

  return String(
    value
  ).slice(0, 10);
};

const formatDate = (
  value
) => {
  if (!value) return "—";

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return text(
      value
    );
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
};

function getDaysBetween(
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

  const difference =
    Math.floor(
      (
        end.getTime() -
        start.getTime()
      ) /
        86400000
    );

  return difference >= 0
    ? difference + 1
    : 0;
}

function statusClass(
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
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (
    value ===
      "rejected"
  ) {
    return "bg-red-50 text-red-700 border-red-200";
  }

  if (
    value ===
      "cancelled"
  ) {
    return "bg-slate-100 text-slate-600 border-slate-200";
  }

  return "bg-amber-50 text-amber-700 border-amber-200";
}

function statusLabel(
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
    return "APPROVED";
  }

  if (
    value ===
      "rejected"
  ) {
    return "REJECTED";
  }

  if (
    value ===
      "cancelled"
  ) {
    return "CANCELLED";
  }

  return "PENDING";
}

/* =========================================================
   MAIN
========================================================= */

export default function StudentLeave() {
  const navigate =
    useNavigate();

  const [
    authUser,
    setAuthUser,
  ] = useState(null);

  const [
    student,
    setStudent,
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
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    fromDate,
    setFromDate,
  ] = useState("");

  const [
    toDate,
    setToDate,
  ] = useState("");

  const [
    leaveType,
    setLeaveType,
  ] = useState(
    "CASUAL"
  );

  const [
    reason,
    setReason,
  ] = useState("");

  const [
    remarks,
    setRemarks,
  ] = useState("");

  const [
    filter,
    setFilter,
  ] = useState(
    "ALL"
  );

  /* =======================================================
     AUTH + STUDENT
  ======================================================= */

  useEffect(
    () => {
      const unsubscribe =
        onAuthStateChanged(
          auth,
          async (
            user
          ) => {
            if (!user) {
              setAuthUser(
                null
              );

              setStudent(
                null
              );

              setLoading(
                false
              );

              navigate(
                "/student-login",
                {
                  replace:
                    true,
                }
              );

              return;
            }

            setAuthUser(
              user
            );

            try {
              setLoading(
                true
              );
              setError(
                ""
              );

              const studentQuery =
                query(
                  collection(
                    db,
                    "students"
                  ),
                  limit(
                    1000
                  )
                );

              const snapshot =
                await getDocs(
                  studentQuery
                );

              const profile =
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
                  .find(
                    (
                      item
                    ) =>
                      String(
                        item.uid ||
                          item.authUid ||
                          ""
                      ) ===
                        String(
                          user.uid
                        ) ||
                      normalize(
                        item.email ||
                          item.accountEmail
                      ) ===
                        normalize(
                          user.email
                        )
                  );

              if (
                !profile
              ) {
                throw new Error(
                  "Student profile not found."
                );
              }

              setStudent(
                profile
              );
            } catch (
              loadError
            ) {
              console.error(
                "Student leave profile error:",
                loadError
              );

              setError(
                loadError?.message ||
                  "Unable to load student profile."
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
     REALTIME LEAVE REQUESTS
  ======================================================= */

  useEffect(
    () => {
      if (
        !authUser?.uid
      ) {
        return;
      }

      const identifiers =
        {
          uid:
            String(
              authUser.uid
            ),

          studentId:
            String(
              student?.id ||
                ""
            ),

          enrollmentNo:
            String(
              student?.enrollmentNo ||
                ""
            ),
        };

      const unsubscribeList =
        [];

      const seenIds =
        new Set();

      const queries =
        [];

      if (
        identifiers
          .studentId
      ) {
        queries.push(
          query(
            collection(
              db,
              "leaveRequests"
            )
          )
        );
      }

      queries.forEach(
        (
          requestQuery
        ) => {
          const unsubscribe =
            onSnapshot(
              requestQuery,
              (
                snapshot
              ) => {
                const incoming =
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
                        const sameUid =
                          String(
                            item.uid ||
                              item.studentUid ||
                              ""
                          ) ===
                          identifiers.uid;

                        const sameStudent =
                          String(
                            item.studentId ||
                              ""
                          ) ===
                          identifiers.studentId;

                        const sameEnrollment =
                          String(
                            item.enrollmentNo ||
                              ""
                          ) ===
                          identifiers.enrollmentNo;

                        return (
                          sameUid ||
                          sameStudent ||
                          (
                            identifiers
                              .enrollmentNo &&
                            sameEnrollment
                          )
                        );
                      }
                    );

                setRequests(
                  (
                    previous
                  ) => {
                    const map =
                      new Map(
                        previous.map(
                          (
                            item
                          ) => [
                            item.id,
                            item,
                          ]
                        )
                      );

                    incoming.forEach(
                      (
                        item
                      ) => {
                        seenIds.add(
                          item.id
                        );

                        map.set(
                          item.id,
                          item
                        );
                      }
                    );

                    return Array.from(
                      map.values()
                    ).sort(
                      (
                        a,
                        b
                      ) => {
                        const aTime =
                          a.createdAt?.toMillis
                            ? a.createdAt.toMillis()
                            : new Date(
                                a.createdAt ||
                                  0
                              ).getTime();

                        const bTime =
                          b.createdAt?.toMillis
                            ? b.createdAt.toMillis()
                            : new Date(
                                b.createdAt ||
                                  0
                              ).getTime();

                        return (
                          bTime -
                          aTime
                        );
                      }
                    );
                  }
                );
              },
              (
                listenerError
              ) => {
                console.error(
                  "Leave listener error:",
                  listenerError
                );
              }
            );

          unsubscribeList.push(
            unsubscribe
          );
        }
      );

      return () => {
        unsubscribeList.forEach(
          (
            unsubscribe
          ) =>
            unsubscribe()
        );
      };
    },
    [
      authUser?.uid,
      student?.id,
      student?.enrollmentNo,
    ]
  );

  /* =======================================================
     FILTERED REQUESTS
  ======================================================= */

  const filteredRequests =
    useMemo(
      () => {
        if (
          filter ===
          "ALL"
        ) {
          return requests;
        }

        return requests.filter(
          (
            item
          ) =>
            normalize(
              item.status
            ) ===
            normalize(
              filter
            )
        );
      },
      [
        requests,
        filter,
      ]
    );

  /* =======================================================
     SUMMARY
  ======================================================= */

  const summary =
    useMemo(
      () => {
        const result =
          {
            total:
              requests.length,

            pending: 0,

            approved: 0,

            rejected: 0,

            days: 0,
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
              result.pending +=
                1;
            }

            if (
              status ===
              "approved"
            ) {
              result.approved +=
                1;
            }

            if (
              status ===
              "rejected"
            ) {
              result.rejected +=
                1;
            }

            if (
              status ===
              "approved"
            ) {
              result.days +=
                Number(
                  item.totalDays ||
                    getDaysBetween(
                      item.fromDate,
                      item.toDate
                    )
                );
            }
          }
        );

        return result;
      },
      [
        requests,
      ]
    );

  /* =======================================================
     FORM VALIDATION
  ======================================================= */

  function validateForm() {
    setError(
      ""
    );
    setSuccess(
      ""
    );

    if (
      !student
    ) {
      return "Student profile is not available.";
    }

    if (
      !fromDate
    ) {
      return "Please select leave start date.";
    }

    if (
      !toDate
    ) {
      return "Please select leave end date.";
    }

    if (
      toDate <
      fromDate
    ) {
      return "End date cannot be before start date.";
    }

    const totalDays =
      getDaysBetween(
        fromDate,
        toDate
      );

    if (
      totalDays <=
      0
    ) {
      return "Please select valid leave dates.";
    }

    if (
      totalDays >
      30
    ) {
      return "A single leave request cannot exceed 30 days.";
    }

    if (
      !reason.trim()
    ) {
      return "Please enter a leave reason.";
    }

    if (
      reason.trim()
        .length <
      5
    ) {
      return "Please provide a little more detail in the reason.";
    }

    return "";
  }

  /* =======================================================
     SUBMIT
  ======================================================= */

  async function submitLeave(
    event
  ) {
    event.preventDefault();

    const validation =
      validateForm();

    if (
      validation
    ) {
      setError(
        validation
      );

      return;
    }

    if (
      !authUser?.uid ||
      !student
    ) {
      setError(
        "Student authentication is not available."
      );

      return;
    }

    try {
      setSaving(
        true
      );
      setError(
        ""
      );
      setSuccess(
        ""
      );

      const totalDays =
        getDaysBetween(
          fromDate,
          toDate
        );

      const payload =
        {
          studentId:
            String(
              student.id ||
                ""
            ),

          studentUid:
            String(
              authUser.uid
            ),

          uid:
            String(
              authUser.uid
            ),

          studentName:
            text(
              student.name,
              ""
            ),

          enrollmentNo:
            String(
              student.enrollmentNo ||
                ""
            ),

          className:
            text(
              student.className ||
                student.class ||
                student.grade,
              ""
            ),

          section:
            text(
              student.section,
              ""
            ),

          sessionId:
            text(
              student.sessionId ||
                "",
              ""
            ),

          session:
            text(
              student.session ||
                student.sessionName ||
                "",
              ""
            ),

          leaveType:
            leaveType,

          fromDate:
            fromDate,

          toDate:
            toDate,

          totalDays:
            totalDays,

          reason:
            reason.trim(),

          remarks:
            remarks.trim(),

          status:
            "PENDING",

          requestedBy:
            authUser.uid,

          requestedByName:
            text(
              student.name,
              ""
            ),

          requestedAt:
            serverTimestamp(),

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        };

      await addDoc(
        collection(
          db,
          "leaveRequests"
        ),
        payload
      );

      setSuccess(
        "Leave request submitted successfully. It is now waiting for Class Teacher approval."
      );

      setFromDate(
        ""
      );

      setToDate(
        ""
      );

      setLeaveType(
        "CASUAL"
      );

      setReason(
        ""
      );

      setRemarks(
        ""
      );
    } catch (
      saveError
    ) {
      console.error(
        "Leave submission error:",
        saveError
      );

      if (
        saveError?.code ===
        "permission-denied"
      ) {
        setError(
          "You do not have permission to submit a leave request."
        );
      } else {
        setError(
          saveError?.message ||
            "Leave request could not be submitted."
        );
      }
    } finally {
      setSaving(
        false
      );
    }
  }

  /* =======================================================
     CANCEL PENDING REQUEST
     -------------------------------------------------------
     Student-side cancellation is intentionally local-safe:
     only pending requests can be requested for cancellation.
     Actual Firestore permission must also be enforced by rules.
  ======================================================= */

  async function cancelRequest(
    request
  ) {
    if (
      !request?.id
    ) {
      return;
    }

    if (
      normalize(
        request.status
      ) !==
      "pending"
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Cancel this pending leave request?"
      );

    if (
      !confirmed
    ) {
      return;
    }

    try {
      /*
        We intentionally avoid updateDoc here until your
        Firestore Rules explicitly allow the student to
        update only their own pending leave record.

        Showing a clear message is safer than silently
        attempting an unauthorized mutation.
      */

      window.alert(
        "Cancellation permission is not enabled yet in the current security workflow. The Class Teacher/Admin can reject the request."
      );
    } catch (
      cancelError
    ) {
      console.error(
        "Cancel leave:",
        cancelError
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
      <StudentLayout>

        <div className="flex min-h-[75vh] items-center justify-center bg-slate-50">

          <div className="text-center">

            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />

            <p className="mt-4 text-sm font-black text-slate-800">
              Loading Leave Centre
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Preparing your leave records…
            </p>

          </div>

        </div>

      </StudentLayout>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <StudentLayout>

      <div className="min-h-screen bg-slate-50">

        <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">

          {/* HEADER */}

          <section className="overflow-hidden rounded-[30px] bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-900 p-6 text-white shadow-xl sm:p-8">

            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

              <div>

                <span className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.2em]">
                  Student Services
                </span>

                <h1 className="mt-4 text-3xl font-black sm:text-4xl">
                  Leave Centre
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-200">
                  Submit leave applications and track
                  approval status directly from your student portal.
                </p>

                {student && (
                  <div className="mt-5 flex flex-wrap gap-2">

                    <span className="rounded-xl bg-white/10 px-3 py-2 text-[10px] font-bold">
                      🎓{" "}
                      {text(
                        student.name
                      )}
                    </span>

                    <span className="rounded-xl bg-white/10 px-3 py-2 text-[10px] font-bold">
                      🪪{" "}
                      {text(
                        student.enrollmentNo
                      )}
                    </span>

                    <span className="rounded-xl bg-white/10 px-3 py-2 text-[10px] font-bold">
                      📚{" "}
                      {text(
                        student.className ||
                          student.class ||
                          student.grade
                      )}{" "}
                      -{" "}
                      {text(
                        student.section
                      )}
                    </span>

                  </div>
                )}

              </div>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/student-dashboard"
                  )
                }
                className="rounded-xl bg-white px-5 py-3 text-xs font-black text-slate-900"
              >
                ← Dashboard
              </button>

            </div>

          </section>

          {/* ERROR */}

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-black text-red-800">
                Leave Request
              </p>

              <p className="mt-1 text-xs leading-5 text-red-700">
                {error}
              </p>
            </div>
          )}

          {/* SUCCESS */}

          {success && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-black text-emerald-800">
                Request Submitted
              </p>

              <p className="mt-1 text-xs leading-5 text-emerald-700">
                {success}
              </p>
            </div>
          )}

          {/* SUMMARY */}

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                Total Requests
              </p>

              <p className="mt-2 text-2xl font-black text-slate-900">
                {
                  summary.total
                }
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-[9px] font-black uppercase tracking-wider text-amber-600">
                Pending
              </p>

              <p className="mt-2 text-2xl font-black text-amber-900">
                {
                  summary.pending
                }
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-[9px] font-black uppercase tracking-wider text-emerald-600">
                Approved
              </p>

              <p className="mt-2 text-2xl font-black text-emerald-900">
                {
                  summary.approved
                }
              </p>
            </div>

            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <p className="text-[9px] font-black uppercase tracking-wider text-red-600">
                Rejected
              </p>

              <p className="mt-2 text-2xl font-black text-red-900">
                {
                  summary.rejected
                }
              </p>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <p className="text-[9px] font-black uppercase tracking-wider text-blue-600">
                Approved Days
              </p>

              <p className="mt-2 text-2xl font-black text-blue-900">
                {
                  summary.days
                }
              </p>
            </div>

          </section>

          {/* CREATE REQUEST */}

          <Card>

            <div className="border-b border-slate-100 p-6">

              <p className="text-[9px] font-black uppercase tracking-[.2em] text-emerald-600">
                New Application
              </p>

              <h2 className="mt-1 text-2xl font-black text-slate-900">
                Apply for Leave
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Your request will be submitted to the Class Teacher for approval.
              </p>

            </div>

            <form
              onSubmit={
                submitLeave
              }
              className="p-6"
            >

              <div className="grid gap-5 md:grid-cols-2">

                <label>
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                    From Date
                  </span>

                  <input
                    type="date"
                    value={
                      fromDate
                    }
                    onChange={(
                      event
                    ) =>
                      setFromDate(
                        event.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                    To Date
                  </span>

                  <input
                    type="date"
                    value={
                      toDate
                    }
                    min={
                      fromDate ||
                      undefined
                    }
                    onChange={(
                      event
                    ) =>
                      setToDate(
                        event.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Leave Type
                  </span>

                  <select
                    value={
                      leaveType
                    }
                    onChange={(
                      event
                    ) =>
                      setLeaveType(
                        event.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black outline-none focus:border-emerald-500"
                  >
                    <option value="CASUAL">
                      Casual Leave
                    </option>

                    <option value="MEDICAL">
                      Medical Leave
                    </option>

                    <option value="EMERGENCY">
                      Emergency Leave
                    </option>

                    <option value="FAMILY">
                      Family Leave
                    </option>

                    <option value="OTHER">
                      Other
                    </option>
                  </select>
                </label>

                <div className="rounded-xl bg-slate-50 p-4">

                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                    Total Leave Days
                  </p>

                  <p className="mt-1 text-2xl font-black text-slate-900">
                    {
                      getDaysBetween(
                        fromDate,
                        toDate
                      )
                    }
                  </p>

                </div>

              </div>

              <label className="mt-5 block">

                <span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Reason
                </span>

                <textarea
                  value={
                    reason
                  }
                  onChange={(
                    event
                  ) =>
                    setReason(
                      event.target
                        .value
                    )
                  }
                  rows={4}
                  maxLength={500}
                  placeholder="Enter the reason for your leave…"
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-500"
                />

                <div className="mt-1 text-right text-[9px] font-bold text-slate-400">
                  {
                    reason.length
                  }
                  /500
                </div>

              </label>

              <label className="mt-2 block">

                <span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Additional Remarks
                </span>

                <textarea
                  value={
                    remarks
                  }
                  onChange={(
                    event
                  ) =>
                    setRemarks(
                      event.target
                        .value
                    )
                  }
                  rows={3}
                  maxLength={300}
                  placeholder="Optional additional information…"
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-500"
                />

              </label>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">

                <p className="text-[10px] leading-5 text-slate-500">
                  Status will remain{" "}
                  <strong>
                    PENDING
                  </strong>{" "}
                  until your Class Teacher processes the request.
                </p>

                <button
                  type="submit"
                  disabled={
                    saving
                  }
                  className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-xs font-black text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Submitting…"
                    : "📤 Submit Leave Request"}
                </button>

              </div>

            </form>

          </Card>

          {/* REQUEST HISTORY */}

          <Card>

            <div className="flex flex-col gap-4 border-b border-slate-100 p-6 lg:flex-row lg:items-center lg:justify-between">

              <div>

                <p className="text-[9px] font-black uppercase tracking-[.2em] text-blue-600">
                  Request History
                </p>

                <h2 className="mt-1 text-2xl font-black text-slate-900">
                  My Leave Applications
                </h2>

              </div>

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
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black outline-none"
              >
                <option value="ALL">
                  All Requests
                </option>

                <option value="PENDING">
                  Pending
                </option>

                <option value="APPROVED">
                  Approved
                </option>

                <option value="REJECTED">
                  Rejected
                </option>
              </select>

            </div>

            {!filteredRequests.length ? (
              <div className="p-12 text-center">

                <div className="text-5xl">
                  📅
                </div>

                <h3 className="mt-4 text-lg font-black text-slate-800">
                  No Leave Requests
                </h3>

                <p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-slate-500">
                  Your submitted leave applications and
                  approval decisions will appear here.
                </p>

              </div>
            ) : (
              <div className="divide-y divide-slate-100">

                {filteredRequests.map(
                  (
                    request
                  ) => {

                    const totalDays =
                      Number(
                        request.totalDays ||
                          getDaysBetween(
                            request.fromDate,
                            request.toDate
                          )
                      );

                    return (
                      <article
                        key={
                          request.id
                        }
                        className="p-6 transition hover:bg-slate-50"
                      >

                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">

                          <div className="min-w-0">

                            <div className="flex flex-wrap items-center gap-2">

                              <h3 className="text-base font-black text-slate-900">
                                {
                                  text(
                                    request.leaveType,
                                    "LEAVE"
                                  )
                                }
                              </h3>

                              <span
                                className={`rounded-full border px-3 py-1 text-[9px] font-black ${statusClass(
                                  request.status
                                )}`}
                              >
                                {
                                  statusLabel(
                                    request.status
                                  )
                                }
                              </span>

                            </div>

                            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[10px] font-bold text-slate-500">

                              <span>
                                📅{" "}
                                {
                                  formatDate(
                                    request.fromDate
                                  )
                                }
                                {" "}
                                →
                                {" "}
                                {
                                  formatDate(
                                    request.toDate
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

                              <span>
                                🪪{" "}
                                {
                                  text(
                                    request.enrollmentNo
                                  )
                                }
                              </span>

                            </div>

                            <div className="mt-4 rounded-2xl bg-slate-50 p-4">

                              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                                Reason
                              </p>

                              <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-700">
                                {
                                  text(
                                    request.reason
                                  )
                                }
                              </p>

                            </div>

                            {request.remarks && (
                              <div className="mt-3 rounded-2xl bg-blue-50 p-4">

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
                              <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">

                                <p className="text-[9px] font-black uppercase tracking-wider text-emerald-600">
                                  Class Teacher Remark
                                </p>

                                <p className="mt-2 whitespace-pre-wrap text-xs font-semibold leading-5 text-emerald-900">
                                  {
                                    request.teacherRemark
                                  }
                                </p>

                              </div>
                            )}

                            {request.rejectionReason && (
                              <div className="mt-3 rounded-2xl border border-red-100 bg-red-50 p-4">

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

                          </div>

                          <div className="flex shrink-0 flex-wrap gap-2">

                            {normalize(
                              request.status
                            ) ===
                              "pending" && (
                              <button
                                type="button"
                                onClick={() =>
                                  cancelRequest(
                                    request
                                  )
                                }
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-black text-slate-600 hover:bg-slate-50"
                              >
                                Cancel Request
                              </button>
                            )}

                          </div>

                        </div>

                        <div className="mt-4 flex flex-wrap gap-5 text-[9px] font-bold text-slate-400">

                          <span>
                            Requested:{" "}
                            {request.requestedAt?.toDate
                              ? request.requestedAt
                                  .toDate()
                                  .toLocaleString(
                                    "en-IN"
                                  )
                              : "Just now"}
                          </span>

                          {request.approvedAt?.toDate && (
                            <span>
                              Approved:{" "}
                              {request.approvedAt
                                .toDate()
                                .toLocaleString(
                                  "en-IN"
                                )}
                            </span>
                          )}

                          {request.rejectedAt?.toDate && (
                            <span>
                              Rejected:{" "}
                              {request.rejectedAt
                                .toDate()
                                .toLocaleString(
                                  "en-IN"
                                )}
                            </span>
                          )}

                        </div>

                      </article>
                    );
                  }
                )}

              </div>
            )}

          </Card>

        </div>

      </div>

    </StudentLayout>
  );
}

/* =========================================================
   SIMPLE CARD COMPONENT
========================================================= */

function Card({
  children,
  className = "",
}) {
  return (
    <section
      className={`overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {children}
    </section>
  );
}