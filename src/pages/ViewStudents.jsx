import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../config/firebase";

function ViewStudents() {
  const [students, setStudents] = useState([]);

  const loadStudents = async () => {
    try {
      const snapshot = await getDocs(collection(db, "students"));

      const data = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      setStudents(data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const deleteStudent = async (id) => {
    const ok = window.confirm("Delete this student?");

    if (!ok) return;

    try {
      await deleteDoc(doc(db, "students", id));

      alert("Student Deleted Successfully");

      loadStudents();
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">

      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-lg p-6">

        <h1 className="text-3xl font-bold text-green-700 mb-6">
          View Students
        </h1>

        <div className="overflow-x-auto">

          <table className="w-full border-collapse border border-gray-300">

            <thead>

              <tr className="bg-green-700 text-white">

                <th className="border p-3">Student Name</th>

                <th className="border p-3">Enrollment No</th>

                <th className="border p-3">Class</th>

                <th className="border p-3">Section</th>

                <th className="border p-3">Email</th>

                <th className="border p-3">Mobile</th>

                <th className="border p-3">Action</th>

              </tr>

            </thead>

            <tbody>              {students.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="border p-6 text-center text-gray-500"
                  >
                    No Students Found
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr
                    key={student.id}
                    className="hover:bg-gray-100 transition"
                  >
                    <td className="border p-3 text-center">
                      {student.name || "-"}
                    </td>

                    <td className="border p-3 text-center">
                      {student.enrollmentNo || "-"}
                    </td>

                    <td className="border p-3 text-center">
                      {student.className || "-"}
                    </td>

                    <td className="border p-3 text-center">
                      {student.section || "-"}
                    </td>

                    <td className="border p-3 text-center">
                      {student.email || "-"}
                    </td>

                    <td className="border p-3 text-center">
                      {student.mobile || "-"}
                    </td>

                    <td className="border p-3 text-center">

                      <button
                        onClick={() => deleteStudent(student.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                      >
                        Delete
                      </button>

                    </td>

                  </tr>
                ))
              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}

export default ViewStudents;