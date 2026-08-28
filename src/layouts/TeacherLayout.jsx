import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import {
  auth,
  db,
} from "../config/firebase";

/* =========================================================
   THEMES
========================================================= */

const THEMES = {
  emerald: {
    primary: "#059669",
    dark: "#064e3b",
    soft: "#ecfdf5",
    border: "#a7f3d0",
  },

  blue: {
    primary: "#2563eb",
    dark: "#1e3a8a",
    soft: "#eff6ff",
    border: "#bfdbfe",
  },

  violet: {
    primary: "#7c3aed",
    dark: "#4c1d95",
    soft: "#f5f3ff",
    border: "#ddd6fe",
  },

  orange: {
    primary: "#ea580c",
    dark: "#7c2d12",
    soft: "#fff7ed",
    border: "#fed7aa",
  },

  rose: {
    primary: "#e11d48",
    dark: "#881337",
    soft: "#fff1f2",
    border: "#fecdd3",
  },
};

/* =========================================================
   HELPERS
========================================================= */

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function display(
  value,
  fallback = "—"
) {
  const result =
    String(value ?? "").trim();

  return result || fallback;
}

/* =========================================================
   COMPONENT
========================================================= */

export default function TeacherLayout({
  children,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const [authUser, setAuthUser] =
    useState(null);

  const [teacher, setTeacher] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [themeName, setThemeName] =
    useState(
      () =>
        localStorage.getItem(
          "teacherPortalTheme"
        ) || "emerald"
    );

  const theme =
    THEMES[themeName] ||
    THEMES.emerald;

  /* =======================================================
     APPLY THEME
  ======================================================= */

  useEffect(() => {
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

    document.documentElement.style.setProperty(
      "--teacher-border",
      theme.border
    );
  }, [themeName, theme]);

  /* =======================================================
     AUTHENTICATION
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (currentUser) => {
          if (!mounted) {
            return;
          }

          if (!currentUser) {
            setAuthUser(null);
            setTeacher(null);
            setLoading(false);

            navigate(
              "/login",
              {
                replace: true,
              }
            );

            return;
          }

          try {
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
              await signOut(
                auth
              );

              navigate(
                "/login",
                {
                  replace: true,
                }
              );

              return;
            }

            const teacherData = {
              id: snapshot.id,
              ...snapshot.data(),
            };

            const role = normalize(
              teacherData.role
            );

            const status =
              normalize(
                teacherData.accountStatus ||
                  "active"
              );

            if (
              role !==
              "teacher"
            ) {
              await signOut(
                auth
              );

              navigate(
                "/login",
                {
                  replace: true,
                }
              );

              return;
            }

            if (
              [
                "disabled",
                "blocked",
                "suspended",
                "inactive",
              ].includes(status)
            ) {
              await signOut(
                auth
              );

              navigate(
                "/login",
                {
                  replace: true,
                }
              );

              return;
            }

            if (mounted) {
              setAuthUser(
                currentUser
              );

              setTeacher(
                teacherData
              );

              setLoading(false);
            }
          } catch (error) {
            console.error(
              "Teacher authentication error:",
              error
            );

            if (mounted) {
              setLoading(false);

              navigate(
                "/login",
                {
                  replace: true,
                }
              );
            }
          }
        }
      );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [navigate]);

  /* =======================================================
     MENU
  ======================================================= */

  const menu = useMemo(
    () => [
      {
        label: "Dashboard",
        icon: "🏠",
        path: "/teacher-dashboard",
      },

      {
        label: "Attendance",
        icon: "✅",
        path: "/teacher/attendance",
      },

      {
        label: "Leave Approval",
        icon: "📅",
        path: "/teacher/leave-approval",
        classTeacherOnly: true,
      },
    ],
    []
  );

  function isActive(path) {
    if (
      path ===
      "/teacher-dashboard"
    ) {
      return (
        location.pathname ===
          "/teacher-dashboard" ||
        location.pathname ===
          "/teacher/dashboard"
      );
    }

    return location.pathname.startsWith(
      path
    );
  }

  function go(path) {
    navigate(path);
  }

  async function logout() {
    try {
      await signOut(auth);

      navigate(
        "/login",
        {
          replace: true,
        }
      );
    } catch (error) {
      console.error(
        "Teacher logout:",
        error
      );
    }
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">

          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--teacher-primary)]" />

          <p className="mt-4 text-sm font-black text-slate-800">
            Loading Teacher Portal
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Verifying your account…
          </p>

        </div>
      </div>
    );
  }

  /* =======================================================
     LAYOUT
  ======================================================= */

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ================================================
          DESKTOP SIDEBAR
      ================================================ */}

      <div className="flex min-h-screen">

        <aside className="sticky top-0 hidden h-screen w-[270px] shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">

          {/* BRAND */}

          <div className="border-b border-slate-100 p-5">

            <button
              type="button"
              onClick={() =>
                go(
                  "/teacher-dashboard"
                )
              }
              className="flex w-full items-center gap-3 text-left"
            >

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--teacher-primary)] text-xs font-black text-white">
                XYZ
              </div>

              <div className="min-w-0">

                <p className="truncate text-sm font-black text-slate-900">
                  XYZ PUBLIC SCHOOL
                </p>

                <p className="mt-0.5 text-[9px] font-black uppercase tracking-wider text-slate-400">
                  Teacher Portal
                </p>

              </div>

            </button>

          </div>

          {/* PROFILE */}

          <div className="border-b border-slate-100 p-4">

            <div className="rounded-2xl bg-[var(--teacher-soft)] p-4">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-lg shadow-sm">
                  👨‍🏫
                </div>

                <div className="min-w-0">

                  <p className="truncate text-xs font-black text-slate-900">
                    {display(
                      teacher?.name,
                      "Teacher"
                    )}
                  </p>

                  <p className="truncate text-[9px] font-bold text-slate-500">
                    {display(
                      teacher?.employeeId ||
                        teacher?.employeeCode,
                      "Teacher"
                    )}
                  </p>

                </div>

              </div>

              {teacher?.isClassTeacher && (
                <div className="mt-3 rounded-xl bg-white p-3">

                  <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                    Class Teacher
                  </p>

                  <p className="mt-1 text-[10px] font-black text-slate-800">
                    {display(
                      teacher?.classTeacherClassName ||
                        teacher?.className,
                      "Assigned Class"
                    )}
                  </p>

                  <p className="mt-0.5 text-[9px] font-bold text-slate-500">
                    Section{" "}
                    {display(
                      teacher?.classTeacherSection ||
                        teacher?.section
                    )}
                  </p>

                </div>
              )}

            </div>

          </div>

          {/* MENU */}

          <nav className="flex-1 overflow-y-auto p-4">

            <p className="px-2 pb-2 text-[8px] font-black uppercase tracking-[.2em] text-slate-400">
              Workspace
            </p>

            <div className="space-y-1">

              {menu.map(
                (item) => {

                  if (
                    item.classTeacherOnly &&
                    !teacher?.isClassTeacher
                  ) {
                    return null;
                  }

                  const active =
                    isActive(
                      item.path
                    );

                  return (
                    <button
                      key={
                        item.path
                      }
                      type="button"
                      onClick={() =>
                        go(
                          item.path
                        )
                      }
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                        active
                          ? "bg-[var(--teacher-soft)] text-[var(--teacher-primary)]"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >

                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-base shadow-sm">
                        {
                          item.icon
                        }
                      </span>

                      <span className="text-xs font-black">
                        {
                          item.label
                        }
                      </span>

                    </button>
                  );
                }
              )}

            </div>

          </nav>

          {/* BOTTOM */}

          <div className="space-y-3 border-t border-slate-100 p-4">

            <label className="block">

              <span className="mb-1.5 block px-1 text-[8px] font-black uppercase tracking-wider text-slate-400">
                Theme
              </span>

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
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black text-slate-700 outline-none focus:border-[var(--teacher-primary)]"
              >

                <option value="emerald">
                  Emerald
                </option>

                <option value="blue">
                  Blue
                </option>

                <option value="violet">
                  Violet
                </option>

                <option value="orange">
                  Orange
                </option>

                <option value="rose">
                  Rose
                </option>

              </select>

            </label>

            <button
              type="button"
              onClick={
                logout
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-black text-red-700 hover:bg-red-100"
            >
              🚪 Logout
            </button>

          </div>

        </aside>

        {/* ================================================
            MAIN
        ================================================ */}

        <main className="min-w-0 flex-1">

          {/* MOBILE TOP BAR */}

          <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">

            <div className="flex items-center justify-between gap-3">

              <button
                type="button"
                onClick={() =>
                  go(
                    "/teacher-dashboard"
                  )
                }
                className="min-w-0 text-left"
              >

                <p className="truncate text-xs font-black text-slate-900">
                  XYZ PUBLIC SCHOOL
                </p>

                <p className="text-[9px] font-bold text-slate-400">
                  Teacher Portal
                </p>

              </button>

              <div className="flex items-center gap-2">

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
                  className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-[9px] font-black outline-none"
                >

                  <option value="emerald">
                    Emerald
                  </option>

                  <option value="blue">
                    Blue
                  </option>

                  <option value="violet">
                    Violet
                  </option>

                  <option value="orange">
                    Orange
                  </option>

                  <option value="rose">
                    Rose
                  </option>

                </select>

                <button
                  type="button"
                  onClick={
                    logout
                  }
                  className="rounded-lg bg-red-50 px-3 py-2 text-[9px] font-black text-red-700"
                >
                  Logout
                </button>

              </div>

            </div>

          </header>

          {/* PAGE */}

          <div className="min-h-screen">
            {children}
          </div>

        </main>

      </div>
    </div>
  );
}