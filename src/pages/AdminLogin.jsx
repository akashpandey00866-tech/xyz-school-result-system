import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../config/firebase";

function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const ADMIN_EMAIL = "akashpandey00866@gmail.com";

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      alert("Please fill all fields.");
      return;
    }

    try {
      setLoading(true);

      const userCredential =
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

      if (userCredential.user.email !== ADMIN_EMAIL) {
        await signOut(auth);
        alert("Access Denied! Only Admin can login.");
        return;
      }

      alert("Admin Login Successful");
      navigate("/admin-dashboard");

    } catch (error) {

      switch (error.code) {

        case "auth/invalid-credential":
          alert("Invalid Email or Password");
          break;

        case "auth/user-not-found":
          alert("Admin account not found");
          break;

        case "auth/wrong-password":
          alert("Wrong Password");
          break;

        case "auth/too-many-requests":
          alert("Too many attempts. Try again later.");
          break;

        default:
          alert(error.message);

      }

    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {

    if (!email) {
      alert("Please enter your email first.");
      return;
    }

    try {

      await sendPasswordResetEmail(auth, email);

      alert("Password reset email sent successfully.");

    } catch (error) {

      switch (error.code) {

        case "auth/user-not-found":
          alert("No account found with this email.");
          break;

        case "auth/invalid-email":
          alert("Please enter a valid email.");
          break;

        default:
          alert(error.message);

      }

    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-700 via-green-600 to-blue-700 p-4">

      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">

        <div className="text-center">

          <div className="text-6xl mb-3">
            🏫
          </div>

          <h1 className="text-3xl font-bold text-green-700">
            XYZ SCHOOL
          </h1>

          <p className="text-gray-500 mt-2">
            Result Management System
          </p>

          <h2 className="text-xl font-semibold mt-6">
            Admin Login
          </h2>

        </div>

        <form
          onSubmit={handleLogin}
          className="space-y-5 mt-8"
        >          <div>
            <label
              htmlFor="email"
              className="block mb-2 font-semibold"
            >
              Admin Email
            </label>

            <input
              id="email"
              name="email"
              type="email"
              placeholder="Enter Admin Email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>

          <div>

            <div className="flex justify-between items-center mb-2">

              <label
                htmlFor="password"
                className="font-semibold"
              >
                Password
              </label>

              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-green-700 hover:text-green-900 hover:underline"
              >
                Forgot Password?
              </button>

            </div>

            <div className="relative">

              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter Password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border rounded-lg p-3 pr-20 outline-none focus:ring-2 focus:ring-green-600"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3 text-green-700 font-semibold"
              >
                {showPassword ? "Hide" : "Show"}
              </button>

            </div>

          </div>

          <div className="flex justify-between items-center">

            <label className="flex items-center gap-2 text-sm text-gray-600">

              <input
                type="checkbox"
                className="accent-green-700"
              />

              Remember Me

            </label>

          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-700 text-white py-3 rounded-lg hover:bg-green-800 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? "Signing In..." : "Login"}
          </button>
                  </form>

        <div className="mt-6 text-center">

          <p className="text-sm text-gray-500">
            Only authorized administrators can access this system.
          </p>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="mt-4 text-green-700 hover:text-green-900 hover:underline font-medium"
          >
            ← Back to Home
          </button>

        </div>

        <div className="border-t mt-8 pt-5 text-center">

          <p className="text-gray-500 text-sm">
            © 2026 XYZ School Result Management System
          </p>

          <p className="text-xs text-gray-400 mt-1">
            Developed with React • Firebase • Tailwind CSS
          </p>

        </div>

      </div>

    </div>
  );
}

export default AdminLogin;