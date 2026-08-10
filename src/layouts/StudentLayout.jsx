import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../config/firebase";

/* =========================================================
   STUDENT ERP LAYOUT
========================================================= */

function StudentLayout({ children }) {
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const [profileOpen, setProfileOpen] =
    useState(false);

  /* =======================================================
     STUDENT SESSION
  ======================================================= */

  let student = {};

  try {
    const localStudent =
      localStorage.getItem("student");

    const sessionStudent =
      sessionStorage.getItem("student");

    student = JSON.parse(
      localStudent ||
        sessionStudent ||
        "{}"
    );
  } catch (error) {
    console.error(
      "Student session error:",
      error
    );
  }

  const studentName =
    student.name ||
    student.fullName ||
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

  const initials = studentName
    .split(" ")
    .filter(Boolean)
    .map(
      (word) => word[0]
    )
    .join("")
    .substring(0, 2)
    .toUpperCase();

  /* =======================================================
     NAVIGATION
     
     Only Result + Fees are currently functional.
     Other modules are future-ready.
  ======================================================= */

  const navigation = [
    {
      section: "MAIN",
      items: [
        {
          title: "Dashboard",
          icon: "🏠",
          path: "/student-dashboard",
          active: true,
        },
      ],
    },

    {
      section: "ACADEMICS",
      items: [
        {
          title: "My Profile",
          icon: "👤",
          path: "/student/profile",
          future: true,
        },

        {
          title: "Academic Progress",
          icon: "📈",
          path: "/student/progress",
          future: true,
        },

        {
          title: "Results",
          icon: "📊",
          path: "/student/result",
          active: true,
        },

        {
          title: "Rechecking / Re-evaluation",
          icon: "🔍",
          path: "/student/rechecking",
          active: true,
          badge: "Result",
        },

        {
          title: "Subjects",
          icon: "📚",
          path: "/student/subjects",
          future: true,
        },

        {
          title: "Examination",
          icon: "📝",
          path: "/student/examination",
          future: true,
        },

        {
          title: "Academic Calendar",
          icon: "📅",
          path: "/student/calendar",
          future: true,
        },
      ],
    },

    {
      section: "FINANCE",
      items: [
        {
          title: "Fees",
          icon: "💰",
          path: "/student/fees",
          active: true,
        },

        {
          title: "Fee Receipts",
          icon: "🧾",
          path: "/student/fees/receipts",
          active: true,
        },
      ],
    },

    {
      section: "SCHOOL",
      items: [
        {
          title: "Notices",
          icon: "📢",
          path: "/student/notices",
          future: true,
        },

        {
          title: "Notifications",
          icon: "🔔",
          path: "/student/notifications",
          future: true,
        },

        {
          title: "Documents",
          icon: "📄",
          path: "/student/documents",
          future: true,
        },
      ],
    },

    {
      section: "GUARDIAN",
      items: [
        {
          title: "Guardian Connect",
          icon: "👨‍👩‍👦",
          path: "/student/guardian",
          future: true,
        },

        {
          title: "Complaint",
          icon: "📝",
          path: "/student/complaint",
          future: true,
        },

        {
          title: "Suggestion",
          icon: "💡",
          path: "/student/suggestion",
          future: true,
        },
      ],
    },
  ];

  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout = async () => {
    const confirmed =
      window.confirm(
        "Are you sure you want to logout?"
      );

    if (!confirmed) return;

    try {
      await signOut(auth);
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    }

    localStorage.removeItem(
      "student"
    );

    localStorage.removeItem(
      "studentLoggedIn"
    );

    sessionStorage.removeItem(
      "student"
    );

    sessionStorage.removeItem(
      "studentLoggedIn"
    );

    navigate(
      "/student-login",
      {
        replace: true,
      }
    );
  };

  /* =======================================================
     NAVIGATION CLICK
  ======================================================= */

  const handleNavigation = (
    item,
    event
  ) => {
    if (item.future) {
      event.preventDefault();

      alert(
        `${item.title} module is coming soon. It will be connected with the school system in the next phase.`
      );

      return;
    }

    setMobileMenuOpen(
      false
    );
  };

  /* =======================================================
     LAYOUT
  ======================================================= */

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ===================================================
          MOBILE OVERLAY
      =================================================== */}

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={() =>
            setMobileMenuOpen(
              false
            )
          }
        />
      )}

      {/* ===================================================
          SIDEBAR
      =================================================== */}

      <aside
        className={`
          fixed
          left-0
          top-0
          z-50
          flex
          h-screen
          w-[280px]
          flex-col
          border-r
          border-slate-200
          bg-white
          shadow-xl
          transition-transform
          duration-300
          lg:translate-x-0
          ${
            mobileMenuOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >

        {/* BRAND */}

        <div className="border-b border-slate-100 px-5 py-5">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-700 text-xl text-white shadow-sm">
              🏫
            </div>

            <div className="min-w-0">

              <h1 className="truncate text-sm font-extrabold text-slate-900">
                XYZ PUBLIC SCHOOL
              </h1>

              <p className="mt-0.5 text-[10px] font-medium text-slate-500">
                Student ERP Portal
              </p>

            </div>

            {/* MOBILE CLOSE */}

            <button
              onClick={() =>
                setMobileMenuOpen(
                  false
                )
              }
              className="ml-auto text-xl text-slate-400 lg:hidden"
            >
              ×
            </button>

          </div>

        </div>

        {/* STUDENT MINI PROFILE */}

        <div className="mx-4 mt-4 rounded-2xl bg-gradient-to-br from-green-700 to-emerald-600 p-4 text-white">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 font-extrabold backdrop-blur">
              {initials}
            </div>

            <div className="min-w-0">

              <p className="truncate text-sm font-bold">
                {studentName}
              </p>

              <p className="mt-0.5 truncate text-[10px] text-green-100">
                {enrollmentNo}
              </p>

            </div>

          </div>

          <div className="mt-3 flex items-center justify-between border-t border-white/20 pt-3">

            <span className="text-[10px] text-green-100">
              Class {className}-{section}
            </span>

            <span className="rounded-full bg-white/15 px-2 py-1 text-[9px] font-bold">
              ACTIVE
            </span>

          </div>

        </div>

        {/* NAVIGATION */}

        <nav className="mt-4 flex-1 overflow-y-auto px-4 pb-5">

          {navigation.map(
            (group) => (
              <div
                key={
                  group.section
                }
                className="mb-5"
              >

                <p className="mb-2 px-3 text-[9px] font-extrabold tracking-[0.12em] text-slate-400">
                  {group.section}
                </p>

                <div className="space-y-1">

                  {group.items.map(
                    (item) => (
                      <NavLink
                        key={
                          item.path
                        }
                        to={
                          item.path
                        }
                        onClick={(
                          event
                        ) =>
                          handleNavigation(
                            item,
                            event
                          )
                        }
                        className={({
                          isActive,
                        }) =>
                          `
                          group
                          flex
                          items-center
                          gap-3
                          rounded-xl
                          px-3
                          py-2.5
                          text-xs
                          font-semibold
                          transition
                          ${
                            isActive &&
                            item.active
                              ? "bg-green-50 text-green-800"
                              : "text-slate-600 hover:bg-slate-50 hover:text-green-700"
                          }
                          `
                        }
                      >

                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-base transition group-hover:bg-white">
                          {item.icon}
                        </span>

                        <span className="min-w-0 flex-1 truncate">
                          {item.title}
                        </span>

                        {item.future && (
                          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[7px] font-bold text-slate-400">
                            SOON
                          </span>
                        )}

                        {item.badge && (
                          <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[7px] font-bold text-green-700">
                            {item.badge}
                          </span>
                        )}

                        {item.future ? (
                          <span className="text-[10px] text-slate-300">
                            🔒
                          </span>
                        ) : (
                          <span className="text-slate-300 opacity-0 transition group-hover:opacity-100">
                            →
                          </span>
                        )}

                      </NavLink>
                    )
                  )}

                </div>

              </div>
            )
          )}

        </nav>

        {/* SIDEBAR FOOTER */}

        <div className="border-t border-slate-100 p-4">

          <button
            onClick={() =>
              navigate(
                "/student/settings"
              )
            }
            className="mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50">
              ⚙️
            </span>

            Account Settings
          </button>

          <button
            onClick={
              handleLogout
            }
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-red-600 transition hover:bg-red-50"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
              🚪
            </span>

            Logout
          </button>

        </div>

      </aside>

      {/* ===================================================
          MAIN AREA
      =================================================== */}

      <div className="min-h-screen lg:pl-[280px]">

        {/* =================================================
            TOP HEADER
        ================================================= */}

        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">

          <div className="flex h-[68px] items-center justify-between px-4 sm:px-6">

            {/* MOBILE MENU */}

            <button
              onClick={() =>
                setMobileMenuOpen(
                  true
                )
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-lg lg:hidden"
            >
              ☰
            </button>

            {/* PAGE INFO */}

            <div className="hidden lg:block">

              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Student Portal
              </p>

              <p className="mt-0.5 text-sm font-extrabold text-slate-800">
                Academic & Fee Management
              </p>

            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-4">

              {/* NOTIFICATION */}

              <button
                onClick={() =>
                  alert(
                    "Notifications module will be available in the next phase."
                  )
                }
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-lg transition hover:bg-slate-50"
              >
                🔔

                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
              </button>

              {/* PROFILE */}

              <div className="relative">

                <button
                  onClick={() =>
                    setProfileOpen(
                      (
                        value
                      ) =>
                        !value
                    )
                  }
                  className="flex items-center gap-2 rounded-xl border border-slate-200 px-2 py-1.5 transition hover:bg-slate-50"
                >

                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-xs font-extrabold text-green-800">
                    {initials}
                  </div>

                  <div className="hidden text-left sm:block">

                    <p className="max-w-[130px] truncate text-xs font-bold text-slate-800">
                      {studentName}
                    </p>

                    <p className="text-[9px] text-slate-400">
                      Student
                    </p>

                  </div>

                  <span className="text-xs text-slate-400">
                    ▾
                  </span>

                </button>

                {/* PROFILE DROPDOWN */}

                {profileOpen && (
                  <div className="absolute right-0 top-12 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">

                    <div className="border-b border-slate-100 px-3 py-3">

                      <p className="truncate text-xs font-bold text-slate-800">
                        {studentName}
                      </p>

                      <p className="mt-1 truncate text-[10px] text-slate-400">
                        {enrollmentNo}
                      </p>

                    </div>

                    <button
                      onClick={() => {
                        setProfileOpen(
                          false
                        );

                        navigate(
                          "/student/profile"
                        );
                      }}
                      className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      👤 My Profile
                    </button>

                    <button
                      onClick={() => {
                        setProfileOpen(
                          false
                        );

                        navigate(
                          "/student/settings"
                        );
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      ⚙️ Account Settings
                    </button>

                    <button
                      onClick={
                        handleLogout
                      }
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-red-600 hover:bg-red-50"
                    >
                      🚪 Logout
                    </button>

                  </div>
                )}

              </div>

            </div>

          </div>

        </header>

        {/* =================================================
            CONTENT
        ================================================= */}

        <main className="min-h-[calc(100vh-68px)] px-4 py-5 sm:px-6 sm:py-7">

          <div className="mx-auto max-w-7xl">

            {children}

          </div>

        </main>

      </div>

    </div>
  );
}

export default StudentLayout;