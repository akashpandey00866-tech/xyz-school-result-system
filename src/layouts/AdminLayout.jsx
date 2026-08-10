import {
  useEffect,
  useState,
} from "react";

import {
  useLocation,
  NavLink,
  useNavigate,
} from "react-router-dom";

import {
  signOut,
} from "firebase/auth";

import {
  LayoutDashboard,
  Users,
  GraduationCap,
  FileText,
  PlusCircle,
  IndianRupee,
  Settings,
  Settings2,
  WalletCards,
  LogOut,
  Menu,
  X,
  CalendarDays,
  ClipboardCheck,
  ShieldCheck,
  FileSpreadsheet,
  UserRoundCog,
  Megaphone,
  Upload,
} from "lucide-react";

import {
  auth,
} from "../config/firebase";


function AdminLayout({
  children,
}) {

  const navigate =
    useNavigate();

  const location =
    useLocation();


  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false);


  const [
    loggingOut,
    setLoggingOut,
  ] = useState(false);


  /* =========================================================
     RESULTS OPEN STATE
  ========================================================= */

  const isResultsPage =
    location.pathname.startsWith(
      "/add-result"
    ) ||
    location.pathname.startsWith(
      "/view-results"
    ) ||
    location.pathname.startsWith(
      "/result/"
    ) ||
    location.pathname.startsWith(
      "/publish-results"
    );


  const [
    resultsOpen,
    setResultsOpen,
  ] = useState(
    isResultsPage
  );


  /* =========================================================
     FEES OPEN STATE
  ========================================================= */

  const isFeesPage =
    location.pathname.startsWith(
      "/fee-management"
    ) ||
    location.pathname.startsWith(
      "/fees"
    ) ||
    location.pathname.startsWith(
      "/fee-settings"
    ) ||
    location.pathname.startsWith(
      "/collect-fee"
    ) ||
    location.pathname.startsWith(
      "/payment-history"
    );


  const [
    feesOpen,
    setFeesOpen,
  ] = useState(
    isFeesPage
  );


  /* =========================================================
     ROUTE CHANGE
  ========================================================= */

  useEffect(() => {

    if (isResultsPage) {

      setResultsOpen(true);

    }

    if (isFeesPage) {

      setFeesOpen(true);

    }

    setSidebarOpen(false);

  }, [
    location.pathname,
    isResultsPage,
    isFeesPage,
  ]);


  /* =========================================================
     ACTIVE
  ========================================================= */

  const isActive = (
    path
  ) => {

    return (
      location.pathname === path ||
      location.pathname.startsWith(
        `${path}/`
      )
    );

  };


  /* =========================================================
     LOGOUT
  ========================================================= */

  async function handleLogout() {

    if (loggingOut) {
      return;
    }


    const confirmed =
      window.confirm(
        "Are you sure you want to logout from the Admin Portal?"
      );


    if (!confirmed) {
      return;
    }


    try {

      setLoggingOut(true);

      await signOut(auth);

      localStorage.removeItem(
        "admin"
      );

      localStorage.removeItem(
        "adminUser"
      );

      sessionStorage.removeItem(
        "admin"
      );

      navigate(
        "/admin-login",
        {
          replace: true,
        }
      );

    }

    catch (error) {

      console.error(
        "Admin logout error:",
        error
      );

      alert(
        "Unable to logout. Please try again."
      );

    }

    finally {

      setLoggingOut(false);

    }

  }


  /* =========================================================
     UI
  ========================================================= */

  return (

    <div className="min-h-screen bg-slate-50 text-slate-800">


      {/* =====================================================
          MOBILE HEADER
      ===================================================== */}

      <header className="lg:hidden sticky top-0 z-50 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 shadow-sm">

        <button
          type="button"
          onClick={() =>
            setSidebarOpen(true)
          }
          className="w-10 h-10 rounded-xl hover:bg-slate-100 flex items-center justify-center"
          aria-label="Open navigation"
        >

          <Menu size={22} />

        </button>


        <button
          type="button"
          onClick={() =>
            navigate(
              "/admin-dashboard"
            )
          }
          className="flex items-center gap-2"
        >

          <div className="w-9 h-9 rounded-xl bg-green-700 text-white flex items-center justify-center">

            <GraduationCap
              size={20}
            />

          </div>


          <div className="text-left">

            <p className="font-bold text-sm text-slate-900">

              XYZ PUBLIC SCHOOL

            </p>

            <p className="text-[10px] text-slate-500">

              Admin ERP

            </p>

          </div>

        </button>


        <div className="w-10" />

      </header>


      {/* =====================================================
          MOBILE OVERLAY
      ===================================================== */}

      {sidebarOpen && (

        <button
          type="button"
          aria-label="Close navigation"
          onClick={() =>
            setSidebarOpen(false)
          }
          className="fixed inset-0 z-50 bg-slate-900/40 lg:hidden"
        />

      )}


      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside
        className={`
          fixed left-0 top-0 z-[60] h-screen w-[285px]
          bg-white border-r border-slate-200
          flex flex-col shadow-xl lg:shadow-none
          transition-transform duration-200
          ${
            sidebarOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
          }
        `}
      >


        {/* =================================================
            BRAND
        ================================================= */}

        <div className="h-[76px] px-5 border-b border-slate-100 flex items-center justify-between shrink-0">

          <button
            type="button"
            onClick={() =>
              navigate(
                "/admin-dashboard"
              )
            }
            className="flex items-center gap-3 text-left"
          >

            <div className="w-11 h-11 rounded-xl bg-green-700 text-white flex items-center justify-center shadow-sm">

              <GraduationCap
                size={23}
              />

            </div>


            <div>

              <p className="font-extrabold text-sm text-slate-900">

                XYZ PUBLIC SCHOOL

              </p>

              <p className="text-[11px] text-slate-500 mt-0.5">

                Administration ERP

              </p>

            </div>

          </button>


          <button
            type="button"
            onClick={() =>
              setSidebarOpen(false)
            }
            className="lg:hidden w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center"
            aria-label="Close navigation"
          >

            <X size={19} />

          </button>

        </div>


        {/* =================================================
            ADMIN PROFILE
        ================================================= */}

        <div className="px-4 pt-4 shrink-0">

          <div className="rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 p-3.5">

            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-full bg-green-700 text-white flex items-center justify-center font-bold">

                A

              </div>


              <div className="min-w-0">

                <p className="font-bold text-sm text-slate-900">

                  Administrator

                </p>


                <p className="text-xs text-green-700 flex items-center gap-1 mt-0.5">

                  <ShieldCheck
                    size={13}
                  />

                  Secure Admin Access

                </p>

              </div>

            </div>

          </div>

        </div>


        {/* =================================================
            NAVIGATION
        ================================================= */}

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">


          {/* DASHBOARD */}

          <NavItem
            to="/admin-dashboard"
            icon={
              <LayoutDashboard
                size={19}
              />
            }
            label="Dashboard"
            active={
              location.pathname ===
              "/admin-dashboard"
            }
          />


          {/* ACADEMIC */}

          <NavItem
            to="/academic-configuration"
            icon={
              <CalendarDays
                size={19}
              />
            }
            label="Academic Setup"
            active={
              isActive(
                "/academic-configuration"
              )
            }
          />


          {/* STUDENTS */}

          <NavItem
            to="/students"
            icon={
              <Users size={19} />
            }
            label="Students"
            active={
              isActive(
                "/students"
              )
            }
          />


          {/* STUDENT ACCOUNTS */}

          <NavItem
            to="/student-accounts"
            icon={
              <UserRoundCog
                size={19}
              />
            }
            label="Student Accounts"
            active={
              isActive(
                "/student-accounts"
              )
            }
          />


          {/* =================================================
              RESULTS
          ================================================= */}

          <div className="pt-1">

            <button
              type="button"
              onClick={() =>
                setResultsOpen(
                  (value) =>
                    !value
                )
              }
              className={`
                w-full flex items-center justify-between gap-3
                px-3 py-2.5 rounded-xl text-sm font-semibold
                transition
                ${
                  isResultsPage ||
                  resultsOpen
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }
              `}
            >

              <span className="flex items-center gap-3">

                <FileText
                  size={19}
                />

                Results

              </span>


              <span className="text-slate-500">

                {resultsOpen
                  ? "−"
                  : "+"}

              </span>

            </button>


            {resultsOpen && (

              <div className="ml-5 mt-1 pl-4 border-l border-slate-200 space-y-1">

                <NavSubItem
                  to="/add-result"
                  label="Enter Result"
                  icon={
                    <PlusCircle
                      size={16}
                    />
                  }
                />


                <NavSubItem
                  to="/view-results"
                  label="View Results"
                  icon={
                    <ClipboardCheck
                      size={16}
                    />
                  }
                />


                <NavSubItem
                  to="/publish-results"
                  label="Publish All Results"
                  icon={
                    <ShieldCheck
                      size={16}
                    />
                  }
                />

              </div>

            )}

          </div>


          {/* =================================================
              EXCEL
          ================================================= */}

          <NavItem
            to="/excel-export"
            icon={
              <FileSpreadsheet
                size={19}
              />
            }
            label="Excel Export"
            active={
              isActive(
                "/excel-export"
              )
            }
          />


          {/* Excel Sub Actions */}

          <NavSubItem
            to="/excel-export"
            label="Excel & Records"
            icon={
              <FileSpreadsheet
                size={16}
              />
            }
          />


          <NavSubItem
            to="/excel-import"
            label="Upload Excel"
            icon={
              <Upload
                size={16}
              />
            }
          />


          {/* =================================================
              FEES
          ================================================= */}

          <div className="pt-1">

            <button
              type="button"
              onClick={() =>
                setFeesOpen(
                  (value) =>
                    !value
                )
              }
              className={`
                w-full flex items-center justify-between gap-3
                px-3 py-2.5 rounded-xl text-sm font-semibold
                transition
                ${
                  isFeesPage ||
                  feesOpen
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }
              `}
            >

              <span className="flex items-center gap-3">

                <IndianRupee
                  size={19}
                />

                Fees

              </span>


              <span className="text-slate-500">

                {feesOpen
                  ? "−"
                  : "+"}

              </span>

            </button>


            {feesOpen && (

              <div className="ml-5 mt-1 pl-4 border-l border-slate-200 space-y-1">


                <NavSubItem
                  to="/fee-management"
                  label="Fee Dashboard"
                  icon={
                    <WalletCards
                      size={16}
                    />
                  }
                />


                <NavSubItem
                  to="/fee-settings"
                  label="Fee Settings"
                  icon={
                    <Settings2
                      size={16}
                    />
                  }
                />

              </div>

            )}

          </div>


          {/* =================================================
              NOTICES
          ================================================= */}

          {isActive(
            "/notices"
          ) && (

            <NavItem
              to="/notices"
              icon={
                <Megaphone
                  size={19}
                />
              }
              label="Notices"
              active
            />

          )}

        </nav>


        {/* =================================================
            BOTTOM
        ================================================= */}

        <div className="border-t border-slate-100 p-3 space-y-1 shrink-0">


          <NavItem
            to="/settings"
            icon={
              <Settings
                size={19}
              />
            }
            label="Settings"
            active={
              isActive(
                "/settings"
              )
            }
          />


          <button
            type="button"
            onClick={
              handleLogout
            }
            disabled={
              loggingOut
            }
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-red-50 hover:text-red-700 transition disabled:opacity-50"
          >

            <LogOut
              size={19}
            />

            {loggingOut
              ? "Signing out..."
              : "Logout"}

          </button>


          <p className="px-3 pt-2 text-[10px] text-slate-400">

            School ERP • Admin Portal

          </p>

        </div>

      </aside>


      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <main className="lg:ml-[285px] min-h-screen">


        {/* DESKTOP TOP BAR */}

        <div className="hidden lg:flex h-[76px] bg-white border-b border-slate-200 items-center justify-between px-7">

          <div>

            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">

              Administration

            </p>


            <h2 className="text-lg font-bold text-slate-900">

              {
                getPageTitle(
                  location.pathname
                )
              }

            </h2>

          </div>


          <div className="flex items-center gap-3">

            <div className="w-9 h-9 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm">

              A

            </div>


            <div className="hidden xl:block">

              <p className="text-sm font-semibold text-slate-800">

                Administrator

              </p>

              <p className="text-[11px] text-slate-500">

                School ERP

              </p>

            </div>

          </div>

        </div>


        <div className="min-h-[calc(100vh-76px)]">

          {children}

        </div>

      </main>

    </div>

  );

}


/* =========================================================
   NAV ITEM
========================================================= */

function NavItem({
  to,
  icon,
  label,
  active,
}) {

  return (

    <NavLink
      to={to}
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-xl
        text-sm font-semibold transition
        ${
          active
            ? "bg-green-700 text-white shadow-sm"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }
      `}
    >

      {icon}

      <span>
        {label}
      </span>

    </NavLink>

  );

}


/* =========================================================
   SUB NAV ITEM
========================================================= */

function NavSubItem({
  to,
  icon,
  label,
}) {

  return (

    <NavLink
      to={to}
      className={({ isActive }) =>
        `
          flex items-center gap-2.5 px-3 py-2 rounded-lg
          text-xs font-semibold transition
          ${
            isActive
              ? "bg-green-50 text-green-700"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          }
        `
      }
    >

      {icon}

      <span>
        {label}
      </span>

    </NavLink>

  );

}


/* =========================================================
   PAGE TITLE
========================================================= */

function getPageTitle(
  path
) {

  if (
    path ===
    "/admin-dashboard"
  ) {

    return "Dashboard";

  }


  if (
    path.startsWith(
      "/academic-configuration"
    )
  ) {

    return "Academic Setup";

  }


  if (
    path.startsWith(
      "/students"
    ) ||
    path.startsWith(
      "/add-student"
    ) ||
    path.startsWith(
      "/edit-student"
    )
  ) {

    return "Students";

  }


  if (
    path.startsWith(
      "/student-accounts"
    )
  ) {

    return "Student Accounts";

  }


  if (
    path.startsWith(
      "/add-result"
    )
  ) {

    return "Enter Result";

  }


  if (
    path.startsWith(
      "/view-results"
    ) ||
    path.startsWith(
      "/result/"
    )
  ) {

    return "View Results";

  }


  if (
    path.startsWith(
      "/publish-results"
    )
  ) {

    return "Publish All Results";

  }


  if (
    path.startsWith(
      "/excel-export"
    )
  ) {

    return "Excel Export";

  }


  if (
    path.startsWith(
      "/excel-import"
    )
  ) {

    return "Excel Import";

  }


  if (
    path.startsWith(
      "/fee-management"
    ) ||
    path.startsWith(
      "/fees"
    ) ||
    path.startsWith(
      "/fee-settings"
    ) ||
    path.startsWith(
      "/collect-fee"
    ) ||
    path.startsWith(
      "/payment-history"
    )
  ) {

    return "Fee Management";

  }


  if (
    path.startsWith(
      "/settings"
    )
  ) {

    return "Settings";

  }


  return "School ERP";

}


export default AdminLayout;