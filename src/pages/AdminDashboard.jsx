import { useNavigate } from "react-router-dom";

function AdminDashboard() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-gray-100">

      <aside className="w-64 bg-green-700 text-white">

        <div className="p-6 text-3xl font-bold border-b border-green-600">
          XYZ SCHOOL
        </div>

        <nav className="mt-6">

          <button
            onClick={() => navigate("/admin-dashboard")}
            className="w-full text-left px-6 py-4 hover:bg-green-800"
          >
            🏠 Dashboard
          </button>

          <button
            onClick={() => navigate("/add-student")}
            className="w-full text-left px-6 py-4 hover:bg-green-800"
          >
            👨‍🎓 Students
          </button>

          <button className="w-full text-left px-6 py-4 hover:bg-green-800">
            🏫 Classes
          </button>

          <button className="w-full text-left px-6 py-4 hover:bg-green-800">
            📚 Subjects
          </button>

          <button className="w-full text-left px-6 py-4 hover:bg-green-800">
            📄 Results
          </button>

          <button className="w-full text-left px-6 py-4 hover:bg-green-800">
            ⚙ Settings
          </button>

        </nav>

      </aside>

      <div className="flex-1">

        <header className="bg-white shadow px-8 py-5 flex justify-between items-center">

          <h1 className="text-3xl font-bold">
            Admin Dashboard
          </h1>

          <button
            onClick={() => navigate("/admin-login")}
            className="bg-red-600 text-white px-5 py-2 rounded-lg"
          >
            Logout
          </button>

        </header>

        <main className="p-8">

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            <div className="bg-white rounded-xl shadow p-6">
              <p className="text-gray-500">Students</p>
              <h2 className="text-4xl font-bold text-blue-700 mt-3">0</h2>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <p className="text-gray-500">Classes</p>
              <h2 className="text-4xl font-bold text-green-700 mt-3">0</h2>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <p className="text-gray-500">Subjects</p>
              <h2 className="text-4xl font-bold text-purple-700 mt-3">0</h2>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <p className="text-gray-500">Results</p>
              <h2 className="text-4xl font-bold text-red-700 mt-3">0</h2>
            </div>

          </div>

        </main>

      </div>

    </div>
  );
}

export default AdminDashboard;