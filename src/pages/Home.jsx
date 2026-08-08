import StudentLayout from "../layouts/StudentLayout";
import { Link } from "react-router-dom";

function Home() {
  return (
    <StudentLayout>
      <section className="min-h-screen bg-gradient-to-br from-blue-800 via-blue-700 to-green-700 text-white flex items-center">
        <div className="max-w-7xl mx-auto px-6 w-full">

          <div className="grid md:grid-cols-2 gap-12 items-center">

            {/* Left Side */}
            <div>

              <span className="bg-yellow-400 text-black px-4 py-1 rounded-full text-sm font-semibold">
                Result Management System
              </span>

              <h1 className="text-5xl md:text-6xl font-bold mt-6 leading-tight">
                XYZ School
              </h1>

              <h2 className="text-3xl mt-4 font-semibold text-blue-100">
                Student Result Portal
              </h2>

              <p className="mt-6 text-lg text-gray-200 leading-8">
                Secure online portal for students to view academic results,
                profile details, practical marks, internal assessments,
                semester performance and download official mark sheets.
              </p>

              <div className="flex flex-wrap gap-5 mt-10">

                <Link
                  to="/student-login"
                  className="bg-white text-blue-800 px-8 py-3 rounded-xl font-bold hover:bg-gray-200 transition"
                >
                  Student Login
                </Link>

                <Link
                  to="/admin-login"
                  className="bg-green-600 px-8 py-3 rounded-xl font-bold hover:bg-green-700 transition"
                >
                  Admin Login
                </Link>

              </div>

            </div>

            {/* Right Side */}

            <div className="flex justify-center">

              <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-10 shadow-2xl w-full max-w-md">

                <h2 className="text-3xl font-bold text-center">
                  Portal Features
                </h2>

                <div className="space-y-5 mt-8 text-lg">

                  <div>✅ Secure Student Login</div>

                  <div>✅ View Complete Result</div>

                  <div>✅ Internal Marks (ST1 ST2 ST3)</div>

                  <div>✅ Practical Marks</div>

                  <div>✅ Rank & Percentage</div>

                  <div>✅ PDF Download</div>

                  <div>✅ Print Marksheet</div>

                  <div>✅ Real-Time Firestore Data</div>

                </div>

              </div>

            </div>

          </div>

        </div>
      </section>
    </StudentLayout>
  );
}

export default Home;