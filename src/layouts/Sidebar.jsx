import { NavLink, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../config/firebase";

const DashboardIcon = () => "📊";
const StudentIcon = () => "👨‍🎓";
const SubjectIcon = () => "📚";
const FeeIcon = () => "💰";
const AddResultIcon = () => "✍";
const ViewResultIcon = () => "📋";
const PublishIcon = () => "🚀";
const ArchiveIcon = () => "📦";
const SettingIcon = () => "⚙️";
const LogoutIcon = () => "🚪";

function Sidebar() {

  const navigate = useNavigate();

  const menu = [

    {
      title: "Dashboard",
      icon: DashboardIcon,
      path: "/admin-dashboard",
    },

    {
      title: "Students",
      icon: StudentIcon,
      path: "/view-students",
    },

    {
      title: "Subject Management",
      icon: SubjectIcon,
      path: "/subject-management",
    },

    {
      title: "Fee Management",
      icon: FeeIcon,
      path: "/fee-management",
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

  async function handleLogout() {

    const ok = window.confirm(
      "Are you sure you want to logout?"
    );

    if (!ok) return;

    try {

      await signOut(auth);

      navigate("/admin-login", {
        replace: true,
      });

    }

    catch (error) {

      console.log(error);

      alert("Logout Failed");

    }

  }

  return (

    <aside className="fixed left-0 top-0 w-72 h-screen bg-gradient-to-b from-green-900 via-green-800 to-green-950 text-white shadow-2xl flex flex-col">

      {/* Logo */}

      <div className="p-6 border-b border-green-700">

        <div className="flex items-center gap-4">

          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-3xl shadow">

            🏫

          </div>

          <div>

            <h1 className="text-2xl font-bold">

              XYZ School

            </h1>

            <p className="text-green-200 text-sm">

              ERP Management System

            </p>

          </div>

        </div>

      </div>

      {/* Navigation */}

      <div className="flex-1 overflow-y-auto px-4 py-6">

        <h3 className="text-green-200 uppercase text-xs font-bold tracking-wider mb-4 px-2">

          Main Menu

        </h3>

        {

          menu.map((item) => {

            const Icon = item.icon;

            return (

              <NavLink

                key={item.path}

                to={item.path}

                className={({ isActive }) =>

                  `flex items-center gap-4 px-5 py-4 rounded-xl mb-3 transition-all duration-300 ${

                    isActive

                      ? "bg-white text-green-900 shadow-lg font-bold"

                      : "hover:bg-green-700 hover:translate-x-2"

                  }`

                }

              >

                <span className="text-2xl">

                  <Icon />

                </span>

                <span className="text-[15px]">

                  {item.title}

                </span>

              </NavLink>

            );

          })

        }

      </div>

      {/* Footer */}

      <div className="border-t border-green-700 p-5">

        <div className="bg-green-800 rounded-xl p-4 mb-4">

          <h3 className="font-bold text-lg">

            Admin Panel

          </h3>

          <p className="text-green-200 text-sm">

            School ERP v2.0

          </p>

          <div className="mt-3 text-xs text-green-300">

            Subject → Result → Publish Workflow

          </div>

        </div>

        <button

          onClick={handleLogout}

          className="w-full flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 py-3 rounded-xl font-semibold transition"

        >

          <LogoutIcon />

          Logout

        </button>

      </div>

    </aside>

  );

}

export default Sidebar;