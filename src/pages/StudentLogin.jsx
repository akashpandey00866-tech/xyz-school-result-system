import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

import { db } from "../config/firebase";

function StudentLogin() {

  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [formData, setFormData] = useState({

    enrollmentNo: "",

    password: "",

    remember: false,

  });

  const handleChange = (e) => {

    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({

      ...prev,

      [name]: type === "checkbox" ? checked : value,

    }));

  };const handleLogin = async (e) => {

  e.preventDefault();

  setError("");

  if (!formData.enrollmentNo.trim()) {

    setError("Enter Enrollment Number");

    return;

  }

  if (!formData.password.trim()) {

    setError("Enter Password");

    return;

  }

  try {

    setLoading(true);

    const q = query(
      collection(db, "students"),
      where(
        "enrollmentNo",
        "==",
        formData.enrollmentNo.trim()
      )
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {

      setError("Student Not Found");

      return;

    }

    const docSnap = snapshot.docs[0];

    const student = {

      id: docSnap.id,

      ...docSnap.data(),

    };

    if (
      student.password !==
      formData.password
    ) {

      setError("Incorrect Password");

      return;

    }

    localStorage.setItem(
      "student",
      JSON.stringify(student)
    );

    navigate("/student-dashboard");

  } catch (error) {

    console.log(error);

    setError(error.message);

  } finally {

    setLoading(false);

  }

};
  return (

<div className="min-h-screen bg-gradient-to-br from-blue-700 via-green-600 to-emerald-700 flex items-center justify-center px-4 py-10">

<div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">

<div className="bg-green-700 text-white text-center py-8">

<div className="w-24 h-24 mx-auto rounded-full bg-white flex items-center justify-center text-green-700 text-4xl font-bold">

🏫

</div>

<h1 className="text-3xl font-bold mt-4">

XYZ PUBLIC SCHOOL

</h1>

<p className="text-green-100 mt-2">

Student Portal Login

</p>

</div>

<div className="p-8">

{error && (

<div className="bg-red-100 border border-red-300 text-red-700 rounded-xl px-4 py-3 mb-6">

{error}

</div>

)}

<form onSubmit={handleLogin} className="space-y-6">
{/* Enrollment */}

<div>

<label className="block text-sm font-semibold text-gray-700 mb-2">

Enrollment Number

</label>

<input
  type="text"
  name="enrollmentNo"
  value={formData.enrollmentNo}
  onChange={handleChange}
  placeholder="Enter Enrollment Number"
  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-green-600 focus:outline-none transition"
/>

</div>

{/* Password */}

<div>

<label className="block text-sm font-semibold text-gray-700 mb-2">

Password

</label>

<div className="relative">

<input

type={showPassword ? "text" : "password"}

name="password"

value={formData.password}

onChange={handleChange}

placeholder="Enter Password"

className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-20 focus:border-green-600 focus:outline-none transition"

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

{/* Remember Me */}

<div className="flex items-center justify-between">

<label className="flex items-center gap-2 cursor-pointer">

<input

type="checkbox"

name="remember"

checked={formData.remember}

onChange={handleChange}

/>

<span className="text-sm text-gray-600">

Remember Me

</span>

</label>

<button

type="button"

onClick={() => navigate("/")}

className="text-sm text-green-700 hover:underline"

>

Back to Home

</button>

</div>

{/* Login Button */}

<button

type="submit"

disabled={loading}

className="w-full bg-green-700 hover:bg-green-800 text-white py-3 rounded-xl font-semibold transition disabled:opacity-50"

>

{loading ? "Signing In..." : "Student Login"}

</button>
{/* Help Box */}

<div className="mt-8 rounded-2xl bg-green-50 border border-green-200 p-5">

  <h3 className="text-lg font-bold text-green-700">

    Login Help

  </h3>

  <ul className="mt-3 space-y-2 text-sm text-gray-600">

    <li>• Use your School Enrollment Number.</li>

    <li>• Enter your Student Password.</li>

    <li>• Contact school if you forgot your password.</li>

  </ul>

</div>

{/* Footer */}

<div className="mt-8 text-center">

  <p className="text-gray-500 text-sm">

    © 2026 XYZ PUBLIC SCHOOL

  </p>

  <p className="text-xs text-gray-400 mt-2">

    Student ERP Portal v1.0

  </p>

</div>

</form>

</div>

</div>

</div>

);

}

export default StudentLogin;