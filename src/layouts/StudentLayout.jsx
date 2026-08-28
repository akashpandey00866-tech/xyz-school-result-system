import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../config/firebase";

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
        active: true,
      },
      {
        title: "Academic Progress",
        icon: "📈",
        path: "/student/progress",
        active: true,
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
        active: true,
      },
      {
        title: "Examination",
        icon: "📝",
        path: "/student/examination",
        active: true,
      },
      {
        title: "Academic Calendar",
        icon: "📅",
        path: "/student/calendar",
        active: true,
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
        active: true,
      },
      {
        title: "Notifications",
        icon: "🔔",
        path: "/student/notifications",
        active: true,
      },
      {
        title: "Documents",
        icon: "📄",
        path: "/student/documents",
        active: true,
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
        active: true,
      },
      {
        title: "Complaint",
        icon: "📝",
        path: "/student/complaint",
        active: true,
      },
      {
        title: "Suggestion",
        icon: "💡",
        path: "/student/suggestion",
        active: true,
      },
    ],
  },
];

function readStudentSession() {
  try {
    const localStudent = localStorage.getItem("student");
    const sessionStudent = sessionStorage.getItem("student");

    return JSON.parse(
      localStudent || sessionStudent || "{}"
    );
  } catch {
    return {};
  }
}

function StudentLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [student, setStudent] = useState(readStudentSession);

  const studentName =
    student?.name ||
    student?.fullName ||
    auth.currentUser?.displayName ||
    "Student";

  const enrollmentNo =
    student?.enrollmentNo ||
    student?.enrollmentNumber ||
    "—";

  const className =
    student?.className ||
    student?.class ||
    "—";

  const section = student?.section || "—";

  const initials =
    studentName
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "ST";

  const flatItems = useMemo(
    () =>
      navigation.flatMap((group) =>
        group.items.map((item) => ({
          ...item,
          section: group.section,
        }))
      ),
    []
  );

  const activeIndex = Math.max(
    0,
    flatItems.findIndex(
      (item) =>
        location.pathname === item.path ||
        (item.path !== "/student-dashboard" &&
          location.pathname.startsWith(`${item.path}/`))
    )
  );

  const activeItem =
    flatItems[activeIndex] || flatItems[0];

  useEffect(() => {
    const syncStudent = () => {
      setStudent(readStudentSession());
    };

    window.addEventListener("storage", syncStudent);
    window.addEventListener("student-session-updated", syncStudent);

    return () => {
      window.removeEventListener("storage", syncStudent);
      window.removeEventListener(
        "student-session-updated",
        syncStudent
      );
    };
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to logout?"
    );

    if (!confirmed) return;

    try {
      await signOut(auth);
    } catch (error) {
      console.error("Student logout error:", error);
    }

    localStorage.removeItem("student");
    localStorage.removeItem("studentLoggedIn");
    sessionStorage.removeItem("student");
    sessionStorage.removeItem("studentLoggedIn");

    navigate("/login", { replace: true });
  };

  const handleNavKeyDown = (event, itemIndex) => {
    const navigationKeys = [
      "ArrowDown",
      "ArrowUp",
      "Home",
      "End",
    ];

    if (!navigationKeys.includes(event.key)) return;

    event.preventDefault();

    let nextIndex = itemIndex;

    if (event.key === "ArrowDown") {
      nextIndex =
        itemIndex >= flatItems.length - 1
          ? 0
          : itemIndex + 1;
    }

    if (event.key === "ArrowUp") {
      nextIndex =
        itemIndex <= 0
          ? flatItems.length - 1
          : itemIndex - 1;
    }

    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") {
      nextIndex = flatItems.length - 1;
    }

    const nextItem = flatItems[nextIndex];

    if (!nextItem) return;

    const element = document.getElementById(
      `student-nav-${nextIndex}`
    );

    element?.focus();

    if (nextItem.active !== false) {
      navigate(nextItem.path);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 cursor-default bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-800/80",
          "bg-[#07111f] text-white shadow-2xl transition-all duration-300",
          collapsed ? "w-[88px]" : "w-[280px]",
          mobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        <div className="border-b border-white/10 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 text-xl shadow-lg">
              🏫
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-black tracking-tight">
                  XYZ PUBLIC SCHOOL
                </p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
                  Student ERP Portal
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() =>
                setCollapsed((value) => !value)
              }
              className="ml-auto hidden h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white lg:flex"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={
                collapsed
                  ? "Expand sidebar"
                  : "Collapse sidebar"
              }
            >
              {collapsed ? "→" : "←"}
            </button>
          </div>
        </div>

        {!collapsed && (
          <div className="mx-3 mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 text-sm font-black shadow-lg">
                {initials}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-black">
                  {studentName}
                </p>
                <p className="truncate text-[10px] font-semibold text-slate-400">
                  {enrollmentNo}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                Class
              </span>
              <span className="text-xs font-black text-cyan-300">
                {className}
                {section !== "—" ? ` • ${section}` : ""}
              </span>
            </div>

            <div className="mt-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-300" />
              Active account
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-3 py-4">
          {navigation.map((group) => (
            <div key={group.section} className="mb-5">
              {!collapsed && (
                <p className="mb-2 px-3 text-[9px] font-black tracking-[0.2em] text-slate-500">
                  {group.section}
                </p>
              )}

              <div className="space-y-1">
                {group.items.map((item) => {
                  const index = flatItems.findIndex(
                    (entry) =>
                      entry.path === item.path
                  );

                  return (
                    <NavLink
                      key={item.path}
                      id={`student-nav-${index}`}
                      to={item.path}
                      end={item.path === "/student-dashboard"}
                      title={
                        collapsed
                          ? item.title
                          : `${item.title}${item.badge ? ` • ${item.badge}` : ""}`
                      }
                      onClick={(event) => {
                        if (item.active === false) {
                          event.preventDefault();
                          return;
                        }

                        setMobileMenuOpen(false);
                      }}
                      onKeyDown={(event) =>
                        handleNavKeyDown(event, index)
                      }
                      className={({ isActive }) =>
                        [
                          "group relative flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5",
                          "text-xs font-bold outline-none transition-all",
                          "focus-visible:ring-2 focus-visible:ring-cyan-400",
                          isActive
                            ? "bg-gradient-to-r from-blue-600/90 to-violet-600/90 text-white shadow-lg shadow-blue-950/40"
                            : "text-slate-400 hover:bg-white/[0.06] hover:text-white",
                          collapsed
                            ? "justify-center"
                            : "",
                        ].join(" ")
                      }
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-base">
                        {item.icon}
                      </span>

                      {!collapsed && (
                        <>
                          <span className="min-w-0 flex-1 truncate">
                            {item.title}
                          </span>

                          {item.badge && (
                            <span className="rounded-md bg-cyan-400/10 px-1.5 py-0.5 text-[8px] font-black uppercase text-cyan-300">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 p-3">
          {!collapsed && (
            <button
              type="button"
              onClick={() => navigate("/student/settings")}
              className="mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5">
                ⚙️
              </span>
              Account Settings
            </button>
          )}

          <button
            type="button"
            onClick={handleLogout}
            title="Logout"
            className={[
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5",
              "text-xs font-black text-red-300 outline-none transition",
              "hover:bg-red-500/10 hover:text-red-200",
              "focus-visible:ring-2 focus-visible:ring-red-400",
              collapsed ? "justify-center" : "",
            ].join(" ")}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10">
              🚪
            </span>
            {!collapsed && "Logout"}
          </button>
        </div>
      </aside>

      <div
        className={[
          "min-h-screen transition-all duration-300",
          collapsed
            ? "lg:pl-[88px]"
            : "lg:pl-[280px]",
        ].join(" ")}
      >
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
          <div className="flex min-h-[72px] items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={() =>
                setMobileMenuOpen(true)
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden"
              aria-label="Open student navigation"
            >
              ☰
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">
                {activeItem?.section || "MAIN"}
              </p>
              <h1 className="truncate text-base font-black text-slate-900 sm:text-lg">
                {activeItem?.title || "Dashboard"}
              </h1>
            </div>

            <div className="hidden items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700">
                Live
              </span>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setProfileOpen((value) => !value)
                }
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 pr-2 outline-none transition hover:border-blue-200 hover:shadow-sm focus-visible:ring-4 focus-visible:ring-blue-100"
                aria-expanded={profileOpen}
                aria-haspopup="menu"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 text-[10px] font-black text-white">
                  {initials}
                </span>
                <span className="hidden max-w-[130px] truncate text-xs font-black text-slate-700 md:block">
                  {studentName}
                </span>
                <span className="text-slate-400">
                  {profileOpen ? "⌃" : "⌄"}
                </span>
              </button>

              {profileOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-12 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl"
                >
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="truncate text-sm font-black text-slate-900">
                      {studentName}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold text-slate-500">
                      {enrollmentNo} • {className}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate("/student/profile");
                    }}
                    className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50"
                    role="menuitem"
                  >
                    👤 My Profile
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate("/student/settings");
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50"
                    role="menuitem"
                  >
                    ⚙️ Account Settings
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-black text-red-600 hover:bg-red-50"
                    role="menuitem"
                  >
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-72px)]">
          {children}
        </main>
      </div>
    </div>
  );
}

export default StudentLayout;
