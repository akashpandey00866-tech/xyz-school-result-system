import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";

import { db } from "../config/firebase";

function EditStudent() {

  const { id } = useParams();

  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

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
    status: "",
  });

  useEffect(() => {
    loadStudent();
  }, []);

  const loadStudent = async () => {

    try {

      const ref = doc(db, "students", id);

      const snapshot = await getDoc(ref);

      if (snapshot.exists()) {

        setStudent(snapshot.data());

      }

    } catch (error) {

      alert(error.message);

    } finally {

      setLoading(false);

    }

  };

  const handleChange = (e) => {

    setStudent({

      ...student,

      [e.target.name]: e.target.value,

    });

  };

  const handleUpdate = async (e) => {

    e.preventDefault();

    try {

      await updateDoc(

        doc(db, "students", id),

        student

      );

      alert("Student Updated Successfully");

      navigate("/view-students");

    } catch (error) {

      alert(error.message);

    }

  };
    if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h2 className="text-2xl font-bold">
          Loading...
        </h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">

      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl p-8">

        <h1 className="text-3xl font-bold text-green-700 mb-8">
          Edit Student
        </h1>

        <form
          onSubmit={handleUpdate}
          className="grid grid-cols-1 md:grid-cols-2 gap-5"
        >

          <input
            type="text"
            name="name"
            value={student.name}
            onChange={handleChange}
            placeholder="Student Name"
            className="border rounded-lg p-3"
          />

          <input
            type="text"
            name="enrollmentNo"
            value={student.enrollmentNo}
            onChange={handleChange}
            placeholder="Enrollment Number"
            className="border rounded-lg p-3"
          />

          <input
            type="text"
            name="fatherName"
            value={student.fatherName}
            onChange={handleChange}
            placeholder="Father Name"
            className="border rounded-lg p-3"
          />

          <input
            type="text"
            name="motherName"
            value={student.motherName}
            onChange={handleChange}
            placeholder="Mother Name"
            className="border rounded-lg p-3"
          />

          <input
            type="date"
            name="dob"
            value={student.dob}
            onChange={handleChange}
            className="border rounded-lg p-3"
          />

          <select
            name="gender"
            value={student.gender}
            onChange={handleChange}
            className="border rounded-lg p-3"
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>

          <input
            type="text"
            name="className"
            value={student.className}
            onChange={handleChange}
            placeholder="Class"
            className="border rounded-lg p-3"
          />

          <input
            type="text"
            name="section"
            value={student.section}
            onChange={handleChange}
            placeholder="Section"
            className="border rounded-lg p-3"
          />

          <input
            type="email"
            name="email"
            value={student.email}
            onChange={handleChange}
            placeholder="Email"
            className="border rounded-lg p-3"
          />

          <input
            type="text"
            name="mobile"
            value={student.mobile}
            onChange={handleChange}
            placeholder="Mobile Number"
            className="border rounded-lg p-3"
          />

          <textarea
            name="address"
            rows="3"
            value={student.address}
            onChange={handleChange}
            placeholder="Address"
            className="md:col-span-2 border rounded-lg p-3 resize-none"
          />

          <select
            name="status"
            value={student.status}
            onChange={handleChange}
            className="md:col-span-2 border rounded-lg p-3"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          <button
            type="submit"
            className="md:col-span-2 bg-green-700 text-white py-3 rounded-lg hover:bg-green-800"
          >
            Update Student
          </button>

        </form>

      </div>

    </div>
  );
}

export default EditStudent;