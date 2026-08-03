import { useState } from "react";

function StudentLogin() {
  const [formData, setFormData] = useState({
    enrollment: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.enrollment || !formData.password) {
      alert("Please fill all fields");
      return;
    }

    setLoading(true);

    // Firebase Login yahan add hoga
    setTimeout(() => {
      setLoading(false);
      alert("Login Module Ready");
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-700 to-green-700 p-4">

      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">

        <div className="text-center mb-8">

          <h1 className="text-4xl font-bold text-blue-700">
            XYZ SCHOOL
          </h1>

          <p className="text-gray-500 mt-2">
            Student Result Management System
          </p>

        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          <div>

            <label className="font-semibold block mb-2">
              Enrollment Number
            </label>

            <input
              type="text"
              name="enrollment"
              value={formData.enrollment}
              onChange={handleChange}
              placeholder="Enter Enrollment Number"
              className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-600"
            />

          </div>

          <div>

            <label className="font-semibold block mb-2">
              Password
            </label>

            <div className="relative">

              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
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

          <div className="flex justify-end">

            <button
              type="button"
              className="text-blue-700 hover:underline"
            >
              Forgot Password?
            </button>

          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white py-3 rounded-lg font-semibold transition"
          >
            {loading ? "Please Wait..." : "Login"}
          </button>

        </form>

        <div className="text-center mt-6 text-gray-500 text-sm">
          © 2026 XYZ School
        </div>

      </div>

    </div>
  );
}

export default StudentLogin;