import { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../config/firebase";

function AddStudent() {
  const [student, setStudent] = useState({
    name: "",
    enrollmentNo: "",
    className: "",
    section: "",
    fatherName: "",
    email: "",
    mobile: "",
  });

  const handleChange = (e) => {
    setStudent({
      ...student,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await addDoc(collection(db, "students"), student);

      alert("Student Saved Successfully");

      setStudent({
        name: "",
        enrollmentNo: "",
        className: "",
        section: "",
        fatherName: "",
        email: "",
        mobile: "",
      });
          } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">

      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg p-8">

        <h1 className="text-3xl font-bold text-green-700 mb-8">
          Add Student
        </h1>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-5"
        >

          <input
            type="text"
            name="name"
            placeholder="Student Name"
            value={student.name}
            onChange={handleChange}
            className="border p-3 rounded-lg"
          />

          <input
            type="text"
            name="enrollmentNo"
            placeholder="Enrollment Number"
            value={student.enrollmentNo}
            onChange={handleChange}
            className="border p-3 rounded-lg"
          />

          <input
            type="text"
            name="className"
            placeholder="Class"
            value={student.className}
            onChange={handleChange}
            className="border p-3 rounded-lg"
          />

          <input
            type="text"
            name="section"
            placeholder="Section"
            value={student.section}
            onChange={handleChange}
            className="border p-3 rounded-lg"
          />

          <input
            type="text"
            name="fatherName"
            placeholder="Father Name"
            value={student.fatherName}
            onChange={handleChange}
            className="border p-3 rounded-lg"
          />

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={student.email}
            onChange={handleChange}
            className="border p-3 rounded-lg"
          />

          <input
            type="text"
            name="mobile"
            placeholder="Mobile Number"
            value={student.mobile}
            onChange={handleChange}
            className="border p-3 rounded-lg md:col-span-2"
          />

          <button
            type="submit"
            className="bg-green-700 text-white py-3 rounded-lg md:col-span-2 hover:bg-green-800"
          >
            Save Student
          </button>

        </form>

      </div>

    </div>
  );
}

export default AddStudent;