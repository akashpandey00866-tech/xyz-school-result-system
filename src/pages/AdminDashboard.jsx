import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { signOut } from "firebase/auth";

import {
  Users,
  GraduationCap,
  BookOpen,
  FileText,
  IndianRupee,
  Archive,
  LogOut,
  Settings,
  RefreshCcw,
} from "lucide-react";

import { db, auth } from "../config/firebase";

import AdminLayout from "../layouts/AdminLayout";

function AdminDashboard() {

  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  const [dashboard, setDashboard] = useState({

    students: 0,

    subjects: 0,

    draftResults: 0,

    publishedResults: 0,

    archivedStudents: 0,

    feeCollected: 0,

    feeDue: 0,

  });

  useEffect(() => {

    loadDashboard();

  }, []);

  async function loadDashboard() {

    try {

      setLoading(true);

      const [

        studentSnap,

        subjectSnap,

        resultSnap,

      ] = await Promise.all([

        getDocs(collection(db, "students")),

        getDocs(collection(db, "subjects")),

        getDocs(collection(db, "results")),

      ]);

      let feeCollected = 0;

      let feeDue = 0;

      let archivedStudents = 0;

      studentSnap.forEach((doc) => {

        const data = doc.data();

        feeCollected += Number(data.paidFee || 0);

        feeDue += Number(data.dueFee || 0);

        if (data.isArchived) archivedStudents++;

      });

      let publishedResults = 0;

      let draftResults = 0;

      resultSnap.forEach((doc) => {

        const data = doc.data();

        if (data.status === "Published") {

          publishedResults++;

        } else {

          draftResults++;

        }

      });

      setDashboard({

        students: studentSnap.size,

        subjects: subjectSnap.size,

        draftResults,

        publishedResults,

        archivedStudents,

        feeCollected,

        feeDue,

      });

    }

    catch (error) {

      console.log(error);

      alert("Unable to load dashboard.");

    }

    finally {

      setLoading(false);

    }

  }

  async function handleLogout() {

    const ok = window.confirm(

      "Are you sure you want to logout?"

    );

    if (!ok) return;

    await signOut(auth);

    navigate("/admin-login");

  }
    return (

    <AdminLayout>

      {

        loading ? (

          <div className="flex justify-center items-center h-[70vh]">

            <div className="w-16 h-16 border-4 border-green-700 border-t-transparent rounded-full animate-spin"></div>

          </div>

        ) : (

          <div className="space-y-8">

            {/* =========================
                HEADER
            ========================= */}

            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-5">

              <div>

                <h1 className="text-4xl font-bold text-gray-800">

                  School ERP Dashboard

                </h1>

                <p className="text-gray-500 mt-2">

                  Student • Subject • Result • Fee Management

                </p>

              </div>

              <div className="flex gap-3">

                <button

                  onClick={loadDashboard}

                  className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-5 py-3 rounded-xl transition"

                >

                  <RefreshCcw size={18} />

                  Refresh

                </button>

                <button

                  onClick={() => navigate("/settings")}

                  className="flex items-center gap-2 bg-gray-700 hover:bg-black text-white px-5 py-3 rounded-xl transition"

                >

                  <Settings size={18} />

                  Settings

                </button>

                <button

                  onClick={handleLogout}

                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-xl transition"

                >

                  <LogOut size={18} />

                  Logout

                </button>

              </div>

            </div>

            {/* =========================
                DASHBOARD CARDS
            ========================= */}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">

              <DashboardCard

                icon={<Users size={32} />}

                title="Students"

                value={dashboard.students}

                color="blue"

              />

              <DashboardCard

                icon={<BookOpen size={32} />}

                title="Subjects"

                value={dashboard.subjects}

                color="indigo"

              />

              <DashboardCard

                icon={<FileText size={32} />}

                title="Draft Results"

                value={dashboard.draftResults}

                color="yellow"

              />

              <DashboardCard

                icon={<GraduationCap size={32} />}

                title="Published Results"

                value={dashboard.publishedResults}

                color="green"

              />

              <DashboardCard

                icon={<IndianRupee size={32} />}

                title="Fee Collected"

                value={`₹${dashboard.feeCollected}`}

                color="emerald"

              />

              <DashboardCard

                icon={<IndianRupee size={32} />}

                title="Fee Due"

                value={`₹${dashboard.feeDue}`}

                color="red"

              />

              <DashboardCard

                icon={<Archive size={32} />}

                title="Archived"

                value={dashboard.archivedStudents}

                color="orange"

              />

              <DashboardCard

                icon={<Settings size={32} />}

                title="System"

                value="Ready"

                color="purple"

              />

            </div>
                        {/* =========================
                QUICK ACTIONS
            ========================= */}

            <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-8">

              <div className="mb-8">

                <h2 className="text-3xl font-bold text-gray-800">

                  🚀 Quick Actions

                </h2>

                <p className="text-gray-500 mt-2">

                  Manage Students, Subjects, Results and School Operations

                </p>

              </div>

              {/* Student Management */}

              <div className="mb-10">

                <h3 className="text-xl font-bold text-green-700 mb-5">

                  👨‍🎓 Student Management

                </h3>

                <div className="grid md:grid-cols-3 gap-5">

                  <ActionCard

                    title="Add Student"

                    subtitle="Register New Student"

                    icon="➕"

                    color="green"

                    onClick={() => navigate("/add-student")}

                  />

                  <ActionCard

                    title="View Students"

                    subtitle="Manage Student Records"

                    icon="👨‍🎓"

                    color="blue"

                    onClick={() => navigate("/view-students")}

                  />

                  <ActionCard

                    title="Archive"

                    subtitle="Archived Students"

                    icon="🗂"

                    color="orange"

                    onClick={() => navigate("/archive")}

                  />

                </div>

              </div>

              {/* Result Management */}

              <div className="mb-10">

                <h3 className="text-xl font-bold text-purple-700 mb-5">

                  📊 Result Management

                </h3>

                <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-5">

                  <ActionCard

                    title="Subject Management"

                    subtitle="Create Subjects"

                    icon="📚"

                    color="indigo"

                    onClick={() => navigate("/subject-management")}

                  />

                  <ActionCard

                    title="Add Result"

                    subtitle="Generate Draft"

                    icon="✍"

                    color="green"

                    onClick={() => navigate("/add-result")}

                  />

                  <ActionCard

                    title="View Results"

                    subtitle="Draft Results"

                    icon="📋"

                    color="blue"

                    onClick={() => navigate("/view-results")}

                  />

                  <ActionCard

                    title="Publish Results"

                    subtitle="Final Verification"

                    icon="🚀"

                    color="red"

                    onClick={() => navigate("/publish-results")}

                  />

                  <ActionCard

                    title="Result Settings"

                    subtitle="Coming Soon"

                    icon="⚙"

                    color="gray"

                    disabled

                  />

                </div>

              </div>

              {/* Fee Management */}

              <div>

                <h3 className="text-xl font-bold text-emerald-700 mb-5">

                  💰 Fee Management

                </h3>

                <div className="grid md:grid-cols-3 gap-5">

                  <ActionCard

                    title="Fee Dashboard"

                    subtitle="Fee Collection"

                    icon="💰"

                    color="emerald"

                    onClick={() => navigate("/fee-management")}

                  />

                  <ActionCard

                    title="Fee Settings"

                    subtitle="School Fee Structure"

                    icon="⚙"

                    color="cyan"

                    onClick={() => navigate("/fee-settings")}

                  />

                  <ActionCard

                    title="System Settings"

                    subtitle="ERP Configuration"

                    icon="🛠"

                    color="purple"

                    onClick={() => navigate("/settings")}

                  />

                </div>

              </div>

            </div>
                        {/* =========================
                RECENT ACTIVITIES
            ========================= */}

            <div className="grid lg:grid-cols-2 gap-6">

              <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-6">

                <h2 className="text-2xl font-bold text-gray-800 mb-6">

                  📌 Recent Activities

                </h2>

                <div className="space-y-4">

                  <ActivityItem

                    color="green"

                    title="Student Management"

                    text="Student module is running successfully."

                  />

                  <ActivityItem

                    color="blue"

                    title="Subject Management"

                    text="Ready to create class wise subjects."

                  />

                  <ActivityItem

                    color="purple"

                    title="Result Management"

                    text="Draft result generation is available."

                  />

                  <ActivityItem

                    color="orange"

                    title="Publish Center"

                    text="Final result publishing module."

                  />

                </div>

              </div>

              <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-6">

                <h2 className="text-2xl font-bold text-gray-800 mb-6">

                  📈 System Status

                </h2>

                <div className="space-y-5">

                  <StatusItem

                    title="Student Module"

                    status="Active"

                    color="green"

                  />

                  <StatusItem

                    title="Subject Module"

                    status="Ready"

                    color="blue"

                  />

                  <StatusItem

                    title="Result Module"

                    status="Draft Mode"

                    color="yellow"

                  />

                  <StatusItem

                    title="Publish Center"

                    status="Ready"

                    color="red"

                  />

                  <StatusItem

                    title="Fee Module"

                    status="Running"

                    color="emerald"

                  />

                </div>

              </div>

            </div>

          </div>

        )

      }

    </AdminLayout>

  );

}
function DashboardCard({

  icon,

  title,

  value,

  color,

}) {

  const colors = {

    blue: "bg-blue-50 text-blue-700 border-blue-200",

    green: "bg-green-50 text-green-700 border-green-200",

    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",

    red: "bg-red-50 text-red-700 border-red-200",

    orange: "bg-orange-50 text-orange-700 border-orange-200",

    purple: "bg-purple-50 text-purple-700 border-purple-200",

    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",

    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",

  };

  return (

    <div

      className={`rounded-2xl border shadow-lg p-6 transition hover:shadow-xl hover:-translate-y-1 ${colors[color]}`}

    >

      <div className="flex justify-between items-center">

        <div>

          <p className="text-sm font-medium opacity-80">

            {title}

          </p>

          <h2 className="text-3xl font-bold mt-3">

            {value}

          </h2>

        </div>

        <div className="text-5xl opacity-80">

          {icon}

        </div>

      </div>

    </div>

  );

}

function ActionCard({

  title,

  subtitle,

  icon,

  color,

  onClick,

  disabled = false,

}) {

  const colors = {

    blue: "bg-blue-700 hover:bg-blue-800",

    green: "bg-green-700 hover:bg-green-800",

    red: "bg-red-600 hover:bg-red-700",

    orange: "bg-orange-600 hover:bg-orange-700",

    purple: "bg-purple-700 hover:bg-purple-800",

    emerald: "bg-emerald-700 hover:bg-emerald-800",

    cyan: "bg-cyan-700 hover:bg-cyan-800",

    gray: "bg-gray-400",

    indigo: "bg-indigo-700 hover:bg-indigo-800",

  };

  return (

    <button

      disabled={disabled}

      onClick={onClick}

      className={`${colors[color]} text-white rounded-2xl p-6 text-left transition duration-300 hover:scale-105 shadow-lg disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed disabled:hover:scale-100`}

    >

      <div className="text-5xl mb-4">

        {icon}

      </div>

      <h3 className="text-xl font-bold">

        {title}

      </h3>

      <p className="text-sm opacity-90 mt-2">

        {subtitle}

      </p>

    </button>

  );

}
function ActivityItem({

  color,

  title,

  text,

}) {

  const colors = {

    green: "border-green-600",

    blue: "border-blue-600",

    purple: "border-purple-600",

    orange: "border-orange-600",

    red: "border-red-600",

    emerald: "border-emerald-600",

  };

  return (

    <div

      className={`border-l-4 ${colors[color]} pl-4 py-2`}

    >

      <h3 className="font-semibold text-gray-800">

        {title}

      </h3>

      <p className="text-gray-500 text-sm mt-1">

        {text}

      </p>

    </div>

  );

}

function StatusItem({

  title,

  status,

  color,

}) {

  const colors = {

    green: "bg-green-500",

    blue: "bg-blue-500",

    yellow: "bg-yellow-500",

    red: "bg-red-500",

    emerald: "bg-emerald-500",

    purple: "bg-purple-500",

  };

  return (

    <div className="flex justify-between items-center border-b pb-4">

      <div>

        <h3 className="font-semibold text-gray-800">

          {title}

        </h3>

      </div>

      <div className="flex items-center gap-3">

        <span

          className={`w-3 h-3 rounded-full ${colors[color]}`}

        ></span>

        <span className="font-medium text-gray-700">

          {status}

        </span>

      </div>

    </div>

  );

}

export default AdminDashboard;