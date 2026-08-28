import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  limit,
  query,
} from "firebase/firestore";

import { auth, db } from "../config/firebase";
import StudentLayout from "../layouts/StudentLayout";

const MODULES = {
  profile: {
    title: "My Profile",
    section: "ACADEMICS",
    color: "blue",
    description:
      "View your verified personal and academic profile.",
  },
  progress: {
    title: "Academic Progress",
    section: "ACADEMICS",
    color: "emerald",
    description:
      "Review your published academic performance.",
  },
  subjects: {
    title: "Subjects",
    section: "ACADEMICS",
    color: "violet",
    description:
      "View subjects configured for your academic record.",
  },
  examination: {
    title: "Examination",
    section: "ACADEMICS",
    color: "amber",
    description:
      "View published examination information.",
  },
  calendar: {
    title: "Academic Calendar",
    section: "ACADEMICS",
    color: "blue",
    description:
      "View school academic events and important dates.",
  },
  notices: {
    title: "School Notices",
    section: "SCHOOL",
    color: "orange",
    description:
      "Read notices published for students.",
  },
  notifications: {
    title: "Notifications",
    section: "SCHOOL",
    color: "violet",
    description:
      "View important student notifications.",
  },
  documents: {
    title: "Documents",
    section: "SCHOOL",
    color: "blue",
    description:
      "View available student documents.",
  },
  guardian: {
    title: "Guardian Connect",
    section: "GUARDIAN",
    color: "emerald",
    description:
      "View guardian-related information and services.",
  },
  complaint: {
    title: "Complaint",
    section: "GUARDIAN",
    color: "red",
    description:
      "Submit or review student support complaints.",
  },
  suggestion: {
    title: "Suggestion",
    section: "GUARDIAN",
    color: "amber",
    description:
      "Submit or review suggestions.",
  },
};

function keyFromPath(pathname) {
  const part =
    pathname
      .split("/")
      .filter(Boolean)
      .pop() || "profile";

  return MODULES[part]
    ? part
    : "profile";
}

function ModuleCard({
  label,
  value,
  tone = "slate",
}) {
  const map = {
    slate:
      "bg-slate-50 text-slate-900",
    blue:
      "bg-blue-50 text-blue-900",
    green:
      "bg-emerald-50 text-emerald-900",
    violet:
      "bg-violet-50 text-violet-900",
    amber:
      "bg-amber-50 text-amber-900",
    red:
      "bg-red-50 text-red-900",
  };

  return (
    <div
      className={`rounded-2xl p-4 ${
        map[tone] || map.slate
      }`}
    >
      <p className="text-[9px] font-black uppercase tracking-wider opacity-60">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-black">
        {value || "—"}
      </p>
    </div>
  );
}

export default function StudentPortalModules() {
  const location =
    useLocation();

  const navigate =
    useNavigate();

  const moduleKey =
    keyFromPath(
      location.pathname
    );

  const config =
    MODULES[moduleKey];

  const [student, setStudent] =
    useState(null);

  const [items, setItems] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const user =
          auth.currentUser;

        if (!user) {
          navigate(
            "/student-login",
            {
              replace: true,
            }
          );
          return;
        }

        const studentSnap =
          await getDocs(
            query(
              collection(
                db,
                "students"
              ),
              limit(500)
            )
          );

        const profile =
          studentSnap.docs
            .map(
              (item) => ({
                id: item.id,
                ...item.data(),
              })
            )
            .find(
              (item) =>
                String(
                  item.uid ||
                    item.authUid ||
                    ""
                ) ===
                  String(
                    user.uid
                  ) ||
                String(
                  item.email ||
                    item.accountEmail ||
                    ""
                ).toLowerCase() ===
                  String(
                    user.email ||
                      ""
                  ).toLowerCase()
            );

        if (!profile) {
          throw new Error(
            "Student profile not found."
          );
        }

        let nextItems = [];

        const collectionMap = {
          profile: null,
          progress:
            "results",
          subjects:
            "subjects",
          examination:
            "examinations",
          calendar:
            "academicCalendar",
          notices:
            "notices",
          notifications:
            "notifications",
          documents:
            "studentDocuments",
          guardian:
            "guardians",
          complaint:
            "studentComplaints",
          suggestion:
            "studentSuggestions",
        };

        const collectionName =
          collectionMap[
            moduleKey
          ];

        if (collectionName) {
          try {
            const snap =
              await getDocs(
                query(
                  collection(
                    db,
                    collectionName
                  ),
                  limit(200)
                )
              );

            nextItems =
              snap.docs.map(
                (item) => ({
                  id: item.id,
                  ...item.data(),
                })
              );
          } catch (err) {
            console.error(
              `Student ${collectionName}:`,
              err
            );
          }
        }

        if (!mounted) return;

        setStudent(
          profile
        );

        setItems(
          nextItems
        );
      } catch (err) {
        console.error(
          "Student module:",
          err
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [
    navigate,
    moduleKey,
  ]);

  const profile =
    student || {};

  const visibleItems =
    useMemo(() => {
      return items.slice(
        0,
        100
      );
    }, [items]);

  if (loading) {
    return (
      <StudentLayout>
        <div className="flex min-h-[75vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />

            <p className="mt-4 text-sm font-black">
              Loading {config.title}
            </p>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <section className="rounded-[30px] bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-xl sm:p-8">
            <p className="text-[9px] font-black uppercase tracking-[.2em] text-emerald-200">
              {config.section}
            </p>

            <h1 className="mt-3 text-3xl font-black sm:text-4xl">
              {config.title}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">
              {config.description}
            </p>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/student-dashboard"
                )
              }
              className="mt-5 rounded-xl bg-white px-4 py-3 text-xs font-black text-slate-900"
            >
              ← Dashboard
            </button>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ModuleCard
              label="Student"
              value={
                profile.name ||
                profile.fullName ||
                profile.studentName
              }
              tone="green"
            />

            <ModuleCard
              label="Enrollment"
              value={
                profile.enrollmentNo ||
                profile.enrollmentNumber
              }
              tone="blue"
            />

            <ModuleCard
              label="Class"
              value={`${profile.className || profile.class || "—"} - ${
                profile.section || "—"
              }`}
              tone="violet"
            />

            <ModuleCard
              label="Account"
              value={
                profile.accountStatus ||
                "ACTIVE"
              }
              tone="green"
            />
          </section>

          {moduleKey ===
            "profile" && (
            <section className="grid gap-4 md:grid-cols-2">
              <ModuleCard
                label="Full Name"
                value={
                  profile.name ||
                  profile.fullName ||
                  profile.studentName
                }
              />

              <ModuleCard
                label="Email"
                value={
                  profile.email ||
                  profile.accountEmail
                }
              />

              <ModuleCard
                label="Mobile"
                value={
                  profile.mobile ||
                  profile.phone
                }
              />

              <ModuleCard
                label="Academic Session"
                value={
                  profile.session ||
                  profile.academicSession
                }
              />
            </section>
          )}

          {moduleKey ===
            "progress" && (
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-slate-900">
                Published Progress Records
              </h2>

              <div className="mt-5 space-y-3">
                {visibleItems.length ? (
                  visibleItems.map(
                    (item) => (
                      <div
                        key={
                          item.id
                        }
                        className="rounded-2xl bg-slate-50 p-4"
                      >
                        <p className="text-xs font-black">
                          {item.examName ||
                            item.examinationName ||
                            item.name ||
                            "Result"}
                        </p>

                        <p className="mt-1 text-[10px] text-slate-500">
                          Percentage:{" "}
                          {item.percentage ??
                            "—"}
                        </p>
                      </div>
                    )
                  )
                ) : (
                  <p className="text-xs text-slate-500">
                    No progress record available.
                  </p>
                )}
              </div>
            </section>
          )}

          {![
            "profile",
            "progress",
          ].includes(
            moduleKey
          ) && (
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[.2em] text-slate-400">
                    Live Data
                  </p>

                  <h2 className="mt-1 text-xl font-black text-slate-900">
                    {config.title}
                  </h2>
                </div>

                <span className="text-[10px] font-bold text-slate-400">
                  {visibleItems.length} record(s)
                </span>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {visibleItems.length ? (
                  visibleItems.map(
                    (item) => (
                      <div
                        key={
                          item.id
                        }
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <p className="text-xs font-black text-slate-800">
                          {item.title ||
                            item.name ||
                            item.subjectName ||
                            item.examName ||
                            item.type ||
                            config.title}
                        </p>

                        <p className="mt-2 whitespace-pre-wrap text-[10px] leading-5 text-slate-500">
                          {item.message ||
                            item.description ||
                            item.details ||
                            item.date ||
                            item.status ||
                            "Record available in the student portal."}
                        </p>
                      </div>
                    )
                  )
                ) : (
                  <div className="md:col-span-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                    <p className="text-sm font-black text-slate-700">
                      No data available
                    </p>

                    <p className="mt-1 text-[10px] text-slate-400">
                      This page is connected and ready to display
                      records when the corresponding collection is populated.
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </StudentLayout>
  );
}
