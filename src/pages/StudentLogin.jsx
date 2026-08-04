import { useState } from "react";

function StudentLogin() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-700 to-green-700 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">

        <h1 className="text-3xl font-bold text-center text-blue-700">
          XYZ SCHOOL
        </h1>

        <p className="text-center text-gray-500 mt-2 mb-8">
          Student Login
        </p>

        <form className="space-y-5">

          <div>
            <label className="block mb-2 font-semibold">
              Enrollment Number
            </label>

            <input
              type="text"
              placeholder="Enter Enrollment Number"
              className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block mb-2 font-semibold">
              Password
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter Password"
                className="w-full border rounded-lg p-3 pr-16 outline-none focus:ring-2 focus:ring-blue-600"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3 text-blue-700 font-semibold"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-700 text-white py-3 rounded-lg hover:bg-blue-800 transition"
          >
            Login
          </button>

        </form>

      </div>
    </div>
  );
}

export default StudentLogin;