import { NavLink, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../config/firebase";


/* =========================================================
   ICONS
========================================================= */

const DashboardIcon = () => "📊";
const StudentIcon = () => "👨‍🎓";
const AccountIcon = () => "🔐";
const SubjectIcon = () => "📚";
const AcademicIcon = () => "🎓";
const FeeIcon = () => "💰";
const AddResultIcon = () => "✍️";
const ViewResultIcon = () => "📋";
const PublishIcon = () => "🚀";
const ArchiveIcon = () => "📦";
const SettingIcon = () => "⚙️";
const LogoutIcon = () => "🚪";


/* =========================================================
   SIDEBAR
========================================================= */

function Sidebar() {

  const navigate = useNavigate();


  /* =======================================================
     MENU
  ======================================================= */

  const menu = [

    {
      title: "Dashboard",
      icon: DashboardIcon,
      path: "/admin/dashboard",
    },

    {
      title: "Students",
      icon: StudentIcon,
      path: "/students",
    },

    {
      title: "Student Accounts",
      icon: AccountIcon,
      path: "/student-accounts",
    },

    {
      title: "Academic Configuration",
      icon: AcademicIcon,
      path: "/academic-configuration",
    },

    {
      title: "Subject Management",
      icon: SubjectIcon,
      path: "/academic-configuration",
    },

    {
      title: "Fee Management",
      icon: FeeIcon,
      path: "/fees",
    },

    {
      title: "Add Result",
      icon: AddResultIcon,
      path: "/add-result",
    },

    {
      title: "View Results",
      icon: ViewResultIcon,
      path: "/view-results",
    },

    {
      title: "Publish Results",
      icon: PublishIcon,
      path: "/publish-results",
    },

    {
      title: "Archive",
      icon: ArchiveIcon,
      path: "/archive",
    },

    {
      title: "Settings",
      icon: SettingIcon,
      path: "/settings",
    },

  ];


  /* =======================================================
     LOGOUT
  ======================================================= */

  async function handleLogout() {

    const ok =
      window.confirm(
        "Are you sure you want to logout?"
      );


    if (!ok) {
      return;
    }


    try {

      await signOut(auth);


      localStorage.removeItem(
        "adminAuthenticated"
      );


      navigate(
        "/admin/login",
        {
          replace: true,
        }
      );

    } catch (error) {

      console.error(
        "Admin Logout Error:",
        error
      );


      alert(
        "Logout failed. Please try again."
      );

    }

  }


  /* =======================================================
     UI
  ======================================================= */

  return (

    <aside
      className="
        fixed
        left-0
        top-0
        w-72
        h-screen
        bg-gradient-to-b
        from-green-900
        via-green-800
        to-green-950
        text-white
        shadow-2xl
        flex
        flex-col
        z-50
      "
    >

      {/* =================================================
          LOGO
      ================================================= */}

      <div
        className="
          p-6
          border-b
          border-green-700
        "
      >

        <div
          className="
            flex
            items-center
            gap-4
          "
        >

          <div
            className="
              w-16
              h-16
              rounded-full
              bg-white
              flex
              items-center
              justify-center
              text-3xl
              shadow
              flex-shrink-0
            "
          >
            🏫
          </div>


          <div>

            <h1
              className="
                text-2xl
                font-bold
              "
            >
              XYZ School
            </h1>


            <p
              className="
                text-green-200
                text-sm
                mt-1
              "
            >
              ERP Management System
            </p>

          </div>

        </div>

      </div>


      {/* =================================================
          NAVIGATION
      ================================================= */}

      <div
        className="
          flex-1
          overflow-y-auto
          px-4
          py-6
        "
      >

        <h3
          className="
            text-green-200
            uppercase
            text-xs
            font-bold
            tracking-wider
            mb-4
            px-2
          "
        >
          Main Menu
        </h3>


        <div>

          {menu.map((item) => {

            const Icon =
              item.icon;


            return (

              <NavLink
                key={item.title}
                to={item.path}
                className={({ isActive }) =>

                  `
                    flex
                    items-center
                    gap-4
                    px-5
                    py-4
                    rounded-xl
                    mb-3
                    transition-all
                    duration-300
                    ${
                      isActive
                        ? "bg-white text-green-900 shadow-lg font-bold"
                        : "hover:bg-green-700 hover:translate-x-2"
                    }
                  `
                }
              >

                <span
                  className="
                    text-2xl
                    w-7
                    text-center
                  "
                >
                  <Icon />
                </span>


                <span
                  className="
                    text-[15px]
                  "
                >
                  {item.title}
                </span>

              </NavLink>

            );

          })}

        </div>

      </div>


      {/* =================================================
          FOOTER
      ================================================= */}

      <div
        className="
          border-t
          border-green-700
          p-5
        "
      >

        <div
          className="
            bg-green-800
            rounded-xl
            p-4
            mb-4
          "
        >

          <h3
            className="
              font-bold
              text-lg
            "
          >
            Admin Panel
          </h3>


          <p
            className="
              text-green-200
              text-sm
            "
          >
            School ERP v2.0
          </p>


          <div
            className="
              mt-3
              text-xs
              text-green-300
            "
          >
            Student → Account → Result → Publish
          </div>

        </div>


        <button
          type="button"
          onClick={handleLogout}
          className="
            w-full
            flex
            items-center
            justify-center
            gap-3
            bg-red-600
            hover:bg-red-700
            py-3
            rounded-xl
            font-semibold
            transition
          "
        >

          <LogoutIcon />

          Logout

        </button>

      </div>

    </aside>

  );

}


export default Sidebar;