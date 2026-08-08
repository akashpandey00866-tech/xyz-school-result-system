import { useState } from "react";

import {
  collection,
  addDoc,
  doc,
  getDoc,
} from "firebase/firestore";

import { db } from "../config/firebase";
import LoadingButton from "../components/LoadingButton";
import AdminLayout from "../layouts/AdminLayout";

function AddStudent() {

  const [loading, setLoading] = useState(false);

  const [student, setStudent] = useState({

    name: "",
    enrollmentNo: "",

    fatherName: "",
    motherName: "",

    dob: "",
    gender: "",

    className: "",
    section: "",

    email: "",
    mobile: "",

    address: "",

    password: "",

  });

  const handleChange = (e) => {

    setStudent({

      ...student,

      [e.target.name]: e.target.value,

    });

  };

  const resetForm = () => {

    setStudent({

      name: "",
      enrollmentNo: "",

      fatherName: "",
      motherName: "",

      dob: "",
      gender: "",

      className: "",
      section: "",

      email: "",
      mobile: "",

      address: "",

      password: "",

    });

  };
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !student.name.trim() ||
      !student.enrollmentNo.trim() ||
      !student.className ||
      !student.section ||
      !student.email.trim()
    ) {
      alert("Please fill all required fields.");
      return;
    }

  try {

    setLoading(true);

    /* ==============================
       Fetch Fee Settings
    ============================== */

    const feeRef = doc(
      db,
      "settings",
      "feeSettings"
    );

    const feeSnap = await getDoc(feeRef);

    if (!feeSnap.exists()) {

      alert("Fee Settings not found.");

      return;

    }

    const feeData = feeSnap.data();

    const annualFee =
      Number(
        feeData[
          `class${student.className}`
        ]
      ) || 0;

    if (annualFee <= 0) {

      alert(
        `Fee not found for Class ${student.className}`
      );

      return;

    }

    /* ==============================
       Student Data
    ============================== */

    const studentData = {

      ...student,

      annualFee,

      paidFee: 0,

      dueFee: annualFee,

      paymentHistory: [],

      admissionDate:
        new Date().toLocaleDateString("en-IN"),

      createdAt: new Date(),

      isArchived: false,

    };

    await addDoc(

      collection(db, "students"),

      studentData

    );

    alert("✅ Student Added Successfully");

    resetForm();

  }

  catch (error) {

    console.log(error);

    alert(error.message);

  }

  finally {

    setLoading(false);

  }

};
return (
  <AdminLayout>

    <div className="max-w-7xl mx-auto">

      {/* Header */}

      <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 flex justify-between items-center">

        <div>

          <h1 className="text-4xl font-bold text-green-700">
            👨‍🎓 Student Admission
          </h1>

          <p className="text-gray-500 mt-2">
            Add a new student to the School ERP System
          </p>

        </div>

        <div className="hidden md:block bg-green-100 px-6 py-4 rounded-xl">

          <h2 className="text-green-700 font-bold">
            Session
          </h2>

          <p className="text-xl font-bold">
            2026 - 2027
          </p>

        </div>

      </div>

      {/* Form */}

      <div className="bg-white rounded-2xl shadow-xl p-8">

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >

          <input
            type="text"
            name="name"
            value={student.name}
            onChange={handleChange}
            placeholder="Student Name *"
            className="border rounded-xl p-3"
            required
          />

          <input
            type="text"
            name="enrollmentNo"
            value={student.enrollmentNo}
            onChange={handleChange}
            placeholder="Enrollment Number *"
            className="border rounded-xl p-3"
            required
          />

          <input
            type="text"
            name="fatherName"
            value={student.fatherName}
            onChange={handleChange}
            placeholder="Father Name"
            className="border rounded-xl p-3"
          />

          <input
            type="text"
            name="motherName"
            value={student.motherName}
            onChange={handleChange}
            placeholder="Mother Name"
            className="border rounded-xl p-3"
          />

          <input
            type="date"
            name="dob"
            value={student.dob}
            onChange={handleChange}
            className="border rounded-xl p-3"
          />

          <select
            name="gender"
            value={student.gender}
            onChange={handleChange}
            className="border rounded-xl p-3"
          >
            <option value="">Select Gender</option>
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>

          <select
            name="className"
            value={student.className}
            onChange={handleChange}
            className="border rounded-xl p-3"
            required
          >
            <option value="">Select Class</option>

            {Array.from({ length: 12 }, (_, i) => (

              <option
                key={i + 1}
                value={String(i + 1)}
              >
                Class {i + 1}
              </option>

            ))}

          </select>

          <select
            name="section"
            value={student.section}
            onChange={handleChange}
            className="border rounded-xl p-3"
            required
          >
            <option value="">Select Section</option>
            <option>A</option>
            <option>B</option>
            <option>C</option>
            <option>D</option>
          </select>

          <input
            type="email"
            name="email"
            value={student.email}
            onChange={handleChange}
            placeholder="Email Address *"
            className="border rounded-xl p-3"
            required
          />

          <input
            type="text"
            name="mobile"
            value={student.mobile}
            onChange={handleChange}
            placeholder="Mobile Number"
            className="border rounded-xl p-3"
          />

          <textarea
            name="address"
            value={student.address}
            onChange={handleChange}
            rows="3"
            placeholder="Address"
            className="md:col-span-2 border rounded-xl p-3 resize-none"
          />

          <select
            name="status"
            value={student.status}
            onChange={handleChange}
            className="md:col-span-2 border rounded-xl p-3"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          <div className="md:col-span-2 flex gap-4 mt-4">

            <LoadingButton
              type="submit"
              loading={loading}
              className="flex-1 bg-green-700 hover:bg-green-800 text-white"
            >
              💾 Save Student
            </LoadingButton>

            <button
              type="button"
              onClick={resetForm}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-xl"
            >
              🔄 Reset Form
            </button>

          </div>

        </form>

      </div>

    </div>

  </AdminLayout>
);

}

export default AddStudent;